import { MultiAgentTool } from './multiAgentTool.js';
import { fileReaderTool } from './implementations/fileReaderTool.js';
import { smartFileEditorTool } from './implementations/smartFileEditorTool.js';
import { statAuditTool } from './implementations/askExpertTool.js';
import { fileSearchTool } from './implementations/fileSearchTool.js';
import { paradoxAuditTool } from './implementations/paradoxResolutionTool.js';
import { moveFolderTool } from './implementations/renameFolderTool.js';
import { MultiAgentToolContext, MultiAgentToolResult } from './momoa_core/types.js';
import { getAssetString } from './services/promptManager.js';
import { regexValidatorTool } from './implementations/regexValidatorTool.js';
import { restartProjectTool } from './implementations/projectRestartTool.js';
import { revertFileTool } from './implementations/revertFileTool.js';
import { registryLookupTool } from './implementations/urlFetchTool.js';
import { LintTool } from './implementations/LintTool.js';
import { registryFactFinderTool } from './implementations/FactFinderTool.js';
import { monteCarloTool } from './implementations/optimizerTool.js';
import { forensicScriptTool } from './implementations/codeRunnerTool.js';
import { researchLogTool } from './implementations/researchLogTool.js';
import { safetyScanTool } from './implementations/safetyScanTool.js';
import { reconcileTool } from './implementations/reconcileTool.js';
import { biasAuditTool } from './implementations/biasAuditTool.js';
import { screencaptureTool } from './implementations/screencaptureTool.js';

const tools = new Map<string, MultiAgentTool>();

function registerTool(tool: MultiAgentTool): void {
  if (tools.has(tool.name)) {
    console.warn(`Tool "${tool.name}" is already registered. Overwriting.`);
  }
  tools.set(tool.name, tool);
}

export function getToolNames(): string[] {
  return [...tools.keys()];
}

export function getTool(toolName: string): MultiAgentTool | undefined {
  return tools.get(toolName);
}

export async function executeTool(
  toolName: string | undefined,
  params: Record<string, unknown> | undefined,
  context: MultiAgentToolContext
): Promise<MultiAgentToolResult> {
  const toolResultPrefix = await getAssetString('tool-result-prefix');
  const toolResultSuffix = await getAssetString('tool-result-suffix');

  if (!toolName) {
    return { result: 'No valid tool name was provided.' };
  }

  const tool = tools.get(toolName);

  if (!tool) {
    return { result: `Error: Tool '${toolName}' is not implemented yet.` };
  }

  if (!params) {
    return { result: `No valid parameters were found for ${tool?.displayName}.` };
  }

  try {
    const toolResult = await tool.execute(params, context);
    return {
      result: `${toolResultPrefix}\n${toolResult.result}\n${toolResultSuffix}`,
      transcriptReplacementID: toolResult.transcriptReplacementID,
      transcriptReplacementString: `${toolResultPrefix}\n${toolResult.transcriptReplacementString}\n${toolResultSuffix}`
    };
  } catch (error: unknown) {
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = `Error executing ${tool?.displayName} tool: ${error.message}`;
    } else {
      errorMessage = `Error executing ${tool?.displayName} tool.`;
    }
    return {
      result: `${toolResultPrefix}\n${errorMessage}\n${toolResultSuffix}`,
    };
  }
}

// --- Core Document Tools ---
registerTool(fileReaderTool);
registerTool(smartFileEditorTool);
registerTool(fileSearchTool);
registerTool(revertFileTool);
registerTool(moveFolderTool);
registerTool(researchLogTool);
registerTool(LintTool);
registerTool(regexValidatorTool);
registerTool(restartProjectTool);

// --- Forensic Analysis Tools ---
registerTool(statAuditTool);           // STATAUDIT  - Statistical Reconstruction
registerTool(safetyScanTool);          // SAFETYSCAN - Result Anomaly Detector
registerTool(reconcileTool);           // RECONCILE  - Dataset Integrity
registerTool(monteCarloTool);          // MONTECARLO - Fabrication Plausibility Simulator
registerTool(forensicScriptTool);      // RUNFORENSIC - Forensic Script Executor
registerTool(paradoxAuditTool);        // PARADOXAUDIT - Contradiction Resolution
registerTool(registryFactFinderTool);  // FACTFINDER - Preregistration & Provenance
registerTool(registryLookupTool);      // URL/FETCH  - Registry & Retraction Fetcher
registerTool(biasAuditTool);           // BIASAUDIT  - Overseer Bias Auditor
registerTool(screencaptureTool);       // SCREENCAPTURE - Figure Integrity Tool

