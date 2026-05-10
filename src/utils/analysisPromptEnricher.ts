

import { Part }                  from '@google/genai';
import { DEFAULT_GEMINI_PRO_MODEL } from '../config/models.js';
import { GeminiClient }          from '../services/geminiClient.js';
import { getAssetString, replaceRuntimePlaceholders } from '../services/promptManager.js';
import { removeBacktickFences }  from './markdownUtils.js';


export async function enrichInvestigationPrompt(
  enrichmentAssetKey: string,
  originalPrompt:     string,
  assumptions:        string,
  investigationSpec:  string,
  geminiClient:       GeminiClient,
  sendMessage:        (message: string) => void,
  image?:             string,
  imageMimeType?:     string
): Promise<string> {
  try {
    const parts: Part[] = [];

    const enrichTemplate = await getAssetString(enrichmentAssetKey);
    const enrichPrompt   = await replaceRuntimePlaceholders(enrichTemplate, {
      OriginalPrompt: originalPrompt,
      Assumptions:    assumptions.trim(),
      Spec:           investigationSpec,
    });

    if (imageMimeType && image) {
      parts.push({ inlineData: { mimeType: imageMimeType, data: image } });
    }
    parts.push({ text: enrichPrompt });

    const result = (await geminiClient.sendOneShotMessage(parts, { model: DEFAULT_GEMINI_PRO_MODEL }))?.text ?? originalPrompt;
    return removeBacktickFences(result);
  } catch (error) {
    console.error('Prompt enrichment error:', error);
    return originalPrompt;
  }
}

