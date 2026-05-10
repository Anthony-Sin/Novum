

import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { spawn } from 'child_process';
import { MultiAgentTool } from '../multiAgentTool.js';
import { MultiAgentToolResult, MultiAgentToolContext, ToolParsingResult } from '../../novum_core/types.js';
import { addDynamicallyRelevantDocument, updatePaperEntry } from '../../utils/paperAnalysis.js';
import { MAX_MEM_PERCENTAGE, MAX_SCRIPT_EXECUTION_TIMEOUT } from '../../config/config.js';
import { logFilename } from '../../config/config.js';

const MAX_TOTAL_RUNS = 200;
const TIMEOUT = MAX_SCRIPT_EXECUTION_TIMEOUT;
const LARGE_FILE_LIMIT_KB = 100;

const calculateStats = (values: number[]) => {
  if (values.length === 0) return { mean: 0, std: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
};

const runScript = (cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv, timeoutMs: number) => {
  return new Promise<{ stdout: string; stderr: string; timedOut: boolean; exitCode: number | null }>((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, env });
    let stdout = '', stderr = '';
    let timedOut = false;
    const MAX_LOG_SIZE = LARGE_FILE_LIMIT_KB * 2 * 1024;
    const appendLog = (cur: string, n: string) => {
      const c = cur + n;
      return c.length > MAX_LOG_SIZE ? `[Truncated]\n${c.slice(-MAX_LOG_SIZE)}` : c;
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

export const monteCarloTool: MultiAgentTool = {
  displayName: "Fabrication Plausibility Simulator",
  name: 'MONTECARLO{',
  endToken: '}MONTECARLO',

  async execute(params: Record<string, unknown>, context: MultiAgentToolContext): Promise<MultiAgentToolResult> {
    const updateProgress = (message: string) => {
      context.sendMessage(JSON.stringify({ status: 'PROGRESS_UPDATES', completed_status_message: message }));
    };

    let evalScript = params['evaluator_script'] as string;
    let searchSpace = params['search_space'] as Record<string, any>;
    const goal = (params['goal'] as string || 'min').toLowerCase();
    const budget = Number(params['budget']) || 0;
    const trials = Number(params['trials']) || 1;

    const isPython = evalScript?.endsWith('.py');
    const isRust = evalScript?.endsWith('.rs');

    if (!isPython && !isRust) {
      return { result: `Error: Simulation script must be .py or .rs` };
    }

    updateProgress(`Running fabrication plausibility simulation:\n* Script: \`${evalScript}\`\n* Goal: ${goal} (fabrication score)\n* Simulations: ${budget || 'grid'} x ${trials} trials`);

    let entryPointFunction: string | null = null;
    if (evalScript.includes(':') && isPython) {
      const p = evalScript.split(':');
      evalScript = p[0];
      entryPointFunction = p[1];
    }

    let dependencies: string[] = [];
    const rawDeps = params['dependencies'];
    if (typeof rawDeps === 'string') {
      try { const p = JSON.parse(rawDeps); dependencies = Array.isArray(p) ? p : [rawDeps]; }
      catch (_) { if (rawDeps.trim() !== '[]') dependencies = [rawDeps]; }
    } else if (Array.isArray(rawDeps)) {
      dependencies = rawDeps;
    }

    if (typeof searchSpace === 'string') {
      try { searchSpace = JSON.parse(searchSpace); }
      catch (_) { return { result: `Error: search_space is invalid JSON.` }; }
    }

    if (!evalScript || !searchSpace || Object.keys(searchSpace).length === 0) {
      return { result: `Error: Missing simulation script or parameter space.` };
    }

    
    let jobs: Record<string, string>[] = [];
    if (budget > 0) {
      for (let i = 0; i < budget; i++) {
        const job: Record<string, string> = {};
        for (const [key, value] of Object.entries(searchSpace)) {
          if (typeof value === 'object' && value !== null && !Array.isArray(value) && 'min' in value) {
            const min = Number(value.min), max = Number(value.max);
            const isInt = value.type === 'int';
            let v = Math.random() * (max - min) + min;
            if (isInt) v = Math.round(v);
            job[key] = isInt ? String(v) : v.toFixed(4);
          } else if (Array.isArray(value)) {
            job[key] = String(value[Math.floor(Math.random() * value.length)]);
          } else {
            job[key] = String(value);
          }
        }
        jobs.push(job);
      }
    } else {
      jobs = [{}];
      for (const key of Object.keys(searchSpace)) {
        const values = (Array.isArray(searchSpace[key]) ? searchSpace[key] : [searchSpace[key]]).map(String);
        const newJobs: Record<string, string>[] = [];
        for (const base of jobs) for (const val of values) newJobs.push({ ...base, [key]: val });
        jobs = newJobs;
      }
    }

    const totalExecutions = jobs.length * trials;
    if (totalExecutions > MAX_TOTAL_RUNS) {
      return { result: `Error: ${totalExecutions} simulations requested, limit is ${MAX_TOTAL_RUNS}. Reduce budget or trials.` };
    }

    const allFilesMap = new Map<string, string>([
      ...context.fileMap,
      ...Array.from(context.binaryFileMap.keys()).map(k => [k, ''] as [string, string])
    ]);

    const filesToStage = [{ path: evalScript }, ...dependencies.map(d => ({ path: d }))];
    for (const f of filesToStage) {
      if (!allFilesMap.has(f.path)) return { result: `File '${f.path}' not found in project context.` };
    }

    let tempDir = '';
    const resultsLog: string[] = [];
    let bestScore = goal === 'max' ? -Infinity : Infinity;
    let bestParams: Record<string, string> = {};
    let bestStats = { mean: 0, std: 0 };
    let runCounter = 0;

    try {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'momoa-mc-'));

      for (const f of filesToStage) {
        const dest = path.join(tempDir, f.path);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        const content = context.fileMap.has(f.path)
          ? context.fileMap.get(f.path)!
          : Buffer.from(context.binaryFileMap.get(f.path)!, 'base64');
        if (Buffer.isBuffer(content)) await fs.writeFile(dest, content);
        else await fs.writeFile(dest, content, 'utf8');
      }

      
      let executableScript = path.basename(evalScript);
      if (isRust) {
        const compilerLimitKB = Math.floor((os.freemem() / 1024) * MAX_MEM_PERCENTAGE);
        executableScript = 'mc_sim_binary';
        const compileRes = await runScript(
          os.platform() === 'win32' ? 'cmd' : 'sh', 
          os.platform() === 'win32' ? ['/c', `rustc ${evalScript} -o ${executableScript}`] : ['-c', `ulimit -v ${compilerLimitKB} && rustc ${evalScript} -o ${executableScript}`],
          tempDir, process.env, TIMEOUT
        );
        if (compileRes.exitCode !== 0) return { result: `Rust compilation failed:\n${compileRes.stderr}` };
      } else if (isPython && entryPointFunction) {
        const moduleName = path.basename(evalScript, '.py');
        const wrapper = `import sys\nimport ${moduleName}\ntry:\n    result = ${moduleName}.${entryPointFunction}()\n    print(f"[MONTECARLO_SCORE]: {result}")\nexcept Exception as e:\n    print(f"Error: {e}", file=sys.stderr)\n    sys.exit(1)\n`;
        executableScript = `__mc_wrapper.py`;
        await fs.writeFile(path.join(tempDir, executableScript), wrapper, 'utf8');
      }

      const freeMemKB = Math.floor(os.freemem() / 1024);
      const memLimitKB = Math.floor((freeMemKB * MAX_MEM_PERCENTAGE) / Math.min(jobs.length, 5));

      const runJob = async (envConfig: Record<string, string>) => {
        const trialScores: number[] = [];
        for (let t = 0; t < trials; t++) {
          try {
            const trialDir = path.join(tempDir, `run_${runCounter++}`);
            await fs.mkdir(trialDir);
            for (const f of filesToStage) {
              const src = path.join(tempDir, f.path);
              const dst = path.join(trialDir, f.path);
              await fs.mkdir(path.dirname(dst), { recursive: true });
              await fs.symlink(src, dst);
            }
            let cmd = 'sh', args: string[];
            if (isRust) {
              const binSrc = path.join(tempDir, executableScript);
              const binDst = path.join(trialDir, executableScript);
              await fs.symlink(binSrc, binDst);
              cmd = os.platform() === 'win32' ? 'cmd' : 'sh';
              args = os.platform() === 'win32' ? ['/c', `${binDst}`] : ['-c', `ulimit -v ${memLimitKB} && ${binDst}`];
            } else {
              if (executableScript !== path.basename(evalScript)) {
                await fs.symlink(path.join(tempDir, executableScript), path.join(trialDir, executableScript));
              }
              cmd = os.platform() === 'win32' ? 'cmd' : 'sh';
              args = os.platform() === 'win32' ? ['/c', `python ${executableScript}`] : ['-c', `ulimit -v ${memLimitKB} && python3 ${executableScript}`];
            }
            const env = {
              ...process.env, ...envConfig,
              PYTHONPATH: tempDir + path.delimiter + (process.env.PYTHONPATH || ''),
              RANDOM_SEED: String(Math.floor(Math.random() * 100000) + t)
            };
            const { stdout } = await runScript(cmd, args, trialDir, env, TIMEOUT);
            const scoreTag = isRust ? '[MONTECARLO_SCORE]' : '[MONTECARLO_SCORE]';
            const match = stdout.match(new RegExp(`${scoreTag}:\\s*([\\-\\d\\.eE]+)`));
            if (match && !isNaN(parseFloat(match[1]))) trialScores.push(parseFloat(match[1]));
          } catch (_) {}
        }
        if (trialScores.length === 0) {
          resultsLog.push(`Params: ${JSON.stringify(envConfig)} -> SIMULATION_FAILED`);
          return;
        }
        const stats = calculateStats(trialScores);
        const isBetter = goal === 'max' ? stats.mean > bestScore : stats.mean < bestScore;
        if (isBetter) { bestScore = stats.mean; bestParams = envConfig; bestStats = stats; }
        const suffix = trials > 1 ? ` (mean=${stats.mean.toFixed(4)}, std=${stats.std.toFixed(4)})` : '';
        const logEntry = `Params: ${JSON.stringify(envConfig)} -> FabricationScore=${stats.mean.toFixed(4)}${suffix}`;
        updateProgress(logEntry);
        resultsLog.push(logEntry);
      };

      for (let i = 0; i < jobs.length; i += 5) {
        await Promise.all(jobs.slice(i, i + 5).map(runJob));
      }

      if (resultsLog.every(l => l.includes('SIMULATION_FAILED'))) {
        return { result: `All simulations failed. Check that your script outputs [MONTECARLO_SCORE]: <number>.\n\nErrors:\n${resultsLog.join('\n')}` };
      }

      const bestStr = trials > 1
        ? `Best Fabrication Score: ${bestStats.mean.toFixed(4)} (StdDev: ${bestStats.std.toFixed(4)})`
        : `Best Fabrication Score: ${bestScore}`;

      const output = `## MONTECARLO � Fabrication Plausibility Simulation Results

Strategy: ${budget > 0 ? 'Random Search' : 'Grid Search'} | Trials per config: ${trials}
${bestStr}
Best Parameters: ${JSON.stringify(bestParams)}

Interpretation: A score near 0.0 means the reported statistics ARE plausible under the stated study design.
A score near 1.0 means the reported statistics are IMPLAUSIBLE and consistent with fabrication.

### Full Simulation Log (top 20)
${resultsLog.slice(0, 20).join('\n')}`;

      return { result: output };
    } catch (err) {
      return { result: `MONTECARLO system error: ${err}` };
    } finally {
      if (tempDir) await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  },

  async extractParameters(invocation: string): Promise<ToolParsingResult> {
    const trimmed = invocation.trim();
    if (!trimmed.endsWith(this.endToken!)) return { success: false, error: `Missing closing }MONTECARLO token.` };
    const content = trimmed.substring(0, trimmed.lastIndexOf(this.endToken!));
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    if (jsonStart < 0 || jsonEnd < 0) return { success: false, error: `JSON parameter space missing.` };

    const preJson = content.substring(0, jsonStart).trim();
    let files: string[] = [], deps: string[] = [];
    const bracketStart = preJson.indexOf('[');
    const bracketEnd = preJson.lastIndexOf(']');
    if (bracketStart !== -1 && bracketEnd > bracketStart) {
      files = preJson.substring(0, bracketStart).split(/[,|]/).map(s => s.trim()).filter(Boolean);
      const depsContent = preJson.substring(bracketStart + 1, bracketEnd);
      if (depsContent.trim()) deps = depsContent.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
    } else {
      const parts = preJson.split(/[,|]/).map(s => s.trim()).filter(Boolean);
      files = parts.slice(0, 1);
      deps = parts.slice(1);
    }
    if (files.length < 1) return { success: false, error: `Missing simulation script filename.` };

    let searchSpace: any;
    try { searchSpace = JSON.parse(content.substring(jsonStart, jsonEnd + 1)); }
    catch (_) { return { success: false, error: `Invalid JSON parameter space.` }; }

    const args = content.substring(jsonEnd + 1).split(/[,|]/).map(s => s.trim()).filter(Boolean);
    return {
      success: true,
      params: {
        evaluator_script: files[0], dependencies: deps, search_space: searchSpace,
        goal: (args[0] || 'min').replace(/['"]/g, '').toLowerCase(),
        budget: parseInt(args[1] || '0'), trials: parseInt(args[2] || '1')
      }
    };
  }
};


