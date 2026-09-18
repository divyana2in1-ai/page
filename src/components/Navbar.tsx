import React, { useState } from 'react';
import { Book as BookIcon, FileText, Printer, Library, Sparkles, HelpCircle, CheckCircle2, X } from 'lucide-react';
import { Book } from '../types';

interface NavbarProps {
  activeTab: 'books' | 'reader' | 'vocab' | 'print';
  onTabChange: (tab: 'books' | 'reader' | 'vocab' | 'print') => void;
  books: Book[];
  currentBook: Book | null;
  onSelectBook: (book: Book) => void;
  pendingVocabCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  books,
  currentBook,
  onSelectBook,
  pendingVocabCount
}) => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between text-slate-100 z-30 select-none">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-bold text-base tracking-tight text-white">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/30">
              <BookIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">Book Vocab</span>
              <span className="hidden sm:inline-block text-xs font-normal text-slate-400 ml-2 border-l border-slate-700 pl-2">
                Physical Book Annotation Studio
              </span>
            </div>
          </div>
        </div>

        {/* Center Tabs */}
        <nav className="flex items-center bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
          <button
            onClick={() => onTabChange('books')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'books'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <Library className="w-3.5 h-3.5" />
            <span>Books</span>
          </button>

          <button
            onClick={() => onTabChange('reader')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'reader'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <BookIcon className="w-3.5 h-3.5" />
            <span>PDF Reader</span>
          </button>

          <button
            onClick={() => onTabChange('vocab')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all relative ${
              activeTab === 'vocab'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Vocabulary</span>
            {pendingVocabCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 ml-1">
                {pendingVocabCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('print')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'print'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Labels</span>
          </button>
        </nav>

        {/* Right Info & Book Selector */}
        <div className="flex items-center gap-3">
          {/* Active Book selector if books exist */}
          {books.length > 0 && (
            <div className="hidden md:flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Current:</span>
              <select
                value={currentBook?.id || ''}
                onChange={(e) => {
                  const b = books.find((x) => x.id === e.target.value);
                  if (b) onSelectBook(b);
                }}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2 py-1 max-w-[160px] truncate focus:outline-none focus:border-blue-500"
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* AI Thinking Status Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-[11px] text-slate-300">
            <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
            <span>Gemini 3.1 Pro</span>
            <span className="text-[9px] uppercase px-1 py-0.2 bg-indigo-500/20 text-indigo-300 font-semibold rounded border border-indigo-500/30">
              High Thinking
            </span>
          </div>

          {/* Workflow Guide Button */}
          <button
            onClick={() => setShowHelp(true)}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="How the Physical Book Workflow Works"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Workflow Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 text-slate-200 shadow-2xl relative">
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <BookIcon className="w-5 h-5 text-blue-400" />
              Physical Book Annotation Workflow
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              This application is designed specifically for annotating physical books with tiny printed labels.
            </p>

            <div className="space-y-3 text-xs">
              <div className="flex gap-3 items-start bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0">1</span>
                <div>
                  <strong className="text-white block font-medium">Read Physical Book</strong>
                  <p className="text-slate-400 mt-0.5">When you meet an unfamiliar word in your paper book, open that page in the PDF reader.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0">2</span>
                <div>
                  <strong className="text-white block font-medium">Double-click or Long-press the Word</strong>
                  <p className="text-slate-400 mt-0.5">A small unobtrusive popup appears showing the word, book page, and context sentence. Tap "+ Save Word".</p>
                </div>
              </div>

              <div className="flex gap-3 items-start bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0">3</span>
                <div>
                  <strong className="text-white block font-medium">Instant & Local</strong>
                  <p className="text-slate-400 mt-0.5">Saving is instant and completely local. No AI calls interrupt your reading session.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0">4</span>
                <div>
                  <strong className="text-white block font-medium">Generate AI Meanings (Batch)</strong>
                  <p className="text-slate-400 mt-0.5">Later, in the Vocabulary tab, click "Generate Meanings". Gemini 3.1 Pro creates short, context-specific definitions under 60 chars.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0">5</span>
                <div>
                  <strong className="text-white block font-medium">Print, Cut & Paste into Book</strong>
                  <p className="text-slate-400 mt-0.5">Go to the Print tab to generate compact sticker labels grouped by page. Print on standard or sticker paper, cut, and paste onto your physical pages!</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-5 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" /> Got it, let's read
            </button>
          </div>
        </div>
      )}
    </>
  );
};
