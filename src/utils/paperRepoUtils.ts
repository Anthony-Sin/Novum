

import * as fs   from 'fs';
import * as path from 'path';
import { tmpdir }           from 'node:os';
import simpleGit, { SimpleGit } from 'simple-git';
import { isBinaryFileSync } from 'isbinaryfile';


const LARGE_FILE_SIZE_LIMIT_BYTES = 5 * 1024 * 1024;


export interface PaperSourceMetadata {
  doi?:          string;
  arxivId?:      string;
  pubmedId?:     string;
  title?:        string;
  authors?:      string[];
  journal?:      string;
  year?:         number;
  repoUrl?:      string;
  retractionUrl?: string;
}


export function isGitRepository(directory: string): boolean {
  try {
    let current = path.resolve(directory);
    while (true) {
      if (fs.existsSync(path.join(current, '.git'))) return true;
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
    return false;
  } catch { return false; }
}


export function findGitRoot(directory: string): string | null {
  try {
    let current = path.resolve(directory);
    while (true) {
      if (fs.existsSync(path.join(current, '.git'))) return current;
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
    return null;
  } catch { return null; }
}


export async function clonePaperRepoIntoMemory({
  repoUrl,
  githubToken,
  fileMap,
  binaryFileMap,
}: {
  repoUrl:      string;
  githubToken:  string;
  fileMap:      Map<string, string>;
  binaryFileMap: Map<string, string>;
}): Promise<Array<{ path: string; comment?: string }>> {
  let rawUrl = repoUrl.trim();
  let branch: string | undefined;

  if (rawUrl.includes('#')) {
    [rawUrl, branch] = rawUrl.split('#') as [string, string];
  }

  const repo    = rawUrl.replace(/^https:\/\/(www\.)?github\.com\
  const tempDir = fs.mkdtempSync(path.join(tmpdir(), 'novum-clone-'));

  try {
    const git: SimpleGit = simpleGit(tempDir);
    githubToken = githubToken || process.env.GITHUB_TOKEN || '';
    if (!githubToken) throw new Error('GITHUB_TOKEN is required for repository access.');

    const cloneUrl     = `https://${githubToken}@github.com/${repo}.git`;
    const cloneOptions = branch ? ['--branch', branch] : [];
    await git.clone(cloneUrl, tempDir, cloneOptions);

    const allFiles = (await git.raw(['ls-files'])).split('\n').filter(f => f.trim().length > 0);
    const result:   Array<{ path: string; comment?: string }> = [];

    for (const filePath of allFiles) {
      const fullPath = path.join(tempDir, filePath);
      const stats    = fs.statSync(fullPath);

      if (stats.size > LARGE_FILE_SIZE_LIMIT_BYTES) {
        result.push({ path: filePath, comment: 'Skipped (file exceeds 5 MB limit)' });
        continue;
      }

      if (isBinaryFileSync(fullPath)) {
        binaryFileMap.set(filePath, fs.readFileSync(fullPath).toString('base64'));
        result.push({ path: filePath, comment: 'Binary (flagged for image-integrity review)' });
      } else {
        fileMap.set(filePath, fs.readFileSync(fullPath, 'utf-8'));
        result.push({ path: filePath });
      }
    }

    return result;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}


export function normaliseDOI(raw: string): { doi: string; url: string } | null {
  const cleaned = raw.trim()
    .replace(/^https?:\/\/doi\.org\
    .replace(/^doi:/i, '')
    .trim();

  
  if (!/^10\.\d{4,}\/\S+/.test(cleaned)) return null;

  return { doi: cleaned, url: `https://doi.org/${cleaned}` };
}


export function normaliseArxivId(raw: string): { arxivId: string; abstractUrl: string; pdfUrl: string } | null {
  const cleaned = raw.trim()
    .replace(/^https?:\/\/arxiv\.org\/(abs|pdf)\
    .replace(/^arxiv:/i, '')
    .replace(/\.pdf$/i, '')
    .trim();

  if (!/^\d{4}\.\d{4,5}(v\d+)?$/.test(cleaned) && !/^[a-z-]+\/\d{7}$/.test(cleaned)) return null;

  return {
    arxivId:     cleaned,
    abstractUrl: `https://arxiv.org/abs/${cleaned}`,
    pdfUrl:      `https://arxiv.org/pdf/${cleaned}.pdf`,
  };
}

