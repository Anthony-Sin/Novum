

import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { spawn } from 'child_process';
import { MultiAgentTool } from '../multiAgentTool.js';
import { MultiAgentToolResult, MultiAgentToolContext, ToolParsingResult } from '../../novum_core/types.js';
import { addDynamicallyRelevantDocument, updatePaperEntry } from '../../utils/paperAnalysis.js';
import { logFilename, MAX_MEM_PERCENTAGE, MAX_SCRIPT_EXECUTION_TIMEOUT } from '../../config/config.js';

const LARGE_FILE_LIMIT_KB = 100;
const MAX_CONTEXT_FILE_SIZE_BYTES = 100 * 1024 * 1024;
const EXECUTION_TIMEOUT_MS = MAX_SCRIPT_EXECUTION_TIMEOUT;

const runScript = (cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv, timeoutMs: number) => {
  return new Promise<{ stdout: string; stderr: string; timedOut: boolean; exitCode: number | null }>((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, env });
    let stdout = '', stderr = '';
    let timedOut = false;
    const MAX_LOG_SIZE = LARGE_FILE_LIMIT_KB * 2 * 1024;
    const appendLog = (cur: string, n: string) => {
      const c = cur + n;
      return c.length > MAX_LOG_SIZE ? `[Output truncated]\n${c.slice(-MAX_LOG_SIZE)}` : c;
    };
    child.stdout.on('data', (d) => { stdout = appendLog(stdout, d.toString()); });
    child.stderr.on('data', (d) => { stderr = appendLog(stderr, d.toString()); });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => { try { child.kill('SIGKILL'); } catch (_) {} }, 2000);
    }, timeoutMs);
    child.on('close', (code) => { clearTimeout(timer); resolve({ stdout, stderr, timedOut, exitCode: code }); });
    child.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
};

