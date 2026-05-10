

import {
  GenerateContentResponse,
  Content,
  GenerateContentConfig,
  Part,
  FinishReason,
  BlockedReason,
  Tool,
  Type,
} from '@google/genai';
import { ApiPolicyManager } from './apiPolicyManager.js';
import { DEFAULT_GEMINI_FLASH_MODEL } from '../config/models.js';
import { TranscriptManager } from './transcriptManager.js';
import { ContentGenerator, createContentGenerator, ContentGeneratorConfig, AuthType, resolveApiKeyForModel } from './contentGenerator.js';
import { FormattedTranscriptEntry, GeminiClientConfig, MarkerPair, ToolFunctionDeclaration } from '../novum_core/types.js';
import { LlmBlockedError } from '../shared/errors.js';

const MAX_ATTEMPTS = 6;

export interface GenerateContentOptions {
  model?: string;
  temperature?: number;
  enableThinking?: boolean;
  enableGrounding?: boolean; 
  signal?: AbortSignal; 
  responseMimeType?: string;
  tools?: ToolFunctionDeclaration[]; 
}

export class GeminiClient {
  private contentGenerators = new Map<string, Promise<ContentGenerator>>();
  private readonly apiPolicyManager: ApiPolicyManager;
  private readonly config: GeminiClientConfig;
  private readonly apiName = 'PaperIntegritySleuth';

  
  
  private tokenUsage = new Map<string, { 
    inputTokens: number, 
    outputTokens: number, 
    cachedInputTokens: number 
  }>();

  constructor(config: GeminiClientConfig, apiPolicyManager: ApiPolicyManager) {
    this.apiPolicyManager = apiPolicyManager;
    this.config = config;
  }

