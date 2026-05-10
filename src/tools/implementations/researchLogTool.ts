

import { logFilename } from "../../config/config.js";
import { MultiAgentToolContext, MultiAgentToolResult, ToolParsingResult } from "../../novum_core/types.js";
import { MultiAgentTool } from "../multiAgentTool.js";


export const researchLogTool: MultiAgentTool = {
  displayName: "Research Logger",
  name: 'UPDATE_RESEARCH_LOG',

  async execute(params: Record<string, string>, context: MultiAgentToolContext): Promise<MultiAgentToolResult> {
    
    const entry = params.entry;

    if (!entry) {
      return { result: "Error: No log entry provided." };
    }

    let trimmed = entry.trim();

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        
        trimmed = trimmed.slice(1, -1).trim();
    }

    
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'UTC' });
    const formattedEntry = `## [${timestamp} UTC]\n${trimmed}\n\n----\n\n`;

    
    const existingContent = context.fileMap.get(logFilename) ?? "";
    const updatedContent = (formattedEntry + existingContent).trim();

    
    context.fileMap.set(logFilename, updatedContent);
    context.editedFilesSet.add(logFilename);

    
    if (context.saveFiles) {
      context.sendMessage(JSON.stringify({
        status: 'APPLY_FILE_CHANGE',
        data: {
          filename: logFilename,
          content: Buffer.from(updatedContent).toString('base64'),
        }
      }));
    }

    const successMsg = `Appended Research Log entry to \`${logFilename}\`\n\`\`\`\`\n${trimmed}\n\`\`\`\``;
    
    
    context.sendMessage(JSON.stringify({
      status: 'WORK_LOG',
      message: successMsg,
    }));

    context.sendMessage(JSON.stringify({
        status: "PROGRESS_UPDATES",
        completed_status_message: successMsg,
      })
    );

    return { result: successMsg };
  },

  async extractParameters(invocation: string, _context: MultiAgentToolContext): Promise<ToolParsingResult> {
    const entry = invocation.trim();
    if (entry) {
      return { success: true, params: { entry } };
    }
    return { success: false, error: "Log entry cannot be empty." };
  }
};

