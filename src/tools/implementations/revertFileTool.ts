

import { MultiAgentTool } from '../multiAgentTool.js';
import { MultiAgentToolContext, MultiAgentToolResult, ToolParsingResult } from '../../novum_core/types.js';
import { paperLookup } from '../../utils/paperLookup.js';
import { generatePaperDiffReport, isLockFile, getLockFileHiddenPlaceholder } from '../../utils/paperVersionDiff.js';
import { getAssetString } from '../../services/promptManager.js';
import { updateFileEntry } from '../../utils/paperAnalysis.js';


export async function updateDiffInAllTranscripts(context: MultiAgentToolContext) {
  const docId = PROJECT_DIFF_ID;

  if (!docId || !context.transcriptsToUpdate) {
    return;
  }

  const newDiffBlock = generatePaperDiffReport(context, true);

  context.transcriptsToUpdate.forEach(transcript => {
    transcript.replaceEntry(docId, newDiffBlock);
  });
  
  console.log(`Updated diff block '${docId}' in all registered transcripts.`);
}

export const PROJECT_DIFF_ID = "PROJECT_DIFF_ID";

export const revertFileTool: MultiAgentTool = {
  displayName: "Revert File",
  name: 'DOC/REVERT{',
  endToken: '}',

  async execute(params: Record<string, string>, context: MultiAgentToolContext): Promise<MultiAgentToolResult> {
    const providedFilename = params.filename;
    if (!providedFilename) {
      return { result: "Error: 'filename' parameter is missing." };
    }
    
    if (!context.originalFileMap || !context.originalBinaryFileMap) {
      return { result: "Error: Orchestrator did not provide original file maps to context." };
    }

    
    const allFilesMap = new Map<string, string>([
      ...context.fileMap,
      ...Array.from(context.binaryFileMap.keys()).map(key => [key, ''] as [string, string])
    ]);
    const filename = await paperLookup(providedFilename, allFilesMap, context.multiAgentGeminiClient);

    const originalExisted = context.originalFileMap.has(filename) || context.originalBinaryFileMap.has(filename);
    const currentExisted = context.fileMap.has(filename) || context.binaryFileMap.has(filename);
    
    let revertMessage = `---Error: Could not revert '${filename}'. It was not found in the current project state.---`;
    let revertSucceeded = false;
    let finalContent: string | null | undefined = undefined;
    let isBinary = false;

    
    if (context.originalFileMap.has(filename)) {
      const originalContent = context.originalFileMap.get(filename)!;
      context.fileMap.set(filename, originalContent);
      context.binaryFileMap.delete(filename); 
      
      revertMessage = `---File '${filename}' has been successfully reverted to its original state.---`;
      revertSucceeded = true;
      finalContent = originalContent;
      isBinary = false;
    }
    
    else if (context.originalBinaryFileMap.has(filename)) {
      const originalContent = context.originalBinaryFileMap.get(filename)!;
      context.binaryFileMap.set(filename, originalContent);
      context.fileMap.delete(filename); 
      
      revertMessage = `---File '${filename}' has been successfully reverted to its original state.---`;
      revertSucceeded = true;
      finalContent = null;
      isBinary = true;
    }
    
    else if (!originalExisted && currentExisted) {
      context.fileMap.delete(filename);
      context.binaryFileMap.delete(filename);
      
      revertMessage = `---File '${filename}' was created during this run and has been successfully deleted (reverted).---`;
      revertSucceeded = true;
      finalContent = undefined; 
      isBinary = false;
    }
    
    else if (!originalExisted && !currentExisted) {
      revertMessage = `---Error: Could not revert '${filename}'. It was not found in the current project or the original project state.---`;
    }

    
    if (revertSucceeded) {
      context.sendMessage(JSON.stringify({
          status: "PROGRESS_UPDATES",
          completed_status_message: `Undoing changes to \`${filename}\`, and reverting it to its original content.`,
      }));

      
      
      if (finalContent !== undefined) { 
        try {
          if (!context.binaryFileMap.has(filename)) {
            await updateFileEntry(filename, context.fileMap, context.multiAgentGeminiClient);
          } else {
            await updateFileEntry(filename, context.fileMap, undefined, 
              { 
                filename: filename,
                description: "[Binary File]"
              }, 
              true);
          }
        } catch (e: any) {
          console.warn(`Failed to re-analyze reverted file ${filename}: ${e.message}`);
        }
      }

      
      
      context.transcriptsToUpdate?.forEach(transcript => {
        transcript.supersedeEntry(filename);
      });
      
      
      context.editedFilesSet.delete(filename);
    }

    
    await updateDiffInAllTranscripts(context);

    
    const prefix = await getAssetString('file-content-prefix');
    const suffix = await getAssetString('file-content-suffix');
    const replacementString = await getAssetString('file-content-removed');
    
    if (!revertSucceeded) {
      
      
      return {
        result: revertMessage,
        transcriptReplacementID: filename,
        transcriptReplacementString: `${prefix}\n${replacementString}\n${suffix}`
      };
    }

    
    let finalResultString = revertMessage;
    if (finalContent !== undefined) { 
      if (isBinary) {
        finalResultString += `\nFile '${filename}' is a binary file.`;
      } else if (isLockFile(filename)) { 
        finalResultString += `\n${getLockFileHiddenPlaceholder(filename)}`;
      } else if (finalContent !== null) {
        finalResultString += `\n${prefix}\n${finalContent}\n${suffix}`;
      }
    }
    
    return {
      result: finalResultString,
      transcriptReplacementID: filename,
      transcriptReplacementString: `${prefix}\n${replacementString}\n${suffix}`
    };
  },

  async extractParameters(invocation: string, _context: MultiAgentToolContext): Promise<ToolParsingResult> {
    if (invocation.trim().endsWith("}")) {
      const filename = invocation.trim().slice(0, -1).trim();
      return {
        success: true,
        params: { filename }
      };
    } else {
      return {
        success: false,
        error: `Invalid syntax for ${this.displayName}. Expected DOC/REVERT{filename.txt}`
      };
    }
  }
};

