import {
  CountTokensResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
  GoogleGenAI,
  Model,
  GetModelParameters,
} from "@google/genai";
import { DEFAULT_GEMINI_MODEL } from "../config/models.js";

export interface ContentGenerator {
  generateContent(
    request: GenerateContentParameters
  ): Promise<GenerateContentResponse>;

  generateContentStream(
    request: GenerateContentParameters
  ): Promise<AsyncGenerator<GenerateContentResponse>>;

  countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;

  embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;

  get(params: GetModelParameters): Promise<Model>;
}

export enum AuthType {
  LOGIN_WITH_GOOGLE = "oauth-personal", 
  USE_GEMINI = "gemini-api-key",        
  USE_VERTEX_AI = "vertex-ai",          
  CLOUD_SHELL = "cloud-shell",          
}

export type ContentGeneratorConfig = {
  model: string;
  apiKey?: string;
  vertexai?: boolean;
  authType?: AuthType | undefined;
};

export async function createContentGeneratorConfig(
  model: string | undefined,
  authType: AuthType | undefined,
  options?: Record<string, string>
): Promise<ContentGeneratorConfig> {
  const geminiApiKey = options?.geminiApiKey || process.env.GEMINI_API_KEY;
  const googleApiKey = options?.googleApiKey || process.env.GOOGLE_API_KEY;
  const googleCloudProject = process.env.GOOGLE_CLOUD_PROJECT;
  const googleCloudLocation = process.env.GOOGLE_CLOUD_LOCATION;

  
  
  const effectiveModel = model || DEFAULT_GEMINI_MODEL;

  const contentGeneratorConfig: ContentGeneratorConfig = {
    model: effectiveModel,
    authType,
  };

  
  if (
    authType === AuthType.LOGIN_WITH_GOOGLE ||
    authType === AuthType.CLOUD_SHELL
  ) {
    return contentGeneratorConfig;
  }

  if (authType === AuthType.USE_GEMINI && geminiApiKey) {
    contentGeneratorConfig.apiKey = geminiApiKey;
    return contentGeneratorConfig;
  }

  
  if (
    authType === AuthType.USE_VERTEX_AI &&
    !!googleApiKey &&
    googleCloudProject &&
    googleCloudLocation
  ) {
    contentGeneratorConfig.apiKey = googleApiKey;
    contentGeneratorConfig.vertexai = true;

    return contentGeneratorConfig;
  }

  return contentGeneratorConfig;
}

export async function createContentGenerator(
  config: ContentGeneratorConfig,
  sdkVersion?: string,
  platformDetails?: string
): Promise<ContentGenerator> {
  let httpOptions: { headers: { "User-Agent": string } } | undefined = undefined;

  
  if (sdkVersion && platformDetails) {
    httpOptions = {
      headers: {
        "User-Agent": `PaperIntegrityVerifier/${sdkVersion} (${platformDetails})`,
      },
    };
  }
  
  if (
    config.authType === AuthType.LOGIN_WITH_GOOGLE ||
    config.authType === AuthType.CLOUD_SHELL
  ) {
    throw new Error(
      `Error creating contentGenerator: Unsupported Environment for automated paper scraping.`
    );
  }

  if (
    config.authType === AuthType.USE_GEMINI ||
    config.authType === AuthType.USE_VERTEX_AI
  ) {
    const googleGenAI = new GoogleGenAI({
      apiKey: config.apiKey === "" ? undefined : config.apiKey,
      vertexai: config.vertexai,
      httpOptions,
    });
    return googleGenAI.models;
  }

  throw new Error(
    `Error creating contentGenerator: Unsupported authType for Literature Review: ${config.authType}`
  );
}

export function resolveApiKeyForModel(model: string, defaultApiKey?: string): string | undefined {
  if (!model) return defaultApiKey;
  
  
  const sanitizedModel = model.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const envVarName = `GEMINI_API_KEY_${sanitizedModel}`;
  
  return process.env[envVarName] || defaultApiKey;
}

