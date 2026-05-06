import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Paperclip, Search, FlaskConical, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface ThreadInputProps {
  onStart: (prompt: string) => void;
  isStarting?: boolean;
}

export default function ThreadInput({ onStart, isStarting }: ThreadInputProps) {
  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    if (prompt.trim() && !isStarting) {
      onStart(prompt.trim());
      setPrompt('');
    }
  };

  const examples = [
    {
      title: "Llama-3 Hallucination Analysis",
      prompt: "Analyze the primary cause of latent hallucination in the Llama-3 70B RAG pipeline using recent telemetry.",
      icon: <AlertCircle className="w-3.5 h-3.5" />
    },
    {
      title: "Self-Correction Benchmarking",
      prompt: "Benchmark self-correction capabilities in GPT-4o vs Claude 3.5 Sonnet for code-generation tasks.",
      icon: <FlaskConical className="w-3.5 h-3.5" />
    },
    {
      title: "Context Window Truncation",
      prompt: "Investigate if document retrieval window (K=5) leads to evidence truncation in forensic traces.",
      icon: <Search className="w-3.5 h-3.5" />
    }
  ];

  return (
    <div className="w-full max-w-3xl px-8 flex flex-col items-center">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full space-y-12 mb-12 text-center"
      >
        <div className="space-y-6">
          <h2 className="font-serif italic text-4xl lg:text-5xl text-ink tracking-tight leading-tight max-w-2xl mx-auto">
            Systematic Forensics for Scientific Papers
          </h2>
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-30">
            Autonomous Logic // Agentic Testing // Zero-Bias Observation
          </p>
        </div>
      </motion.div>

      <form 
        onSubmit={handleSubmit} 
        className="w-full bg-white/60 backdrop-blur-md rounded-lg border border-line shadow-2xl shadow-ink/5 p-2 focus-within:border-ink transition-all duration-300"
      >
        <div className="flex flex-col gap-2 p-4">
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
            placeholder="Describe your research objective..."
            className="w-full bg-transparent outline-none resize-none font-serif italic text-lg lg:text-xl text-ink placeholder:text-ink/10"
          />
          
          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-4 opacity-40">
              <Paperclip className="w-4 h-4 cursor-pointer hover:opacity-100 transition-opacity" />
              <Search className="w-4 h-4 cursor-pointer hover:opacity-100 transition-opacity" />
              <FlaskConical className="w-4 h-4 cursor-pointer hover:opacity-100 transition-opacity" />
            </div>
            
            <button
              type="submit"
              disabled={!prompt.trim() || isStarting}
              className={cn(
                "flex items-center gap-2 px-6 py-2 rounded-sm font-bold text-[10px] uppercase tracking-[0.2em] transition-all",
                prompt.trim() 
                  ? "bg-ink text-white hover:bg-zinc-800" 
                  : "bg-ink/5 text-ink/20 cursor-not-allowed"
              )}
            >
              {isStarting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  Execute
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      <div className="w-full mt-20 space-y-6">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 whitespace-nowrap">Example Protocols</span>
          <div className="h-px bg-line w-full" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {examples.map((ex, i) => (
            <button
              key={i}
              onClick={() => {
                setPrompt(ex.prompt);
                textareaRef.current?.focus();
              }}
              className="text-left p-5 border border-line rounded-lg hover:border-ink hover:bg-white/40 transition-all group relative overflow-hidden h-full flex flex-col justify-between"
            >
              <div className="opacity-40 mb-4 group-hover:opacity-100 transition-opacity">
                {ex.icon}
              </div>
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-ink mb-1">{ex.title}</h4>
                <p className="font-serif italic text-xs leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity whitespace-normal line-clamp-3">
                  &quot;{ex.prompt}&quot;
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
