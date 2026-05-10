

import { MultiAgentTool } from '../multiAgentTool.js';
import { findInDocuments } from '../../utils/paperAnalysis.js';
import { MultiAgentToolContext, MultiAgentToolResult, ToolParsingResult } from '../../novum_core/types.js';


export const fileSearchTool: MultiAgentTool = {
  displayName: "File Search",
  name: 'FILESEARCH{query: "',

  
  async execute(params: Record<string, string>, context: MultiAgentToolContext): Promise<MultiAgentToolResult> {

    const query = params.query;

    context.sendMessage(JSON.stringify({
      status: "PROGRESS_UPDATES",
      completed_status_message: `Searching for \`${query}\``,
    }));

    
    const contentMatches = findInDocuments(query, context.fileMap) || [];
    
    
    const searchResults = new Set<string>(contentMatches);

    
    const allFilenames = [...context.fileMap.keys(), ...context.binaryFileMap.keys()];
    for (const filename of allFilenames) {
        if (filename.includes(query)) {
            if (context.binaryFileMap.has(filename)) {
                searchResults.add(`Binary file found: ${filename}`);
            } else {
                
                
                searchResults.add(filename);
            }
        }
    }

    const finalResultArray = Array.from(searchResults);
    const replacementString = `---FILE SEARCH RESULTS INTENTIONALLY REMOVED---`;

    const result = finalResultArray.length > 0 ? finalResultArray.join('\n') : `No matches found for your query.`;

    context.sendMessage(JSON.stringify({
      status: "PROGRESS_UPDATES",
      completed_status_message: `\`\`\`\n${result.trim()}\n\`\`\``,
    }));

    return {
      result: result,
      transcriptReplacementID: query,
      transcriptReplacementString: replacementString
    };
  },

  
  async extractParameters(invocation: string, _context: MultiAgentToolContext): Promise<ToolParsingResult> {

    const toolCallEndMarker = '" END_QUERY}';
    const endQueryMarkerIndex = invocation.indexOf(toolCallEndMarker);

    if (endQueryMarkerIndex === -1) {
      return { 
        success: false,
        error: `Unable to search the files because you provided invalid syntax. Please pay close attention to the required syntax before trying again.`
      }
    }

    const extractedQuery = invocation.substring(0, endQueryMarkerIndex);
    if (!extractedQuery.trim()) {
      return { 
        success: false,
        error: `Unable to search the files because the provided query string was empty, which is invalid. Please pay close attention to the required syntax before trying again.`
      }
    }

    return {
      success: true,
      params: {
        query: extractedQuery.trim()
      }
    }
  }
};

