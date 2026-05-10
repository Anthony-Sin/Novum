

import * as path from 'path';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import { MultiAgentTool } from '../multiAgentTool.js';
import { MultiAgentToolResult, MultiAgentToolContext, ToolParsingResult } from '../../novum_core/types.js';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { isLockFile } from '../../utils/paperVersionDiff.js';
import { paperLookup } from '../../utils/paperLookup.js';




function getFullFilePath(sessionId: string, filename: string): string {
    
    const systemTempDir = tmpdir();
    
    
    
    const tempDir = path.join(systemTempDir, 'momoa_lint', sessionId);
    return path.join(tempDir, filename);
}


async function saveFile(sessionId: string, filename: string, fileContent: string): Promise<void> {
    const fullPath = getFullFilePath(sessionId, filename);
    const dirPath = path.dirname(fullPath);

    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(fullPath, fileContent, 'utf8');
    console.log(`File saved successfully to ${fullPath}`);
}


function detectLanguage(filename: string): string {
    
    const baseName = path.basename(filename).toLowerCase();
    if (baseName === 'pom.xml')
        return 'maven';
    else if (baseName === 'dockerfile')
        return 'docker';

    
    const lastDotIndex = filename.lastIndexOf('.');

    
    if (lastDotIndex < 1) {
        return 'unknown';
    }

    
    const extension = filename.substring(lastDotIndex).toLowerCase();

    
    switch (extension) {
        case '.py':
            return 'python';
        case '.tsx':
        case '.ts':
        case '.js':
            return 'javascript';
        case '.go':
            return 'go';
        case '.java':
            return 'java';
        case '.kt':
            return 'kotlin';
        case '.cpp':
        case '.cxx':
        case '.cc':
        case '.h':
        case '.hpp':
            return 'cpp';
        default:
            return 'unknown';
    }
}


function processExecution(command: string, args: string[], filename: string, fullFileName: string, resultPrefixString: string, successString: string, cwd?: string, env?: NodeJS.ProcessEnv): Promise<string> {
    return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';

        
        
        console.log("Execute: " + command + " " + args.join(' '));

        const cmdLineProcess = spawn(command, args, { 
          shell: false, 
          cwd: cwd, 
          env: env || process.env
        });

        
        const timeout = setTimeout(() => {
            cmdLineProcess.kill('SIGTERM');
            reject(`${resultPrefixString}Error: Process timed out after 60 seconds.`);
        }, 60000); 

        cmdLineProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        cmdLineProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        cmdLineProcess.on('error', (err) => {
            
            clearTimeout(timeout);
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
                reject(`${resultPrefixString}Error: Command "${command}" not found. Please ensure it is installed and in the system's PATH.`);
            } else {
                reject(`${resultPrefixString}Error spawning process: ${err.message}`);
            }
            console.error("Process Spawn Error");
        });

        cmdLineProcess.on('close', (_code) => {
            clearTimeout(timeout);
            let combinedOutput = stdout + stderr;

            if (_code === 0) {
                if (!combinedOutput) combinedOutput = successString;
            } else {
                if (!combinedOutput) combinedOutput = "Linter failed to execute or exited with an error code but produced no output.";
            }
            const resultPrefix = resultPrefixString;

            
            const completePath = path.resolve(fullFileName);
            combinedOutput = combinedOutput.replaceAll(completePath, filename);
            combinedOutput = combinedOutput.replaceAll(fullFileName, filename);

            
            resolve(`${resultPrefix}\n${combinedOutput}`);
        });
    });
}


