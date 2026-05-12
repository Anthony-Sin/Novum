import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import ResearchStepCard from './ResearchStepCard';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, OrbitControls } from '@react-three/drei';
import { ThreeDocument } from './ThreeDocument';
import { wsService, WebSocketMessage } from '../services/websocketService';

import { app } from '../lib/firebase';

const rtdb = getDatabase(app);

interface ResearchThreadProps {
  threadId: string; // Used as sessionId for backend
}

export default function ResearchThread({ threadId }: ResearchThreadProps) {
  const [steps, setSteps] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [threadData, setThreadData] = useState<any>({ prompt: "Investigating paper..." });
  const [arizeSync, setArizeSync] = useState(0.98);

  const stepsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // We still keep listening to firestore for the prompt/title initially
    const threadRef = doc(db, 'threads', threadId);
    const unsubThread = onSnapshot(threadRef, (snap) => {
       const data = snap.data();
       if (data) {
           setThreadData(prev => ({ ...prev, ...data }));
       }
    });

    // 1. Listen to Realtime Database for history/metadata
    const sessionRef = ref(rtdb, `julesmomoa/sessions/${threadId}`);
    
    const handleData = (snap: any) => {
        const val = snap.val();
        if (val) {
            if (val.metadata) {
                if (val.metadata.status === 'running') setIsProcessing(true);
                else setIsProcessing(false);
            }
            if (val.history) {
                const historyArray = Object.values(val.history).sort((a: any, b: any) => a.timestamp - b.timestamp);

                const formattedSteps = historyArray.map((item: any, index) => {
                  return {
                    id: index.toString(),
                    type: item.status === 'ERROR' ? 'reflection' : item.status === 'COMPLETE_RESULT' ? 'result' : 'hypothesis',
                    agentName: item.runnerInstanceId || 'Orchestrator',
                    content: item.completed_status_message || item.current_status_message || item.message || "Working...",
                    findings: []
                  }
                }).filter(s => s.content && s.content.trim() !== "");

                setSteps(formattedSteps);
            }
        }
    };

    onValue(sessionRef, handleData);

    // 2. Setup WebSocket connection for start command and realtime updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    // We connect to the backend node server on port 4001
    wsService.connect(`${protocol}//${host}:4001`);

    const handleWsMessage = (msg: WebSocketMessage) => {
       if (msg.status === 'PARAMS_RECEIVED' || msg.status === 'CHUNK_RECEIVED') {
         setIsProcessing(true);
       }
       if (msg.status === 'WORK_LOG' || msg.status === 'PROGRESS_UPDATES') {
          setArizeSync(prev => Math.min(0.99, prev + 0.01));
       }
       if (msg.status === 'ERROR' || msg.status === 'COMPLETE_RESULT') {
          setIsProcessing(false);
       }
    };

    const removeListener = wsService.addListener(handleWsMessage);

    return () => {
      unsubThread();
      off(sessionRef, 'value', handleData);
      removeListener();
      wsService.disconnect();
    };
  }, [threadId]);

  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  const startInvestigation = () => {
    if (isProcessing) return;
    setIsProcessing(true);

    // We send INITIAL_REQUEST_PARAMS and START_TASK over websocket
    wsService.send({
      status: 'INITIAL_REQUEST_PARAMS',
      data: {
        prompt: threadData?.prompt || "Analyze the target paper",
        llmName: "gemini-3-flash-preview",
        maxTurns: 20
      }
    });

    setTimeout(() => {
      wsService.send({ status: 'START_TASK' });
    }, 1000);
  };

  return (
    <div className="h-full flex flex-row overflow-hidden bg-beige-bg">
      <div className="flex-1 overflow-hidden relative flex flex-col">
        <div className="flex-1 overflow-y-auto px-8 py-12 flex flex-col gap-12">
          {/* Research Objective Header */}
          <div className="max-w-2xl mx-auto w-full space-y-4 text-center border-b border-line pb-12 opacity-80">
            <p className="text-[9px] uppercase font-bold tracking-[0.3em] opacity-40">Forensic Investigation #0x{threadId.slice(-4)}</p>
            <h2 className="font-serif italic text-3xl tracking-tight leading-snug">&quot;{threadData?.title || threadData?.prompt}&quot;</h2>
          </div>

          <div className="max-w-2xl mx-auto w-full space-y-8">
            <AnimatePresence initial={false}>
              {steps.map((step, index) => (
                <div key={step.id}>
                   <ResearchStepCard step={step} index={index} />
                </div>
              ))}
            </AnimatePresence>
            
            {isProcessing && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 opacity-40 ml-6"
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-ink" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest font-mono italic">Agent reasoning loop active...</span>
              </motion.div>
            )}
            <div ref={stepsEndRef} className="h-32 shrink-0" /> {/* Spacer */}
          </div>
        </div>

        {/* Bottom Command Center */}
        <div className="p-6 bg-white/40 backdrop-blur-md border-t border-line">
          <div className="max-w-2xl mx-auto">
            <div className="relative group border border-line bg-white rounded-lg overflow-hidden flex items-stretch focus-within:border-ink transition-all shadow-xl shadow-ink/5">
              <div className="p-4 flex items-center border-r border-line opacity-20">
                 <Zap className="w-4 h-4" />
              </div>
              <input
                value={isProcessing ? "Processing logical instruction..." : undefined}
                placeholder="Inject observation or specific protocol instruction..."
                className="flex-1 bg-transparent px-4 py-4 text-xs font-mono text-ink/60 outline-none placeholder:opacity-20"
                readOnly={isProcessing}
              />
              <button
                onClick={startInvestigation}
                disabled={isProcessing || threadData?.status === 'complete'}
                className={cn(
                  "px-8 py-4 font-bold text-[11px] uppercase tracking-[0.2em] transition-all",
                  isProcessing
                    ? "bg-ink/5 text-ink/20"
                    : "bg-ink text-white hover:bg-zinc-800"
                )}
              >
                {isProcessing ? 'Working' : threadData?.status === 'complete' ? 'Archived' : 'Execute'}
              </button>
            </div>
            <div className="mt-3 flex justify-between items-center px-2">
              <div className="flex gap-4 opacity-20">
                 <span className="text-[8px] font-bold uppercase tracking-widest">Arize Sync: {arizeSync.toFixed(2)}</span>
                 <span className="text-[8px] font-bold uppercase tracking-widest">Logic Drift: 0.02</span>
              </div>
              <div className="text-[8px] font-bold uppercase tracking-widest opacity-20">
                 Protocol: Scientific_Method_v2.4
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Visualizer Panel */}
      <div className="w-1/3 min-w-[300px] border-l border-line bg-[#fbf9f4] relative overflow-hidden hidden lg:block">
         <div className="absolute top-0 left-0 w-full p-4 z-10 flex justify-between items-center bg-gradient-to-b from-[#fbf9f4] to-transparent">
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink/40">3D Artifact Inspection</span>
            {isProcessing && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
         </div>

         <div className="h-full w-full">
            <Canvas>
               <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />
               <OrbitControls enableZoom={false} enablePan={false} />
               <Environment preset="city" />
               <ambientLight intensity={0.5} />
               <directionalLight position={[10, 10, 10]} intensity={1} />
               <ThreeDocument analyzing={isProcessing} />
            </Canvas>
         </div>

         {/* Overlay slide-show of active processes */}
         {isProcessing && (
           <div className="absolute bottom-8 left-4 right-4 bg-white/80 backdrop-blur-md p-4 border border-line rounded shadow-lg pointer-events-none">
             <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="space-y-2"
             >
                <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-ink/60">
                   <span>Active Protocol</span>
                   <Loader2 className="w-3 h-3 animate-spin text-accent" />
                </div>
                <p className="text-xs font-mono truncate">{steps[steps.length - 1]?.content || "Initializing..."}</p>
                <div className="w-full bg-line h-1 rounded-full overflow-hidden">
                   <motion.div
                     className="h-full bg-accent"
                     initial={{ width: "0%" }}
                     animate={{ width: "100%" }}
                     transition={{ duration: 5, repeat: Infinity }}
                   />
                </div>
             </motion.div>
           </div>
         )}
      </div>
    </div>
  );
}
