import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Paperclip, Search, FlaskConical, Loader2, AlertCircle, CheckCircle2, Info, Library, ExternalLink, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export interface Paper {
  id: string;
  title: string;
  authors?: { name: string }[];
  doi?: string;
  downloadUrl?: string;
  url?: string;
}

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

  const [latestPapers, setLatestPapers] = useState<Paper[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [papersError, setPapersError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPapers = async () => {
      setLoadingPapers(true);
      setPapersError(null);
      try {
        const res = await fetch('/api/latest-papers?limit=4');
        if (!res.ok) throw new Error('Failed to fetch papers');
        const data = await res.json();
        if (isMounted) setLatestPapers(data);
      } catch (err) {
        console.error("Failed to fetch latest papers:", err);
        if (isMounted) setPapersError("Could not load latest repository items.");
      } finally {
        if (isMounted) setLoadingPapers(false);
      }
    };
    fetchPapers();
    return () => { isMounted = false; };
  }, []);

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
          <div className="space-y-4 relative">
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

            <div className="relative flex items-center gap-3 group/input bg-white/40 border border-line/60 rounded-md px-3 py-2.5 focus-within:border-accent focus-within:bg-white/60 transition-all duration-300 shadow-inner">
              <div className="relative group/info cursor-help shrink-0">
                <Info className="w-3.5 h-3.5 text-accent/60 hover:text-accent transition-colors" />
                <div className="absolute left-0 bottom-full mb-2 w-64 bg-ink text-white text-[10px] leading-relaxed p-3 rounded shadow-xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-300 z-50 pointer-events-none">
                  Harness the power of the CORE API to streamline paper processing and academic discovery. Link a target research paper (via DOI or URL) to initialize an autonomous forensic analysis of its methodologies, claims, and references.
                  <div className="absolute top-full left-3 border-4 border-transparent border-t-ink" />
                </div>
              </div>
              <input
                type="text"
                value={paperUrl}
                onChange={handleUrlChange}
                placeholder="Target paper DOI or URL required"
                className="flex-1 bg-transparent outline-none font-mono text-[11px] text-ink placeholder:text-ink/40 focus:border-accent transition-colors min-w-0"
              />
              <div className="flex items-center shrink-0">
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

      {/* Library / Recent Papers Section */}
      <div className="w-full mt-16 space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 opacity-40">
            <Library className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap">Repository Archive</span>
          </div>
          <div className="h-px bg-line w-full" />
        </div>
        
        {loadingPapers ? (
           <div className="flex items-center justify-center gap-3 py-8 text-ink/30">
              <Loader2 className="w-5 h-5 animate-spin" />
              <p className="text-xs font-serif italic">Accessing global research index...</p>
           </div>
        ) : papersError ? (
           <div className="flex items-center justify-center gap-3 py-8 text-red-500/50">
              <AlertCircle className="w-5 h-5" />
              <p className="text-xs font-serif italic">{papersError}</p>
           </div>
        ) : latestPapers.length === 0 ? (
           <div className="flex items-center justify-center py-8 text-ink/30">
              <p className="text-xs font-serif italic">No recent papers discovered in the repository.</p>
           </div>
        ) : (
          <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, staggerChildren: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {latestPapers.map((paper, i) => {
              const doiLink = paper.doi ? `https://doi.org/${paper.doi}` : paper.id;
              const hasPdf = !!paper.downloadUrl;
              const hasLink = !!paper.doi || !!paper.url || !!paper.id;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + (i * 0.1) }}
                  className="group relative flex flex-col justify-between p-5 border border-line rounded-lg hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(58,109,115,0.1)] hover:border-accent/40 bg-white/30 backdrop-blur-sm transition-all duration-300"
                >
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start justify-between gap-4">
                      <h4 className="text-xs font-bold text-ink leading-tight line-clamp-2 group-hover:text-accent transition-colors">
                        {paper.title}
                      </h4>
                    </div>
                    {paper.authors && paper.authors.length > 0 && (
                      <p className="font-serif italic text-xs leading-relaxed opacity-60 line-clamp-1">
                         {paper.authors.map((a) => a.name).join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-auto pt-4 border-t border-line/50">
                     {hasPdf && (
                       <a
                         href={paper.downloadUrl}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-ink/60 hover:text-accent transition-colors"
                         onClick={(e) => e.stopPropagation()}
                       >
                         <FileText className="w-3.5 h-3.5" />
                         PDF
                       </a>
                     )}
                     {hasLink && (
                       <a
                         href={paper.url || doiLink}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-ink/60 hover:text-accent transition-colors"
                         onClick={(e) => e.stopPropagation()}
                       >
                         <ExternalLink className="w-3.5 h-3.5" />
                         Source
                       </a>
                     )}

                     <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaperUrl(paper.downloadUrl || paper.url || doiLink);
                          textareaRef.current?.focus();
                        }}
                        className="ml-auto flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-accent opacity-0 group-hover:opacity-100 transition-opacity"
                     >
                       Analyze <ArrowRight className="w-3 h-3" />
                     </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
