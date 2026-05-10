
import WebSocket, { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import * as http from 'http';
import { Orchestrator } from './novum_core/orchestrator.js';
import { Config, DEFAULT_GEMINI_EMBEDDING_MODEL } from './config/config.js';
import { AuthType } from './services/contentGenerator.js';
import { randomUUID } from 'crypto';
import { isBinaryFileSync } from 'isbinaryfile';
import { ServerMode, UserSecrets } from './shared/model.js';

interface WebSocketMessage {
  status: 'INITIAL_REQUEST_PARAMS' | 'FILE_CHUNK' | 'START_TASK' | 'HITL_RESPONSE' | string;
  data?: any;
  messageId?: string;
  answer?: any;
}

interface InitialRequestData {
  prompt: string;
  image: string;
  imageMimeType: string;
  llmName: string;
  maxTurns?: number;
  assumptions?: string;
  files?: { name: string, content: string }[];
  apiKey?: string;
  saveFiles?: boolean; 
  mode?: ServerMode;
  projectSpecification?: string;
  environmentInstructions?: string;
  notWorkingBuild?: boolean;
  weaveId?: string;
  maxDurationMs?: number;
  gracePeriodMs?: number;
}

interface FileChunkData {
  files: { name: string, content: string }[];
}

const clients: Map<string, WebSocket> = new Map();
const orchestratorInstances: Map<string, Orchestrator> = new Map();
const abortControllers: Map<string, AbortController> = new Map();
const pendingTasks: Map<string, InitialRequestData> = new Map();

function initializeWebSocketServer(port: number, httpServer: http.Server | null = null): void {
  const wss = httpServer ? new WebSocketServer({ server: httpServer }) : new WebSocketServer({ port });

  wss.on('error', (error: Error) => console.error(`WebSocket server error: ${error.message}`));

  wss.on('connection', (ws: WebSocket) => {
    const uuid = uuidv4();
    clients.set(uuid, ws);
    console.log(`Forensic Client connected: ${uuid}`);

    ws.on('message', (message: WebSocket.RawData) => handleIncomingMessage(uuid, message));

    ws.on('close', () => {
      console.log(`Client disconnected: ${uuid}`);
      const controller = abortControllers.get(uuid);
      if (controller) controller.abort();
      clients.delete(uuid);
      orchestratorInstances.delete(uuid);
      abortControllers.delete(uuid);
      pendingTasks.delete(uuid);
    });

    ws.on('error', (error: Error) => {
      console.error(`WebSocket error for client ${uuid}: ${error.message}`);
      const controller = abortControllers.get(uuid);
      if (controller) controller.abort();
      orchestratorInstances.delete(uuid);
      abortControllers.delete(uuid);
      clients.delete(uuid);
      pendingTasks.delete(uuid);
    });
  });

  console.log(`Forensic WebSocket active on port ${port}`);
}

function sendMessage(clientUUID: string, message: string): void {
  const ws = clients.get(clientUUID);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(message);
  }
}

async function handleIncomingMessage(clientUUID: string, message: WebSocket.RawData): Promise<void> {
  try {
    const parsedMessage: WebSocketMessage = JSON.parse(message.toString());
    switch (parsedMessage.status) {
      case 'INITIAL_REQUEST_PARAMS':
        if (parsedMessage.data) handleInitialRequestParams(clientUUID, parsedMessage.data);
        break;
      case 'FILE_CHUNK':
        if (parsedMessage.data) handleFileChunk(clientUUID, parsedMessage.data);
        break;
      case 'START_TASK':
        handleStartTask(clientUUID);
        break;
      case 'HITL_RESPONSE':
        if (parsedMessage.answer !== undefined) handleHitlResponse(clientUUID, parsedMessage.answer);
        break;
      default:
        console.log(`Unknown message type: ${parsedMessage.status}`);
    }
  } catch (error) {
    console.error(`Error parsing message from client ${clientUUID}:`, error);
  }
}

async function handleInitialRequestParams(clientUUID: string, requestData: InitialRequestData): Promise<void> {
  if (orchestratorInstances.has(clientUUID) || pendingTasks.has(clientUUID)) {
    sendMessage(clientUUID, JSON.stringify({ status: 'ERROR', message: 'Investigation already active.' }));
    return;
  }
  requestData.files = [];
  pendingTasks.set(clientUUID, requestData);
  sendMessage(clientUUID, JSON.stringify({ status: 'PARAMS_RECEIVED', message: 'Forensic parameters loaded.' }));
}

