

import { MultiAgentToolContext } from '../momoa_core/types.js';
import { getTool, getToolNames } from './multiAgentToolRegistry.js';


export interface MultiAgentToolRequest {
  toolName: string | undefined;
  params: Record<string, unknown> | undefined; 
}


export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}


function escapeRegExp(str: string): string {
  // $& means the whole matched string
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


export async function parseToolRequest(text: string, toolPrefix: string, context: MultiAgentToolContext): Promise<MultiAgentToolRequest | string | undefined> {
  const toolNames = getToolNames();

  if (!toolNames || toolNames.length === 0) {
    return undefined;
  }

  // 1. Create a dynamic regular expression to find all tool invocations.
  // This regex will find any line that starts with the toolPrefix, followed by one of the valid toolNames.
  // - `^`: Asserts position at the start of a line (due to the 'm' flag).
  // - `(${toolNames.join('|')})`: Captures the matched toolName.
  // - 'gm': Global flag (find all matches) and Multiline flag (`^` matches start of line).
  const escapedPrefix = escapeRegExp(toolPrefix);
  const toolNamesPattern = toolNames.map(escapeRegExp).join('|');
  const regex = new RegExp(`^${escapedPrefix}(${toolNamesPattern})`, 'gm');

  // 2. Find all matches using `matchAll`.
  // This gives us an iterator of all results, which we convert to an array.
  const matches = [...text.matchAll(regex)];

  // 3. If no matches are found, no tool was invoked.
  if (matches.length === 0) {
    return undefined;
  }

  // 4. The first match contains our target tool and its starting position.
  const firstMatch = matches[0];
  const toolName = firstMatch[1]; // The first captured group is the tool name itself.

  // The invocation string begins immediately after the entire matched prefix and name (e.g., after "@search").
  const startIndex = (firstMatch.index ?? 0) + firstMatch[0].length;
  
  // 5. Determine the end of the invocation string.
  // If there's a second match, the string ends right before it.
  // Otherwise, the string continues to the end of the text.
  const endIndex = matches.length > 1 ? matches[1].index : text.length;

  // 6. Extract and trim the final invocation string.
  const invocationString = text.substring(startIndex, endIndex).trim();

  // 7. Use the rest of your logic to get the tool and extract its parameters.
  const foundTool = getTool(toolName);
  if (!foundTool) {
    return undefined; // Safeguard in case tool name is not in the registry
  }
  const toolParsingResult = await foundTool.extractParameters(invocationString, context);

  if (toolParsingResult.success) {
    // CHANGE 2: Pass params directly without stringifying them.
    // This ensures arrays remain arrays (e.g. ['a.py', 'b.py']) instead of becoming "['a.py', 'b.py']"
    return { toolName, params: toolParsingResult.params };
  }  else
    return toolParsingResult.error
}
