import React, { useState, useEffect, useCallback } from 'react';
import { Book, VocabularyItem, PrintSettings } from './types';
import {
  getStoredBooks,
  saveStoredBooks,
  getStoredVocabulary,
  saveStoredVocabulary,
  getStoredPrintSettings,
  saveStoredPrintSettings,
  getPdfFromStorage,
  deletePdfFromStorage,
  DEFAULT_PRINT_SETTINGS,
} from './storage';
import { Navbar } from './components/Navbar';
import { BooksView } from './components/BooksView';
import { PdfReader } from './components/PdfReader';
import { VocabularyView } from './components/VocabularyView';
import { PrintStudio } from './components/PrintStudio';

export default function App() {
  const [activeTab, setActiveTab] = useState<'books' | 'reader' | 'vocab' | 'print'>('reader');
  const [books, setBooks] = useState<Book[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [printSettings, setPrintSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // ── 1. Initial Load ─────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const storedBooks = getStoredBooks();
        const storedVocab = getStoredVocabulary();
        const storedPrint = getStoredPrintSettings();

        setBooks(storedBooks);
        setVocabulary(storedVocab);
        setPrintSettings(storedPrint);

        if (storedBooks.length > 0) {
          const first = storedBooks[0];
          // Ensure pdfDataUrl is loaded for the first book
          const pdfDataUrl = await getPdfFromStorage(first.id);
          const hydratedBook = { ...first, pdfDataUrl: pdfDataUrl || undefined };
          setCurrentBook(hydratedBook);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, []);

  // ── 2. Select Book ──────────────────────────────────────────────────────────
  const handleSelectBook = async (book: Book) => {
    try {
      let dataUrl = book.pdfDataUrl;
      if (!dataUrl) {
        dataUrl = (await getPdfFromStorage(book.id)) || undefined;
      }
      const hydrated = { ...book, pdfDataUrl: dataUrl };
      setCurrentBook(hydrated);
    } catch (err) {
      console.error('Error selecting book:', err);
      setCurrentBook(book);
    }
  };

  // ── 3. Add Book ─────────────────────────────────────────────────────────────
  const handleAddBook = (newBook: Book) => {
    const updated = [newBook, ...books];
    setBooks(updated);
    saveStoredBooks(updated);
    setCurrentBook(newBook);
  };

  // ── 4. Delete Book ──────────────────────────────────────────────────────────
  const handleDeleteBook = async (bookId: string) => {
    const updatedBooks = books.filter((b) => b.id !== bookId);
    setBooks(updatedBooks);
    saveStoredBooks(updatedBooks);

    const updatedVocab = vocabulary.filter((v) => v.bookId !== bookId);
    setVocabulary(updatedVocab);
    saveStoredVocabulary(updatedVocab);

    await deletePdfFromStorage(bookId);

    if (currentBook?.id === bookId) {
      if (updatedBooks.length > 0) {
        handleSelectBook(updatedBooks[0]);
      } else {
        setCurrentBook(null);
        setActiveTab('books');
      }
    }
  };

  // ── 5. Update Book Page Offset ──────────────────────────────────────────────
  const handleUpdateBookOffset = (bookId: string, newOffset: number) => {
    const updated = books.map((b) =>
      b.id === bookId ? { ...b, pageOffset: newOffset } : b
    );
    setBooks(updated);
    saveStoredBooks(updated);

    if (currentBook?.id === bookId) {
      setCurrentBook((prev) => (prev ? { ...prev, pageOffset: newOffset } : null));
    }
  };

  // ── 6. Save Word from PDF Reader ────────────────────────────────────────────
  const handleSaveWord = useCallback(
    (item: Omit<VocabularyItem, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'aiProcessed' | 'printed'>) => {
      setVocabulary((prev) => {
        // Check for existing duplicate on the same page
        const existingIdx = prev.findIndex(
          (v) =>
            v.bookId === item.bookId &&
            v.word.toLowerCase() === item.word.toLowerCase() &&
            v.pageNumber === item.pageNumber
        );

        let updated: VocabularyItem[];
        const now = new Date().toISOString();

        if (existingIdx >= 0) {
          // Update existing context
          updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            context: item.context || updated[existingIdx].context,
            updatedAt: now,
          };
        } else {
          // Add new vocabulary item
          const newItem: VocabularyItem = {
            id: `vocab-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            bookId: item.bookId,
            word: item.word,
            pageNumber: item.pageNumber,
            context: item.context,
            status: 'pending',
            aiProcessed: false,
            printed: false,
            createdAt: now,
            updatedAt: now,
          };
          updated = [newItem, ...prev];
        }

        saveStoredVocabulary(updated);
        return updated;
      });
    },
    []
  );

  // ── 7. Vocabulary Operations ────────────────────────────────────────────────
  const handleUpdateVocabItem = (id: string, updates: Partial<VocabularyItem>) => {
    setVocabulary((prev) => {
      const updated = prev.map((v) =>
        v.id === id ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v
      );
      saveStoredVocabulary(updated);
      return updated;
    });
  };

  const handleDeleteVocabItem = (id: string) => {
    setVocabulary((prev) => {
      const updated = prev.filter((v) => v.id !== id);
      saveStoredVocabulary(updated);
      return updated;
    });
  };

  const handleBulkDeleteVocab = (ids: string[]) => {
    setVocabulary((prev) => {
      const idSet = new Set(ids);
      const updated = prev.filter((v) => !idSet.has(v.id));
      saveStoredVocabulary(updated);
      return updated;
    });
  };

  const handleAddVocabItem = (
    item: Omit<VocabularyItem, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const now = new Date().toISOString();
    const newItem: VocabularyItem = {
      ...item,
      id: `vocab-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };
    setVocabulary((prev) => {
      const updated = [newItem, ...prev];
      saveStoredVocabulary(updated);
      return updated;
    });
  };

  const handleBulkAddVocab = (
    items: Omit<VocabularyItem, 'id' | 'createdAt' | 'updatedAt'>[]
  ) => {
    const now = new Date().toISOString();
    const newItems: VocabularyItem[] = items.map((item, idx) => ({
      ...item,
      id: `vocab-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    }));
    setVocabulary((prev) => {
      const updated = [...newItems, ...prev];
      saveStoredVocabulary(updated);
      return updated;
    });
  };

  const handleMarkAsPrinted = (vocabIds: string[]) => {
    const idSet = new Set(vocabIds);
    setVocabulary((prev) => {
      const updated = prev.map((v) =>
        idSet.has(v.id) ? { ...v, status: 'printed' as const, printed: true } : v
      );
      saveStoredVocabulary(updated);
      return updated;
    });
  };

  // ── 8. Print Settings Update ────────────────────────────────────────────────
  const handleUpdatePrintSettings = (settings: PrintSettings) => {
    setPrintSettings(settings);
    saveStoredPrintSettings(settings);
  };

  const pendingCount = vocabulary.filter((v) => v.status === 'pending').length;

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono">Initializing Book Vocab Studio...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30 selection:text-blue-200">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        books={books}
        currentBook={currentBook}
        onSelectBook={handleSelectBook}
        pendingVocabCount={pendingCount}
      />

      {/* Main View Area */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'books' && (
          <BooksView
            books={books}
            vocabulary={vocabulary}
            onSelectBook={handleSelectBook}
            onAddBook={handleAddBook}
            onDeleteBook={handleDeleteBook}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'reader' && (
          currentBook ? (
            <PdfReader
              book={currentBook}
              vocabulary={vocabulary}
              onSaveWord={handleSaveWord}
              onUpdateBookOffset={handleUpdateBookOffset}
              onNavigateToVocab={() => setActiveTab('vocab')}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <p className="text-sm font-semibold mb-2">No book selected</p>
              <button
                onClick={() => setActiveTab('books')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium"
              >
                Go to Books
              </button>
            </div>
          )
        )}

        {activeTab === 'vocab' && (
          <VocabularyView
            books={books}
            currentBook={currentBook}
            vocabulary={vocabulary}
            onUpdateVocabItem={handleUpdateVocabItem}
            onDeleteVocabItem={handleDeleteVocabItem}
            onBulkDeleteVocab={handleBulkDeleteVocab}
            onAddVocabItem={handleAddVocabItem}
            onBulkAddVocab={handleBulkAddVocab}
            onNavigateToTab={setActiveTab}
            onSelectBook={handleSelectBook}
          />
        )}

        {activeTab === 'print' && (
          <PrintStudio
            books={books}
            currentBook={currentBook}
            vocabulary={vocabulary}
            printSettings={printSettings}
            onUpdatePrintSettings={handleUpdatePrintSettings}
            onMarkAsPrinted={handleMarkAsPrinted}
            onNavigateToVocab={() => setActiveTab('vocab')}
            onLoadDemoVocab={(items) => {
              setVocabulary(items);
              saveStoredVocabulary(items);
            }}
          />
        )}
      </main>
    </div>
  );
}