export const forensicScriptTool: MultiAgentTool = {
  displayName: "Forensic Script Executor",
  name: 'RUNFORENSIC{',
  endToken: '}',

  async execute(params: Record<string, unknown>, context: MultiAgentToolContext): Promise<MultiAgentToolResult> {
    const updateProgress = (message: string) => {
      context.sendMessage(JSON.stringify({ status: 'PROGRESS_UPDATES', completed_status_message: message }));
    };

    const files = params['files'] as string[];
    if (!files || files.length === 0) {
      return { result: "Error: No forensic script files provided." };
    }

    const mainScript = files[0];
    const otherFiles = files.slice(1);
    const ext = path.extname(mainScript).toLowerCase();
    const isRust = ext === '.rs';
    const isPython = ext === '.py';

    if (!isRust && !isPython) {
      return { result: `Error: Forensic scripts must be .py or .rs (got '${ext}').` };
    }

    let tempDir = '';
    try {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'momoa-forensic-'));

      const stageFile = async (fileName: string) => {
        const content = context.fileMap.get(fileName);
        const targetPath = path.join(tempDir, fileName);
        const targetDir = path.dirname(targetPath);
        await fs.mkdir(targetDir, { recursive: true });
        if (content === undefined) {
          if (context.binaryFileMap.has(fileName)) {
            const buf = Buffer.from(context.binaryFileMap.get(fileName)!, 'base64');
            await fs.writeFile(targetPath, buf);
            return;
          }
          throw new Error(`File '${fileName}' not found in project context.`);
        }
        await fs.writeFile(targetPath, content, 'utf8');
      };

      await stageFile(mainScript);
      for (const f of otherFiles) await stageFile(f);

      const freeMemKB = Math.floor(os.freemem() / 1024);
      const memLimitKB = Math.floor(freeMemKB * MAX_MEM_PERCENTAGE);
      const memLimitMB = Math.floor(memLimitKB / 1024);

      let cmd = '', args: string[] = [];
      let executionEnv = { ...process.env };
      let compileOutput = '';

      if (isPython) {
        updateProgress(`Executing forensic Python script \`${mainScript}\` (memory cap: ${memLimitMB}MB)`);
        cmd = 'sh';
        args = ['-c', `ulimit -v ${memLimitKB} && python3 "${mainScript}"`];
        executionEnv = {
          ...process.env,
          PYTHONPATH: tempDir + path.delimiter + (process.env.PYTHONPATH || ''),
          PYTHONUNBUFFERED: '1'
        };
      } else if (isRust) {
        updateProgress(`Compiling and executing Rust forensic script \`${mainScript}\``);
        const binaryName = 'forensic_bin';
        const compileRes = await runScript(
          'sh', ['-c', `ulimit -v ${memLimitKB} && rustc ${mainScript} -o ${binaryName}`],
          tempDir, process.env, 300000
        );
        if (compileRes.exitCode !== 0) {
          return { result: `Rust compilation failed:\n${compileRes.stderr}\n${compileRes.stdout}` };
        }
        if (compileRes.stderr) compileOutput += `[Compilation Warning]: ${compileRes.stderr}\n`;
        cmd = 'sh';
        args = ['-c', `ulimit -v ${memLimitKB} && ${path.join(tempDir, binaryName)}`];
      }

      const { stdout, stderr, timedOut, exitCode } = await runScript(
        cmd, args, tempDir, executionEnv, EXECUTION_TIMEOUT_MS
      );

      let result = compileOutput;
      if (timedOut) result += `Error: Forensic script timed out after ${EXECUTION_TIMEOUT_MS / 1000}s.\n`;
      else if (exitCode !== 0) result += `Script exited with code ${exitCode}.\n`;
      else result += `Forensic script execution successful.\n`;

      updateProgress(result);

      
      const normalizedInputFiles = new Set(files.map(f => path.normalize(f)));
      const getFilesRecursively = async (dir: string): Promise<string[]> => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const f = await Promise.all(entries.map(async (e) => {
          const res = path.join(dir, e.name);
          return e.isDirectory() ? getFilesRecursively(res) : res;
        }));
        return Array.prototype.concat(...f);
      };

      const allFilesInTemp = await getFilesRecursively(tempDir);
      const generatedFiles: string[] = [];

      for (const fullPath of allFilesInTemp) {
        let relativePath = path.relative(tempDir, fullPath);
        if (normalizedInputFiles.has(relativePath)) continue;
        let baseName = path.basename(relativePath);

        
        if (baseName.toUpperCase() === logFilename.toUpperCase()) {
          try {
            const logContent = await fs.readFile(fullPath, 'utf8');
            const existing = context.fileMap.get(logFilename) ?? '';
            context.fileMap.set(logFilename, (logContent + '\n' + existing).trim());
            context.editedFilesSet.add(logFilename);
            generatedFiles.push(logFilename);
          } catch (_) {}
          continue;
        }

        if (baseName.startsWith('.') || relativePath.includes('__pycache__') || baseName.endsWith('.pyc')) continue;

        const stats = await fs.stat(fullPath);
        if (stats.isFile()) {
          const contentBuffer = await fs.readFile(fullPath);
          const isBinary = contentBuffer.subarray(0, 1024).includes(0);
          const isTooLarge = contentBuffer.length > (LARGE_FILE_LIMIT_KB * 1024);
          if (isBinary || isTooLarge) {
            context.binaryFileMap.set(relativePath, contentBuffer.toString('base64'));
          } else {
            context.fileMap.set(relativePath, contentBuffer.toString('utf8'));
            await updatePaperEntry(relativePath, context.fileMap, context.multiAgentGeminiClient);
          }
          context.editedFilesSet.add(relativePath);
          addDynamicallyRelevantDocument(relativePath);
          generatedFiles.push(relativePath);
        }
      }

      if (generatedFiles.length > 0) {
        result += `\nGenerated forensic output files: ${generatedFiles.join(', ')}\n`;
      }

      if (stdout?.trim()) result += `\n--- STDOUT ---\n${stdout.trim()}\n`;
      if (stderr?.trim()) result += `\n--- STDERR ---\n${stderr.trim()}\n`;

      return { result };
    } catch (e: any) {
      return { result: `RUNFORENSIC system error: ${e.message}` };
    } finally {
      if (tempDir) {
        try { await fs.rm(tempDir, { recursive: true, force: true }); } catch (_) {}
      }
    }
  },

  async extractParameters(invocation: string, _context: MultiAgentToolContext): Promise<ToolParsingResult> {
    const trimmed = invocation.trim();
    const endToken = this.endToken ?? '}';
    if (!trimmed.endsWith(endToken)) {
      return { success: false, error: `Invalid syntax: Must end with '${endToken}'` };
    }
    const content = trimmed.substring(0, trimmed.lastIndexOf(endToken));
    const files = content.split(/[,|]/).map(f => f.trim()).filter(f => f.length > 0);
    if (files.length === 0) return { success: false, error: "No forensic script files specified." };
    return { success: true, params: { files } };
  }
};