export const LintTool: MultiAgentTool = {
  displayName: "Lint Tool",
  name: 'LINT{',
  endToken: '}',

  
  async execute(params: Record<string, unknown>, context: MultiAgentToolContext): Promise<MultiAgentToolResult> {
    const providedFilename = params['filename'] as string;

    if (!providedFilename) {
      return {
        result: `Error: 'filename' parameter is missing for ${this.displayName} tool.`
      };
    }

    
    const allFilesMap = new Map<string, string>([
      ...context.fileMap,
      ...Array.from(context.binaryFileMap.keys()).map(key => [key, ''] as [string, string])
    ]);

    let filename = providedFilename.trim();
    
    if (!allFilesMap.has(filename)) {
        
        const suggestion = await paperLookup(filename, allFilesMap, context.multiAgentGeminiClient);

        if (suggestion && suggestion !== filename && allFilesMap.has(suggestion)) {
            return {
                result: `File '${filename}' was not found. Did you mean '${suggestion}'?`
            };
        }

        return {
          result: `---File '${filename}' not found---`
        };
    }

    context.sendMessage(JSON.stringify({
        status: "PROGRESS_UPDATES",
        completed_status_message: `Linting \`${filename}\``,
      })
    );

    
    if (context.binaryFileMap.has(filename)) {
       return { result: "Binary files are not supported for linting." }
    }

    
    if (isLockFile(filename)) {
       return { result: "Lock files are not supported for linting." }
    }

    const fileContent = context.fileMap.get(filename);
    if (!fileContent) {
       return { result: `\`${filename}\` is empty.` }
    }

    
    
    const sessionId = context.infrastructureContext.getSessionId() || randomUUID();
    const fullFileName = getFullFilePath(sessionId, filename);

    try {
      
      await saveFile(sessionId, filename, fileContent);
      const language = detectLanguage(filename);

      
      if (language === 'cpp') {
          const targetDir = path.dirname(filename);
          
          
          for (const [candidateName, candidateContent] of context.fileMap.entries()) {
              
              if (candidateName === filename) continue;

              
              if (path.dirname(candidateName) === targetDir) {
                  const ext = path.extname(candidateName).toLowerCase();
                  if (ext === '.h' || ext === '.hpp') {
                      
                      await saveFile(sessionId, candidateName, candidateContent);
                  }
              }
          }
      }

      let linterCommand: string | null = null;
      let linterArgs: string[] = [];

      switch (language) {
        case 'python':
          linterCommand = 'python3'; 
          linterArgs = ['-m', 'flake8', fullFileName, '--config', 'linter-tool-definition-files/.flake8', '--show-source'];
        break;        
        case 'javascript':
          
          linterCommand = path.resolve('node_modules', '.bin', 'eslint');
          
          
          const configPath = path.resolve('linter-tool-definition-files', 'eslint.config.js');
          
          
          linterArgs = [
              path.basename(fullFileName), 
              '--config', configPath, 
              '--no-color', 
              '--format', 'codeframe' 
          ];
          break;
        case 'go':
          linterCommand = 'revive';
          
          
          linterArgs = ['-formatter', 'friendly', fullFileName];
          break;
        case 'java':
          linterCommand = 'java';
          
          linterArgs = ['-jar', 'linter-tool-definition-files/checkstyle-10.23.1-all.jar', fullFileName, '-c', 'linter-tool-definition-files/google_checks.xml'];
          break;
        case 'cpp':
          linterCommand = 'clang-tidy';
          
          linterArgs = [
            fullFileName, 
            '-checks=-clang-diagnostic-error', 
            '--', 
            '-std=c++17', 
            '-Iinclude', 
            '-DNDEBUG'
          ];
          break;
        case 'docker':
          linterCommand = 'hadolint'; 
          linterArgs = [fullFileName];
          break;
        case 'kotlin':
          linterCommand = 'ktlint'; 
          linterArgs = [
              '--editorconfig=linter-tool-definition-files/.editorconfig',
              fullFileName
          ];
          break;
        case 'maven':
          linterCommand = 'mvn';
          linterArgs = ['validate', '-f', fullFileName, '-B', '-q', '-U'];
          break;
        default:
          return { result: `You asked to lint ${filename} and this is the result from the Lint tool:\nUnsupported language or unknown file extension for ${filename}.` };
      }

      if (!linterCommand) {
        return { result: `You asked to lint ${filename} and this is the result from the Linter:\nInternal error: Could not determine linter command for language ${language}.` };
      }

      
      
      
      let executionCwd: string | undefined;
      let executionEnv: NodeJS.ProcessEnv = process.env;

      if (language === 'javascript') {
          executionCwd = path.dirname(fullFileName);

          const projectNodeModules = path.resolve(process.cwd(), 'node_modules');
          
          executionEnv = {
              ...process.env, 
              NODE_PATH: projectNodeModules 
          };
      }

      const noWarningsOrErrors = "No warnings or errors were found.";
      const resultPrefix = `You asked to lint ${filename} and this is the result from the Linter:`;
      
      let output = await processExecution(
        linterCommand,
        linterArgs,
        filename,
        fullFileName,
        resultPrefix,
        noWarningsOrErrors,
        executionCwd, 
        executionEnv
      );

      
      
      
      
      const warningRegex = /\(node:\d+\) \[MODULE_TYPELESS_PACKAGE_JSON\][\s\S]*?\(Use `node --trace-warnings \.\.\.` to show where the warning was created\)\s*/;

      
      output = output.replace(warningRegex, "").trim();

      
      if (output === resultPrefix || output === "") {
          
          output = resultPrefix ? `${resultPrefix}\n${noWarningsOrErrors}` : noWarningsOrErrors;
      }

      context.sendMessage(JSON.stringify({
        status: "PROGRESS_UPDATES",
        completed_status_message: output,
      }));

      return { result: output };

    } catch (error) {
      console.error(`LintTool execution failed for ${filename}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { result: `You asked to lint ${filename} and this is the result from the Linter:\nError during execution: ${errorMessage}` };    
    } finally {
        
        try {
            
            
            const sessionDir = path.dirname(fullFileName);
            
            await fs.rm(sessionDir, { recursive: true, force: true });

            const namespaceDir = path.dirname(sessionDir); 
            await fs.rmdir(namespaceDir).catch(() => {});
        } catch (cleanupError) {
            
        }
    }
  },

  
  async extractParameters(invocation: string, _context: MultiAgentToolContext): Promise<ToolParsingResult> {
    if (invocation.trim().endsWith("}")) {
      const filename = invocation.trim().slice(0, -1).trim();
      return {
        success: true, 
        params: {
          filename
        }
      };
    } else {
      return {
        success: false, 
        error: `Invalid syntax for the ${this.displayName} Tool. Make sure you include the curly brackets.`
      }
    }
  }
}

