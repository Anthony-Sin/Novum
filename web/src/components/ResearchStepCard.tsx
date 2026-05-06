import Markdown from 'react-markdown';
import { motion } from 'motion/react';
import { FlaskConical, Search, CheckCircle2, AlertCircle, RefreshCcw } from 'lucide-react';
import { cn } from '../lib/utils';

interface Step {
  id: string;
  type: 'hypothesis' | 'test' | 'reflection' | 'result';
  agentName: string;
  content: string;
  findings?: string[];
  createdAt: any;
}

interface ResearchStepCardProps {
  step: Step;
  index: number;
}

const getStepIcon = (type: string) => {
  switch (type) {
    case 'hypothesis': return <Search className="w-4 h-4 text-accent" />;
    case 'test': return <FlaskConical className="w-4 h-4 text-blue-500" />;
    case 'reflection': return <RefreshCcw className="w-4 h-4 text-amber-500" />;
    case 'result': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    default: return <AlertCircle className="w-4 h-4 text-zinc-400" />;
  }
};

const getStepColor = (type: string) => {
  switch (type) {
    case 'hypothesis': return 'border-accent bg-accent/5';
    case 'test': return 'border-blue-200 bg-blue-50/30';
    case 'reflection': return 'border-amber-200 bg-amber-50/30';
    case 'result': return 'border-emerald-200 bg-emerald-50/30 text-emerald-900';
    default: return 'border-beige-300 bg-white';
  }
};

export default function ResearchStepCard({ step, index }: ResearchStepCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative pl-6 pb-6 last:pb-2 group"
    >
      {/* Indicator */}
      <div className={cn(
        "absolute left-0 top-0.5 w-1 h-full rounded-full transition-colors",
        step.type === 'hypothesis' ? 'bg-ink' : 
        step.type === 'test' ? 'bg-emerald-600' : 
        'bg-ink/10'
      )} />

      <div className="space-y-1">
        <div className="flex items-center gap-2 opacity-60">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ink">
            {step.type}
          </p>
          <span className="text-[9px] font-mono">/ {step.agentName}</span>
        </div>

        <div className="markdown-body font-serif italic text-sm text-ink leading-relaxed">
          <Markdown>{step.content}</Markdown>
        </div>

        {step.findings && step.findings.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {step.findings.map((finding, idx) => (
              <span key={idx} className="bg-ink/5 px-2 py-0.5 rounded-sm font-mono text-[9px] uppercase tracking-tighter opacity-80">
                &gt; {finding}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
