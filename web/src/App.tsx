import { useState, useEffect } from 'react';
import { useFirebase } from './components/FirebaseProvider';
import Sidebar from './components/Sidebar';
import ThreadInput from './components/ThreadInput';
import ResearchThread from './components/ResearchThread';
import { db } from './lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { generateThreadTitle } from './services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { FlaskConical, Github, Twitter, LogIn } from 'lucide-react';
import { handleFirestoreError, OperationType } from './lib/errorHandlers';

export default function App() {
  const { user: realUser, loading: authLoading, signIn } = useFirebase();
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

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
    try {
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
    } catch (err) {
      console.error(err);
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
        <header className="px-6 py-4 border-b border-line flex justify-between items-center bg-beige-bg/90 backdrop-blur-sm z-40">
          <div className="flex items-center gap-3">
            <h1 className="text-xs font-bold tracking-widest uppercase opacity-80">Novum</h1>
            <span className="w-px h-3 bg-line" />
            <p className="text-[9px] uppercase tracking-[0.2em] opacity-40 font-bold">Paper Forensics</p>
          </div>
          
          <div className="flex items-center gap-3">
            <p className="text-[9px] font-bold opacity-30 uppercase tracking-tighter">{user.displayName}</p>
            <img 
              src={user.photoURL || ''} 
              alt={user.displayName || ''} 
              className="w-5 h-5 rounded-full grayscale opacity-40"
            />
          </div>
        </header>

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

        <footer className="px-6 py-3 border-t border-line flex justify-center items-center">
          <p className="text-[8px] uppercase tracking-[0.4em] opacity-10 font-bold">Novum Paper Forensics</p>
        </footer>
      </main>
    </div>
  );
}
