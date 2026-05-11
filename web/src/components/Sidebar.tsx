import { useState, useEffect } from 'react';
import { Settings, Plus, Library, Loader2, AlertCircle, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import novumIcon from '../icons/novumIcon.png';

// 1. Define strict TypeScript interfaces to replace `any`
export interface Thread {
  id: string;
  title: string;
}

export interface Paper {
  id: string;
  title: string;
  authors?: { name: string }[];
  doi?: string;
  downloadUrl?: string;
}

interface SidebarProps {
  activeId?: string;
  onNew: () => void;
  onSelect: (id: string) => void;
  threads: Thread[];
  onSelectPaper: (url: string) => void;
}

export default function Sidebar({ activeId, onNew, onSelect, threads, onSelectPaper }: SidebarProps) {
  const [showLatestPapers, setShowLatestPapers] = useState(false);
  const [latestPapers, setLatestPapers] = useState<Paper[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2. Improved fetch logic with error handling and unmount protection
  useEffect(() => {
    let isMounted = true;

    const fetchPapers = async () => {
      if (!showLatestPapers || latestPapers.length > 0) return;
      
      setLoadingPapers(true);
      setError(null);

      try {
        const res = await fetch('/api/latest-papers?limit=5');
        if (!res.ok) throw new Error('Failed to fetch papers');
        
        const data = await res.json();
        if (isMounted) setLatestPapers(data);
      } catch (err) {
        console.error("Failed to fetch latest papers:", err);
        if (isMounted) setError("Could not load papers.");
      } finally {
        if (isMounted) setLoadingPapers(false);
      }
    };

    fetchPapers();

    // Cleanup function prevents state updates if component unmounts
    return () => {
      isMounted = false;
    };
  }, [showLatestPapers, latestPapers.length]);

  return (
    <div className="w-12 lg:w-14 group flex flex-col h-screen border-r border-line bg-beige-bg fixed left-0 top-0 z-50 transition-all duration-500 hover:lg:w-60">
      
      {/* Header / Logo */}
      <div className="p-4 border-b border-line flex items-center justify-center lg:justify-start gap-4 overflow-hidden h-[57px] shrink-0">
        <div className="w-8 h-8 flex items-center justify-center rounded-sm shrink-0">
          <img 
            src={novumIcon} 
            alt="Novum Icon" 
            className="w-full h-full object-contain" 
          />
        </div>
        <div className="hidden group-hover:lg:block overflow-hidden whitespace-nowrap animate-in fade-in duration-300">
          <h1 className="font-bold text-xs tracking-widest uppercase text-ink">Forensics</h1>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 py-6 space-y-8 scrollbar-thin scrollbar-thumb-line scrollbar-track-transparent">
        
        {/* Action Buttons */}
        <div className="space-y-3">
          <button 
            onClick={onNew}
            className="w-full flex items-center justify-center lg:justify-start gap-4 p-2.5 text-ink border border-line hover:border-ink hover:bg-white/50 transition-all rounded-sm group/btn"
          >
            <Plus className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover/btn:rotate-90" />
            <span className="hidden group-hover:lg:block font-bold text-[10px] uppercase tracking-[0.2em] whitespace-nowrap">
              New Investigation
            </span>
          </button>
          
          <button
            onClick={() => setShowLatestPapers((prev) => !prev)}
            className={cn(
              "w-full flex items-center justify-center lg:justify-start gap-4 p-2.5 text-ink border transition-all rounded-sm group/btn",
              showLatestPapers ? "border-ink bg-white/50" : "border-line hover:border-ink hover:bg-white/50"
            )}
          >
            <Library className={cn("w-4 h-4 shrink-0 transition-transform", showLatestPapers && "text-ink")} />
            <span className="hidden group-hover:lg:block font-bold text-[10px] uppercase tracking-[0.2em] whitespace-nowrap">
              Latest Papers
            </span>
          </button>
        </div>

        {/* Discovery / Latest Papers Section */}
        {showLatestPapers && (
          <div className="space-y-3 pt-4 border-t border-line/50 hidden group-hover:lg:block animate-in slide-in-from-top-2 fade-in duration-300">
            <h3 className="font-bold text-[9px] uppercase tracking-[0.2em] text-ink/60 px-1">Discovery</h3>
            
            <div className="space-y-1">
              {loadingPapers ? (
                <div className="flex items-center gap-2 px-2 py-3 text-ink/40">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <p className="text-[10px] italic">Loading repository...</p>
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 px-2 py-3 text-red-500/70">
                  <AlertCircle className="w-3 h-3" />
                  <p className="text-[10px] italic">{error}</p>
                </div>
              ) : latestPapers.length === 0 ? (
                <p className="text-[10px] text-ink/40 italic px-2 py-3">No recent papers found.</p>
              ) : (
                latestPapers.map((paper) => (
                  <button
                    key={paper.id}
                    // 3. Strict fallback logic: Download URL first, then DOI, then generic ID URL
                    onClick={() => onSelectPaper(paper.downloadUrl || (paper.doi ? `https://doi.org/${paper.doi}` : paper.id))}
                    className="w-full text-left p-2.5 rounded-sm hover:bg-white/60 hover:translate-x-1 hover:shadow-sm hover:bg-accent/5 transition-all duration-300 border border-transparent hover:border-accent/20 group/paper flex flex-col gap-1 relative"
                    title={paper.title}
                  >
                    <div className="flex items-start gap-2">
                      <FileText className="w-3 h-3 shrink-0 text-ink/40 mt-0.5 group-hover/paper:text-accent transition-colors" />
                      <p className="text-[10px] font-bold text-ink line-clamp-2 leading-snug relative group-hover/paper:text-accent transition-colors">
                        {paper.title}
                      </p>
                    </div>
                    {paper.authors && paper.authors.length > 0 && (
                      <p className="text-[9px] text-ink/50 truncate pl-5">
                        {paper.authors.map((a) => a.name).join(', ')}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Threads List */}
        {threads.length > 0 && (
          <div className="space-y-2 pt-6 border-t border-line/50">
            <h3 className="font-bold text-[9px] uppercase tracking-[0.2em] text-ink/60 px-1 hidden group-hover:lg:block mb-3">
              Active Investigations
            </h3>
            <div className="space-y-1">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => onSelect(thread.id)}
                  className={cn(
                      "w-full flex items-center gap-4 px-2.5 py-3 transition-all border-l-2 rounded-r-sm hover:translate-x-1 duration-300",
                    activeId === thread.id 
                        ? "border-accent bg-accent/5 opacity-100 shadow-sm"
                      : "border-transparent opacity-50 hover:opacity-100 hover:bg-white/30"
                  )}
                >
                  <div className="w-4 h-4 flex items-center justify-center shrink-0">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all duration-300", 
                        activeId === thread.id ? "bg-accent scale-100 shadow-[0_0_8px_rgba(58,109,115,0.8)] animate-pulse-glow" : "bg-ink/30 scale-75"
                    )} />
                  </div>
                  <span className="hidden group-hover:lg:block truncate text-[10px] font-bold uppercase tracking-tight whitespace-nowrap">
                    {thread.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Settings Footer */}
      <div className="p-3 border-t border-line bg-white/10 shrink-0">
        <button className="w-full flex items-center justify-center lg:justify-start gap-4 p-2.5 text-ink opacity-50 hover:opacity-100 hover:bg-white/40 rounded-sm transition-all">
          <Settings className="w-4 h-4 shrink-0 transition-transform duration-500 hover:rotate-180" />
          <span className="hidden group-hover:lg:block font-bold text-[10px] uppercase tracking-[0.2em]">Config</span>
        </button>
      </div>
      
    </div>
  );
}