async function handleFileChunk(clientUUID: string, chunkData: FileChunkData): Promise<void> {
  const task = pendingTasks.get(clientUUID);
  if (!task || !chunkData.files) return;
  task.files = (task.files || []).concat(chunkData.files);
  sendMessage(clientUUID, JSON.stringify({ status: 'CHUNK_RECEIVED' }));
}

async function handleStartTask(clientUUID: string): Promise<void> {
  const taskData = pendingTasks.get(clientUUID);
  if (!taskData) return;
  pendingTasks.delete(clientUUID);
  await handleInitialRequest(clientUUID, taskData);
}

async function handleInitialRequest(clientUUID: string, requestData: InitialRequestData): Promise<void> {
  if (orchestratorInstances.has(clientUUID)) return;

  try {
    const { prompt, image, imageMimeType, llmName, maxTurns, assumptions, files, saveFiles, mode, projectSpecification, environmentInstructions, notWorkingBuild, maxDurationMs, gracePeriodMs } = requestData;
    const requestConfig = new Config({
      sessionId: randomUUID(), debugMode: false, model: llmName, maxTurns: maxTurns ?? 20, assumptions: assumptions,
      embeddingModel: DEFAULT_GEMINI_EMBEDDING_MODEL, cwd: process.cwd(), question: '', fullContext: false,
    });

    await requestConfig.refreshAuth(AuthType.USE_GEMINI);
    const geminiClient = await requestConfig.getGeminiClient();
    const controller = new AbortController();

    const fileMap = new Map<string, string>();
    const binaryFileMap = new Map<string, string>();
    
    if (files) {
      files.forEach(file => {
        const fileBuffer = Buffer.from(file.content, 'base64');
        if (isBinaryFileSync(fileBuffer)) binaryFileMap.set(file.name, file.content);
        else fileMap.set(file.name, fileBuffer.toString('utf-8'));
      });
    }

    const secrets: UserSecrets = {
      geminiApiKey: process.env.GEMINI_API_KEY || '', julesApiKey: process.env.JULES_API_KEY || '',
      githubToken: process.env.GITHUB_TOKEN || '', stitchApiKey: process.env.STITCH_API_KEY || '',
      e2BApiKey: process.env.E2B_API_KEY || '', githubScratchPadRepo: process.env.GITHUB_SCRATCHPAD_REPO || '',
    };

    const orchestrator = new Orchestrator(
      prompt, image, imageMimeType, fileMap, binaryFileMap, geminiClient, (msg) => sendMessage(clientUUID, msg),
      assumptions ?? '', llmName, saveFiles ?? false, secrets, requestConfig, projectSpecification ?? "", environmentInstructions, notWorkingBuild, controller.signal, mode, maxDurationMs, gracePeriodMs
    );

    orchestratorInstances.set(clientUUID, orchestrator);
    abortControllers.set(clientUUID, controller);

    sendMessage(clientUUID, JSON.stringify({ status: 'WORK_LOG', message: `# Document Validation Orchestrator Active\nChecking references, logic flow, and data sets for: \n${prompt}\n\n` }));

    orchestrator.run().catch(err => {
      sendMessage(clientUUID, JSON.stringify({ status: 'ERROR', message: `Audit failed: ${err}\n` }));
    }).finally(() => { try { orchestratorInstances.delete(clientUUID); abortControllers.delete(clientUUID); } catch (e) { console.error("Error during teardown:", e); } });
  } catch (error) {
    sendMessage(clientUUID, JSON.stringify({ status: 'ERROR', message: `Server error: ${error}\n` }));
  }
}

async function handleHitlResponse(clientUUID: string, answer: any): Promise<void> {
  const orchestrator = orchestratorInstances.get(clientUUID);
  if (orchestrator) orchestrator.resolveHitl(answer);
}

export { initializeWebSocketServer, handleIncomingMessage, handleInitialRequestParams, handleFileChunk, handleStartTask, handleInitialRequest, handleHitlResponse, sendMessage };


