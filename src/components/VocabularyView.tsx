import React, { useState, useMemo } from 'react';
import {
  FileText,
  Sparkles,
  Search,
  Download,
  Upload,
  Trash2,
  Edit2,
  Check,
  X,
  BookOpen,
  Printer,
  Plus,
  ArrowUpDown,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Settings,
  Key,
  ChevronLeft,
} from 'lucide-react';
import { Book, VocabularyItem, VocabStatus } from '../types';
import { getStoredGeminiKey, getStoredGeminiModel } from '../utils/geminiSettings';

interface VocabularyViewProps {
  books: Book[];
  currentBook: Book | null;
  vocabulary: VocabularyItem[];
  onUpdateVocabItem: (id: string, updates: Partial<VocabularyItem>) => void;
  onDeleteVocabItem: (id: string) => void;
  onBulkDeleteVocab: (ids: string[]) => void;
  onAddVocabItem: (item: Omit<VocabularyItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onBulkAddVocab?: (items: Omit<VocabularyItem, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
  onNavigateToTab: (tab: 'books' | 'reader' | 'vocab' | 'print') => void;
  onSelectBook: (book: Book) => void;
  onOpenSettings?: () => void;
}

export const VocabularyView: React.FC<VocabularyViewProps> = ({
  books,
  currentBook,
  vocabulary,
  onUpdateVocabItem,
  onDeleteVocabItem,
  onBulkDeleteVocab,
  onAddVocabItem,
  onNavigateToTab,
  onSelectBook,
  onOpenSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const selectedBookId = currentBook?.id || books[0]?.id || '';
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sorting
  const [sortBy, setSortBy] = useState<'page' | 'word' | 'status'>('page');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMeaningText, setEditMeaningText] = useState<string>('');
  const [editExampleText, setEditExampleText] = useState<string>('');

  // AI batch generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [includeExample, setIncludeExample] = useState<boolean>(false);
  const [aiProgress, setAiProgress] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

  // Manual Add Word modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [manualWord, setManualWord] = useState<string>('');
  const [manualPage, setManualPage] = useState<number>(1);
  const [manualContext, setManualContext] = useState<string>('');

  const activeBook = books.find((b) => b.id === selectedBookId) || currentBook || books[0];
  const hasGeminiKey = Boolean(getStoredGeminiKey());

  // Filter items
  const filteredItems = useMemo(() => {
    return vocabulary
      .filter((item) => {
        if (selectedBookId && item.bookId !== selectedBookId) return false;
        if (statusFilter !== 'all' && item.status !== statusFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchWord = item.word.toLowerCase().includes(q);
          const matchContext = (item.context || '').toLowerCase().includes(q);
          const matchMeaning = (item.meaning || '').toLowerCase().includes(q);
          if (!matchWord && !matchContext && !matchMeaning) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'page') {
          return sortAsc ? a.pageNumber - b.pageNumber : b.pageNumber - a.pageNumber;
        }
        if (sortBy === 'word') {
          return sortAsc ? a.word.localeCompare(b.word) : b.word.localeCompare(a.word);
        }
        return sortAsc ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
      });
  }, [vocabulary, selectedBookId, statusFilter, searchQuery, sortBy, sortAsc]);

  // Selection handlers
  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectPendingWords = () => {
    const pendingIds = filteredItems.filter((i) => i.status === 'pending').map((i) => i.id);
    setSelectedIds(new Set(pendingIds));
  };

  // ── Real AI Batch Meaning Generation using configured Gemini API Key ─────
  const handleGenerateMeanings = async (targetIds?: string[]) => {
    const userKey = getStoredGeminiKey();

    const idsToProcess =
      targetIds ||
      (selectedIds.size > 0
        ? Array.from(selectedIds)
        : filteredItems.filter((i) => i.status === 'pending').map((i) => i.id));

    if (idsToProcess.length === 0) {
      setAiError(
        'No pending words to process. Select words in the PDF Reader or click "+ Add Word".'
      );
      setTimeout(() => setAiError(null), 4000);
      return;
    }

    const itemsToProcess = vocabulary.filter((v) => idsToProcess.includes(v.id));

    setIsGenerating(true);
    setAiError(null);
    setAiSuccessMessage(null);
    setAiProgress(`Connecting to Gemini AI for ${itemsToProcess.length} words...`);

    try {
      const BATCH_SIZE = 15;
      let processedTotal = 0;
      const model = getStoredGeminiModel();

      for (let i = 0; i < itemsToProcess.length; i += BATCH_SIZE) {
        const chunk = itemsToProcess.slice(i, i + BATCH_SIZE);
        setAiProgress(
          `Generating contextual definitions: ${i + 1}–${Math.min(
            i + BATCH_SIZE,
            itemsToProcess.length
          )} of ${itemsToProcess.length}...`
        );

        const payload = {
          bookTitle: activeBook?.title || 'Book',
          includeExample,
          model,
          entries: chunk.map((c) => ({
            id: c.id,
            word: c.word,
            page_number: c.pageNumber,
            context: c.context,
          })),
        };

        const res = await fetch('/api/vocabulary/generate-meanings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-gemini-api-key': userKey || '',
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.error || `Server responded with status ${res.status}`
          );
        }

        if (Array.isArray(data.results)) {
          data.results.forEach((resItem: any) => {
            onUpdateVocabItem(resItem.id, {
              meaning: resItem.meaning,
              example: resItem.example,
              status: 'processed',
              aiProcessed: true,
            });
          });
          processedTotal += data.results.length;
        }
      }

      setAiProgress(null);
      setIsGenerating(false);
      setSelectedIds(new Set());
      setAiSuccessMessage(
        `Successfully generated AI meanings for ${processedTotal} words!`
      );
      setTimeout(() => setAiSuccessMessage(null), 4500);
    } catch (err: any) {
      console.error('AI generation error:', err);
      setAiError(err.message || 'Failed to generate meanings');
      setIsGenerating(false);
      setAiProgress(null);
    }
  };

  // ── Inline Edit ─────────────────────────────────────────────────────────
  const startEditing = (item: VocabularyItem) => {
    setEditingId(item.id);
    setEditMeaningText(item.meaning || '');
    setEditExampleText(item.example || '');
  };

  const saveEditing = (id: string) => {
    onUpdateVocabItem(id, {
      meaning: editMeaningText.trim() || undefined,
      example: editExampleText.trim() || undefined,
      status: editMeaningText.trim() ? 'processed' : 'pending',
    });
    setEditingId(null);
  };

  // ── CSV Export ──────────────────────────────────────────────────────────
  const handleExportCsv = () => {
    const headers = ['word', 'page', 'context', 'meaning', 'example', 'status'];
    const rows = filteredItems.map((item) => {
      const esc = (s: any) => `"${String(s || '').replace(/"/g, '""')}"`;
      return [
        esc(item.word),
        item.pageNumber,
        esc(item.context),
        esc(item.meaning),
        esc(item.example),
        esc(item.status),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(activeBook?.title || 'book').replace(/\s+/g, '_')}_vocabulary.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── CSV Import ──────────────────────────────────────────────────────────
  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBook) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length <= 1) return;

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
          if (cols.length >= 2 && cols[0]) {
            onAddVocabItem({
              bookId: activeBook.id,
              word: cols[0],
              pageNumber: parseInt(cols[1]) || 1,
              context: cols[2] || '',
              meaning: cols[3] || undefined,
              example: cols[4] || undefined,
              status: (cols[5] as VocabStatus) || (cols[3] ? 'processed' : 'pending'),
              aiProcessed: Boolean(cols[3]),
              printed: false,
            });
          }
        }
        setAiSuccessMessage('CSV words imported successfully.');
        setTimeout(() => setAiSuccessMessage(null), 3500);
      } catch (err: any) {
        setAiError('Error importing CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualWord.trim() || !activeBook) return;

    onAddVocabItem({
      bookId: activeBook.id,
      word: manualWord.trim().toLowerCase(),
      pageNumber: Number(manualPage) || 1,
      context: manualContext.trim(),
      status: 'pending',
      aiProcessed: false,
      printed: false,
    });

    setShowAddModal(false);
    setManualWord('');
    setManualPage(1);
    setManualContext('');
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-950 text-slate-100 pb-16 md:pb-0">
      {/* ── Top Bar ───────────────────────────────────────────────────────── */}
      <div className="bg-slate-900 border-b border-slate-800 p-3 sm:p-4 shrink-0 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Book title & navigation */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => onNavigateToTab('books')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
              title="Back to Books"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-blue-400" />
              <span>Books</span>
            </button>

            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700 max-w-[200px] sm:max-w-xs truncate">
              <span className="text-[11px] text-slate-400">PDF:</span>
              <span className="text-xs font-bold text-white truncate">
                {activeBook?.title || 'Selected Book'}
              </span>
            </div>

            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
              {filteredItems.length} words
            </span>

            {/* Quick jump to Reader */}
            {activeBook && (
              <button
                onClick={() => {
                  onSelectBook(activeBook);
                  onNavigateToTab('reader');
                }}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline ml-1"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open Reader</span>
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span>Add Word</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
              title="Export as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <label className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import</span>
              <input type="file" accept=".csv" onChange={handleImportCsv} className="hidden" />
            </label>

            <button
              onClick={() => onNavigateToTab('print')}
              className="px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Print</span>
            </button>

            {/* AI Generate Button */}
            <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-800">
              <label className="hidden sm:flex items-center gap-1 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeExample}
                  onChange={(e) => setIncludeExample(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                />
                <span className="text-[11px]">Example</span>
              </label>

              <button
                onClick={() => handleGenerateMeanings()}
                disabled={isGenerating}
                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
                title="Generate AI meanings for pending words using Gemini"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Generate Meanings (AI)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── API Key Banner if not set ────────────────────────────────────── */}
        {!hasGeminiKey && onOpenSettings && (
          <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-2.5 flex items-center justify-between text-xs text-blue-200">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                Want AI meanings? Add your Gemini API key in App Settings.
              </span>
            </div>
            <button
              onClick={onOpenSettings}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-[11px] shrink-0 ml-2"
            >
              Open Settings
            </button>
          </div>
        )}

        {/* ── Filters & Search ────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 pt-1">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search word, context, meaning..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 shrink-0"
            >
              <option value="all">All Words</option>
              <option value="pending">Pending AI</option>
              <option value="processed">Ready (Processed)</option>
              <option value="printed">Printed</option>
            </select>
          </div>

          {/* Bulk Selection Actions */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={selectPendingWords}
              className="text-xs text-amber-300/90 hover:text-amber-200 hover:underline px-1 py-0.5"
            >
              Select Pending
            </button>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 bg-blue-950/60 border border-blue-800/50 px-2 py-1 rounded-md">
                <span className="text-blue-300 font-medium text-[11px]">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={() => handleGenerateMeanings(Array.from(selectedIds))}
                  disabled={isGenerating}
                  className="text-white bg-blue-600 hover:bg-blue-500 px-2 py-0.5 rounded text-[11px] font-semibold"
                >
                  Generate
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete ${selectedIds.size} selected words?`)) {
                      onBulkDeleteVocab(Array.from(selectedIds));
                      setSelectedIds(new Set());
                    }
                  }}
                  className="text-red-400 hover:text-red-300 p-0.5"
                  title="Delete Selected"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress & Alert Banners */}
        {aiProgress && (
          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />
            <span>{aiProgress}</span>
          </div>
        )}

        {aiError && (
          <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>{aiError}</span>
            </div>
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-[11px] font-semibold text-red-200 shrink-0"
              >
                Settings
              </button>
            )}
          </div>
        )}

        {aiSuccessMessage && (
          <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{aiSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* ── Main Content Area: Responsive Mobile Cards & Desktop Table ────────── */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {filteredItems.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 p-6 border-2 border-dashed border-slate-800 rounded-2xl">
            <FileText className="w-10 h-10 text-slate-600 mb-3" />
            <p className="text-sm font-semibold text-slate-300">No vocabulary items found</p>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Select words in the PDF Reader or tap &quot;Add Word&quot; to begin building your book annotation vocabulary.
            </p>
            {activeBook && (
              <button
                onClick={() => {
                  onSelectBook(activeBook);
                  onNavigateToTab('reader');
                }}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Go to PDF Reader</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── Mobile View (screens < 768px): Clean, minimal list showing ONLY word, page no, and status ── */}
            <div className="md:hidden space-y-2">
              {filteredItems.map((item) => {
                const isSelected = selectedIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    className={`px-3.5 py-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500/60 shadow-md'
                        : 'bg-slate-900 border-slate-800 shadow-sm'
                    }`}
                  >
                    {/* Left: Checkbox & Word */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectItem(item.id)}
                        className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0 w-4 h-4 shrink-0 cursor-pointer"
                      />
                      <span className="font-mono text-sm font-bold text-white capitalize truncate">
                        {item.word}
                      </span>
                    </div>

                    {/* Right: Page Number, Status Badge & Delete */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-semibold">
                        p. {item.pageNumber}
                      </span>

                      <span
                        className={`text-[10px] uppercase px-2 py-0.5 rounded-md font-bold tracking-wider ${
                          item.status === 'printed'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : item.status === 'processed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {item.status}
                      </span>

                      <button
                        onClick={() => {
                          if (confirm(`Delete "${item.word}"?`)) {
                            onDeleteVocabItem(item.id);
                          }
                        }}
                        className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                        title="Delete word"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop Table View (screens >= 768px): High-density laptop table ── */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 shadow">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold select-none">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredItems.length > 0 &&
                          filteredItems.every((i) => selectedIds.has(i.id))
                        }
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                      />
                    </th>
                    <th
                      className="p-3 cursor-pointer hover:text-white"
                      onClick={() => {
                        if (sortBy === 'word') setSortAsc(!sortAsc);
                        else {
                          setSortBy('word');
                          setSortAsc(true);
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Word</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="p-3 w-20 cursor-pointer hover:text-white"
                      onClick={() => {
                        if (sortBy === 'page') setSortAsc(!sortAsc);
                        else {
                          setSortBy('page');
                          setSortAsc(true);
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Page</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="p-3">Context Sentence</th>
                    <th className="p-3">Concise AI Meaning</th>
                    <th className="p-3 w-24">Status</th>
                    <th className="p-3 w-16 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredItems.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    const isEditing = editingId === item.id;

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isSelected ? 'bg-blue-950/30' : ''
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectItem(item.id)}
                            className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                          />
                        </td>
                        <td className="p-3 font-mono font-bold text-white capitalize">
                          {item.word}
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          p. {item.pageNumber}
                        </td>
                        <td className="p-3 text-slate-400 italic max-w-xs truncate" title={item.context}>
                          {item.context || '—'}
                        </td>
                        <td className="p-3 text-slate-200">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editMeaningText}
                                onChange={(e) => setEditMeaningText(e.target.value)}
                                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white w-full"
                              />
                              <button
                                onClick={() => saveEditing(item.id)}
                                className="p-1 text-emerald-400 hover:text-emerald-300"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1 text-slate-400 hover:text-slate-300"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            item.meaning || (
                              <span className="text-amber-400/80 italic text-[11px]">
                                Pending AI
                              </span>
                            )
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                              item.status === 'printed'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : item.status === 'processed'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEditing(item)}
                              className="p-1 text-slate-400 hover:text-blue-400 rounded"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete word "${item.word}"?`)) {
                                  onDeleteVocabItem(item.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-400 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Manual Add Word Modal ────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 text-slate-100 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" />
              <span>Manually Add Vocabulary Word</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Add a word from your physical book reading to be annotated with Gemini AI.
            </p>

            <form onSubmit={handleManualAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Vocabulary Word <span className="text-blue-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ephemeral, tenaciously"
                  value={manualWord}
                  onChange={(e) => setManualWord(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Physical Book Page Number <span className="text-blue-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={manualPage}
                  onChange={(e) => setManualPage(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Context Sentence from Book (Recommended)
                </label>
                <textarea
                  rows={3}
                  placeholder="The sentence where the word was encountered in your book..."
                  value={manualContext}
                  onChange={(e) => setManualContext(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 italic"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Word</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
