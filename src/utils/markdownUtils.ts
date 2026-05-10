

import { MultiAgentToolContext } from '../novum_core/types.js';
import { getAssetString } from '../services/promptManager.js';
import { getPaperAnalysis } from './paperAnalysis.js';
import { paperLookup } from './paperLookup.js';


export function removeBacktickFences(text: string): string {
  const trimmed = text.trim();
  const lines   = trimmed.split('\n');

  if (
    lines.length >= 2 &&
    lines[0].trim().startsWith('```') &&
    lines[lines.length - 1].trim() === '```'
  ) {
    return lines.slice(1, lines.length - 1).join('\n');
  }

  if (
    lines.length === 1 &&
    lines[0].trim().startsWith('`') &&
    lines[0].trim().endsWith('`')
  ) {
    return lines[0].slice(1, -1);
  }

  return text;
}

export function toKebabCase(str: string | undefined): string {
  if (!str) return '';
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export const aOrAn = (word: string): string =>
  'aeiou'.includes(word[0]?.toLowerCase()) ? 'an' : 'a';

const numberToWord: Record<number, string> = {
  2: 'two', 3: 'three', 4: 'four', 5: 'five',
  6: 'six', 7: 'seven', 8: 'eight', 9: 'nine',
};


export function formatExpertList(experts: string[]): string {
  const counts = new Map<string, number>();
  for (const e of experts) counts.set(e, (counts.get(e) ?? 0) + 1);

  const sorted = [...counts.entries()].sort(([, a], [, b]) => b - a);
  const items  = sorted.map(([item, count]) => {
    if (count === 1) return `${aOrAn(item)} ${item}`;
    return `${numberToWord[count] ?? count} ${item}s`;
  });

  return new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(items);
}


export const repairTruncatedJsonArray = (jsonString: string): string | undefined => {
  const trimmed = jsonString.trim();
  if (!trimmed.startsWith('[')) return undefined;

  try { if (Array.isArray(JSON.parse(trimmed))) return trimmed; } catch {}

  const tryClose = (s: string): string | undefined => {
    try {
      const attempt = `${s.trimEnd()}]`;
      if (Array.isArray(JSON.parse(attempt))) return attempt;
    } catch {}
    return undefined;
  };

  const direct = tryClose(trimmed);
  if (direct) return direct;

  for (let i = trimmed.length; i > 0; i--) {
    let chunk = trimmed.substring(0, i).trimEnd();
    if (chunk.endsWith(',')) chunk = chunk.slice(0, -1);
    if (chunk === '[') return '[]';
    if (!chunk) return undefined;
    const attempt = tryClose(chunk);
    if (attempt) return attempt;
  }

  return undefined;
};


export const replaceContentBetweenMarkers = (
  original:    string,
  prefix:      string,
  suffix:      string,
  replacement: string
): string => {
  const prefixIdx = original.indexOf(prefix);
  const suffixIdx = original.indexOf(suffix, prefixIdx);
  if (prefixIdx === -1 || suffixIdx === -1) return original;
  return original.slice(0, prefixIdx) + replacement + original.slice(suffixIdx + suffix.length);
};


export async function getDocumentsAndContent(
  requestedFiles: { FILENAME: string; DESCRIPTION: string }[],
  context: MultiAgentToolContext
): Promise<string> {
  const fileContentPrefix = await getAssetString('file-content-prefix');
  const fileContentSuffix = await getAssetString('file-content-suffix');

  if (!requestedFiles?.length) return '--No Documents--';

  const allFilesMap = new Map<string, string>([
    ...context.fileMap,
    ...Array.from(context.binaryFileMap.keys()).map(k => [k, ''] as [string, string]),
  ]);

  const results: string[] = [];

  for (const fileObj of requestedFiles) {
    if (!fileObj?.FILENAME) continue;

    let filename    = fileObj.FILENAME;
    const description = fileObj.DESCRIPTION ?? '';

    filename = await paperLookup(filename, allFilesMap, context.multiAgentGeminiClient);

    let block = `Document: ${filename}\n`;
    if (description) block += `Description: ${description}`;

    const analysis = getPaperAnalysis(filename);
    if (analysis) block += ` ${JSON.stringify(analysis)}`;
    if (description || analysis) block += '\n';

    if (context.fileMap.has(filename)) {
      block += `${fileContentPrefix}\n${context.fileMap.get(filename)}\n${fileContentSuffix}\n`;
    } else if (context.binaryFileMap.has(filename)) {
      block += '[Binary file — flag for image-integrity tool]\n';
    } else {
      block += '[Document not yet in corpus]\n';
    }

    results.push(block);
  }

  return results.join('').trim() || '--No Documents--';
}

