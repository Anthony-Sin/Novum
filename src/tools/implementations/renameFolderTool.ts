

import { MultiAgentToolContext, MultiAgentToolResult, ToolParsingResult } from "../../novum_core/types.js";
import { addDynamicallyRelevantDocument, getPaperAnalysis, removePaperEntry, updatePaperEntry } from "../../utils/paperAnalysis.js";
import { MultiAgentTool } from "../multiAgentTool.js";


export const moveFolderTool: MultiAgentTool = {
  displayName: "Move File or Folder",
  name: 'MOVE_FILE_OR_FOLDER{SOURCE: ',
  endToken: '}',

  
  async execute(params: Record<string, string>, context: MultiAgentToolContext): Promise<MultiAgentToolResult> {
    const source = params.source;
    const destination = params.destination; 

    addDynamicallyRelevantDocument(source);
    addDynamicallyRelevantDocument(destination);

    let sourceExists = false;
    const allFileKeys = [...context.fileMap.keys(), ...context.binaryFileMap.keys()];

    
    if (context.fileMap.has(source) || context.binaryFileMap.has(source)) {
      sourceExists = true;
    } else {
      
      const normalizedSourcePrefix = source.endsWith('/') ? source : source + '/';
      for (const key of allFileKeys) {
        if (key.startsWith(normalizedSourcePrefix)) {
          sourceExists = true;
          break;
        }
      }
    }

    if (!sourceExists) {
      const errorMessage = `No file or folder '${source}' exists, so it can't be moved or renamed. Please check the file or folder name carefully before retrying.`;
      return { result: errorMessage };
    }

    let resultString;
    
    if (context.fileMap.has(source) || context.binaryFileMap.has(source)) {
      
      if (context.fileMap.has(destination) || context.binaryFileMap.has(destination)) {
        return { result: `Couldn't rename ${source} because '${destination}' already exists.` };
      }

      const normalizedDestPrefix = destination.endsWith('/') ? destination : destination + '/';
      for (const key of allFileKeys) {
        if (key.startsWith(normalizedDestPrefix)) {
          return { result: `Invalid destination -- a folder named '${destination}' already exists.` };
        }
      }

      await updateFileInMetadata(source, destination, context);
      resultString = `Renamed file '${source}' to '${destination}'`;
    } else {
      
      if (destination.startsWith(source + '/')) {
        return { result: `Error: Cannot move a directory ('${source}') into a subdirectory of itself.` };
      }

      
      if (context.fileMap.has(destination) || context.binaryFileMap.has(destination)) {
        return { result: `Invalid destination folder name -- a file already exists with that name.` };
      }
      for (const filePath of allFileKeys) {
        if (filePath.startsWith(destination + '/')) {
          return { result: `Folder move failed. The directory '${destination}' already exists and is not empty. The destination directory must not exist or be empty.` };
        }
      }
      
      const eachMove = new Set<{ sourceFilePath: string, destinationFilePath: string }>();
      const normalizedSourcePrefix = source.endsWith('/') ? source : source + '/';
      
      for (const sourceFilePath of allFileKeys) {
        if (sourceFilePath.startsWith(normalizedSourcePrefix)) {
          const destinationFilePath = sourceFilePath.replace(source, destination);
          eachMove.add({ sourceFilePath, destinationFilePath });
        }
      }

      if (eachMove.size === 0) {
        return { result: `Source '${source}' appears to be an empty or non-existent folder. No files were moved.` };
      }

      resultString = `Renamed directory '${source}' to '${destination}':`;
      for (const { sourceFilePath, destinationFilePath } of eachMove) {
        await updateFileInMetadata(sourceFilePath, destinationFilePath, context);
        resultString += `\n* Moved ${sourceFilePath} to ${destinationFilePath}`;
      }
    }

    return { result: resultString };
  },

  
  async extractParameters(invocation: string, _context: MultiAgentToolContext): Promise<ToolParsingResult> {
    const pattern = /^(.*?)\s*DESTINATION:\s*(.*)/;
    const match = invocation.match(pattern);

    if (match && match[1] && match[2]) {
        const source = match[1].trim();
        const destination = match[2].trim().replace(/}$/, '').trim();

        if (source && destination) {
            return {
                success: true,
                params: { source, destination }
            };
        }
    }

    return {
        success: false,
        error: `Invalid syntax for the ${this.displayName} Tool. Expected format: MOVE_FILE_OR_FOLDER{SOURCE: <source_path> DESTINATION: <destination_path>}`
    };
  }
};

async function updateFileInMetadata(source: string, destination: string, context: MultiAgentToolContext) {
  context.editedFilesSet.add(source);
  context.editedFilesSet.add(destination);

  if (context.binaryFileMap.has(source)) {
    const sourceContent = context.binaryFileMap.get(source);
    context.binaryFileMap.set(destination, sourceContent ?? '');
    context.binaryFileMap.delete(source);
  } else {
    const sourceContent = context.fileMap.get(source);
    const sourceAnalysis = getPaperAnalysis(source);
    if (sourceAnalysis) {
      sourceAnalysis.filename = destination;
      sourceAnalysis.relatedFiles = '';
      sourceAnalysis.description = `[Moved from ${source} to ${destination}] ${sourceAnalysis.description}`;
    }

    context.fileMap.set(destination, sourceContent ?? '');
    await updatePaperEntry(destination, context.fileMap, undefined, sourceAnalysis);

    context.fileMap.delete(source);
    removePaperEntry(source);
  }
}

