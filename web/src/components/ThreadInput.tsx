import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Paperclip, Search, FlaskConical, Loader2, Sparkles, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ThreadInputProps {
  onStart: (prompt: string, paperUrl: string) => void;
  isStarting?: boolean;
  initialPaperUrl?: string;
}

export default function ThreadInput({ onStart, isStarting, initialPaperUrl = '' }: ThreadInputProps) {
  const [prompt, setPrompt] = useState('');
  const [paperUrl, setPaperUrl] = useState(initialPaperUrl);
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const [urlStatus, setUrlStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialPaperUrl) {
      setPaperUrl(initialPaperUrl);
      validateUrl(initialPaperUrl);
    }
  }, [initialPaperUrl]);

  const validateUrl = (url: string) => {
    if (!url.trim()) {
      setUrlStatus('idle');
      return;
    }
    // Simple mock validation logic: checking for doi or general format
    setIsValidatingUrl(true);
    setTimeout(() => {
      const isValid = url.includes('doi') || url.includes('.') || url.length > 5;
      setUrlStatus(isValid ? 'valid' : 'invalid');
      setIsValidatingUrl(false);
    }, 400); // Simulate network delay
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPaperUrl(val);
    if (val.trim() === '') {
        setUrlStatus('idle');
    }
  };

  useEffect(() => {
      const handler = setTimeout(() => {
          if (paperUrl.trim()) validateUrl(paperUrl);
      }, 500); // debounce validation

      return () => clearTimeout(handler);
  }, [paperUrl]);


  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [prompt]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (prompt.trim() && paperUrl.trim() && !isStarting) {
      onStart(prompt.trim(), paperUrl.trim());
      setPrompt('');
      setPaperUrl('');
    }
  };

  const examples = [
    {
      title: "Paper Mill Detection",
      prompt: "Investigate the target paper for signs of paper mill generation, including tortured phrases and impossible datasets.",
      icon: <AlertCircle className="w-3.5 h-3.5" />
    },
    {
      title: "Methodology Audit",
      prompt: "Benchmark the reported methodologies against standard protocols to identify falsified methodologies.",
      icon: <FlaskConical className="w-3.5 h-3.5" />
    },
    {
      title: "Reference Truncation Analysis",
      prompt: "Analyze the references and citation network to verify authenticity and identify citation cartels.",
      icon: <Search className="w-3.5 h-3.5" />
    }
  ];

  return (
    <div className="w-full max-w-3xl px-8 flex flex-col items-center pt-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full space-y-8 mb-8 text-center"
      >
        <div className="space-y-4">
          <motion.h2
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="font-serif italic text-4xl lg:text-5xl text-ink tracking-tight leading-tight max-w-2xl mx-auto"
          >
            Systematic Forensics for Scientific Papers
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[10px] uppercase tracking-[0.4em] font-bold text-accent/80"
          >
            Identify Paper Mills // Avoid Wasting Millions // Zero-Bias Observation
          </motion.p>
        </div>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        onSubmit={handleSubmit} 
        className="w-full glass-panel rounded-xl shadow-2xl shadow-accent/10 p-2 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/30 transition-all duration-500 relative overflow-visible"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] focus-within:animate-shimmer pointer-events-none rounded-xl" />
        <div className="flex flex-col gap-3 p-5 relative z-10">
          <div className="space-y-5 relative">
            <div className="relative flex items-center gap-2 group/input">
              <input
                type="text"
                value={paperUrl}
                onChange={handleUrlChange}
                placeholder="Target paper DOI or URL required"
                className="w-full bg-transparent outline-none border-b border-line pb-2 font-mono text-xs text-ink placeholder:text-ink/30 focus:border-accent transition-colors pr-8"
              />
              <div className="relative group/info cursor-help shrink-0 pb-2">
                <Info className="w-4 h-4 text-ink/40 hover:text-accent transition-colors" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-ink text-white text-[10px] leading-relaxed p-3 rounded shadow-xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-300 z-50 pointer-events-none">
                  Harness the power of the CORE API to streamline paper processing and academic discovery. Link a target research paper (via DOI or URL) to initialize an autonomous forensic analysis of its methodologies, claims, and references.
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-ink" />
                </div>
              </div>
              <div className="absolute right-6 top-0 bottom-2 flex items-center pr-1">
                <AnimatePresence mode="wait">
                  {isValidatingUrl ? (
                    <motion.div key="loading" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                      <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
                    </motion.div>
                  ) : urlStatus === 'valid' ? (
                    <motion.div key="valid" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    </motion.div>
                  ) : urlStatus === 'invalid' ? (
                    <motion.div key="invalid" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            <textarea
              ref={textareaRef}
              rows={1}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Describe your forensic objective (e.g. check for manipulated data)..."
              className="w-full bg-transparent outline-none resize-none font-serif italic text-lg lg:text-xl text-ink placeholder:text-ink/20 focus:placeholder:opacity-50 transition-all"
            />
          </div>
          
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-line/50">
            <div className="flex gap-6 opacity-60">
              <div className="relative group/icon cursor-pointer">
                <Paperclip className="w-4 h-4 hover:text-accent hover:scale-110 transition-all duration-300" />
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-ink text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover/icon:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Attach File</span>
              </div>
              <div className="relative group/icon cursor-pointer">
                <Search className="w-4 h-4 hover:text-accent hover:scale-110 transition-all duration-300" />
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-ink text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover/icon:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Deep Search</span>
              </div>
              <div className="relative group/icon cursor-pointer">
                <FlaskConical className="w-4 h-4 hover:text-accent hover:scale-110 transition-all duration-300" />
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-ink text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover/icon:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Experimental</span>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={!prompt.trim() || !paperUrl.trim() || isStarting}
              className={cn(
                "relative overflow-hidden flex items-center gap-2 px-6 py-2 rounded-sm font-bold text-[10px] uppercase tracking-[0.2em] transition-all duration-500",
                (prompt.trim() && paperUrl.trim() && !isStarting)
                  ? "bg-accent text-white hover:bg-accent/90 shadow-[0_0_15px_rgba(58,109,115,0.4)] animate-pulse-glow"
                  : "bg-ink/5 text-ink/20 cursor-not-allowed"
              )}
            >
              {(prompt.trim() && paperUrl.trim() && !isStarting) && (
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] animate-shimmer pointer-events-none" />
              )}
              {isStarting ? (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Initializing...</span>
                </motion.div>
              ) : (
                <>
                  Execute
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.form>

      <div className="w-full mt-12 space-y-6">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 whitespace-nowrap">Forensic Protocols</span>
          <div className="h-px bg-line w-full" />
        </div>
        
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, staggerChildren: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {examples.map((ex, i) => (
            <button
              key={i}
              onClick={() => {
                setPrompt(ex.prompt);
                textareaRef.current?.focus();
              }}
              className="text-left p-5 border border-line rounded-lg hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(58,109,115,0.1)] hover:border-accent/40 bg-white/20 backdrop-blur-sm transition-all duration-300 group relative overflow-hidden h-full flex flex-col justify-between forensic-card"
            >
              <div className="opacity-40 mb-4 group-hover:opacity-100 group-hover:text-accent transition-all duration-300 transform group-hover:scale-110 origin-left">
                {ex.icon}
              </div>
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-ink group-hover:text-accent transition-colors mb-1">{ex.title}</h4>
                <p className="font-serif italic text-xs leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity whitespace-normal line-clamp-3">
                  &quot;{ex.prompt}&quot;
                </p>
              </div>
            </button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
