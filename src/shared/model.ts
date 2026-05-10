export const SESSION_ROOT_PATH = "julesmomoa/sessions";
export const USERINFO_ROOT_PATH = "julesmomoa/userinfo";
export const PROJECT_ROOT_PATH = "julesmomoa/projects";

export type IncomingAction = {
  status:
    | "INITIAL_REQUEST_PARAMS"
    | "FILE_CHUNK"
    | "START_TASK"
    | "HITL_RESPONSE"
    | "ABORT"
    | (string & {});
  data?: any; 
  messageId?: string;
  answer?: any;
};

export enum ServerMode {
   ORCHESTRATOR = 'orchestrator',
   ANALYZER = 'analyzer',
   ENRICH_AND_DECONSTRUCT = "ENRICH_AND_DECONSTRUCT",
   IDENTIFY_NEXT_TASK = "IDENTIFY_NEXT_TASK"
};

export interface InitialRequestData {
  prompt: string;
  image?: string; 
  imageMimeType?: string; 
  llmName: string;
  githubUrl?: string;
  maxTurns?: number;
  assumptions?: string; 
  files?: { name: string; content: string }[]; 
  saveFiles?: boolean;
  secrets: UserSecrets;
  mode?: ServerMode; 
  projectId?: string;
  projectSpecification?: string;
  environmentInstructions?: string;
  notWorkingBuild?: boolean;
  weaveId?: string;
  maxDurationMs?: number;
  gracePeriodMs?: number;
}

export interface UserSecrets {
  geminiApiKey: string;
  julesApiKey: string;
  githubToken: string;
  stitchApiKey: string;
  e2BApiKey: string;
  githubScratchPadRepo: string;
}

export interface FileChunkData {
  files: { name: string; content: string }[];
}

export interface ProjectMetadata {
  title: string;
  description: string;
  ownerId: string;
  repoPath?: string;
  githubUrl?: string;
}


export interface OutgoingMessage {
  
  status:
    | "USER_MESSAGE"
    | "WORK_LOG"
    | "ERROR"
    | "PROGRESS_UPDATES"
    | 'HITL_QUESTION'
    | "COMPLETE_RESULT"
    | (string & {});
  
  message?: string;
  
  completed_status_message?: string;
  current_status_message?: string;
  
  data?: {
    feedback?: string;
    files?: string;
    result?: string;
    retrospective?: string;
  };
}

export interface HistoryItem extends OutgoingMessage {
  timestamp: number;
  runnerInstanceId: string;
}

