import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateResearchStep(prompt: string, context: string) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are an AI forensics agent part of Novum. 
    Your goal is to apply the scientific method to hypothesize and test AI papers and systems.
    
    Current research goal: ${prompt}
    
    Context so far:
    ${context}
    
    You must output exactly one research step. 
    A step can be of type: 'hypothesis', 'test', 'reflection', or 'result'.
    
    Format your response as a JSON object:
    {
      "type": "hypothesis" | "test" | "reflection" | "result",
      "agentName": string,
      "content": "Markdown formatted content of the research action",
      "findings": string[] (optional)
    }
  `;

  try {
    const result = await ai.models.generateContent({
      model: model,
      contents: "Generate the next logical step in the research process.",
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(result.text || "{}");
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
}

export async function generateThreadTitle(prompt: string) {
  const model = "gemini-3-flash-preview";
  try {
    const result = await ai.models.generateContent({
      model: model,
      contents: `Generate a concise, 3-5 word title for a research thread about: "${prompt}"`,
    });
    return result.text?.trim() || "Untitled Research";
  } catch (error) {
    return "New Research";
  }
}
