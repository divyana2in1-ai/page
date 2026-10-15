import React, { useState, useEffect } from 'react';
import {
  Book as BookIcon,
  HelpCircle,
  CheckCircle2,
  X,
  Settings,
  Printer,
  ChevronLeft,
} from 'lucide-react';
import { Book } from '../types';
import { getStoredGeminiKey } from '../utils/geminiSettings';

interface NavbarProps {
  activeTab: 'books' | 'reader' | 'vocab' | 'print';
  onTabChange: (tab: 'books' | 'reader' | 'vocab' | 'print') => void;
  books: Book[];
  currentBook: Book | null;
  onSelectBook: (book: Book) => void;
  pendingVocabCount: number;
  totalVocabCount: number;
  printedVocabCount: number;
  onOpenSettings: () => void;
  onOpenAllBooksPrint: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  currentBook,
  totalVocabCount,
  printedVocabCount,
  onOpenSettings,
  onOpenAllBooksPrint,
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const key = getStoredGeminiKey();
    setHasApiKey(Boolean(key));
  }, []);

  return (
    <>
      {/* ── Top Header Bar (Desktop & Mobile) ─────────────────────────────── */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between text-slate-100 z-30 select-none shrink-0">
        {/* Left: Brand & Title OR Back Button */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {activeTab !== 'books' ? (
            <button
              onClick={() => onTabChange('books')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-colors shrink-0 shadow-sm"
              title="Return to Books screen"
            >
              <ChevronLeft className="w-4 h-4 text-blue-400" />
              <span>Books</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/30 shrink-0">
                <BookIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm sm:text-base tracking-tight bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent truncate">
                    Book Vocab
                  </span>
                  <span className="hidden lg:inline-block text-[11px] font-normal text-slate-400 border-l border-slate-700 pl-2">
                    Physical Book Annotations
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Current Book Badge when inside Reader, Vocab, or Print */}
          {activeTab !== 'books' && currentBook && (
            <div className="flex items-center gap-1.5 min-w-0 max-w-[140px] sm:max-w-xs truncate text-xs text-slate-300 pl-1 border-l border-slate-800">
              <span className="font-medium truncate text-white">
                {currentBook.title}
              </span>
            </div>
          )}
        </div>

        {/* Right Section: Print Status, Settings & Help */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Print Status Button (Shows all PDFs vocab status) */}
          <button
            onClick={onOpenAllBooksPrint}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs transition-colors"
            title="All PDFs Vocabulary & Print Status"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline font-medium">Print Status</span>
            {totalVocabCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-blue-950 text-blue-300 border border-blue-800/80">
                {printedVocabCount}/{totalVocabCount}
              </span>
            )}
          </button>

          {/* Settings Button (Opens Gemini Key & Settings modal) */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs transition-colors relative"
            title="App & Gemini API Settings"
          >
            <Settings className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline font-medium">Settings</span>
            {hasApiKey ? (
              <span
                className="w-2 h-2 rounded-full bg-emerald-400"
                title="Gemini Key Configured"
              />
            ) : (
              <span
                className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"
                title="Add Gemini Key in Settings"
              />
            )}
          </button>

          {/* Workflow Guide Button */}
          <button
            onClick={() => setShowHelp(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="How the Physical Book Workflow Works"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 
        NOTE: The lower buttons (bottom navigation bar) of books, reader, vocab, print 
        have been completely removed as requested: 
        "On this first screen the lower buttons of books,reader, vocab, print should not be shown. 
         Even they should not be shown anywhere,below any screen"
      */}

      {/* Workflow Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 sm:p-6 text-slate-200 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base sm:text-lg font-bold text-white mb-2 flex items-center gap-2">
              <BookIcon className="w-5 h-5 text-blue-400" />
              Physical Book Annotation Workflow
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Designed specifically for annotating physical paper books with tiny printed label stickers.
            </p>

            <div className="space-y-3 text-xs">
              <div className="flex gap-3 items-start bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0">1</span>
                <div>
                  <strong className="text-white block font-medium">Read Physical Book</strong>
                  <p className="text-slate-400 mt-0.5">When reading your paper book, open the matching page in this reader on your laptop or phone.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0">2</span>
                <div>
                  <strong className="text-white block font-medium">Select Unfamiliar Words</strong>
                  <p className="text-slate-400 mt-0.5">Double-tap, highlight, or click the word. Tap &quot;+ Save Word&quot; to store it locally.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0">3</span>
                <div>
                  <strong className="text-white block font-medium">Gemini AI Meanings (Batch)</strong>
                  <p className="text-slate-400 mt-0.5">In the Vocabulary tab, click &quot;Generate Meanings (AI)&quot;. Gemini creates ultra-short, context-accurate definitions strictly under 65 characters.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0">4</span>
                <div>
                  <strong className="text-white block font-medium">Print, Cut & Paste into Book</strong>
                  <p className="text-slate-400 mt-0.5">Go to the Print tab to generate dynamic page blocks or individual labels. Print on paper or sticker sheets, cut, and paste into your physical book margin!</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-5 w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" /> Got it, let&apos;s read
            </button>
          </div>
        </div>
      )}
    </>
  );
};
