
import { GeminiClient } from '../services/geminiClient.js';
import { TranscriptManager } from '../services/transcriptManager.js';
import { UserSecrets } from '../shared/model.js';
import { Overseer } from './overseer.js';
export interface ResearchFinding {
  question:  string;
  answer:    string;
  flaggedAt: Date;
}

export interface FileContent {
  path: string;
  content: string;
}

export interface MarkerPair {
  begin: string;
  end: string;
}

export interface Expert {
  name: string;
  transcript: TranscriptManager;
  model?: string | undefined;
  inRoomTemperature?: number | undefined ;
}

export interface FileSummary {
  filename: string,
  description?: string | undefined,
  detailedSummary?: string | undefined,
  relatedFiles?: string | undefined
}

export interface FAQ {
  question: string,
  answer: string,
  created: Date
}

export enum GuidanceType {
  StandardOverseerGuidance = 'OVERSEER_GUIDANCE',
  ForcedUserGuidance = 'FORCED_USER_GUIDANCE'
}

export interface OverseerFeedback {
  action: string;
  reasoning: string;
  guidance?: string;
  type: GuidanceType;
}

export enum VerbosityType {
  Verbose = 'VERBOSE',
  AISummarize = 'AI_SUMMARIZE',
  Quiet = 'QUIET'
}

export interface MultiAgentToolContext {
  initialPrompt: string;
  initialImage?: string;
  initialImageMimeType?: string;
  fileMap: Map<string, string>;
  binaryFileMap: Map<string, string>;
  editedFilesSet: Set<string>;
  originalFilesSet: Set<string>;
  originalFileMap: Map<string, string>;
  originalBinaryFileMap: Map<string, string>;
  sendMessage: (message: string) => void;
  multiAgentGeminiClient: GeminiClient;
  experts: string[];
  transcriptsToUpdate: TranscriptManager[];
  transcriptForContext: TranscriptManager;
  overseer: Overseer | undefined;
  saveFileResolver: ((outcome: ToolConfirmationOutcome) => void) | null;
  infrastructureContext: InfrastructureContext;
  saveFiles: boolean;
  assumptions?: string;
  secrets: UserSecrets;
  projectSpecification?: string;
  environmentInstructions?: string;
  investigationHalted?: boolean;
  signal?: AbortSignal;
  projectDeadlineMs?: number;
  gracePeriodMs?: number;
}

export interface FuzzyReplaceResult {
  error?: string, 
  modifiedString?: string, 
  multipleMatches?: string[]
}

export enum FileOperation {
  Edit = 'Edit',
  Delete = 'Delete',
  Create = 'Create',
  Move = 'Move'
}

export enum ToolConfirmationOutcome {
  ProceedOnce = 'proceed_once',
  ProceedAlways = 'proceed_always',
  ProceedAlwaysServer = 'proceed_always_server',
  ProceedAlwaysTool = 'proceed_always_tool',
  ModifyWithEditor = 'modify_with_editor',
  Cancel = 'cancel',
  CancelAndRevert = 'cancel_and_revert',
}

export interface MultiAgentToolResult {
  result: string,
  transcriptReplacementID?: string,
  transcriptReplacementString?: string
}

interface SuccessfulToolParsing {
  success: true;
  params: Record<string, unknown | string[]>;
}

interface FailedToolParsing {
  success: false;
  error: string;
}

export interface AssetPurpose {
  id: string;
  purpose: string;
}

export type ToolParsingResult = SuccessfulToolParsing | FailedToolParsing;

export const USER_ROLE = 'user';
export const MODEL_ROLE = 'model';

export const CLIENT_CHAT_PROMPT = `You are an expert Research Integrity Investigator. Another agent on your forensic team has been asked to complete a specific audit task within the context of a larger overarching Research Misconduct Investigation. You are their representative responsible for answering questions related to the investigation, the specific forensic task, and how the task was completed (the audit may still be in progress).`;

export interface FormattedTranscriptPart {
  text?: string;
  inlineData?: { mimeType: string; data: string; };
  functionCall?: FunctionCall;
  functionResponse?: ToolResult;
}

export interface FormattedTranscriptEntry {
  role: string;
  parts: FormattedTranscriptPart[];
  ephemeral?: boolean;
}

export interface ToolProperty {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  description: string;
  items?: {
    type: 'string' | 'number' | 'integer' | 'boolean' | 'object';
  };
  properties?: Record<string, ToolProperty>;
  required?: string[];
}

export interface ToolFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolProperty>;
    required: string[];
  };
}

export interface FunctionCall {
  name: string;
  args: Record<string, string | string[]>;
}

export interface ToolResult {
  role: string;
  name: string;
  response: string;
  filename?: string;
}

export interface ModifySpecResult {
  full_content: string;
  reason: string;
}

export interface ProjectAnalysisResult {
  title: string;
  description: string;
  spec: string;
}


export const READ_FILES_TOOL_NAME = 'read_file';
export const MODIFY_SPEC_TOOL_NAME = 'modify_spec';

export interface InfrastructureContext {
  getToolNames(): string[];
  getToolResultPrefix(): Promise<string>;
  getToolResultSuffix(): Promise<string>;
  getAssetString(name: string): Promise<string>;
  getSessionId(): string;
}

export interface GeminiClientConfig {
  apiKey: string;
  context: InfrastructureContext;
}

export interface TranscriptManagerConfig {
  context: InfrastructureContext;
}

