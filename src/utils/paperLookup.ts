

import { DEFAULT_GEMINI_LITE_MODEL } from '../config/models.js';
import { GeminiClient } from '../services/geminiClient.js';
import { getAssetString, replaceRuntimePlaceholders } from '../services/promptManager.js';
import { removeBacktickFences } from './markdownUtils.js';


export async function paperLookup(
  identifier:   string | undefined,
  documentMap:  Map<string, string>,
  geminiClient: GeminiClient
): Promise<string> {
  const trimmed = identifier?.trim() ?? '';
  if (!trimmed || documentMap.has(trimmed)) return trimmed;

  
  const normalisedDOI = trimmed
    .replace(/^https?:\/\/doi\.org\//i, '') 
    .replace(/^doi:/i, '')
    .trim();

  if (normalisedDOI !== trimmed && documentMap.has(normalisedDOI)) return normalisedDOI;

  try {
    const allDocuments = [...documentMap.keys()].join('\n');

    let lookupPrompt = await getAssetString('file-finder-prompt');
    lookupPrompt = await replaceRuntimePlaceholders(lookupPrompt, {
      AvailableDocuments:  allDocuments,
      RequestedIdentifier: trimmed,
    });

    const suggestion = removeBacktickFences(
      (await geminiClient.sendOneShotMessage(lookupPrompt, { model: DEFAULT_GEMINI_LITE_MODEL }))?.text?.trim() ?? ''
    ).replace(/[`'"{}*]/g, '').trim();

    if (suggestion && documentMap.has(suggestion)) return suggestion;
  } catch {}

  return trimmed;
}

