

import { MultiAgentTool } from '../multiAgentTool.js';
import { addFAQ } from '../../utils/faqs.js';
import { MultiAgentToolContext, MultiAgentToolResult, ToolParsingResult } from '../../momoa_core/types.js';
import { DEFAULT_GEMINI_FLASH_MODEL, DEFAULT_GEMINI_LITE_MODEL, DEFAULT_GEMINI_PRO_MODEL } from '../../config/models.js';
import { removeBacktickFences } from '../../utils/markdownUtils.js';
import { getAssetString, replaceRuntimePlaceholders } from '../../services/promptManager.js';
import { TranscriptManager } from '../../services/transcriptManager.js';
import { Part } from '@google/genai';

async function fetchWebInfo(url: string, question: string, context: MultiAgentToolContext): Promise<string> {
  try {
    const response = await fetch(url, { signal: context.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rawData = await response.text();
    const data = await context.multiAgentGeminiClient.trimToTokenLimit(DEFAULT_GEMINI_FLASH_MODEL, rawData, 0.8);
    const request = `You are a research integrity fact-checker. The text below was fetched from ${url}.
Answer this question as specifically as possible: "${question}"
If the content doesn't answer the question, say so clearly. Do not speculate.
Focus on: preregistration dates, primary endpoints, protocol deviations, retraction notices, author misconduct records.

TEXT:
${data}`;
    const webSummary = (await context.multiAgentGeminiClient.sendOneShotMessage(
      request, { model: DEFAULT_GEMINI_FLASH_MODEL, signal: context.signal }
    ))?.text || '';
    return `Result from ${url}:\n${removeBacktickFences(webSummary).trim()}`;
  } catch (e) {
    return `Failed to retrieve ${url}: ${e instanceof Error ? e.message : String(e)}`;
  }
}

export const registryFactFinderTool: MultiAgentTool = {
  displayName: "Preregistration & Provenance Research Tool",
  name: 'FACTFINDER',

  async execute(params: Record<string, string>, context: MultiAgentToolContext): Promise<MultiAgentToolResult> {
    const question = params.question;
    const toolPrefix = await getAssetString('tool-prefix');

    const updateLog = async (message: string) => {
      context.sendMessage(JSON.stringify({ status: 'WORK_LOG', message }));
      context.overseer?.addLog(message);
    };

    await updateLog(`FACTFINDER invoked: ${question}`);

    let internetSearchResult = "Internet search returned no useful results.";

    try {
      context.sendMessage(JSON.stringify({
        status: "PROGRESS_UPDATES",
        completed_status_message: `Searching registries and retraction databases...`,
      }));

      const searchSystemPrompt =
`You are a research integrity provenance investigator. Your job is to find factual information
from public registries and databases to support a forensic paper audit.

PRIMARY SOURCES TO CHECK (in order of priority):
1. ClinicalTrials.gov — https://clinicaltrials.gov/api/query/full_studies?expr=NCT_NUMBER&fmt=json
2. OSF Registries — https://osf.io/registries/
3. PubPeer — https://pubpeer.com/search?q=SEARCH_TERM
4. Retraction Watch Database — https://retractionwatch.com/?s=SEARCH_TERM
5. CrossRef — https://api.crossref.org/works/DOI
6. Wikipedia for background context — https://en.wikipedia.org/w/api.php?action=query&origin=*&format=json&list=search&srsearch=SEARCHTERM
7. COPE guidelines — https://publicationethics.org/guidance

Use this tool syntax to look up URLs:
${toolPrefix}INTERNET/LOOKUP{Full URL,Question you want answered}

When you have a sufficient answer — or have determined no useful public information exists —
use ${toolPrefix}RETURN followed by your complete finding.
Only what appears AFTER ${toolPrefix}RETURN will be returned.

QUESTION TO RESEARCH:
${question}`;

      const searchChat = new TranscriptManager({ context: context.infrastructureContext });
      searchChat.addEntry('user', searchSystemPrompt);

      const lookupRegex = new RegExp(`${toolPrefix}INTERNET/LOOKUP\\{(.*?)\\}`, 's');
      const returnRegex = new RegExp(`${toolPrefix}RETURN`, 's');

      const maxTurns = 12;
      let turns = 0;
      let done = false;

      while (!done && turns < maxTurns) {
        const llmResponse = await context.multiAgentGeminiClient.sendTranscriptMessage(
          searchChat, { model: DEFAULT_GEMINI_FLASH_MODEL, signal: context.signal }
        );
        const responseText = llmResponse.text || '';
        searchChat.addEntry('model', responseText);
        await updateLog(`# FACTFINDER search turn ${turns + 1}\n${responseText}`);

        if (returnRegex.test(responseText)) {
          done = true;
          internetSearchResult = responseText.split(returnRegex)[1].trim();
        } else {
          const lookupMatch = responseText.match(lookupRegex);
          if (lookupMatch) {
            const parts = lookupMatch[1].trim().split(",", 2);
            let webResult: string;
            if (parts.length === 2) {
              webResult = await fetchWebInfo(parts[0].trim(), parts[1].trim(), context);
            } else {
              webResult = "Invalid syntax — URL and question must be separated by a comma.";
            }
            await updateLog(`Lookup result:\n${webResult}`);
            searchChat.addEntry('user', webResult);
          }
        }
        turns++;
      }
    } catch (error) {
      internetSearchResult = `Search failed: ${error instanceof Error ? error.message : String(error)}`;
    }

    context.sendMessage(JSON.stringify({
      status: "PROGRESS_UPDATES",
      completed_status_message: `Synthesizing provenance findings...`,
    }));

    const synthesisPrompt = `You are a Publication Ethics Specialist and research integrity investigator.

FORENSIC QUESTION:
${question}

SEARCH RESULTS FROM REGISTRIES AND DATABASES:
${internetSearchResult}

Synthesize the above into a structured Provenance Report. Include:
1. Preregistration status (registered / not registered / registered after data collection began)
2. Primary endpoint as registered vs. as published (flag any switching)
3. Any retraction notices, expressions of concern, or PubPeer flags found
4. Author conflict-of-interest or misconduct history
5. COPE guideline compliance assessment
6. Your confidence level (0-100%) and the primary source for your answer

Be adversarial — flag absences of required documentation as findings, not as neutral.`;

    const parts: Part[] = [];
    if (context.initialImage && context.initialImageMimeType) {
      parts.push({ inlineData: { mimeType: context.initialImageMimeType, data: context.initialImage } });
    }
    parts.push({ text: synthesisPrompt });

    let result = (await context.multiAgentGeminiClient.sendOneShotMessage(
      parts, { model: DEFAULT_GEMINI_PRO_MODEL, enableThinking: true, enableGrounding: true, signal: context.signal }
    ))?.text || "";
    result = removeBacktickFences(result).trim() || "FACTFINDER failed to produce a report.";

    const fullResult = `## FACTFINDER — Preregistration & Provenance Report\n\n${result}`;

    const summaryPrompt = await replaceRuntimePlaceholders(
      await getAssetString("summarize-progress-start"),
      { LastOrchestratorResponse: fullResult }
    );
    let summary = "";
    try {
      summary = (await context.multiAgentGeminiClient.sendOneShotMessage(
        summaryPrompt, { model: DEFAULT_GEMINI_LITE_MODEL, signal: context.signal }
      ))?.text || "";
    } catch (_) {}

    context.sendMessage(JSON.stringify({ status: "PROGRESS_UPDATES", completed_status_message: summary }));
    await addFAQ(question, result, context);
    return { result: fullResult };
  },

  async extractParameters(invocation: string, _context: MultiAgentToolContext): Promise<ToolParsingResult> {
    const question = invocation.trim();
    if (question) return { success: true, params: { question } };
    return { success: false, error: `FACTFINDER requires a research question about preregistration, provenance, or publication ethics.` };
  }
};

