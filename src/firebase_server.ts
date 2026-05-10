
import { randomUUID } from "crypto";
import { credential, type ServiceAccount } from "firebase-admin";
import { AppOptions, initializeApp } from "firebase-admin/app";
import { getDatabase, OnDisconnect } from "firebase-admin/database";
import fs from "fs";
import { isBinaryFileSync } from "isbinaryfile";
import path from "path";
import { Config, DEFAULT_GEMINI_EMBEDDING_MODEL } from "./config/config.js";
import { ProjectAnalysisResult } from "./novum_core/types.js";
import { Orchestrator } from "./novum_core/orchestrator.js";
import { AuthType } from "./services/contentGenerator.js";
import {
  FileChunkData,
  HistoryItem,
  IncomingAction,
  InitialRequestData,
  OutgoingMessage,
  ServerMode,
  SESSION_ROOT_PATH,
  PROJECT_ROOT_PATH,
  ProjectMetadata,
} from "./shared/model.js";
import { deferred } from "./utils/promises.js";
import { generateInvestigationTitle } from "./utils/investigationTitleGenerator.js";
import { clonePaperRepoIntoMemory } from "./utils/paperRepoUtils.js";
import { resolveInvestigationSpecification } from "./utils/investigationSpecResolver.js";
import { fileURLToPath } from "url";


let appOptions: AppOptions = {
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://test-641ce-default-rtdb.firebaseio.com",
};
if (process.env.NODE_ENV === "development") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const saPath = path.resolve(__dirname, "../.firebase-service-account.json");
  if (fs.existsSync(saPath)) {
    const sa = fs.readFileSync(saPath, "utf8");
    appOptions.credential = credential.cert(JSON.parse(sa) as ServiceAccount);
  }
}

const app = initializeApp(appOptions);
const db = getDatabase(app);


type RunningSession = {
  sessionId: string;
  abort: AbortController;
  bus: EventTarget;
  pendingTask?: InitialRequestData;
  runner?: Orchestrator;
  projectId?: string; 
  mode?: ServerMode;
};

const runningSessions: Map<string, RunningSession> = new Map();
const runnerInstanceId = randomUUID();

const SERVER_MAX_DURATION_MS = 55 * 60 * 1000;
const SERVER_GRACE_PERIOD_MS = 5 * 60 * 1000;

export async function runSession(
  sessionId: string,
  takeOverIfActive = false
): Promise<void> {
  if (runningSessions.has(sessionId)) {
    console.log(`Forensic Session ${sessionId} is already active.`);
    return;
  }

  let sessionRef = db.ref(SESSION_ROOT_PATH).child(sessionId);
  let runnerRef = sessionRef.child("metadata/runnerInstanceId");
  let activeRunnerInstanceId = await runnerRef.get();

  if (!takeOverIfActive && activeRunnerInstanceId.exists()) {
    console.log(`Session ${sessionId} is being handled by another forensic instance.`);
    return;
  }

  let sessionCompleteDeferred = deferred<void>();

  let session: RunningSession = {
    abort: new AbortController(),
    bus: new EventTarget(),
    sessionId,
  };

  runningSessions.set(sessionId, session);

  let disc: OnDisconnect | undefined;
  db.ref(".info/connected").on("value", (snapshot) => {
    let connected = !!snapshot.val();
    if (connected) {
      runnerRef.set(runnerInstanceId);
      disc?.cancel();
      disc = runnerRef.onDisconnect();
      disc.set(null);
    }
  });

  let actionQueueRef = sessionRef.child("actionQueue");
  actionQueueRef.on("child_added", async (snapshot) => {
    const action = snapshot.val();
    handleIncomingMessage(sessionId, action)
      .catch(err => console.error(`Error handling action for session ${sessionId}:`, err))
      .finally(() => actionQueueRef.child(snapshot.key!).remove());
  });

  let tornDown = false;
  let teardown = (reason: string) => {
    if (tornDown) return;
    console.log(`Investigation ${sessionId} closed because: ${reason}`);
    tornDown = true;
    runningSessions.delete(sessionId);
    db.ref('.info/connected').off('value');
    disc?.cancel();
    disc = undefined;
    sessionCompleteDeferred.resolve();
    runnerRef.set(null);
  };

  session.bus.addEventListener("sessionComplete", () => teardown("Completed"));
  session.abort.signal.addEventListener("abort", () => {
    sessionRef.child("metadata").update({ status: "failed" });
    sendMessage(
      sessionId,
      JSON.stringify({
        status: "ERROR",
        message: "Investigation aborted.",
      })
    );
    teardown("Aborted");
  });

  return sessionCompleteDeferred.promise;
}

