

import { MultiAgentTool } from '../multiAgentTool.js';
import { MultiAgentToolContext, MultiAgentToolResult, ToolParsingResult } from '../../novum_core/types.js';

export const restartProjectTool: MultiAgentTool = {
  displayName: "Restart Project",
  name: 'RESTART_PROJECT{', 
  endToken: '}',

  async execute(params: Record<string, string>, context: MultiAgentToolContext): Promise<MultiAgentToolResult> {
    const guidance = params.guidance;
    if (!guidance || guidance.trim() === '') {
      return { 
        result: "---Error: 'guidance' parameter is missing or empty. You MUST provide clear guidance for the restart.---" 
      };
    }

    if (!context.overseer) {
      return { 
        result: "---Error: Overseer is not available in this context. Cannot restart.---" 
      };
    }

    
    context.overseer?.forceRestart(
      guidance,
      "Restart triggered by Validation agent's RESTART_PROJECT tool."
    );
    
    
    
    return {
      result: `---Project restart has been successfully triggered. This Work Phase will now halt.---`
    };
  },

  async extractParameters(invocation: string, _context: MultiAgentToolContext): Promise<ToolParsingResult> {
    
    const guidance = invocation.slice(0, -1).trim(); 
    
    if (guidance) {
      return {
        success: true,
        params: { guidance }
      };
    } else {
      return {
        success: false,
        error: `Invalid syntax for ${this.displayName}. You MUST provide guidance inside the curly braces. Example: RESTART_PROJECT{The API schema is incorrect.}`
      };
    }
  }
};


