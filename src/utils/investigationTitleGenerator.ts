

import { DEFAULT_GEMINI_LITE_MODEL } from '../config/models.js';
import { GeminiClient }              from '../services/geminiClient.js';


export async function generateInvestigationTitle(
  investigationPrompt: string,
  geminiClient:        GeminiClient
): Promise<string> {
  const prompt = `
You are helping label a scientific-integrity investigation case.
Provide a concise, descriptive title (under 10 words) for the following investigation.
The title should capture the key paper, author, journal, or integrity issue involved.
Do not use any markdown, quotation marks, or punctuation around the title.

Investigation description: ${investigationPrompt}
`.trim();

  return (
    (await geminiClient.sendOneShotMessage(prompt, { model: DEFAULT_GEMINI_LITE_MODEL }))?.text?.trim() ?? ''
  );
}

