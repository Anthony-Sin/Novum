

import { MultiAgentToolContext } from '../novum_core/types.js';
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
  
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


export async function parseToolRequest(text: string, toolPrefix: string, context: MultiAgentToolContext): Promise<MultiAgentToolRequest | string | undefined> {
  const toolNames = getToolNames();

  if (!toolNames || toolNames.length === 0) {
    return undefined;
  }

  
  
  
  
  
  const escapedPrefix = escapeRegExp(toolPrefix);
  const toolNamesPattern = toolNames.map(escapeRegExp).join('|');
  const regex = new RegExp(`^${escapedPrefix}(${toolNamesPattern})`, 'gm');

  
  
  const matches = [...text.matchAll(regex)];

  
  if (matches.length === 0) {
    return undefined;
  }

  
  const firstMatch = matches[0];
  const toolName = firstMatch[1]; 

  
  const startIndex = (firstMatch.index ?? 0) + firstMatch[0].length;
  
  
  
  
  const endIndex = matches.length > 1 ? matches[1].index : text.length;

  
  const invocationString = text.substring(startIndex, endIndex).trim();

  
  const foundTool = getTool(toolName);
  if (!foundTool) {
    return undefined; 
  }
  const toolParsingResult = await foundTool.extractParameters(invocationString, context);

  if (toolParsingResult.success) {
    
    
    return { toolName, params: toolParsingResult.params };
  }  else
    return toolParsingResult.error
}

