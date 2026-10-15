import React from 'react';
import {
  X,
  Printer,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  BookOpen,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { Book, VocabularyItem } from '../types';

interface AllBooksPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  vocabulary: VocabularyItem[];
  onSelectBookAndTab: (book: Book, tab: 'reader' | 'vocab' | 'print') => void;
}

export const AllBooksPrintModal: React.FC<AllBooksPrintModalProps> = ({
  isOpen,
  onClose,
  books,
  vocabulary,
  onSelectBookAndTab,
}) => {
  if (!isOpen) return null;

  const totalWords = vocabulary.length;
  const totalPrinted = vocabulary.filter((v) => v.status === 'printed').length;
  const totalNotPrinted = totalWords - totalPrinted;
  const totalAiReady = vocabulary.filter((v) => v.status === 'processed').length;
  const totalPendingAi = vocabulary.filter((v) => v.status === 'pending').length;
  const printPercent = totalWords > 0 ? Math.round((totalPrinted / totalWords) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 text-slate-100 shadow-2xl relative max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-400" />
              <span>All PDFs Vocabulary & Print Status</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Overview of printed stickers and pending vocabulary across all your books.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Summary Stats */}
        <div className="py-4 border-b border-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-800/60 border border-slate-700/50 p-2.5 rounded-xl">
              <div className="text-lg sm:text-xl font-bold font-mono text-white">
                {totalWords}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                <Layers className="w-3 h-3 text-slate-400" />
                <span>Total Words</span>
              </div>
            </div>

            <div className="bg-blue-950/40 border border-blue-900/50 p-2.5 rounded-xl">
              <div className="text-lg sm:text-xl font-bold font-mono text-blue-400">
                {totalPrinted}
              </div>
              <div className="text-[11px] text-blue-300 flex items-center justify-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3 text-blue-400" />
                <span>Printed ({printPercent}%)</span>
              </div>
            </div>

            <div className="bg-amber-950/40 border border-amber-900/50 p-2.5 rounded-xl">
              <div className="text-lg sm:text-xl font-bold font-mono text-amber-400">
                {totalNotPrinted}
              </div>
              <div className="text-[11px] text-amber-300 flex items-center justify-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Not Printed</span>
              </div>
            </div>

            <div className="bg-emerald-950/40 border border-emerald-900/50 p-2.5 rounded-xl">
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
                {totalAiReady}
              </div>
              <div className="text-[11px] text-emerald-300 flex items-center justify-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>AI Ready</span>
              </div>
            </div>
          </div>

          {/* Global Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Overall Print Progress</span>
              <span className="font-mono font-semibold text-slate-200">
                {totalPrinted} / {totalWords} words printed
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, printPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Per-Book List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
          {books.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No books added yet.
            </div>
          ) : (
            books.map((book) => {
              const bookWords = vocabulary.filter((v) => v.bookId === book.id);
              const bTotal = bookWords.length;
              const bPrinted = bookWords.filter((v) => v.status === 'printed').length;
              const bNotPrinted = bTotal - bPrinted;
              const bAiReady = bookWords.filter((v) => v.status === 'processed').length;
              const bPercent = bTotal > 0 ? Math.round((bPrinted / bTotal) * 100) : 0;

              return (
                <div
                  key={book.id}
                  className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3.5 hover:border-slate-600 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm text-white truncate">
                        {book.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">
                        {book.author ? `by ${book.author}` : book.pdfFilename}
                      </p>
                    </div>

                    {/* Status Badges */}
                    <div className="flex items-center gap-1.5 shrink-0 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-semibold">
                        {bPrinted} Printed
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
                        {bNotPrinted} Not Printed
                      </span>
                    </div>
                  </div>

                  {/* Book Progress Bar */}
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-3">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(100, bPercent)}%` }}
                    />
                  </div>

                  {/* Book Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-700/40 text-xs">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {bTotal} words total ({bAiReady} AI ready)
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          onSelectBookAndTab(book, 'vocab');
                          onClose();
                        }}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                      >
                        <FileText className="w-3 h-3 text-blue-400" />
                        <span>Vocab</span>
                      </button>

                      <button
                        onClick={() => {
                          onSelectBookAndTab(book, 'print');
                          onClose();
                        }}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-sm"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Print This PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
