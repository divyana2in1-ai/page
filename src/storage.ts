import { Book, VocabularyItem, PrintSettings } from './types';
import { INITIAL_SAMPLE_BOOK, INITIAL_SAMPLE_VOCABULARY, generateSamplePdfDataUrl, DEFAULT_BOOK_ID } from './sampleBook';

const DB_NAME = 'BookVocabDB';
const DB_VERSION = 1;
const STORE_PDFS = 'book_pdfs';

// Open IndexedDB for large PDF binary storage
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PDFS)) {
        db.createObjectStore(STORE_PDFS);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePdfToStorage(bookId: string, dataUrl: string): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PDFS, 'readwrite');
      const store = tx.objectStore(STORE_PDFS);
      store.put(dataUrl, bookId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not save PDF to IndexedDB, fallback to in-memory/localStorage', err);
    try {
      localStorage.setItem(`book_pdf_${bookId}`, dataUrl);
    } catch (e) {
      console.warn('PDF exceeds localStorage capacity', e);
    }
  }
}

export async function getPdfFromStorage(bookId: string): Promise<string | null> {
  // If sample book, generate if missing
  if (bookId === DEFAULT_BOOK_ID) {
    try {
      const db = await openDb();
      const cached = await new Promise<string | null>((resolve) => {
        const tx = db.transaction(STORE_PDFS, 'readonly');
        const store = tx.objectStore(STORE_PDFS);
        const req = store.get(bookId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
      if (cached) return cached;
    } catch {}

    const generated = generateSamplePdfDataUrl();
    await savePdfToStorage(bookId, generated);
    return generated;
  }

  try {
    const db = await openDb();
    return new Promise<string | null>((resolve) => {
      const tx = db.transaction(STORE_PDFS, 'readonly');
      const store = tx.objectStore(STORE_PDFS);
      const req = store.get(bookId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return localStorage.getItem(`book_pdf_${bookId}`);
  }
}

export async function deletePdfFromStorage(bookId: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_PDFS, 'readwrite');
    tx.objectStore(STORE_PDFS).delete(bookId);
  } catch {}
  localStorage.removeItem(`book_pdf_${bookId}`);
}

const LOCAL_STORAGE_BOOKS = 'book_vocab_books';
const LOCAL_STORAGE_VOCAB = 'book_vocab_items';
const LOCAL_STORAGE_PRINT = 'book_vocab_print_settings';

export function getStoredBooks(): Book[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_BOOKS);
    if (!raw) {
      const initial = [INITIAL_SAMPLE_BOOK];
      localStorage.setItem(LOCAL_STORAGE_BOOKS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [INITIAL_SAMPLE_BOOK];
  }
}

export function saveStoredBooks(books: Book[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_BOOKS, JSON.stringify(books));
  } catch (e) {
    console.error('Failed to save books to localStorage', e);
  }
}

export function getStoredVocabulary(): VocabularyItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_VOCAB);
    if (!raw) {
      const initial = INITIAL_SAMPLE_VOCABULARY;
      localStorage.setItem(LOCAL_STORAGE_VOCAB, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    // Auto-upgrade if it was the old initial sample of 4 items with incomplete definitions
    if (Array.isArray(parsed) && (parsed.length <= 4 && parsed.some((p) => p.id === 'vocab-1'))) {
      localStorage.setItem(LOCAL_STORAGE_VOCAB, JSON.stringify(INITIAL_SAMPLE_VOCABULARY));
      return INITIAL_SAMPLE_VOCABULARY;
    }
    return parsed;
  } catch {
    return INITIAL_SAMPLE_VOCABULARY;
  }
}

export function saveStoredVocabulary(items: VocabularyItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_VOCAB, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save vocabulary to localStorage', e);
  }
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  layoutMode: 'page-blocks', // One block per page (matching user request!)
  paperSize: 'A4',
  customWidthMm: 210,
  customHeightMm: 297,
  
  // Page Blocks Mode (screenshot style)
  columns: 2, // 2 columns like in screenshot
  fontFamily: 'times', // Times / Serif like in screenshot
  fontSizePt: 8.5,
  blockPaddingMm: 3.5,
  marginMm: 12,
  gapMm: 6,
  showBorder: true,
  showDashedCutLine: false, // Solid border like screenshot
  pageIndicator: 'none', // Pure block of words like screenshot
  casing: 'capitalize', // Dipped down: ...
  lineSpacing: 1.35,
  itemSpacingMm: 1.5,
  bottomExtraPaddingMm: 3.5,

  // Individual Labels Mode
  labelWidthMm: 60,
  labelHeightMm: 20,
  fontSizeWordPt: 8,
  fontSizeMeaningPt: 6.5,
  showPageNumber: true,
  showExample: false,
  groupByPage: true
};

export function getStoredPrintSettings(): PrintSettings {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PRINT);
    if (!raw) return DEFAULT_PRINT_SETTINGS;
    return { ...DEFAULT_PRINT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PRINT_SETTINGS;
  }
}

export function saveStoredPrintSettings(settings: PrintSettings): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_PRINT, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save print settings', e);
  }
}

export function normalizeWord(raw: string): string {
  if (!raw) return '';
  // Strip leading and trailing punctuation, preserve inner apostrophes and hyphens
  let w = raw.trim();
  w = w.replace(/^[^\w']+|[^\w']+$/g, '');
  // Take first word if multiple were dragged
  w = w.split(/\s+/)[0] || '';
  return w.toLowerCase();
}
