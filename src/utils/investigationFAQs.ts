

import { DEFAULT_GEMINI_FLASH_MODEL } from '../config/models.js';
import { ResearchFinding, MultiAgentToolContext } from '../novum_core/types.js';
import { getAssetString, getToolPreamblePrompt, replaceRuntimePlaceholders } from '../services/promptManager.js';
import { TranscriptManager } from '../services/transcriptManager.js';
import { getPaperDescriptions } from './paperAnalysis.js';


const findings = new Map<string, ResearchFinding>();


export async function addFinding(
  question: string,
  answer:   string,
  toolContext: MultiAgentToolContext
): Promise<void> {
  const client = toolContext.multiAgentGeminiClient;

  const summariserPrompt =
    `I am running a scientific integrity investigation using an AI agent. ` +
    `To help the agent, I maintain a list of questions it has asked and expert answers. ` +
    `Please rewrite this question as a short (1-3 sentence) concise alternative.\n\n` +
    `**Question:**\n${question}\n\n**Expert Answer:**\n${answer}`;

  try {
    const summarised = (await client.sendOneShotMessage(summariserPrompt, { model: DEFAULT_GEMINI_FLASH_MODEL }))?.text ?? '';
    findings.set(question, { question: summarised, answer, flaggedAt: new Date() });
    await refreshFindings(toolContext);
  } catch {  }
}

async function refreshFindings(toolContext: MultiAgentToolContext): Promise<void> {
  const client     = toolContext.multiAgentGeminiClient;
  const toolPrefix = await getAssetString('tool-prefix');
  const basePrompt = await getToolPreamblePrompt('finding-updater');

  const eachPrompt = await replaceRuntimePlaceholders(basePrompt, {
    CurrentPapers:   getPaperDescriptions() ?? '--No papers loaded--',
    CurrentFindings: getFindings(),
  });

  const deleteRegex = new RegExp(`^${toolPrefix}DELETEFINDING\\{(.*?)\\}ENDDELETE$`, 's');
  const updateRegex = new RegExp(`^${toolPrefix}UPDATEFINDING\\{(.*?)\\}\\nNEWANSWER\\{(.*?)\\}\\nENDUPDATE$`, 's');
  const returnRegex = new RegExp(`^${toolPrefix}RETURN$`);

  const transcript = new TranscriptManager({ context: toolContext.infrastructureContext });
  transcript.addEntry('user', eachPrompt, { documentId: 'BASE_PROMPT', replacementIfSuperseded: eachPrompt });

  const maxTurns = findings.size + 2;
  let turn = 0;

  while (turn < maxTurns) {
    turn++;

    const refreshed = await replaceRuntimePlaceholders(basePrompt, {
      CurrentPapers:   getPaperDescriptions() ?? '--No papers loaded--',
      CurrentFindings: getFindings(),
    });
    transcript.replaceEntry('BASE_PROMPT', refreshed);

    const llmMsg   = await client.sendTranscriptMessage(transcript, { model: DEFAULT_GEMINI_FLASH_MODEL, enableThinking: true });
    const response = llmMsg.text ?? '';

    if (returnRegex.test(response)) return;

    const updateMatch = response.match(updateRegex);
    if (updateMatch) {
      const q = updateMatch[1].trim();
      const a = updateMatch[2].trim();
      if (findings.has(q)) {
        const f = findings.get(q)!;
        f.answer    = a;
        f.flaggedAt = new Date();
      }
      continue;
    }

    const deleteMatch = response.match(deleteRegex);
    if (deleteMatch) {
      findings.delete(deleteMatch[1].trim());
      continue;
    }
  }
}


export function getFindings(): string {
  if (findings.size === 0) return '--No findings have been recorded--';

  const sorted = Array.from(findings.values()).sort((a, b) => a.flaggedAt.getTime() - b.flaggedAt.getTime());

  return sorted.map(f => {
    const ts = f.flaggedAt.toLocaleString();
    return `Question:\n${f.question}\nFlagged:\n${ts}\nAnswer:\n${f.answer}\n----`;
  }).join('\n\n');
}

