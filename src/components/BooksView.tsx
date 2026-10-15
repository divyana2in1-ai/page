import React, { useState } from 'react';
import {
  Book as BookIcon,
  Plus,
  BookOpen,
  Trash2,
  Layers,
  Sparkles,
  Printer,
  X,
  FileText,
  Bookmark,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Book, VocabularyItem } from '../types';
import { savePdfToStorage } from '../storage';

interface BooksViewProps {
  books: Book[];
  currentBook: Book | null;
  vocabulary: VocabularyItem[];
  onSelectBook: (book: Book) => void;
  onAddBook: (book: Book) => void;
  onDeleteBook: (bookId: string) => void;
  onNavigateToTab: (tab: 'books' | 'reader' | 'vocab' | 'print') => void;
  onOpenAllBooksPrint?: () => void;
}

export const BooksView: React.FC<BooksViewProps> = ({
  books,
  currentBook,
  vocabulary,
  onSelectBook,
  onAddBook,
  onDeleteBook,
  onNavigateToTab,
  onOpenAllBooksPrint,
}) => {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [author, setAuthor] = useState<string>('');
  const [pageOffset, setPageOffset] = useState<number>(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Active book resolution (default to currentBook, or first book)
  const activeBook = currentBook || books[0] || null;
  const otherBooks = activeBook ? books.filter((b) => b.id !== activeBook.id) : books;

  // Active book metrics
  const activeBookWords = activeBook ? vocabulary.filter((v) => v.bookId === activeBook.id) : [];
  const activeSavedCount = activeBookWords.length;
  const activeProcessedCount = activeBookWords.filter((v) => v.status === 'processed').length;
  const activePrintedCount = activeBookWords.filter((v) => v.status === 'printed').length;
  const activeNotPrintedCount = activeSavedCount - activePrintedCount;

  // Global print status metrics
  const totalWords = vocabulary.length;
  const totalPrinted = vocabulary.filter((v) => v.status === 'printed').length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setFormError('Only PDF files (.pdf) are supported.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setFormError(null);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setFormError('Only PDF files (.pdf) are supported.');
        return;
      }
      setSelectedFile(file);
      setFormError(null);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Please provide a book title.');
      return;
    }
    if (!selectedFile) {
      setFormError('Please select a PDF file.');
      return;
    }

    setIsProcessingFile(true);
    setFormError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const newBookId = `book-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        await savePdfToStorage(newBookId, dataUrl);

        const newBook: Book = {
          id: newBookId,
          title: title.trim(),
          author: author.trim() || undefined,
          pdfFilename: selectedFile.name,
          pdfDataUrl: dataUrl,
          pageOffset: Number(pageOffset) || 0,
          createdAt: new Date().toISOString(),
          wordCount: 0,
          processedCount: 0,
        };

        onAddBook(newBook);
        setIsProcessingFile(false);
        setShowAddModal(false);
        setTitle('');
        setAuthor('');
        setPageOffset(0);
        setSelectedFile(null);

        onSelectBook(newBook);
        onNavigateToTab('reader');
      };

      reader.onerror = () => {
        setFormError('Failed to read the PDF file.');
        setIsProcessingFile(false);
      };

      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      setFormError(err.message || 'Failed to process book.');
      setIsProcessingFile(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-3 sm:p-6 md:p-8 text-slate-100">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <BookIcon className="w-6 h-6 text-blue-400" />
              <span>My Books</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Tap any PDF to read and collect words. AI definitions are generated and printed as compact label stickers for your physical book.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Print status option beside top corner */}
            {onOpenAllBooksPrint && (
              <button
                onClick={onOpenAllBooksPrint}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all"
                title="View vocabulary & print status for all PDFs"
              >
                <Printer className="w-3.5 h-3.5 text-blue-400" />
                <span>All PDFs Print Status</span>
                {totalWords > 0 && (
                  <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 bg-blue-950 text-blue-300 rounded border border-blue-800">
                    {totalPrinted}/{totalWords}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add PDF</span>
            </button>
          </div>
        </div>

        {/* ── 1. CURRENT PDF ON TOP ────────────────────────────────────────── */}
        {activeBook ? (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Current Active PDF
              </span>
              <span className="text-[11px] text-slate-400">
                Opened & ready to read
              </span>
            </div>

            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 border-2 border-blue-500/40 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Book Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/60 font-semibold">
                      Current PDF
                    </span>
                    {activeBook.pageOffset !== 0 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-900">
                        Page Offset: {activeBook.pageOffset > 0 ? `+${activeBook.pageOffset}` : activeBook.pageOffset}
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                    {activeBook.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {activeBook.author ? `by ${activeBook.author}` : activeBook.pdfFilename}
                  </p>

                  {/* Vocabulary status chips for current book */}
                  <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                    <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-300 font-mono font-bold">{activeSavedCount}</span>
                      <span className="text-[11px] text-slate-400">Words</span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-900/60">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300 font-mono font-bold">{activeProcessedCount}</span>
                      <span className="text-[11px] text-emerald-400">AI Ready</span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-900/60">
                      <Printer className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-blue-300 font-mono font-bold">{activePrintedCount}</span>
                      <span className="text-[11px] text-blue-300">Printed</span>
                    </div>

                    {activeNotPrintedCount > 0 && (
                      <div className="flex items-center gap-1.5 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-900/60">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-amber-300 font-mono font-bold">{activeNotPrintedCount}</span>
                        <span className="text-[11px] text-amber-300">To Print</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Primary Actions for Current PDF */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                  <button
                    onClick={() => {
                      onSelectBook(activeBook);
                      onNavigateToTab('reader');
                    }}
                    className="py-2.5 px-5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02]"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Read PDF</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectBook(activeBook);
                      onNavigateToTab('vocab');
                    }}
                    className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                    title="View this book's vocabulary"
                  >
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>Vocab ({activeSavedCount})</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectBook(activeBook);
                      onNavigateToTab('print');
                    }}
                    className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                    title="Print labels for this book"
                  >
                    <Printer className="w-4 h-4 text-indigo-400" />
                    <span>Print ({activeNotPrintedCount})</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
            <BookIcon className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No PDF loaded yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Add your first book PDF using the &quot;Add PDF&quot; button above.
            </p>
          </div>
        )}

        {/* ── 2. ALL OTHER PDFS BELOW IN RECTANGLES ─────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>All Other PDFs</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                {otherBooks.length}
              </span>
            </h3>
            <span className="text-[11px] text-slate-500">
              Click any PDF to switch and read
            </span>
          </div>

          {otherBooks.length === 0 ? (
            <div className="p-6 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
              No other books in your library. Add more PDFs to annotate multiple physical books!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherBooks.map((book) => {
                const bookWords = vocabulary.filter((v) => v.bookId === book.id);
                const savedCount = bookWords.length;
                const processedCount = bookWords.filter((v) => v.status === 'processed').length;
                const printedCount = bookWords.filter((v) => v.status === 'printed').length;
                const notPrintedCount = savedCount - printedCount;

                return (
                  <div
                    key={book.id}
                    onClick={() => {
                      onSelectBook(book);
                      onNavigateToTab('reader');
                    }}
                    className="bg-slate-900 border border-slate-800 hover:border-blue-500/60 rounded-xl p-4 sm:p-5 transition-all shadow-md hover:shadow-blue-500/5 cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          PDF Document
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete "${book.title}" and its ${savedCount} saved words?`)) {
                              onDeleteBook(book.id);
                            }
                          }}
                          className="text-slate-500 hover:text-red-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete Book"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Title & Author */}
                      <h4 className="font-bold text-sm sm:text-base text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                        {book.title}
                      </h4>
                      <p className="text-xs text-slate-400 mb-3 line-clamp-1">
                        {book.author ? `by ${book.author}` : book.pdfFilename}
                      </p>

                      {/* Metrics */}
                      <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-slate-800/80 mb-3 text-center">
                        <div>
                          <div className="text-sm font-bold text-slate-100 font-mono">
                            {savedCount}
                          </div>
                          <div className="text-[10px] text-slate-400">Words</div>
                        </div>

                        <div>
                          <div className="text-sm font-bold text-emerald-400 font-mono">
                            {processedCount}
                          </div>
                          <div className="text-[10px] text-slate-400">AI Ready</div>
                        </div>

                        <div>
                          <div className="text-sm font-bold text-blue-400 font-mono">
                            {printedCount}
                          </div>
                          <div className="text-[10px] text-slate-400">Printed</div>
                        </div>
                      </div>
                    </div>

                    {/* Actions on Rectangle Card */}
                    <div
                      className="flex items-center gap-2 pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          onSelectBook(book);
                          onNavigateToTab('reader');
                        }}
                        className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Read PDF</span>
                      </button>

                      <button
                        onClick={() => {
                          onSelectBook(book);
                          onNavigateToTab('vocab');
                        }}
                        className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1 border border-slate-700 transition-colors"
                        title="View Vocabulary"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        <span className="hidden sm:inline">Vocab</span>
                      </button>

                      <button
                        onClick={() => {
                          onSelectBook(book);
                          onNavigateToTab('print');
                        }}
                        className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1 border border-slate-700 transition-colors"
                        title="Print Labels"
                      >
                        <Printer className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="hidden sm:inline">Print</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Add Book Modal ────────────────────────────────────────────── */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                <span>Add Book (PDF)</span>
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Select your book&apos;s text-based PDF. The file is saved directly in local storage for quick access.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* File Dropzone */}
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1.5">
                    Select PDF File
                  </label>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      selectedFile
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700 hover:border-slate-600 bg-slate-800/40'
                    }`}
                    onClick={() => document.getElementById('pdf-file-input')?.click()}
                  >
                    <input
                      id="pdf-file-input"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <BookOpen className="w-8 h-8 mx-auto text-blue-400 mb-2 opacity-80" />
                    {selectedFile ? (
                      <div>
                        <p className="text-xs font-semibold text-white truncate max-w-xs mx-auto">
                          {selectedFile.name}
                        </p>
                        <p className="text-[10px] text-blue-400 mt-1">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB - Click to change
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-medium text-slate-300">
                          Drop PDF here or click to browse
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Standard digital text PDFs supported
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Book Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., The Great Gatsby"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                {/* Author */}
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Author (Optional)
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="e.g., F. Scott Fitzgerald"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Physical Page Offset */}
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Physical Page Offset
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={pageOffset}
                      onChange={(e) => setPageOffset(Number(e.target.value))}
                      className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[11px] text-slate-400">
                      Difference between PDF page and your paper book printed page number (e.g., -12 or +4). Can also be adjusted inside the reader.
                    </p>
                  </div>
                </div>

                {formError && (
                  <p className="text-xs text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                    {formError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingFile}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors disabled:opacity-50"
                  >
                    {isProcessingFile ? 'Loading PDF...' : 'Add & Open Reader'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