function sendMessage(sessionId: string, message: string): void {
  let sessionRef = db.ref(SESSION_ROOT_PATH).child(sessionId);
  let parsed = JSON.parse(message) as OutgoingMessage;
  sessionRef.child("history").push({
    ...parsed,
    timestamp: Date.now(),
    runnerInstanceId,
  } satisfies HistoryItem);

  if (parsed.status === "COMPLETE_RESULT") {
    sessionRef.child("metadata").update({ modifiedAt: Date.now(), status: "complete" });
    sessionRef.child("result").set({
      ...parsed,
      timestamp: Date.now(),
      runnerInstanceId,
    });
    const session = runningSessions.get(sessionId);
    if (session && session.mode === ServerMode.ANALYZER && session.projectId) {
      const result = (parsed as any).data?.result;
      if (result) {
        const metadataRef = db.ref(PROJECT_ROOT_PATH).child(session.projectId).child("metadata");
        if (typeof result === 'object' && result.title && result.description && result.spec) {
          const analysisResult = result as ProjectAnalysisResult;
          console.log(`[Server] Automatically updating forensic spec for Investigation ${session.projectId}`);
          metadataRef.update({
            title: analysisResult.title,
            description: analysisResult.description,
            spec: analysisResult.spec,
          }).catch(err => console.error(`Failed to update metadata: ${err}`));
        } else if (typeof result === 'string') {
          metadataRef.update({ spec: result }).catch(err => console.error(`Failed to update spec: ${err}`));
        }
      }
    }
  } else if (parsed.status === "HITL_QUESTION") {
    sessionRef.child("metadata").update({ modifiedAt: Date.now(), status: "blocked" });
  } else if (parsed.status === "PROGRESS_UPDATES") {
    sessionRef.child("metadata").transaction((currentData) => {
      if (currentData) {
        currentData.latestUpdate = parsed.completed_status_message || null;
        currentData.modifiedAt = Date.now();
        if (currentData.status !== "complete") currentData.status = "running";
      }
      return currentData;
    });
  } else if (parsed.status === "ERROR") {
    sessionRef.child("metadata").transaction((currentData) => {
      if (currentData) {
        currentData.modifiedAt = Date.now();
        if (currentData.status !== "complete") currentData.status = "failed";
      }
      return currentData;
    });
  } else if (parsed.status !== "WORK_LOG") {
    sessionRef.child("metadata").transaction((currentData) => {
      if (currentData) {
        currentData.modifiedAt = Date.now();
        if (currentData.status !== "complete") currentData.status = "running";
      }
      return currentData;
    });
  }
}

async function handleIncomingMessage(clientUUID: string, parsedMessage: IncomingAction): Promise<void> {
  const session = runningSessions.get(clientUUID);
  if (!session) return;

  try {
    switch (parsedMessage.status) {
      case "ABORT":
        session.abort.abort();
        break;
      case "INITIAL_REQUEST_PARAMS":
        if (parsedMessage.data) handleInitialRequestParams(clientUUID, parsedMessage.data);
        break;
      case "FILE_CHUNK":
        if (parsedMessage.data) handleFileChunk(clientUUID, parsedMessage.data);
        break;
      case "START_TASK":
        handleStartTask(clientUUID);
        break;
      case "HITL_RESPONSE":
        if (parsedMessage.answer !== undefined) handleHitlResponse(clientUUID, parsedMessage.answer);
        break;
      default:
        console.log(`Unknown message type: ${parsedMessage.status}`);
    }
  } catch (error) {
    console.error(`Error parsing message from client ${clientUUID}: ${error}`);
  }
}

async function handleInitialRequestParams(clientUUID: string, requestData: InitialRequestData): Promise<void> {
  let session = runningSessions.get(clientUUID);
  if (!session) return;

  if (session.pendingTask || session.runner) {
    sendMessage(clientUUID, JSON.stringify({ status: "ERROR", message: "Task already running." }));
    return;
  }
  
  requestData.files = [];
  session.pendingTask = requestData;
  sendMessage(clientUUID, JSON.stringify({ status: "PARAMS_RECEIVED", message: "Forensic params received. Awaiting documents." }));
}

async function handleFileChunk(clientUUID: string, chunkData: FileChunkData): Promise<void> {
  const task = runningSessions.get(clientUUID)?.pendingTask;
  if (!task || !chunkData.files) return;
  task.files = (task.files || []).concat(chunkData.files);
  sendMessage(clientUUID, JSON.stringify({ status: "CHUNK_RECEIVED" }));
}

async function handleStartTask(clientUUID: string): Promise<void> {
  const session = runningSessions.get(clientUUID);
  const taskData = session?.pendingTask;
  if (!taskData) return;
  session.pendingTask = undefined;
  await handleInitialRequest(clientUUID, taskData);
}

