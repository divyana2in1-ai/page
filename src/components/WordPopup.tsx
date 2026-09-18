import React, { useEffect, useRef } from 'react';
import { BookmarkPlus, X, Check } from 'lucide-react';

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

  // Adjust popup position if it overflows the viewport
  const popupWidth = 260;
  const popupHeight = 130;

  let left = position.x - popupWidth / 2;
  let top = position.y - popupHeight - 12;

  if (left < 10) left = 10;
  if (left + popupWidth > window.innerWidth - 10) {
    left = window.innerWidth - popupWidth - 10;
  }
  if (top < 60) {
    top = position.y + 24; // Show below selection if top of screen
  }

  return (
    <div
      ref={popupRef}
      style={{ left: `${left}px`, top: `${top}px` }}
      className="fixed z-50 w-[260px] bg-slate-900/95 backdrop-blur-md border border-blue-500/50 shadow-2xl rounded-xl p-3 text-slate-100 animate-in fade-in zoom-in-95 duration-150"
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

      {/* Duplicate warning or action buttons */}
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
