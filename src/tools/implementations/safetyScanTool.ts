

import { MultiAgentTool } from '../multiAgentTool.js';
import { MultiAgentToolContext, MultiAgentToolResult, ToolParsingResult } from '../../momoa_core/types.js';
import { DEFAULT_GEMINI_PRO_MODEL, DEFAULT_GEMINI_LITE_MODEL } from '../../config/models.js';
import { removeBacktickFences, getFilesAndContent } from '../../utils/markdownUtils.js';
import { getAssetString, replaceRuntimePlaceholders } from '../../services/promptManager.js';
import { Part } from '@google/genai';

const SAFETYSCAN_SYSTEM_PROMPT = `You are an Anomaly Signal Analyst — a forensic data scientist specializing in
detecting hidden inconsistencies, impossible results, and data fabrication signatures in published research.

YOUR MANDATE:
1. IMPOSSIBLE VALUES: Flag any reported mean, SD, or test statistic that is mathematically
   impossible given the stated sample size, range, or data type. One impossible value = CRITICAL finding.

2. N-COUNT DISCREPANCIES: Subject counts in the methods section, results tables, figures, and
   supplementary data MUST be internally consistent. Any discrepancy = integrity concern.

3. DIGIT PREFERENCE ANALYSIS: Count how often reported p-values cluster just below thresholds
   (0.049x, 0.04x). Tabulate last-digit frequency of reported effect sizes.
   Suspicious clustering = HIGH p-hacking risk.

4. FIGURE DUPLICATION SIGNALS: If image files are provided, examine them for:
   - Identical or near-identical panels claimed to represent different conditions
   - Straight-line boundaries or texture discontinuities in gel/blot images
   - Background irregularities inconsistent with natural exposure gradients

5. INTERNAL CONTRADICTIONS: Does the discussion claim match the results? Does the abstract
   match the full text? Any discrepancy between sections = flag it.

6. HIDDEN INCONSISTENCY INDEX: Document features that appear anomalous but were NOT
   discussed in the paper's limitations section.

OUTPUT FORMAT — Structured Anomaly Signal Report:
- Executive Summary (2-3 sentences)
- CRITICAL Findings (list, each with specific citation to table/figure/section)
- MAJOR Findings
- MINOR Findings
- Hidden Inconsistency Index
- Overall Anomaly Signal Severity: GREEN / YELLOW / RED
- Recommended next investigative action

ADVERSARIAL PRIOR: Every internal inconsistency is presumed real until a specific
documented explanation from the raw data resolves it.`;

export const safetyScanTool: MultiAgentTool = {
  displayName: "Result Anomaly Detector",
  name: 'SAFETYSCAN',

  async execute(params: Record<string, string>, context: MultiAgentToolContext): Promise<MultiAgentToolResult> {
    const updateLog = async (message: string) => {
      context.sendMessage(JSON.stringify({ status: 'WORK_LOG', message }));
      context.overseer?.addLog(message);
    };

    const question = params.question;
    await updateLog(`SAFETYSCAN invoked`);

    context.sendMessage(JSON.stringify({
      status: "PROGRESS_UPDATES",
      current_status_message: `Scanning for statistical anomalies, impossible values, and figure integrity issues...`,
    }));

    try {
      let scanTarget = question;
      let requestedFiles: string[] = [];

      const relevantFilesMarker = 'RELEVANT_FILES:';
      const fileMarkerIndex = question.indexOf(relevantFilesMarker);
      if (fileMarkerIndex !== -1) {
        scanTarget = question.substring(0, fileMarkerIndex).trim();
        const jsonString = question.substring(fileMarkerIndex + relevantFilesMarker.length).trim();
        try {
          const parsedFiles = JSON.parse(jsonString);
          if (Array.isArray(parsedFiles)) requestedFiles = parsedFiles;
        } catch (_) {}
      }

      const fileContent = await getFilesAndContent(requestedFiles, context);

      const fullPrompt = `${SAFETYSCAN_SYSTEM_PROMPT}

## Forensic Scan Target
${scanTarget}

## Paper Data, Tables, and Figures Available for Analysis
${fileContent}

## Investigative Context
${context.projectSpecification ?? '--No Specification Provided--'}

Perform your full anomaly scan now. Be exhaustive. Every table cell, every N count,
every p-value ending must be scrutinized. Produce the complete Anomaly Signal Report.`;

      const parts: Part[] = [];
      if (context.initialImage && context.initialImageMimeType) {
        parts.push({ inlineData: { mimeType: context.initialImageMimeType, data: context.initialImage } });
      }

      // Attach any image files for visual inspection
      const imageExts = new Set(['png', 'jpg', 'jpeg', 'webp', 'tiff', 'tif']);
      for (const filename of requestedFiles) {
        if (context.binaryFileMap.has(filename)) {
          const ext = filename.split('.').pop()?.toLowerCase() ?? '';
          const mimeMap: Record<string, string> = {
            png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
            webp: 'image/webp', tiff: 'image/tiff', tif: 'image/tiff'
          };
          if (imageExts.has(ext)) {
            const mimeType = mimeMap[ext];
            const base64Data = context.binaryFileMap.get(filename);
            if (mimeType && base64Data) {
              parts.push({ inlineData: { mimeType, data: base64Data } });
              await updateLog(`Attaching image for visual anomaly scan: ${filename}`);
            }
          }
        }
      }
      parts.push({ text: fullPrompt });

      const response = await context.multiAgentGeminiClient.sendOneShotMessage(
        parts, { model: DEFAULT_GEMINI_PRO_MODEL, enableThinking: true }
      );

      let report = response?.text || '';
      report = removeBacktickFences(report).trim();

      if (!report) {
        const candidate = response.candidates?.[0];
        report = candidate?.content?.parts?.map((p: any) => p.text).join('\n').trim() || '';
      }

      if (!report) {
        return { result: '[SAFETYSCAN: No anomaly report could be generated]' };
      }

      const result = `## SAFETYSCAN — Anomaly Signal Report\n\n${report}`;

      const summaryPrompt = await replaceRuntimePlaceholders(
        await getAssetString("summarize-progress-start"),
        { LastOrchestratorResponse: result }
      );
      let summary = '';
      try {
        summary = (await context.multiAgentGeminiClient.sendOneShotMessage(
          summaryPrompt, { model: DEFAULT_GEMINI_LITE_MODEL, signal: context.signal }
        ))?.text || '';
      } catch (_) {}

      context.sendMessage(JSON.stringify({ status: "PROGRESS_UPDATES", completed_status_message: summary }));
      return { result };
    } catch (error) {
      const errResult = `SAFETYSCAN error: ${error}`;
      await updateLog(errResult);
      return { result: errResult };
    }
  },

  async extractParameters(invocation: string, _context: MultiAgentToolContext): Promise<ToolParsingResult> {
    const question = invocation.trim();
    if (question) return { success: true, params: { question } };
    return {
      success: false,
      error: `SAFETYSCAN requires a description of what to scan (paper section, table, or figure) and RELEVANT_FILES listing the data files.`
    };
  }
};

