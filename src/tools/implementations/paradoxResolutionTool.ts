

import { DEFAULT_GEMINI_FLASH_MODEL, DEFAULT_GEMINI_LITE_MODEL } from "../../config/models.js";
import { MultiAgentToolContext, MultiAgentToolResult, ToolParsingResult } from "../../momoa_core/types.js";
import { replaceRuntimePlaceholders } from "../../services/promptManager.js";
import { getFilesAndContent, removeBacktickFences, repairTruncatedJsonArray } from "../../utils/markdownUtils.js";
import { MultiAgentTool } from "../multiAgentTool.js";
import { generateDiff } from '../../utils/diffGenerator.js';

const PARADOX_SYSTEM_PROMPT = `You are a Research Integrity Contradiction Analyst.
You have been presented with an internal contradiction or logical impossibility within a published paper's data.

YOUR MANDATE:
- Prioritize raw data and objective statistical laws over author narrative claims.
- Do NOT assume the authors made a typographical error — assume potential data exclusion or manipulation until proven otherwise.
- Determine which reported value is internally inconsistent (e.g., which of two conflicting N-counts is wrong).
- Identify the forensic implications: does this contradiction suggest selective exclusion, post-hoc analysis switching, or outright fabrication?
- Produce a Contradiction Resolution Report with: the contradiction stated precisely, the most likely forensic explanation, the supporting evidence, and the recommended next investigative action.

ADVERSARIAL PRIOR: When two values conflict, the one that favors the authors' conclusion is presumed to be the manipulated one until proven otherwise.`;

const CONTRADICTION_PROMPT_TEMPLATE = `You are generating a steelman adversarial challenge to the following forensic problem summary.
Rewrite it to explicitly contradict its assumptions — frame it as if the authors' data IS correct and the investigator is misreading it.
This adversarial reframing will be used to stress-test the forensic hypothesis.
Respond with only the contradictory restatement, no preamble.

ORIGINAL SUMMARY:
{{ContradictThis}}`;

export const paradoxAuditTool: MultiAgentTool = {
  displayName: "Contradiction Resolution Tool",
  name: 'PARADOXAUDIT',

  async execute(params: Record<string, string>, context: MultiAgentToolContext): Promise<MultiAgentToolResult> {
    const updateLog = async (message: string) => {
      context.sendMessage(JSON.stringify({ status: 'WORK_LOG', message }));
      context.overseer?.addLog(message);
    };

    const question = params.question;
    await updateLog(`PARADOXAUDIT invoked`);

    context.sendMessage(JSON.stringify({
      status: "PROGRESS_UPDATES",
      current_status_message: `Resolving data contradiction — applying adversarial stress-test.`,
    }));

    try {
      let paradoxToSolve = question;
      let requestedFiles: string[] = [];

      const relevantFilesMarker = 'RELEVANT_FILES:';
      const fileMarkerIndex = question.indexOf(relevantFilesMarker);
      if (fileMarkerIndex > -1) {
        paradoxToSolve = question.substring(0, fileMarkerIndex).trim();
        const filesJsonString = question.substring(fileMarkerIndex + relevantFilesMarker.length).trim();
        try {
          const parsedFiles = JSON.parse(repairTruncatedJsonArray(filesJsonString) ?? filesJsonString);
          if (Array.isArray(parsedFiles)) requestedFiles = parsedFiles;
        } catch (_) {}
      }

      const fileNamesPlusContentString = await getFilesAndContent(requestedFiles, context);
      const diffBlock = generateDiff(
        context.originalFileMap, context.fileMap,
        context.editedFilesSet, new Set(context.originalBinaryFileMap.keys())
      );
      const projectDiffString = diffBlock || "---No changes detected---";

      // Generate adversarial contradiction for stress-testing
      const contradictionPrompt = CONTRADICTION_PROMPT_TEMPLATE.replace('{{ContradictThis}}', paradoxToSolve);
      let contradiction = (await context.multiAgentGeminiClient.sendOneShotMessage(
        contradictionPrompt, { model: DEFAULT_GEMINI_FLASH_MODEL }
      ))?.text?.trim() || '';
      contradiction = removeBacktickFences(contradiction).trim();

      const fullPrompt = `${PARADOX_SYSTEM_PROMPT}

## Contradiction to Resolve
${paradoxToSolve}

## Adversarial Counter-Reading (Steelman for Authors)
${contradiction}

## Relevant Paper Files and Data
${fileNamesPlusContentString}

## Current Investigation State
${projectDiffString}

Produce your full Contradiction Resolution Report now.
Resolve the contradiction definitively, or if unresolvable, specify exactly what additional data would resolve it.`;

      let resolution = (await context.multiAgentGeminiClient.sendOneShotMessage(
        fullPrompt,
        { model: DEFAULT_GEMINI_FLASH_MODEL, enableThinking: true }
      ))?.text?.trim() || '';
      resolution = removeBacktickFences(resolution).trim();

      if (!resolution) {
        return { result: '[PARADOXAUDIT: No resolution could be generated]' };
      }

      const result = `## PARADOXAUDIT — Contradiction Resolution Report\n\n${resolution}`;

      let summary = "";
      try {
        summary = (await context.multiAgentGeminiClient.sendOneShotMessage(
          result, { model: DEFAULT_GEMINI_LITE_MODEL, signal: context.signal }
        ))?.text || "";
      } catch (_) {}

      context.sendMessage(JSON.stringify({ status: "PROGRESS_UPDATES", completed_status_message: summary }));
      return { result };
    } catch (error) {
      const errResult = `PARADOXAUDIT error: ${error}`;
      await updateLog(errResult);
      return { result: errResult };
    }
  },

  async extractParameters(invocation: string, _context: MultiAgentToolContext): Promise<ToolParsingResult> {
    const question = invocation.trim();
    if (question) return { success: true, params: { question } };
    return { success: false, error: `PARADOXAUDIT requires a description of the contradiction to resolve.` };
  }
};

