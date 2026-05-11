import { useState, useEffect } from 'react';
import { Settings, Plus, Library } from 'lucide-react';
import { cn } from '../lib/utils';
import novumIcon from '../icons/novumIcon.png';
interface SidebarProps {
  activeId?: string;
  onNew: () => void;
  onSelect: (id: string) => void;
  threads: any[];
  onSelectPaper: (url: string) => void;
}

export default function Sidebar({ activeId, onNew, onSelect, threads, onSelectPaper }: SidebarProps) {
  const [showLatestPapers, setShowLatestPapers] = useState(false);
  const [latestPapers, setLatestPapers] = useState<any[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(false);

  useEffect(() => {
    if (showLatestPapers && latestPapers.length === 0) {
      setLoadingPapers(true);
      fetch('/api/latest-papers?limit=5')
        .then(res => res.json())
        .then(data => {
          setLatestPapers(data);
          setLoadingPapers(false);
        })
        .catch(err => {
          console.error(err);
          setLoadingPapers(false);
        });
    }
  }, [showLatestPapers]);

  return (
    <div className="w-12 lg:w-14 group flex flex-col h-screen border-r border-line bg-beige-bg fixed left-0 top-0 z-50 transition-all duration-500 hover:lg:w-60">
      <div className="p-4 border-b border-line flex items-center justify-center lg:justify-start gap-4 overflow-hidden h-[57px]">
        <div className="w-8 h-8 flex items-center justify-center rounded-sm shrink-0">
          <img 
            src={novumIcon} 
            alt="Novum Icon" 
            className="w-25 h-25 object-contain" 
          />
        </div>
        <div className="hidden group-hover:lg:block overflow-hidden whitespace-nowrap">
          <h1 className="font-bold text-xs tracking-widest uppercase">Forensics</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-6 space-y-8 scroll-area">
        <div className="space-y-4">
          <button 
            onClick={onNew}
            className="w-full flex items-center justify-center lg:justify-start gap-4 p-2.5 text-ink border border-line hover:border-ink transition-all rounded-sm group/btn"
          >
            <Plus className="w-4 h-4 shrink-0 transition-transform group-hover/btn:rotate-90" />
            <span className="hidden group-hover:lg:block font-bold text-[10px] uppercase tracking-[0.2em] whitespace-nowrap">New Investigation</span>
          </button>
          <button
            onClick={() => setShowLatestPapers(!showLatestPapers)}
            className="w-full flex items-center justify-center lg:justify-start gap-4 p-2.5 text-ink border border-line hover:border-ink transition-all rounded-sm group/btn"
          >
            <Library className="w-4 h-4 shrink-0 transition-transform" />
            <span className="hidden group-hover:lg:block font-bold text-[10px] uppercase tracking-[0.2em] whitespace-nowrap">Latest Papers</span>
          </button>
        </div>

        {showLatestPapers && (
          <div className="space-y-2 pt-4 border-t border-line/50 hidden group-hover:lg:block">
            <h3 className="font-bold text-[9px] uppercase tracking-[0.2em] text-ink/60 mb-2">Discovery</h3>
            {loadingPapers ? (
              <p className="text-[10px] text-ink/40 italic">Loading papers...</p>
            ) : latestPapers.length === 0 ? (
              <p className="text-[10px] text-ink/40 italic">No papers found.</p>
            ) : (
              latestPapers.map((paper, i) => (
                <button
                  key={i}
                  onClick={() => onSelectPaper(paper.doi ? `https://doi.org/${paper.doi}` : paper.downloadUrl || paper.id)}
                  className="w-full text-left p-2 rounded hover:bg-white/40 transition-colors border border-transparent hover:border-line"
                >
                  <p className="text-[10px] font-bold text-ink truncate">{paper.title}</p>
                  <p className="text-[9px] text-ink/60 truncate">{paper.authors?.map((a: any) => a.name).join(', ')}</p>
                </button>
              ))
            )}
          </div>
        )}

        <div className="space-y-4 pt-6 border-t border-line/50">
          <div className="space-y-1">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => onSelect(thread.id)}
                className={cn(
                  "w-full flex items-center gap-4 px-2.5 py-3 transition-all border-l-2",
                  activeId === thread.id 
                    ? "border-ink bg-white/40 opacity-100" 
                    : "border-transparent opacity-40 hover:opacity-100 hover:bg-white/20"
                )}
              >
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                  <div className={cn("w-1 h-1 rounded-full", activeId === thread.id ? "bg-ink" : "bg-ink/20")} />
                </div>
                <span className="hidden group-hover:lg:block truncate text-[10px] font-bold uppercase tracking-tight whitespace-nowrap">
                  {thread.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-line bg-white/5">
        <button className="w-full flex items-center justify-center lg:justify-start gap-4 p-2.5 opacity-40 hover:opacity-100 transition-all">
          <Settings className="w-4 h-4 shrink-0" />
          <span className="hidden group-hover:lg:block font-bold text-[10px] uppercase tracking-[0.2em]">Config</span>
        </button>
      </div>
    </div>
  );
}
