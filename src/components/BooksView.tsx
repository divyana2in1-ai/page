import React, { useState } from 'react';
import {
  Book as BookIcon,
  Plus,
  BookOpen,
  Trash2,
  Calendar,
  Layers,
  Upload,
  Sparkles,
  FileCheck,
  Printer,
  X,
  FileText
} from 'lucide-react';
import { Book, VocabularyItem } from '../types';
import { savePdfToStorage } from '../storage';

interface BooksViewProps {
  books: Book[];
  vocabulary: VocabularyItem[];
  onSelectBook: (book: Book) => void;
  onAddBook: (book: Book) => void;
  onDeleteBook: (bookId: string) => void;
  onNavigateToTab: (tab: 'books' | 'reader' | 'vocab' | 'print') => void;
}

export const BooksView: React.FC<BooksViewProps> = ({
  books,
  vocabulary,
  onSelectBook,
  onAddBook,
  onDeleteBook,
  onNavigateToTab,
}) => {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [author, setAuthor] = useState<string>('');
  const [pageOffset, setPageOffset] = useState<number>(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

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
        // Auto-fill title from filename
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
      // Read file to Data URL
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const newBookId = `book-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        // Save PDF to IndexedDB
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

        // Open directly in reader
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
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 md:p-8 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <BookIcon className="w-6 h-6 text-blue-400" />
              <span>My Books</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Open a book's PDF to collect vocabulary while reading your physical copy. Generate AI meanings and print compact label stickers.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Book</span>
          </button>
        </div>

        {/* Books Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {books.map((book) => {
            const bookWords = vocabulary.filter((v) => v.bookId === book.id);
            const savedCount = bookWords.length;
            const processedCount = bookWords.filter((v) => v.status === 'processed').length;
            const printedCount = bookWords.filter((v) => v.status === 'printed').length;

            return (
              <div
                key={book.id}
                className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-xl p-5 transition-all shadow-lg hover:shadow-blue-500/5 flex flex-col justify-between group"
              >
                <div>
                  {/* Top tags & delete */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      PDF Document
                    </span>
                    <button
                      onClick={() => {
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
                  <h3 className="font-bold text-base text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                    {book.title}
                  </h3>
                  <p className="text-xs text-slate-400 mb-4 line-clamp-1">
                    {book.author ? `by ${book.author}` : 'Personal Reading Copy'}
                  </p>

                  {/* Offset & File info */}
                  {book.pageOffset !== 0 && (
                    <div className="text-[11px] text-indigo-300/90 bg-indigo-950/40 border border-indigo-900/50 px-2 py-1 rounded mb-3">
                      Physical Page Offset: {book.pageOffset > 0 ? `+${book.pageOffset}` : book.pageOffset}
                    </div>
                  )}

                  {/* Metrics Bar */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800/80 mb-4 text-center">
                    <div>
                      <div className="text-base font-bold text-slate-100 font-mono">
                        {savedCount}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                        <Layers className="w-2.5 h-2.5" />
                        <span>Saved</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-base font-bold text-emerald-400 font-mono">
                        {processedCount}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                        <span>AI Ready</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-base font-bold text-blue-400 font-mono">
                        {printedCount}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                        <Printer className="w-2.5 h-2.5 text-blue-400" />
                        <span>Printed</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      onSelectBook(book);
                      onNavigateToTab('reader');
                    }}
                    className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Open Reader</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectBook(book);
                      onNavigateToTab('vocab');
                    }}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1 border border-slate-700 transition-colors"
                    title="View Vocabulary"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      onSelectBook(book);
                      onNavigateToTab('print');
                    }}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1 border border-slate-700 transition-colors"
                    title="Print Labels"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

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
                Select your book's text-based PDF. The file is saved directly in local storage for quick access.
              </p>

              {formError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-2.5 rounded-lg mb-4">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* PDF File Dropzone */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    PDF Document <span className="text-blue-400">*</span>
                  </label>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-slate-700 hover:border-blue-500/70 bg-slate-800/40 rounded-xl p-4 text-center cursor-pointer transition-colors relative"
                  >
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                    {selectedFile ? (
                      <div>
                        <span className="text-xs font-semibold text-blue-400 block truncate max-w-xs mx-auto">
                          {selectedFile.name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs text-slate-300 block font-medium">
                          Click to browse or drag and drop PDF here
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Text-selectable PDF files only
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Book Title <span className="text-blue-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Atomic Habits, Deep Work, Dune"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Author */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Author (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. James Clear"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Page Offset */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-300">
                      Physical Page Offset
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Current: {pageOffset > 0 ? `+${pageOffset}` : pageOffset}
                    </span>
                  </div>
                  <input
                    type="number"
                    value={pageOffset}
                    onChange={(e) => setPageOffset(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Example: If PDF page 20 corresponds to printed book page 15, set offset to <strong>-5</strong>.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingFile}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {isProcessingFile ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processing PDF...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Save & Open Book</span>
                      </>
                    )}
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
