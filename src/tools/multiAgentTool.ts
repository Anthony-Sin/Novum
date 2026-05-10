

import { MultiAgentToolContext, MultiAgentToolResult, ToolParsingResult } from "../momoa_core/types";

export interface MultiAgentTool {
  
  readonly displayName: string;
  
  readonly name: string;

  
  readonly endToken?: string;

  
  execute(params: Record<string, unknown>, context: MultiAgentToolContext): Promise<MultiAgentToolResult>;

  extractParameters(invocation: string, context: MultiAgentToolContext): Promise<ToolParsingResult>;
}

