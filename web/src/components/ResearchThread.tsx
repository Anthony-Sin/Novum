import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { generateResearchStep } from '../services/geminiService';
import ResearchStepCard from './ResearchStepCard';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Zap } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/errorHandlers';
import { cn } from '../lib/utils';

interface ResearchThreadProps {
  threadId: string;
}

export default function ResearchThread({ threadId }: ResearchThreadProps) {
  const [steps, setSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [threadData, setThreadData] = useState<any>(null);

  useEffect(() => {
    const threadRef = doc(db, 'threads', threadId);
    const unsubThread = onSnapshot(threadRef, (snap) => {
      setThreadData(snap.data());
    }, (err) => handleFirestoreError(err, OperationType.GET, `threads/${threadId}`));

    const stepsRef = collection(db, 'threads', threadId, 'steps');
    const q = query(stepsRef, orderBy('createdAt', 'asc'));
    
    const unsubSteps = onSnapshot(q, (snap) => {
      setSteps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, `threads/${threadId}/steps`));

    return () => {
      unsubThread();
      unsubSteps();
    };
  }, [threadId]);

  const runNextStep = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const context = steps.map(s => `${s.agentName} (${s.type}): ${s.content}`).join('\n');
      const nextStep = await generateResearchStep(threadData.prompt, context);
      
      if (nextStep) {
        const stepsRef = collection(db, 'threads', threadId, 'steps');
        await addDoc(stepsRef, {
          ...nextStep,
          threadId,
          createdAt: serverTimestamp(),
        });

        // Update thread status if needed
        if (nextStep.type === 'result') {
          const threadRef = doc(db, 'threads', threadId);
          await updateDoc(threadRef, { status: 'completed', updatedAt: serverTimestamp() });
        } else {
          const threadRef = doc(db, 'threads', threadId);
          await updateDoc(threadRef, { status: 'testing', updatedAt: serverTimestamp() });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `threads/${threadId}/steps`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[50vh]">
      <Loader2 className="w-8 h-8 text-accent animate-spin" />
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden bg-beige-bg">
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 scroll-area px-8 py-12 flex flex-col gap-12">
          {/* Research Objective Header */}
          <div className="max-w-2xl mx-auto w-full space-y-4 text-center border-b border-line pb-12 opacity-80">
            <p className="text-[9px] uppercase font-bold tracking-[0.3em] opacity-40">Forensic Investigation #0x{threadId.slice(-4)}</p>
            <h2 className="font-serif italic text-3xl tracking-tight leading-snug">&quot;{threadData?.prompt}&quot;</h2>
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
          </div>
          
          <div className="h-32 shrink-0" /> {/* Spacer */}
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
              onClick={runNextStep}
              disabled={isProcessing || threadData?.status === 'completed'}
              className={cn(
                "px-8 py-4 font-bold text-[11px] uppercase tracking-[0.2em] transition-all",
                isProcessing 
                  ? "bg-ink/5 text-ink/20" 
                  : "bg-ink text-white hover:bg-zinc-800"
              )}
            >
              {isProcessing ? 'Working' : threadData?.status === 'completed' ? 'Archived' : 'Sequence'}
            </button>
          </div>
          <div className="mt-3 flex justify-between items-center px-2">
            <div className="flex gap-4 opacity-20">
               <span className="text-[8px] font-bold uppercase tracking-widest">Arize Sync: 0.98</span>
               <span className="text-[8px] font-bold uppercase tracking-widest">Logic Drift: 0.02</span>
            </div>
            <div className="text-[8px] font-bold uppercase tracking-widest opacity-20">
               Protocol: Scientific_Method_v2.4
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
