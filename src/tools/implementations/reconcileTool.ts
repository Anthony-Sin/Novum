

import { MultiAgentTool } from '../multiAgentTool.js';
import { MultiAgentToolContext, MultiAgentToolResult, ToolParsingResult } from '../../momoa_core/types.js';
import { DEFAULT_GEMINI_PRO_MODEL, DEFAULT_GEMINI_LITE_MODEL } from '../../config/models.js';
import { removeBacktickFences, getFilesAndContent } from '../../utils/markdownUtils.js';
import { getAssetString, replaceRuntimePlaceholders } from '../../services/promptManager.js';
import { Part } from '@google/genai';

const RECONCILE_SYSTEM_PROMPT = `You are a Dataset Integrity Expert — a forensic data reconciliation specialist.
Your job is to cross-reference raw data against reported results to detect manipulation, selective exclusion,
and misrepresentation. You treat every discrepancy as a potential integrity finding.

CORE RECONCILIATION CHECKS:
1. SUBJECT COUNT MATCH: Raw dataset N vs. methods-stated enrollment vs. results table N.
   Any discrepancy in subject counts across sections = flag immediately.

2. RANDOMIZATION INTEGRITY: Are group assignments consistent across all reported figures, tables,
   and supplementary data? Inconsistent group labels = potential manipulation.

3. DATE LOGIC: Do event dates precede study start? Are visit dates outside the study window?
   Impossible dates = strong fabrication signal.

4. DERIVED VARIABLE AUDIT: Spot-check calculated variables against preregistered derivation rules.
   Post-hoc variable creation without preregistration = violation.

5. DROPOUT TRACKING: Every enrolled subject must have a documented disposition record.
   Missing subjects in the final analysis without documented exclusion = critical concern.

6. MISSING DATA PATTERN: Assess missing data mechanism (MCAR/MAR/MNAR).
   Run a conceptual tipping-point analysis: how much missing data imputed as failures
   would flip the primary result?

7. PROTOCOL DEVIATION COMPLETENESS: Are all recorded deviations classified?
   Are their impacts on the primary analysis documented?

OUTPUT FORMAT — Structured Dataset Integrity Report:
- Subject Accountability Table (enrolled -> excluded -> analyzed, at each stage)
- Reconciliation Check Results (PASS / FAIL / REQUIRES_CLARIFICATION for each check)
- Data Anomaly Log (impossible values, inconsistent records)
- Missing Data Impact Assessment
- Overall Dataset Integrity Rating: RELIABLE / QUESTIONABLE / COMPROMISED

FORENSIC PRINCIPLE: The preregistration is the contract. Any deviation not explicitly
reported in the paper is presumed to be an integrity violation until proven otherwise.`;

export const reconcileTool: MultiAgentTool = {
  displayName: "Dataset Integrity Tool",
  name: 'RECONCILE',

  async execute(params: Record<string, string>, context: MultiAgentToolContext): Promise<MultiAgentToolResult> {
    const updateLog = async (message: string) => {
      context.sendMessage(JSON.stringify({ status: 'WORK_LOG', message }));
      context.overseer?.addLog(message);
    };

    const question = params.question;
    await updateLog(`RECONCILE invoked`);

    context.sendMessage(JSON.stringify({
      status: "PROGRESS_UPDATES",
      current_status_message: `Reconciling raw data against reported results — cross-referencing subject counts, dates, and derived variables...`,
    }));

    try {
      let reconcileTarget = question;
      let requestedFiles: string[] = [];

      const relevantFilesMarker = 'RELEVANT_FILES:';
      const fileMarkerIndex = question.indexOf(relevantFilesMarker);
      if (fileMarkerIndex !== -1) {
        reconcileTarget = question.substring(0, fileMarkerIndex).trim();
        const jsonString = question.substring(fileMarkerIndex + relevantFilesMarker.length).trim();
        try {
          const parsedFiles = JSON.parse(jsonString);
          if (Array.isArray(parsedFiles)) requestedFiles = parsedFiles;
        } catch (_) {}
      }

      const fileContent = await getFilesAndContent(requestedFiles, context);

      const fullPrompt = `${RECONCILE_SYSTEM_PROMPT}

## Reconciliation Task
${reconcileTarget}

## Available Data Files, Summary Tables, and Methods Documentation
${fileContent}

## Investigative Context
${context.projectSpecification ?? '--No Specification Provided--'}

Perform the full dataset reconciliation now.
Build the Subject Accountability Table first, then work through each reconciliation check.
Document every discrepancy in the Data Anomaly Log.
Conclude with the overall Dataset Integrity Rating and the specific evidence supporting it.`;

      const parts: Part[] = [];
      if (context.initialImage && context.initialImageMimeType) {
        parts.push({ inlineData: { mimeType: context.initialImageMimeType, data: context.initialImage } });
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
        return { result: '[RECONCILE: No dataset integrity report could be generated]' };
      }

      const result = `## RECONCILE — Dataset Integrity Report\n\n${report}`;

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
      const errResult = `RECONCILE error: ${error}`;
      await updateLog(errResult);
      return { result: errResult };
    }
  },

  async extractParameters(invocation: string, _context: MultiAgentToolContext): Promise<ToolParsingResult> {
    const question = invocation.trim();
    if (question) return { success: true, params: { question } };
    return {
      success: false,
      error: `RECONCILE requires a description of what to reconcile and RELEVANT_FILES listing the raw data and summary files.`
    };
  }
};

