

import { MultiAgentTool } from '../multiAgentTool.js';
import { MultiAgentToolContext, MultiAgentToolResult, ToolParsingResult } from '../../momoa_core/types.js';
import { getAssetString } from '../../services/promptManager.js';
import * as path from 'node:path';
import { Buffer } from 'node:buffer';
import { addDynamicallyRelevantFile, updateFileEntry } from '../../utils/fileAnalysis.js';

const LARGE_FILE_LIMIT_KB = 100;
const cache = new Map<string, MultiAgentToolResult>();

export const registryLookupTool: MultiAgentTool = {
  displayName: "Registry & Retraction Fetcher",
  name: 'URL/FETCH{',
  endToken: '}',

  async execute(params: Record<string, string>, context: MultiAgentToolContext): Promise<MultiAgentToolResult> {
    const providedUrl = params.url;

    if (!providedUrl) {
      return { result: `Error: No URL provided for the Registry & Retraction Fetcher.` };
    }

    const url = providedUrl.trim();

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return { result: `Error: Invalid URL. Must start with 'http://' or 'https://'.` };
    }

    if (cache.has(url)) {
      context.sendMessage(JSON.stringify({
        status: "PROGRESS_UPDATES",
        completed_status_message: `Using cached content from \`${url}\``,
      }));
      return cache.get(url)!;
    }

    context.sendMessage(JSON.stringify({
      status: "PROGRESS_UPDATES",
      completed_status_message: `Fetching from \`${url}\` (ClinicalTrials.gov / OSF / PubPeer / Retraction Watch / CrossRef)`,
    }));

    try {
      const response = await fetch(url);

      if (!response.ok) {
        return {
          result: `Error: Failed to fetch '${url}'. Server responded with HTTP ${response.status} (${response.statusText})`
        };
      }

      let filename = '';
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
      if (!filename) {
        try {
          const urlObj = new URL(url);
          filename = path.basename(urlObj.pathname);
        } catch (_) {}
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = (response.headers.get('content-type') || '').toLowerCase();

      const isText = contentType.includes('text/') ||
                     contentType.includes('json') ||
                     contentType.includes('xml') ||
                     contentType.includes('javascript');
      const isHtml = contentType.includes('text/html');
      const isLarge = buffer.length > LARGE_FILE_LIMIT_KB * 1024;
      const shouldSaveAsFile = (filename && !isHtml) || !isText || isLarge;

      if (shouldSaveAsFile && filename) {
        const analysisDescription = `[Registry/Retraction Record] Fetched from ${url}`;

        if (isText && !isLarge) {
          const content = buffer.toString('utf-8');
          if (context.binaryFileMap.has(filename)) context.binaryFileMap.delete(filename);
          context.fileMap.set(filename, content);
          context.editedFilesSet.add(filename);
          addDynamicallyRelevantFile(filename);
          await updateFileEntry(filename, context.fileMap, undefined, {
            filename, description: analysisDescription, relatedFiles: ''
          });
          return {
            result: `Successfully fetched registry record '${filename}' (${buffer.length} bytes).\n\n--- Content ---\n${content}`,
            transcriptReplacementID: url,
            transcriptReplacementString: `--- Fetched registry record '${filename}' ---`
          };
        }

        const base64Content = buffer.toString('base64');
        if (context.fileMap.has(filename)) context.fileMap.delete(filename);
        context.binaryFileMap.set(filename, base64Content);
        context.editedFilesSet.add(filename);
        addDynamicallyRelevantFile(filename);
        await updateFileEntry(filename, context.fileMap, undefined, {
          filename,
          description: isText ? `${analysisDescription} (Large)` : `${analysisDescription} (Binary)`,
          relatedFiles: ''
        });

        if (isText) {
          const snippet = buffer.subarray(0, LARGE_FILE_LIMIT_KB * 1000).toString('utf-8');
          return {
            result: `Fetched '${filename}' (${buffer.length} bytes). First ${LARGE_FILE_LIMIT_KB}KB:\n\n${snippet}\n\n... (full file saved to project context)`,
            transcriptReplacementID: url,
            transcriptReplacementString: `--- Fetched large registry document '${filename}' ---`
          };
        }

        return {
          result: `Fetched binary file '${filename}' (${buffer.length} bytes) — saved to project context.`,
          transcriptReplacementID: url,
          transcriptReplacementString: `--- Fetched binary file '${filename}' ---`
        };
      }

      const prefix = await getAssetString('url-content-prefix');
      const suffix = await getAssetString('url-content-suffix');
      const replacementString = await getAssetString('url-content-removed');
      const content = buffer.toString('utf-8');

      context.sendMessage(JSON.stringify({
        status: "PROGRESS_UPDATES",
        completed_status_message: `\`\`\`\n${content.slice(0, 500)}\n...\n\`\`\``,
      }));

      const toolResult: MultiAgentToolResult = {
        result: `${prefix}\n${content}\n${suffix}`,
        transcriptReplacementID: url,
        transcriptReplacementString: `${prefix}\n${replacementString}\n${suffix}`
      };

      cache.set(url, toolResult);
      return toolResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { result: `Error: Network failure fetching '${url}'. Details: ${errorMessage}` };
    }
  },

  async extractParameters(invocation: string, _context: MultiAgentToolContext): Promise<ToolParsingResult> {
    if (invocation.trim().endsWith("}")) {
      const url = invocation.trim().slice(0, -1).trim();
      return { success: true, params: { url } };
    }
    return {
      success: false,
      error: `Invalid syntax for the Registry & Retraction Fetcher. Use: URL/FETCH{https://...}`
    };
  }
};

export function getFormattedCacheContents(): string {
  const entries: string[] = [];
  for (const [url, toolResult] of cache.entries()) {
    entries.push(`URL: ${url}\nContent:\n\`\`\`\n${toolResult.result}\n\`\`\``);
  }
  return entries.join('\n----\n');
}

