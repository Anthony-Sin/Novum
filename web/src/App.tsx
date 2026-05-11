import { useState, useEffect } from 'react';
import { useFirebase } from './components/FirebaseProvider';
import Sidebar from './components/Sidebar';
import ThreadInput from './components/ThreadInput';
import ResearchThread from './components/ResearchThread';
import { db } from './lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { generateThreadTitle } from './services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { FlaskConical, Github, Twitter, LogIn, AlertTriangle, X } from 'lucide-react';
import { handleFirestoreError, OperationType } from './lib/errorHandlers';

export default function App() {
  const { user: realUser, loading: authLoading, signIn } = useFirebase();
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Mock user for demo purposes if not signed in
  const user = realUser || { 
    uid: 'demo-user', 
    displayName: 'Anthony Sinchi', 
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anthony' 
  };

  useEffect(() => {
    const q = query(
      collection(db, 'threads'),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setThreads(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      // Handle error quietly for demo
    });

    return () => unsubscribe();
  }, [user.uid]);

  const [selectedPaperUrl, setSelectedPaperUrl] = useState<string | undefined>();

  const handleStartThread = async (prompt: string, paperUrl: string) => {
    setIsStarting(true);
    setApiError(null);
    try {
      // Basic validation format before starting
      const isDoi = paperUrl.includes('doi') || paperUrl.includes('10.');
      if (isDoi) {
         const extractedDoi = paperUrl.replace(/^(https?:\/\/)?(dx\.)?doi\.org\//i, '');
         try {
             // Let's call the backend to see if it's a valid DOI that CORE API can resolve.
             const res = await fetch(`/api/search-paper?doi=${encodeURIComponent(extractedDoi)}`);
             if (!res.ok) {
                 const errData = await res.json();
                 throw new Error(errData.error || 'Failed to resolve DOI');
             }
         } catch(e: any) {
             throw new Error(e.message || "Failed to validate paper. Ensure it exists in the open access repository.");
         }
      }

      const fullPrompt = `Research Objective: ${prompt}\n\nTarget Paper: ${paperUrl}`;
      const title = await generateThreadTitle(prompt);
      const threadRef = await addDoc(collection(db, 'threads'), {
        userId: user.uid,
        title,
        prompt: fullPrompt,
        status: 'idle',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setActiveThreadId(threadRef.id);
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || 'An unexpected error occurred while initializing the forensic process.');
      setTimeout(() => setApiError(null), 8000);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="flex h-screen bg-beige-bg overflow-hidden text-ink font-sans">
      <Sidebar 
        threads={threads} 
        activeId={activeThreadId || undefined} 
        onNew={() => setActiveThreadId(null)}
        onSelect={setActiveThreadId}
        onSelectPaper={(url) => {
          setSelectedPaperUrl(url);
          setActiveThreadId(null);
        }}
      />

      <main className="flex-1 ml-12 lg:ml-14 relative flex flex-col transition-all duration-300">

        {/* Error Toast */}
        <AnimatePresence>
          {apiError && (
            <motion.div
              initial={{ opacity: 0, y: -50, x: '-50%' }}
              animate={{ opacity: 1, y: 24, x: '-50%' }}
              exit={{ opacity: 0, y: -50, x: '-50%' }}
              className="fixed top-0 left-1/2 z-50 animate-jiggle"
            >
              <div className="bg-red-50/90 backdrop-blur-md border border-red-200 shadow-[0_8px_32px_rgba(220,38,38,0.15)] rounded-lg px-4 py-3 flex items-center gap-3 text-red-800 max-w-md w-[90vw]">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                <p className="text-[11px] font-medium leading-snug flex-1">{apiError}</p>
                <button onClick={() => setApiError(null)} className="p-1 hover:bg-red-100 rounded-md transition-colors shrink-0">
                  <X className="w-3.5 h-3.5 opacity-60" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="px-6 py-4 border-b border-line flex justify-between items-center bg-beige-bg/90 backdrop-blur-sm z-40"
        >
          <div className="flex items-center gap-3">
            <h1 className="text-xs font-bold tracking-widest uppercase opacity-80 text-accent">Novum</h1>
            <span className="w-px h-3 bg-line" />
            <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 font-bold">Paper Forensics</p>
          </div>
          
          <div className="flex items-center gap-3">
            <p className="text-[9px] font-bold opacity-30 uppercase tracking-tighter">{user.displayName}</p>
            <img 
              src={user.photoURL || ''} 
              alt={user.displayName || ''} 
              className="w-5 h-5 rounded-full grayscale opacity-40 hover:grayscale-0 transition-all duration-500 hover:scale-110"
            />
          </div>
        </motion.header>

        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeThreadId ? (
              <motion.div
                key="thread"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <ResearchThread threadId={activeThreadId} />
              </motion.div>
            ) : (
              <motion.div
                key="input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center"
              >
                <ThreadInput onStart={handleStartThread} isStarting={isStarting} initialPaperUrl={selectedPaperUrl} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="px-6 py-3 border-t border-line flex justify-center items-center bg-beige-bg/80 backdrop-blur-sm z-10"
        >
          <p className="text-[8px] uppercase tracking-[0.4em] opacity-20 font-bold hover:opacity-50 transition-opacity cursor-default">Novum Paper Forensics // System Active</p>
        </motion.footer>
      </main>
    </div>
  );
}