  private async getContentGenerator(model: string): Promise<ContentGenerator> {
    const apiKey = resolveApiKeyForModel(model, this.config.apiKey);

    if (!apiKey) {
      throw new Error(`API Key not found for model: ${model}. Check environment variables for Fraud Detection keys.`);
    }

    if (this.contentGenerators.has(apiKey)) {
      return this.contentGenerators.get(apiKey)!;
    }

    console.log(`Initializing Data Sleuth Model with API Key ${apiKey} (for ${model}).`)

    const generatorPromise = (async () => {
      try {
        const contentGeneratorConfig: ContentGeneratorConfig = {
          model: model, 
          authType: AuthType.USE_GEMINI,
          apiKey: apiKey,
        };
        
        const contentGenerator = await createContentGenerator(
          contentGeneratorConfig,
        );
        return contentGenerator;
      } catch (error) {
        console.error(
          `FATAL: GeminiClient failed to initialize Integrity Analyzer for model ${model}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        this.contentGenerators.delete(apiKey);
        throw new Error('Integrity Analyzer initialization failed.');
      }
    })();

    this.contentGenerators.set(apiKey, generatorPromise);
    return generatorPromise;
  }

  public getTokenUsage(): Map<string, { 
    inputTokens: number, 
    outputTokens: number, 
    cachedInputTokens: number 
  }> {
    return this.tokenUsage;
  }

  private updateTokenUsage(modelName: string, response: GenerateContentResponse): void {
    const usage = response.usageMetadata;
    if (usage) {
      const stats = this.tokenUsage.get(modelName) || { 
        inputTokens: 0, 
        outputTokens: 0, 
        cachedInputTokens: 0 
      };
      
      const promptTokens = usage.promptTokenCount || 0;
      const cachedTokens = usage.cachedContentTokenCount || 0;
      const outputTokens = usage.candidatesTokenCount || 0;
      const nonCachedInputTokens = promptTokens - cachedTokens;

      stats.inputTokens += nonCachedInputTokens;
      stats.outputTokens += outputTokens;
      stats.cachedInputTokens += cachedTokens;
      
      this.tokenUsage.set(modelName, stats);
    }
  }

    private _removeRepetitiveBlocks(text: string): string {
    const MAX_REPETITIONS = 10;
    const lines = text.split('\n');
    const cleanedLines: string[] = [];
    let i = 0;

    while (i < lines.length) {
      let bestBlockSize = 0;
      let bestRepeatCount = 0;
      
      const maxBlockSize = Math.floor((lines.length - i) / 6);

      for (let k = 1; k <= maxBlockSize; k++) {
        let count = 1; 
        let p = i + k; 

        while (p + k <= lines.length) {
          let match = true;
          for (let j = 0; j < k; j++) {
            if (lines[i + j] !== lines[p + j]) {
              match = false;
              break;
            }
          }
          if (match) {
            count++;
            p += k;
          } else {
            break;
          }
        }

        if (count > MAX_REPETITIONS) {
          bestBlockSize = k;
          bestRepeatCount = count;
          break; 
        }
      }

      if (bestBlockSize > 0) {
        for (let j = 0; j < MAX_REPETITIONS * bestBlockSize; j++) {
          cleanedLines.push(lines[i + j]);
        }

        cleanedLines.push(`[--- ${bestRepeatCount - MAX_REPETITIONS}x suspected synthetic data loops truncated ---]`);

        i += bestBlockSize * bestRepeatCount;

        if (i < lines.length) {
          const nextLine = lines[i];
          const firstLineOfBlock = lines[i - (bestBlockSize * bestRepeatCount)];
          
          if (nextLine.length > 0 && firstLineOfBlock.startsWith(nextLine)) {
            i++;
          }
        }
      } else {
        cleanedLines.push(lines[i]);
        i++;
      }
    }

    return cleanedLines.join('\n');
  }

  private _mapFormattedTranscriptToContent(
    transcript: FormattedTranscriptEntry[]
  ): Content[] {
    return transcript.map(entry => ({
      role: entry.role,
      parts: entry.parts as Part[],
    }));
  }

  private _createErrorResponse(
    errorMessage: string,
  ): GenerateContentResponse {
    console.error(`Fraud Analysis halted. Engine returning error response: ${errorMessage}`);
    const errorText = `--- The literature verification API was unable to provide a response (${errorMessage}) ---`;
    return {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text: errorText }],
          },
          finishReason: FinishReason.FINISH_REASON_UNSPECIFIED,
          index: 0,
          safetyRatings: [],
        },
      ],
      promptFeedback: {
        blockReason: BlockedReason.BLOCKED_REASON_UNSPECIFIED,
        safetyRatings: [],
      },
      text: errorText,
      data: '',
      functionCalls: [],
      executableCode: '',
      codeExecutionResult: '',
    };
  }

  private _parseRetryDelayFromString(errorMessage: string): number | null {
    try {
      const errorObj = JSON.parse(errorMessage);
      const details = errorObj?.error?.details;

      if (!Array.isArray(details)) {
        return null;
      }

      const retryInfo = details.find(
        (d: any) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
      );

      const delayStr = retryInfo?.retryDelay;
      if (typeof delayStr !== 'string') return null;

      const match = delayStr.match(/^(\d+(\.\d+)?)(s|ms)?$/);
      if (!match) return null;

      const value = parseFloat(match[1]);
      const unit = match[3];

      if (unit === 'ms') return value;
      return value * 1000;

    } catch (parseError) {
      return null;
    }
  }

    private async _reduceContents(
      contents: Content[],
      orderedMarkerPairs: MarkerPair[]
  ): Promise<Content[]> {
      let replacedOne = false;
      const replacementText = '---REDUNDANT PAPER SECTION OMITTED FOR TOKEN LIMITS---';

      for (const markerPair of orderedMarkerPairs) {
        const { begin: toolBeginMarker, end: toolEndMarker } = markerPair;
        const intermediateContents: Content[] = [];
        replacedOne = false;

        for (const content of contents) {
          if (replacedOne) {
            intermediateContents.push(content);
            continue;
          }

          const newParts: Part[] = [];
          let partReplaced = false;

          if (content.parts) {
            for (const part of content.parts) {
              if ('text' in part && !partReplaced) {
                const text = part.text;
                if (text) {
                  const startIndex = text.indexOf(toolBeginMarker);

                  if (startIndex !== -1) {
                    const endIndex = text.indexOf(toolEndMarker, startIndex + toolBeginMarker.length);

                    if (endIndex !== -1) {
                      const pre = text.substring(0, startIndex);
                      const post = text.substring(endIndex + toolEndMarker.length);
                      newParts.push({ text: pre + replacementText + post });
                      replacedOne = true; 
                      partReplaced = true;
                      continue; 
                    }
                  }
                }
              }
              newParts.push(part);
            }
          }
          intermediateContents.push({ ...content, parts: newParts });
        }
        
        if (replacedOne) return intermediateContents;
      }

      if (!replacedOne) {
        const indexToRemove = 3; 
        if (contents.length <= indexToRemove) {
            console.warn(`Cannot perform secondary reduction on paper text.`);
            return contents;
        }

        const reducedContents = [...contents]; 
        reducedContents.splice(indexToRemove, 1);
        console.warn(`Performed secondary reduction: Removed older audit trail element.`);
        return reducedContents;
    }

      return contents;
  }

  public async trimToTokenLimit(
    model: string,
    data: string,
    proportionOfLimit: number
  ): Promise<string> {
    const contentGenerator = await this.getContentGenerator(model);
    const modelInfo = await contentGenerator.get({ model });
    const contextWindowSize = modelInfo?.inputTokenLimit ?? 1_048_576; 
    const maxTokens = Math.floor(contextWindowSize * proportionOfLimit);

    const { totalTokens } = await contentGenerator.countTokens({
      model,
      contents: [{ role: 'user', parts: [{ text: data }] }]
    });

    if (totalTokens && totalTokens > maxTokens) {
      console.warn(`Paper data exceeds context window (${totalTokens} > ${contextWindowSize}). Trimming references...`);
      const ratio = maxTokens / totalTokens;
      const newLength = Math.floor(data.length * ratio);
      data = data.substring(0, newLength) + '\n...[PAPER TRIMMED DUE TO CONTEXT LIMIT - CHECK SEPARATELY]...';
    }

    return data;
  }

  private async _generateContentWithRetries(
    model: string,
    contents: Content[],
    generateConfig: GenerateContentConfig,
    signal?: AbortSignal,
  ): Promise<GenerateContentResponse> {
    let contentGenerator: ContentGenerator;
    try {
      contentGenerator = await this.getContentGenerator(model);
    } catch (e) {
      return this._createErrorResponse(
        `GeminiClient failed to init for model ${model}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    let currentContents = [...contents];

    
    try {
      const modelInfo = await contentGenerator.get({model: model})
      const maxTokens = modelInfo?.inputTokenLimit;

      if (maxTokens) {
        const toolBeginMarker = await this.config.context.getToolResultPrefix();
        const toolEndMarker = await this.config.context.getToolResultSuffix();

        const markers = [
          { begin: toolBeginMarker, end: toolEndMarker }, 
          { begin: "@DOC/EDIT{", end: "END_EDIT" }, 
        ];

        const limit = maxTokens * 0.99; 
        
        let countRequest: any = { model: model, contents: currentContents };
        let tokenCheck = await contentGenerator.countTokens(countRequest);
        let currentTokens = tokenCheck.totalTokens;

        while (currentTokens && currentTokens > limit) {
          console.warn(`Reducing paper context size. Current: ${currentTokens}, Limit: ${Math.floor(limit)}`);
          currentContents = await this._reduceContents(currentContents, markers);
          countRequest = { model: model, contents: currentContents };
          tokenCheck = await contentGenerator.countTokens(countRequest);
          let newTokens = tokenCheck.totalTokens;

          if (newTokens === currentTokens) {
            console.error('Failed to reduce context. Too much raw data. Aborting.');
            throw new Error('Context reduction failed.');
          }
          currentTokens = newTokens;
        }
      }
    } catch (error) {
      console.error('Error during token count:', error);
    }

    try {
      await this.apiPolicyManager.trackAndApplyPolicy(this.apiName, model);
    } catch (error) {
      if (error instanceof LlmBlockedError) throw error;
      return this._createErrorResponse(`Policy check failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        if (signal?.aborted) throw new DOMException('Verification aborted.', 'AbortError');

        const apiCallPromise = contentGenerator.generateContent({
          model,
          contents: currentContents,
          config: generateConfig,
        } as any);

        let response: GenerateContentResponse;

        if (signal) {
          let abortHandler: () => void;
          const abortPromise = new Promise<never>((_, reject) => {
            abortHandler = () => reject(new DOMException('Request aborted by researcher.', 'AbortError'));
            signal.addEventListener('abort', abortHandler, { once: true });
          });

          try {
            response = await Promise.race([apiCallPromise, abortPromise]);
          } finally {
            signal.removeEventListener('abort', abortHandler!);
          }
        } else {
          response = await apiCallPromise;
        }

        if (!response?.candidates || response.candidates.length === 0) {
          throw new Error('Invalid or empty response during analysis.');
        }
        this.updateTokenUsage(model, response);
        this.apiPolicyManager.reportApiSuccess(this.apiName, model);

        const firstCandidate = response.candidates[0];
        if (firstCandidate?.content?.parts) {
          for (const part of firstCandidate.content.parts) {
            if (part.text) {
              const runawayLoopPattern = /(.)\1{50,}\s*$/;
              if (runawayLoopPattern.test(part.text)) {
                part.text = "[System Note: Response discarded. Encountered synthetic text loop characteristic of hallucinated generation.]";
              } else {
                part.text = part.text.replace(/-{10,}/g, '---');
              }
            }
          }
        }

        return response;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (error instanceof DOMException && error.name === 'AbortError') {
          return this._createErrorResponse('Analysis aborted.');
        }

        try {
          this.apiPolicyManager.reportApiFailure(this.apiName, model);
        } catch (apiError) {
          console.error('CRITICAL failure reporting API drop:', apiError);
        }

        const isContextError = errorMessage.includes('400') && 
                             (errorMessage.includes('exceeds the limit') || 
                              errorMessage.includes('context length') || 
                              errorMessage.includes('prompt is too long'));

        if (isContextError && attempt < MAX_ATTEMPTS) {
          const toolBeginMarker = await this.config.context.getToolResultPrefix();
          const toolEndMarker = await this.config.context.getToolResultSuffix();

          const markers = [
            { begin: toolBeginMarker, end: toolEndMarker }, 
            { begin: "@DOC/EDIT{", end: "END_EDIT" }, 
          ];

          console.warn(`Attempt ${attempt} hit paper context limit. Trimming sections immediately.`);
          currentContents = await this._reduceContents(currentContents, markers);
          continue; 
        }

        if (attempt === MAX_ATTEMPTS) {
          return this._createErrorResponse(`Final attempt (${attempt}) failed. Error: ${errorMessage}`);
        }
        
        let delay: number;
        const defaultDelay = Math.pow(2, attempt) * 1000;
        const apiDelayMs = this._parseRetryDelayFromString(errorMessage);

        if (apiDelayMs !== null) {
          delay = apiDelayMs + 1000;
        } else {
          delay = defaultDelay;
        }

        console.warn(`Analysis attempt ${attempt} failed: ${errorMessage}. Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return this._createErrorResponse('All fraud detection verification attempts failed.');
  }

  public async sendOneShotMessage(
    prompt: string | Part[],
    options?: GenerateContentOptions,
  ): Promise<GenerateContentResponse> {
    const model = options?.model || DEFAULT_GEMINI_FLASH_MODEL;
    
    const toolsArray: Tool[] = [];
    if (options?.enableGrounding) {
        toolsArray.push({ googleSearch: {} }); 
    }

    const generateConfig: GenerateContentConfig = {
      temperature: options?.temperature,
      tools: toolsArray.length > 0 ? toolsArray : undefined,
    };
    if (options?.enableGrounding && generateConfig.temperature === undefined) {
        generateConfig.temperature = 0; 
    }

    const contents: Content[] = [
      {
        role: 'user',
        parts: typeof prompt === 'string' ? [{ text: prompt }] : prompt,
      },
    ];

    return this._generateContentWithRetries(model, contents, generateConfig, options?.signal);
  }

  public async sendTranscriptMessage(
    transcriptManager: TranscriptManager | undefined,
    options?: GenerateContentOptions,
  ): Promise<GenerateContentResponse> {
    const model = options?.model || DEFAULT_GEMINI_FLASH_MODEL;
    const toolsArray: Tool[] = [];
    
    if (options?.enableGrounding) toolsArray.push({ googleSearch: {} });

    if (options?.tools && options.tools.length > 0) {
      toolsArray.push({
        functionDeclarations: options.tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: {
            type: Type.OBJECT,
            properties: Object.entries(tool.parameters.properties).reduce((acc, [key, prop]) => {
              acc[key] = {
                type: Type.STRING, 
                description: prop.description
              };
              return acc;
            }, {} as any),
            required: tool.parameters.required
          }
        }))
      });
    }

    const generateConfig: GenerateContentConfig = {
      temperature: options?.temperature,
      tools: toolsArray.length > 0 ? toolsArray : undefined,
    };
    if (options?.enableGrounding) {
      if (generateConfig.temperature === undefined) generateConfig.temperature = 0;
    }

    const contents: Content[] = this._mapFormattedTranscriptToContent(transcriptManager?.getTranscript() ?? []);
    const response = await this._generateContentWithRetries(model, contents, generateConfig, options?.signal);

    const modelContent = response.candidates?.[0]?.content;
    if (modelContent) {
      const hasFunctionCalls = modelContent.parts?.some(part => !!part.functionCall);

      if (hasFunctionCalls) {
        transcriptManager?.addEntry(modelContent.role ?? 'model', modelContent.parts as any, {}, false);
      } else {
        const newTranscriptEntry = (modelContent.parts ?? [])
          .map(part => ('text' in part ? part.text : ''))
          .join('\n');

        if (newTranscriptEntry === '---The literature verification API was unable to provide a response---') {
          return response;
        }

        const dedupedTranscriptEntry = this._removeRepetitiveBlocks(newTranscriptEntry);
        const cleanTranscriptEntry = (await transcriptManager?.cleanLLMResponse(dedupedTranscriptEntry)) || dedupedTranscriptEntry;

        transcriptManager?.addEntry(modelContent.role ?? 'model', cleanTranscriptEntry, {}, false);

        if (response.candidates?.[0]?.content) {
          response.candidates[0].content.parts = [{ text: cleanTranscriptEntry }];
        }
      }
    }

    return response;
  }
}

