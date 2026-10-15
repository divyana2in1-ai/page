import React, { useEffect, useRef, useState } from 'react';
import { BookmarkPlus, X, Check, BookOpen } from 'lucide-react';

interface WordPopupProps {
  word: string;
  pageNumber: number;
  physicalPageNumber: number;
  context: string;
  position: { x: number; y: number };
  onSave: () => void;
  onCancel: () => void;
  isDuplicate?: boolean;
}

export const WordPopup: React.FC<WordPopupProps> = ({
  word,
  pageNumber,
  physicalPageNumber,
  context,
  position,
  onSave,
  onCancel,
  isDuplicate = false,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Keyboard shortcut: Enter to save, Escape to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, onCancel]);

  // Mobile Bottom Sheet Mode
  if (isMobile) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-150"
        onClick={onCancel}
      >
        <div
          ref={popupRef}
          className="w-full bg-slate-900 border-t border-slate-700/80 rounded-t-2xl p-4 text-slate-100 shadow-2xl safe-area-pb animate-in slide-in-from-bottom duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Grab handle */}
          <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-3" />

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-1 inline-block">
                Word Selected
              </span>
              <h3 className="font-mono text-xl font-bold text-white tracking-tight truncate">
                {word}
              </h3>
              <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                <span>Physical Page {physicalPageNumber}</span>
                {physicalPageNumber !== pageNumber && (
                  <span className="text-slate-500 text-[11px]">
                    (PDF p.{pageNumber})
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onCancel}
              className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Context quote */}
          {context && (
            <div className="text-xs text-slate-200 bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl mb-3.5 italic leading-relaxed">
              &ldquo;{context}&rdquo;
            </div>
          )}

          {isDuplicate && (
            <div className="text-xs text-amber-300 mb-3 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 p-2 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span>Already recorded on this page. Saving will update the context sentence.</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onSave}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
            >
              {isDuplicate ? <Check className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
              <span>{isDuplicate ? 'Update Context' : 'Save to Vocabulary'}</span>
            </button>
            <button
              onClick={onCancel}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop / Laptop Floating Popup Mode
  const popupWidth = 270;
  const popupHeight = 135;

  let left = position.x - popupWidth / 2;
  let top = position.y - popupHeight - 12;

  if (left < 12) left = 12;
  if (left + popupWidth > window.innerWidth - 12) {
    left = window.innerWidth - popupWidth - 12;
  }
  if (top < 65) {
    top = position.y + 24; // Show below selection if near top
  }

  return (
    <div
      ref={popupRef}
      style={{ left: `${left}px`, top: `${top}px` }}
      className="fixed z-50 w-[270px] bg-slate-900/95 backdrop-blur-md border border-blue-500/40 shadow-2xl rounded-xl p-3 text-slate-100 animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header with Word and Page info */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <div className="font-mono text-base font-bold text-blue-400 truncate tracking-tight">
            {word}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Page {physicalPageNumber}
            {physicalPageNumber !== pageNumber && (
              <span className="text-slate-500 text-[10px] ml-1">
                (PDF p.{pageNumber})
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
          title="Cancel (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Context preview snippet */}
      {context && (
        <div className="text-[11px] text-slate-300 bg-slate-950/70 border border-slate-800 p-1.5 rounded-md mb-2.5 line-clamp-2 italic leading-relaxed">
          &ldquo;{context}&rdquo;
        </div>
      )}

      {/* Duplicate warning */}
      {isDuplicate && (
        <div className="text-[10px] text-amber-300/90 mb-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Already recorded on this page
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <button
          onClick={onSave}
          className="flex-1 py-1.5 px-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm transition-all"
        >
          {isDuplicate ? <Check className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
          <span>{isDuplicate ? 'Update Context' : 'Save Word'}</span>
        </button>
        <button
          onClick={onCancel}
          className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
