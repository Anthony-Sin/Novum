

import { DEFAULT_GEMINI_FLASH_MODEL } from '../config/models.js';
import { GeminiClient }               from '../services/geminiClient.js';
import { getAssetString, replaceRuntimePlaceholders } from '../services/promptManager.js';
import { TranscriptManager }          from '../services/transcriptManager.js';
import { removeBacktickFences, repairTruncatedJsonArray, replaceContentBetweenMarkers } from './markdownUtils.js';
import { InfrastructureContext, MultiAgentToolContext } from '../novum_core/types.js';
import { parseToolRequest }           from '../tools/multiAgentToolParser.js';
import { executeTool, getTool }       from '../tools/multiAgentToolRegistry.js';


export interface RelevantPaperFile {
  
  filename:    string;
  
  description: string;
}


function trimAfterToolCall(response: string): string {
  const toolStart = /(@[a-zA-Z0-9_]+)(\{)/.exec(response);
  if (!toolStart || toolStart.index === undefined) return response;

  const startIdx  = toolStart.index + toolStart[1].length;
  let depth       = 0;
  let inString    = false;
  let escaped     = false;

  for (let i = startIdx; i < response.length; i++) {
    const ch = response[i];
    if (escaped)          { escaped = false; continue; }
    if (ch === '\\')      { escaped = true;  continue; }
    if (ch === '"')       { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return response.substring(0, i + 1);
    }
  }

  return response;
}


export async function analyzeRelevantDocumentsForInvestigation(
  investigationDescription: string,
  assumptions:   string,
  fileMap:       Map<string, string>,
  binaryFileMap: Map<string, string>,
  infrastructureContext: InfrastructureContext,
  geminiClient:  GeminiClient,
  sendMessage:   (msg: string) => void,
  image?:        string,
  imageMimeType?: string
): Promise<RelevantPaperFile[]> {

  const log = async (message: string, progress = false) => {
    sendMessage(JSON.stringify({ status: 'WORK_LOG', message }));
    if (progress) sendMessage(JSON.stringify({ status: 'PROGRESS_UPDATES', completed_status_message: message }));
  };

  const transcript = new TranscriptManager({ context: infrastructureContext });
  const basePrompt = await getAssetString('paper-document-analyzer');
  const corpusList = [...fileMap.keys(), ...binaryFileMap.keys()].join('\n');

  const initialPrompt = await replaceRuntimePlaceholders(basePrompt, {
    InvestigationDescription: investigationDescription,
    Assumptions:  assumptions,
    CorpusSummary: corpusList || '--No documents loaded--',
  });

  if (image && imageMimeType)
    transcript.addImage(initialPrompt, image, imageMimeType);
  else
    transcript.addEntry('user', initialPrompt);

  await log('Identifying documents relevant to this investigation.', true);

  const toolContext: MultiAgentToolContext = {
    fileMap,
    binaryFileMap,
    editedFilesSet:       new Set<string>(),
    originalFilesSet:     new Set<string>([...fileMap.keys(), ...binaryFileMap.keys()]),
    originalFileMap:      new Map(fileMap),
    originalBinaryFileMap: new Map(binaryFileMap),
    sendMessage,
    experts:              [],
    overseer:             undefined,
    transcriptsToUpdate:  [transcript],
    transcriptForContext: transcript,
    multiAgentGeminiClient: geminiClient,
    saveFileResolver:     null,
    infrastructureContext,
    initialPrompt:        investigationDescription,
    saveFiles:            false,
    secrets:              {} as any,
    signal:            undefined,
    projectDeadlineMs: undefined,
    gracePeriodMs:     undefined,
  };

  const toolPrefix        = await getAssetString('tool-prefix');
  const FINISH_PREFIX     = `${toolPrefix}TOOL_CALL:`;
  const FINISH_REGEX      = new RegExp(`${FINISH_PREFIX}FINISH[\\{\\[](.*)[\\}\\]]`, 'sm');
  const fileContentPrefix = await getAssetString('file-content-prefix');
  const fileContentSuffix = await getAssetString('file-content-suffix');
  const urlContentPrefix  = await getAssetString('url-content-prefix');
  const urlContentSuffix  = await getAssetString('url-content-suffix');
  const REDACTED          = '---CONTENT INTENTIONALLY REMOVED---';

  const maxTurns = 30;
  let turns      = 0;
  let done       = false;

  await log('## Paper Document Analyzer\n');

  while (!done) {
    turns++;

    if (turns > maxTurns) {
      transcript.addEntry('user',
        `You have exhausted your turn limit. You MUST call ${toolPrefix}TOOL_CALL:FINISH now ` +
        `with a valid JSON array of relevant documents, even if incomplete.`
      );
    } else if (turns > maxTurns + 2) {
      done = true;
      continue;
    }

    const llmMsg      = await geminiClient.sendTranscriptMessage(transcript, { model: DEFAULT_GEMINI_FLASH_MODEL });
    let rawResponse   = llmMsg.text ?? '';

    rawResponse = await transcript.cleanLLMResponse(rawResponse);
    rawResponse = trimAfterToolCall(rawResponse);
    await log(`${rawResponse}\n`);

    
    const finishMatch = rawResponse.match(FINISH_REGEX);
    if (finishMatch) {
      try {
        let json     = removeBacktickFences(finishMatch[1].trim());
        json         = repairTruncatedJsonArray(json) ?? '';
        let relevant = JSON.parse(json) as RelevantPaperFile[];

        const before = relevant.length;
        relevant     = relevant.filter(f => fileMap.has(f.filename) || binaryFileMap.has(f.filename));
        if (relevant.length < before)
          await log(`(Filtered ${before - relevant.length} documents not found in corpus.)`);

        await log('#### Investigation-relevant documents identified', true);
        await log(relevant.map(r => `\`${r.filename}\`\n\n${r.description}`).join('\n\n'), true);
        return relevant;
      } catch (e: any) {
        const errMsg = `TOOL_RESPONSE: Error parsing JSON — ${e.message}. Please provide the full, correct JSON array again.`;
        transcript.addEntry('user', errMsg);
        await log(`Document Analyzer Error: ${errMsg}`);
        continue;
      }
    }

    
    const toolRequest = await parseToolRequest(rawResponse, toolPrefix, toolContext);
    if (typeof toolRequest === 'string') {
      const errMsg = `Tool Parsing Error: ${toolRequest}`;
      transcript.addEntry('user', errMsg);
      await log(errMsg);
      continue;
    }

    if (toolRequest?.toolName) {
      const tool = getTool(toolRequest.toolName);
      await log(`'${tool?.displayName ?? toolRequest.toolName}' invoked`);

      try {
        const toolResult = await executeTool(toolRequest.toolName, toolRequest.params, toolContext);
        transcript.addEntry('user', toolResult.result, {
          documentId:              toolResult.transcriptReplacementID,
          replacementIfSuperseded: toolResult.transcriptReplacementString,
        });

        let logStr = toolResult.result;
        logStr = replaceContentBetweenMarkers(logStr, fileContentPrefix, fileContentSuffix, REDACTED);
        logStr = replaceContentBetweenMarkers(logStr, urlContentPrefix,  urlContentSuffix,  REDACTED);
        await log(`Tool Result:\n${logStr}`);
      } catch (err: any) {
        const errMsg = `Tool execution failed: ${err.message}`;
        transcript.addEntry('user', errMsg);
        await log(`Tool Error:\n${errMsg}`);
      }
    }
  }

  console.warn('Paper Document Analyzer reached max turns without a FINISH call.');
  await log('Reached max turns without finishing.');
  return [];
}

