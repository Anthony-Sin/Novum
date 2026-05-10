

import { MultiAgentTool } from '../multiAgentTool.js';
import { addFinding } from '../../utils/investigationFAQs.js';
import { MultiAgentToolContext, MultiAgentToolResult, ToolParsingResult } from '../../novum_core/types.js';
import { DEFAULT_GEMINI_LITE_MODEL, DEFAULT_GEMINI_PRO_MODEL } from '../../config/models.js';
import { getDocumentsAndContent, removeBacktickFences } from '../../utils/markdownUtils.js';
import { getAssetString, replaceRuntimePlaceholders } from '../../services/promptManager.js';
import { generatePaperDiff } from '../../utils/paperVersionDiff.js';
import { getFormattedCacheContents } from './urlFetchTool.js';
import { Part } from '@google/genai';

const STATAUDIT_SYSTEM_PROMPT = `You are a Statistical Fraud Auditor — a world-class forensic biostatistician.
Your sole purpose is to independently reconstruct and stress-test statistical claims in published research.

CORE MANDATE:
- Never accept a reported p-value, hazard ratio, or confidence interval at face value.
- Independently recalculate every statistic from the raw data or summary tables provided.
- Flag ANY discrepancy between your recalculation and the reported value.
- Identify p-hacking signatures: implausibly clean p-values, underpowered studies that happen to hit p<0.05,
  suspicious digit clustering, multiple endpoints with no multiplicity correction.
- Assess whether the analysis population matches the preregistered analysis population.
- Apply Benford's Law where sample sizes allow.
- Produce a structured Statistical Audit Report with: recalculated value, reported value,
  MATCH/DISCREPANCY verdict, discrepancy magnitude, P-hacking Risk Score (LOW/MODERATE/HIGH/VERY HIGH),
  and a plain-language forensic interpretation.

ADVERSARIAL PRIOR: Default to the interpretation most consistent with data manipulation
when evidence is ambiguous. Never give authors the benefit of the doubt without documentary proof.`;

export const statAuditTool: MultiAgentTool = {
  displayName: "Statistical Reconstruction Tool",
  name: 'STATAUDIT',

  async execute(params: Record<string, string>, context: MultiAgentToolContext): Promise<MultiAgentToolResult> {
    const updateLog = async (message: string) => {
      context.sendMessage(JSON.stringify({ status: 'WORK_LOG', message }));
      context.overseer?.addLog(message);
    };

    const question = params.question;
    await updateLog(`STATAUDIT invoked`);

    context.sendMessage(JSON.stringify({
      status: "PROGRESS_UPDATES",
      current_status_message: `Running Statistical Reconstruction — independently recalculating reported statistics.`,
    }));

    try {
      let problemSummary = question;
      let requestedFiles: string[] = [];

      const relevantFilesMarker = 'RELEVANT_FILES:';
      const fileMarkerIndex = question.indexOf(relevantFilesMarker);

      if (fileMarkerIndex !== -1) {
        problemSummary = question.substring(0, fileMarkerIndex).trim();
        const jsonString = question.substring(fileMarkerIndex + relevantFilesMarker.length).trim();
        try {
          const parsedFiles = JSON.parse(jsonString);
          if (Array.isArray(parsedFiles)) requestedFiles = parsedFiles;
        } catch (_) {}
      }

      const urlContent = getFormattedCacheContents();
      const fileNamesPlusContentString = await getDocumentsAndContent(requestedFiles.map(f => ({ FILENAME: f, DESCRIPTION: '' })), context);

      const diffBlock = generatePaperDiff(
        context.originalFileMap, context.fileMap,
        context.editedFilesSet, new Set(context.originalBinaryFileMap.keys())
      );
      const projectDiffString = diffBlock || "---No changes detected---";

      const fullPrompt = `${STATAUDIT_SYSTEM_PROMPT}

## Forensic Task
${problemSummary}

## Available Paper Files and Data
${fileNamesPlusContentString}

## Previously Fetched Registry / Web Content
${urlContent}

## Current Investigation State (Unified Diff)
${projectDiffString}

## Investigative Context
${context.projectSpecification ?? '--No Specification Provided--'}

Produce your full Statistical Audit Report now. Every quantitative finding must include
the source data, the calculation method, and the MATCH/DISCREPANCY verdict.`;

      const parts: Part[] = [];
      if (context.initialImage && context.initialImageMimeType) {
        parts.push({ inlineData: { mimeType: context.initialImageMimeType, data: context.initialImage } });
      }
      for (const filename of requestedFiles) {
        if (context.binaryFileMap.has(filename)) {
          const ext = filename.split('.').pop()?.toLowerCase();
          const mimeMap: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
          const mimeType = mimeMap[ext ?? ''];
          const base64Data = context.binaryFileMap.get(filename);
          if (mimeType && base64Data) parts.push({ inlineData: { mimeType, data: base64Data } });
        }
      }
      parts.push({ text: fullPrompt });

      const expertResponse = await context.multiAgentGeminiClient.sendOneShotMessage(
        parts,
        { model: DEFAULT_GEMINI_PRO_MODEL, enableThinking: true }
      );

      let auditReport = expertResponse?.text || "";
      auditReport = removeBacktickFences(auditReport).trim();

      if (!auditReport) {
        const candidate = expertResponse.candidates?.[0];
        auditReport = candidate?.content?.parts?.map((p: any) => p.text).join('\n').trim() || '';
      }

      if (!auditReport) {
        const nullResult = '[STATAUDIT: No statistical audit report could be generated]';
        await updateLog(nullResult);
        return { result: nullResult };
      }

      const result = `## STATAUDIT — Statistical Reconstruction Report\n\n${auditReport}`;

      const summaryPrompt = await replaceRuntimePlaceholders(
        await getAssetString("summarize-progress-start"),
        { LastOrchestratorResponse: result }
      );
      let summary = "";
      try {
        summary = (await context.multiAgentGeminiClient.sendOneShotMessage(
          summaryPrompt, { model: DEFAULT_GEMINI_LITE_MODEL, signal: context.signal }
        ))?.text || "";
      } catch (_) {}

      context.sendMessage(JSON.stringify({ status: "PROGRESS_UPDATES", completed_status_message: summary }));
      await addFinding(problemSummary, auditReport, context);
      return { result };
    } catch (error) {
      const errResult = `STATAUDIT error: ${error}`;
      await updateLog(errResult);
      return { result: errResult };
    }
  },

  async extractParameters(invocation: string, _context: MultiAgentToolContext): Promise<ToolParsingResult> {
    const question = invocation.trim();
    if (question) return { success: true, params: { question } };
    return { success: false, error: `STATAUDIT requires a forensic question describing what statistics to reconstruct.` };
  }
};