async function handleInitialRequest(clientUUID: string, requestData: InitialRequestData): Promise<void> {
  let session = runningSessions.get(clientUUID);
  if (!session || session.runner) return;

  let runnerName = 'Forensic Orchestrator';

  try {
    const {
      prompt, llmName, maxTurns, githubUrl, assumptions, files, saveFiles,
      secrets, mode, projectId, projectSpecification: requestInvestigationSpec,
      environmentInstructions, notWorkingBuild, image, imageMimeType, weaveId,
      maxDurationMs, gracePeriodMs
    } = requestData as InitialRequestData & { projectId?: string; mode?: string; projectSpecification?: string };

    
    const investigationSpecification = await resolveInvestigationSpecification(requestInvestigationSpec, weaveId);
    sendMessage(
      clientUUID,
      JSON.stringify({
        status: "WORK_LOG",
        message: `### Establishing Integrity Baseline\nWorking from Forensic Investigation Spec:\n\n${investigationSpecification}`,
      })
    );

    session.projectId = projectId;
    session.mode = mode;

    const isAnalyzer = mode === ServerMode.ANALYZER;
    runnerName = isAnalyzer ? 'Paper Analyzer' : 'Forensic Orchestrator';

    const __run_dirname = path.dirname(fileURLToPath(import.meta.url));
    const assumptionsPath = path.join(__run_dirname, '../src/assets/assumptions/forensic_agent.md');
    const baseAssumptions = fs.existsSync(assumptionsPath) ? fs.readFileSync(assumptionsPath, 'utf-8') : "";
    const combinedAssumptions = `${baseAssumptions}\n${requestData.assumptions || ''}`;

    const requestConfig = new Config({
      sessionId: randomUUID(),
      debugMode: false,
      model: llmName,
      maxTurns: maxTurns ?? 20,
      assumptions: combinedAssumptions,
      embeddingModel: DEFAULT_GEMINI_EMBEDDING_MODEL,
      cwd: process.cwd(),
      question: "",
      fullContext: false,
      fileFiltering: { respectGitIgnore: true, enableRecursiveFileSearch: true },
    });

    await requestConfig.refreshAuth(AuthType.USE_GEMINI, {
      geminiApiKey: secrets.geminiApiKey,
      googleApiKey: secrets.geminiApiKey,
    });

    const geminiClient = await requestConfig.getGeminiClient();
    const fileMap = new Map<string, string>();
    const binaryFileMap = new Map<string, string>();

    
    if (files) {
      files.forEach((file) => {
        const fileBuffer = Buffer.from(file.content, "base64");
        if (isBinaryFileSync(fileBuffer)) {
          binaryFileMap.set(file.name, file.content);
        } else {
          fileMap.set(file.name, fileBuffer.toString("utf-8"));
        }
      });
    }

    const runner = new Orchestrator(
      prompt, image, imageMimeType, fileMap, binaryFileMap, geminiClient,
      (msg) => sendMessage(clientUUID, msg),
      combinedAssumptions ?? "", llmName, saveFiles ?? true, secrets, requestConfig,
      investigationSpecification, environmentInstructions, notWorkingBuild,
      session.abort.signal, mode as ServerMode | undefined, SERVER_MAX_DURATION_MS, SERVER_GRACE_PERIOD_MS
    );

    session.runner = runner;
    sendMessage(clientUUID, JSON.stringify({ status: "WORK_LOG", message: `# ${runnerName} deployed for literature audit:\n${prompt}\n\n` }));

    generateInvestigationTitle(requestData.prompt, geminiClient).then((title) => {
      let sessionRef = db.ref(SESSION_ROOT_PATH).child(clientUUID);
      sessionRef.child("metadata").update({ title });
    });

    runner.run()
      .catch((error) => console.error(`${runnerName} failed:`, error))
      .finally(() => {
        session.bus.dispatchEvent(new Event("sessionComplete"));
        db.ref(SESSION_ROOT_PATH).child(clientUUID).child("metadata").update({ status: "complete" });
      });
  } catch (error) {
    sendMessage(clientUUID, JSON.stringify({ status: "ERROR", message: `Invocation failed: ${error}\n` }));
  }
}

async function handleHitlResponse(clientUUID: string, answer: any): Promise<void> {
  const runner = runningSessions.get(clientUUID)?.runner;
  if (runner && runner instanceof Orchestrator) {
    runner.resolveHitl(answer);
  }
}

function abortSession(sessionId: string): boolean {
  const session = runningSessions.get(sessionId);
  if (session) {
    session.abort.abort();
    return true;
  }
  return false;
}

async function deleteProjectAndDependencies(projectId: string, requesterUid: string): Promise<boolean> {
  const projectRef = db.ref(`${PROJECT_ROOT_PATH}/${projectId}`);
  const metadataRef = projectRef.child("metadata");
  const metadataSnapshot = await metadataRef.get();
  
  if (!metadataSnapshot.exists()) throw new Error(`Investigation ${projectId} not found.`);
  const metadata = metadataSnapshot.val() as ProjectMetadata;
  if (metadata.ownerId !== requesterUid) throw new Error("Authorization failed: Requester is not the owner.");

  const sessionsRef = db.ref(SESSION_ROOT_PATH);
  const sessionsQuery = sessionsRef.orderByChild("metadata/projectId").equalTo(projectId);
  const sessionsSnapshot = await sessionsQuery.get();

  const updates: { [key: string]: null } = {};
  updates[`${PROJECT_ROOT_PATH}/${projectId}`] = null;

  sessionsSnapshot.forEach((childSnapshot) => {
    if (childSnapshot.key) updates[`${SESSION_ROOT_PATH}/${childSnapshot.key}`] = null;
  });

  await db.ref().update(updates);
  return true;
}

export {
  abortSession, deleteProjectAndDependencies, handleFileChunk,
  handleHitlResponse, handleIncomingMessage, handleInitialRequest,
  handleInitialRequestParams, handleStartTask, sendMessage,
};

