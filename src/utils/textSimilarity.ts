

import { FuzzyReplaceResult } from '../novum_core/types.js';

interface Match {
  startIndex:  number;
  endIndex:    number;
  matchedText: string;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getLineStartIndices(text: string): number[] {
  const indices = [0];
  const re = /\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) indices.push(m.index + m[0].length);
  return indices;
}

function findLineNumber(charIndex: number, lineStarts: number[]): number {
  for (let i = lineStarts.length - 1; i >= 0; i--)
    if (charIndex >= lineStarts[i]) return i + 1;
  return 1;
}

function generateNoMatchError(originalText: string, needle: string): string {
  const needleLines  = needle.split(/\r?\n/);
  let prefixContent  = needleLines[0];
  if (needleLines.length > 1 && prefixContent.length < 30) prefixContent += `\n${needleLines[1]}`;
  prefixContent = prefixContent.substring(0, 120);

  const parts = prefixContent.split(/\s+/).filter(p => p.length > 0);
  if (parts.length > 0) {
    try {
      const prefixRe = new RegExp(parts.map(escapeRegExp).join('\\s+'), 'i');
      const found    = prefixRe.exec(originalText);
      if (found) {
        let displayNeedle = parts.join(' ');
        if (displayNeedle.length > 40) displayNeedle = `${displayNeedle.substring(0, 37)}...`;
        let displayFound  = found[0].replace(/\s+/g, ' ');
        if (displayFound.length > 60) displayFound = `${displayFound.substring(0, 57)}...`;
        return `Passage not found. Content similar to '${displayNeedle}' was located as '${displayFound}', but the full block did not match.`;
      }
    } catch {}
  }

  let excerpt = needle.replace(/\s+/g, ' ').trim().substring(0, 70);
  if (needle.length > 70) excerpt += '...';
  return `Passage starting with '${excerpt}' was not found in the document.`;
}

function performSingleFuzzyReplace(
  original:    string,
  match:       Match,
  needle:      string,
  replacement: string
): string {
  const trailingWS      = (needle.match(/(\s*)$/) ?? ['', ''])[1];
  const newlineCount    = (trailingWS.match(/\r?\n/g) ?? []).length;
  const trailPureNL     = /^[\r\n]*$/.test(trailingWS);

  let suffixStart       = match.startIndex + match.matchedText.length;
  let nlConsumed        = 0;
  let i                 = suffixStart;

  while (i < original.length) {
    if (nlConsumed >= newlineCount && trailPureNL) break;
    const ch = original[i];
    if (ch === '\n' || (ch === '\r' && original[i + 1] === '\n')) {
      i += ch === '\r' ? 2 : 1;
      nlConsumed++;
    } else if ((ch === ' ' || ch === '\t') && !trailPureNL) {
      i++;
    } else break;
  }
  suffixStart = i;

  return original.substring(0, match.startIndex) + replacement + original.substring(suffixStart);
}

function buildSnippets(original: string, matches: Match[]): string[] {
  const linesArr   = original.split(/\r?\n/);
  const lineStarts = getLineStartIndices(original);

  return matches.map(match => {
    const startLine = findLineNumber(match.startIndex, lineStarts);
    const endLine   = findLineNumber(Math.max(0, match.endIndex - 1), lineStarts);

    let ctxStart = startLine;
    for (let i = startLine - 2; i >= 0; i--) {
      if (linesArr[i].trim()) { ctxStart = i + 1; break; }
    }
    let ctxEnd = endLine;
    for (let i = endLine; i < linesArr.length; i++) {
      if (linesArr[i].trim()) { ctxEnd = i + 1; break; }
    }

    ctxStart = Math.max(1, ctxStart);
    ctxEnd   = Math.min(linesArr.length, ctxEnd);

    const sliceStart = lineStarts[ctxStart - 1];
    const sliceEnd   = ctxEnd < lineStarts.length ? lineStarts[ctxEnd] : original.length;
    let snippet = original.slice(sliceStart, sliceEnd);
    if (snippet.endsWith('\r\n')) snippet = snippet.slice(0, -2);
    else if (snippet.endsWith('\n')) snippet = snippet.slice(0, -1);
    return snippet;
  });
}


export function fuzzyReplace(
  haystack:    string,
  needle:      string,
  replacement: string
): FuzzyReplaceResult {
  const parts = needle.split(/\s+/).filter(p => p.length > 0);

  if (parts.length === 0)
    return { error: 'The passage to find is empty or whitespace-only.' };

  
  const escapedNeedle = escapeRegExp(needle);
  const countRe       = new RegExp(`(?=(${escapedNeedle}))`, 'gi');
  const occurrences   = [...haystack.matchAll(countRe)].length;

  if (occurrences === 1) {
    const replaced = haystack.replace(new RegExp(escapedNeedle, 'i'), replacement);
    return { modifiedString: replaced };
  }

  
  const pattern   = parts.map(escapeRegExp).join('\\s+');
  const searchRe  = new RegExp(pattern, 'gi');
  const matches:   Match[] = [];
  let m: RegExpExecArray | null;

  while ((m = searchRe.exec(haystack)) !== null) {
    matches.push({ startIndex: m.index, endIndex: m.index + m[0].length, matchedText: m[0] });
    if (m[0].length === 0) searchRe.lastIndex++;
  }

  if (matches.length === 0) return { error: generateNoMatchError(haystack, needle) };
  if (matches.length === 1) return { modifiedString: performSingleFuzzyReplace(haystack, matches[0], needle, replacement) };
  return { multipleMatches: buildSnippets(haystack, matches) };
}


export function detectRecycledText(
  targetPassage: string,
  corpus:        Map<string, string>,
  minWords:      number = 20
): Map<string, string[]> {
  const results = new Map<string, string[]>();
  const words   = targetPassage.split(/\s+/).filter(w => w.length > 0);

  if (words.length < minWords) return results;

  
  const probe   = words.slice(0, minWords).map(escapeRegExp).join('\\s+');
  const probeRe = new RegExp(probe, 'gi');

  for (const [filename, content] of corpus.entries()) {
    const hits: string[] = [];
    let m: RegExpExecArray | null;

    while ((m = probeRe.exec(content)) !== null) {
      const start   = Math.max(0, m.index - 80);
      const end     = Math.min(content.length, m.index + probe.length + 80);
      hits.push(`...${content.slice(start, end).replace(/\s+/g, ' ')}...`);
      if (m[0].length === 0) probeRe.lastIndex++;
    }

    if (hits.length > 0) results.set(filename, hits);
  }

  return results;
}

