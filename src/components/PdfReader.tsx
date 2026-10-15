import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  BookOpen,
  Bookmark,
  PanelRightClose,
  PanelRightOpen,
  Settings2,
  Sparkles,
  Check,
  AlertCircle,
  X,
  Printer,
  FileText,
} from 'lucide-react';
import { Book, VocabularyItem } from '../types';
import { loadPdfJs } from '../utils/pdfLoader';
import { WordPopup } from './WordPopup';
import { normalizeWord } from '../storage';

interface PdfReaderProps {
  book: Book;
  vocabulary: VocabularyItem[];
  onSaveWord: (item: Omit<VocabularyItem, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'aiProcessed' | 'printed'>) => void;
  onUpdateBookOffset: (bookId: string, newOffset: number) => void;
  onNavigateToVocab: () => void;
  onNavigateToPrint?: () => void;
  onNavigateToBooks?: () => void;
}

export const PdfReader: React.FC<PdfReaderProps> = ({
  book,
  vocabulary,
  onSaveWord,
  onUpdateBookOffset,
  onNavigateToVocab,
  onNavigateToPrint,
  onNavigateToBooks,
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(book.totalPages || 1);
  const [scale, setScale] = useState<number>(1.2);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [currentMatchIdx, setCurrentMatchIdx] = useState<number>(-1);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Word selection state
  const [selectedWord, setSelectedWord] = useState<string>('');
  const [selectedContext, setSelectedContext] = useState<string>('');
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);

  // Page offset editor state
  const [editingOffset, setEditingOffset] = useState<boolean>(false);
  const [tempOffset, setTempOffset] = useState<number>(book.pageOffset || 0);

  // Toast notification for non-intrusive save
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const touchStartXRef = useRef<number | null>(null);

  const physicalPage = currentPage + (book.pageOffset || 0);

  // Default sidebar state based on screen width
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }
  }, []);

  // Trigger brief toast
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Filter vocabulary for current book
  const bookVocab = vocabulary.filter((v) => v.bookId === book.id);
  const currentPageVocab = bookVocab.filter((v) => v.pageNumber === physicalPage);

  // Auto-fit width calculation
  const fitToWidth = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - (window.innerWidth < 640 ? 16 : 48);
      const targetScale = Math.max(0.65, Math.min(2.2, containerWidth / 595));
      setScale(parseFloat(targetScale.toFixed(2)));
    }
  }, []);

  // ── Load PDF Document ───────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const initPdf = async () => {
      try {
        const pdfjsLib = await loadPdfJs();
        const dataUrl = book.pdfDataUrl;

        if (!dataUrl) {
          throw new Error('PDF content not available for this book.');
        }

        const loadingTask = pdfjsLib.getDocument(dataUrl);
        const loadedDoc = await loadingTask.promise;

        if (!isMounted) return;
        setPdfDoc(loadedDoc);
        setNumPages(loadedDoc.numPages);
        setCurrentPage(1);
        setIsLoading(false);

        // Auto-fit after loaded
        setTimeout(() => fitToWidth(), 150);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Failed to load PDF:', err);
        setError(err.message || 'Failed to load PDF file. Please ensure it is a valid PDF.');
        setIsLoading(false);
      }
    };

    initPdf();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [book.id, book.pdfDataUrl, fitToWidth]);

  // ── Render Page with Canvas + Exact Text Layer ─────────────────────────
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || !textLayerRef.current) return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {}
      renderTaskRef.current = null;
    }

    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = Math.floor(viewport.width) + 'px';
      canvas.style.height = Math.floor(viewport.height) + 'px';

      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

      const renderContext = {
        canvasContext: context,
        viewport,
        transform,
      };

      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;

      // Render Text Layer for Native Selection
      const textLayerDiv = textLayerRef.current;
      textLayerDiv.innerHTML = '';
      textLayerDiv.style.width = Math.floor(viewport.width) + 'px';
      textLayerDiv.style.height = Math.floor(viewport.height) + 'px';

      const textContent = await page.getTextContent();
      const pdfjsLib = await loadPdfJs();

      if (pdfjsLib.renderTextLayer) {
        await pdfjsLib.renderTextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport,
          textDivs: [],
        }).promise;
      }
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Page render error:', err);
      }
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  // ── Word Selection Handling ─────────────────────────────────────────────
  const extractContextSentence = (fullText: string, targetWord: string): string => {
    if (!fullText) return '';
    const sentences = fullText.split(/(?<=[.!?])\s+/);
    const lowerWord = targetWord.toLowerCase();
    const matched = sentences.find((s) => s.toLowerCase().includes(lowerWord));
    if (matched) {
      return matched.trim().replace(/\s+/g, ' ');
    }
    const idx = fullText.toLowerCase().indexOf(lowerWord);
    if (idx !== -1) {
      const start = Math.max(0, idx - 60);
      const end = Math.min(fullText.length, idx + targetWord.length + 60);
      return (start > 0 ? '...' : '') + fullText.slice(start, end).trim() + (end < fullText.length ? '...' : '');
    }
    return '';
  };

  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;

    const rawWord = selection.toString().trim();
    const cleanWord = normalizeWord(rawWord);
    if (!cleanWord || cleanWord.length < 2) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    let context = '';
    try {
      const ancestor = range.commonAncestorContainer;
      const parentEl = ancestor.nodeType === 1 ? (ancestor as HTMLElement) : ancestor.parentElement;
      if (parentEl && textLayerRef.current && textLayerRef.current.contains(parentEl)) {
        const fullLayerText = textLayerRef.current.innerText || '';
        context = extractContextSentence(fullLayerText, cleanWord);
      }
    } catch (e) {
      console.warn('Context extraction error:', e);
    }

    setSelectedWord(cleanWord);
    setSelectedContext(context);
    setPopupPos({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(handleSelection, 60);
    };

    const handleTouchEnd = () => {
      setTimeout(handleSelection, 120);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleSelection]);

  // Swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartXRef.current;
    if (Math.abs(diff) > 80) {
      if (diff < 0 && currentPage < numPages) {
        setCurrentPage((p) => p + 1);
      } else if (diff > 0 && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      }
    }
    touchStartXRef.current = null;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setCurrentPage((p) => Math.min(numPages, p + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentPage((p) => Math.max(1, p - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numPages]);

  // Save word callback
  const handleSaveWord = () => {
    if (!selectedWord) return;
    onSaveWord({
      bookId: book.id,
      word: selectedWord,
      pageNumber: physicalPage,
      context: selectedContext,
    });
    showToast(`Saved "${selectedWord}" on page ${physicalPage}!`);
    setSelectedWord('');
    setPopupPos(null);
    window.getSelection()?.removeAllRanges();
  };

  // ── PDF Text Search ─────────────────────────────────────────────────────
  const performSearch = async (query: string) => {
    if (!pdfDoc || !query.trim()) return;
    setIsSearching(true);
    const matches: number[] = [];

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((it: any) => it.str).join(' ').toLowerCase();
      if (pageText.includes(query.toLowerCase())) {
        matches.push(i);
      }
    }

    setSearchMatches(matches);
    setIsSearching(false);

    if (matches.length > 0) {
      setCurrentMatchIdx(0);
      setCurrentPage(matches[0]);
      showToast(`Found on ${matches.length} page(s)`);
    } else {
      setCurrentMatchIdx(-1);
      showToast(`"${query}" not found in PDF`);
    }
  };

  const nextSearchResult = () => {
    if (searchMatches.length === 0) return;
    const nextIdx = (currentMatchIdx + 1) % searchMatches.length;
    setCurrentMatchIdx(nextIdx);
    setCurrentPage(searchMatches[nextIdx]);
  };

  const prevSearchResult = () => {
    if (searchMatches.length === 0) return;
    const prevIdx = (currentMatchIdx - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIdx(prevIdx);
    setCurrentPage(searchMatches[prevIdx]);
  };

  const isSelectedWordDuplicate = bookVocab.some(
    (v) => v.word.toLowerCase() === selectedWord.toLowerCase() && v.pageNumber === physicalPage
  );

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-slate-950 overflow-hidden select-none pb-14 md:pb-0">
      {/* ── Toolbar (Responsive for Laptop and Mobile) ────────────────────── */}
      <div className="h-12 bg-slate-900 border-b border-slate-800 px-2 sm:px-4 flex items-center justify-between gap-2 text-slate-200 z-20 shrink-0">
        {/* Left: Book title & Physical Page info */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 truncate max-w-[110px] sm:max-w-[200px]">
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{book.title}</span>
          </div>

          {/* Physical vs PDF page indicator button */}
          <div className="relative">
            <button
              onClick={() => {
                setTempOffset(book.pageOffset || 0);
                setEditingOffset(!editingOffset);
              }}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-750 px-2 py-1 rounded-md border border-slate-700 text-xs font-medium text-slate-100 transition-colors"
              title="Click to adjust physical book page offset"
            >
              <span>p. {physicalPage}</span>
              {book.pageOffset !== 0 && (
                <span className="text-[10px] text-slate-400">
                  ({book.pageOffset > 0 ? `+${book.pageOffset}` : book.pageOffset})
                </span>
              )}
              <Settings2 className="w-2.5 h-2.5 text-slate-400 ml-0.5" />
            </button>

            {/* Offset Popover Editor */}
            {editingOffset && (
              <div className="fixed sm:absolute top-14 left-4 sm:left-0 z-50 bg-slate-900 border border-slate-700 shadow-2xl p-3.5 rounded-xl w-72 text-xs animate-in fade-in">
                <div className="font-semibold text-white mb-1">Physical Page Offset</div>
                <p className="text-[11px] text-slate-400 mb-2.5 leading-relaxed">
                  If the PDF page 20 corresponds to your printed book page 15, set offset to <strong>-5</strong>.
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-slate-300">Offset:</label>
                  <input
                    type="number"
                    value={tempOffset}
                    onChange={(e) => setTempOffset(parseInt(e.target.value) || 0)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-white w-20 text-center font-mono font-bold"
                  />
                  <span className="text-slate-400 text-[11px]">
                    =&gt; Book page {currentPage + tempOffset}
                  </span>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditingOffset(false)}
                    className="px-2.5 py-1 text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      onUpdateBookOffset(book.id, tempOffset);
                      setEditingOffset(false);
                      showToast(`Updated physical offset to ${tempOffset > 0 ? `+${tempOffset}` : tempOffset}`);
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium"
                  >
                    Save Offset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Page Navigation & Zoom Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Page Prev/Next buttons */}
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1 sm:p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 text-xs text-slate-300 bg-slate-800/90 px-2 py-1 rounded-lg border border-slate-700/80">
            <input
              type="number"
              min={1}
              max={numPages}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val >= 1 && val <= numPages) setCurrentPage(val);
              }}
              className="w-7 text-center bg-transparent border-b border-slate-600 focus:outline-none focus:border-blue-400 text-white font-mono"
            />
            <span className="text-slate-500">/</span>
            <span className="font-mono text-slate-400">{numPages}</span>
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
            className="p-1 sm:p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Zoom controls (Compact on mobile) */}
          <div className="flex items-center gap-0.5 bg-slate-800/90 p-0.5 rounded-lg border border-slate-700/80">
            <button
              onClick={() => setScale((s) => Math.max(0.6, parseFloat((s - 0.15).toFixed(2))))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={fitToWidth}
              className="p-1 hover:bg-slate-700 rounded text-slate-300"
              title="Fit to Width (Clear readability)"
            >
              <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
            </button>
            <button
              onClick={() => setScale((s) => Math.min(2.5, parseFloat((s + 0.15).toFixed(2))))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Search & Saved Words Toggle */}
        <div className="flex items-center gap-1.5">
          {/* Mobile search toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1.5 rounded-lg text-slate-300 border border-slate-700 sm:hidden transition-colors ${
              showSearch ? 'bg-blue-600 text-white' : 'bg-slate-800'
            }`}
            title="Search PDF"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Desktop PDF Search Input */}
          <div className="hidden sm:relative sm:flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search PDF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') performSearch(searchQuery);
              }}
              className="pl-7 pr-7 py-1 bg-slate-800 border border-slate-700 text-xs rounded-lg text-white placeholder-slate-500 w-28 focus:w-40 transition-all focus:outline-none focus:border-blue-500"
            />
            {searchMatches.length > 0 && (
              <div className="absolute right-1.5 flex items-center gap-0.5 text-[10px] text-slate-400">
                <span>{currentMatchIdx + 1}/{searchMatches.length}</span>
                <button onClick={prevSearchResult} className="hover:text-white px-0.5">▲</button>
                <button onClick={nextSearchResult} className="hover:text-white px-0.5">▼</button>
              </div>
            )}
          </div>

          {/* Toggle Saved Words Sidebar / Drawer */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors relative ${
              sidebarOpen
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Toggle Collected Words list"
          >
            <Bookmark className="w-3.5 h-3.5" />
            {currentPageVocab.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-blue-400 absolute -top-0.5 -right-0.5" />
            )}
            <span className="hidden md:inline font-medium">Words</span>
          </button>
        </div>
      </div>

      {/* Mobile Search Pop-down */}
      {showSearch && (
        <div className="sm:hidden bg-slate-900 border-b border-slate-800 p-2 flex items-center gap-2 animate-in slide-in-from-top-2">
          <input
            type="text"
            placeholder="Search word in PDF..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') performSearch(searchQuery);
            }}
            className="flex-1 bg-slate-800 border border-slate-700 text-xs rounded-lg px-3 py-1.5 text-white"
          />
          <button
            onClick={() => performSearch(searchQuery)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
          >
            Find
          </button>
          {searchMatches.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-300">
              <span>{currentMatchIdx + 1}/{searchMatches.length}</span>
              <button onClick={prevSearchResult} className="p-1 bg-slate-800 rounded">▲</button>
              <button onClick={nextSearchResult} className="p-1 bg-slate-800 rounded">▼</button>
            </div>
          )}
        </div>
      )}

      {/* ── Main Workspace: Reader + Sidebar ──────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* PDF Viewport */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-slate-900/60 flex flex-col items-center py-4 sm:py-6 px-2 sm:px-4 relative scroll-smooth"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {isLoading && (
            <div className="flex flex-col items-center justify-center my-auto gap-3 text-slate-400 py-20">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Rendering PDF pages...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center my-auto gap-3 text-red-400 py-20 max-w-md text-center p-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm font-semibold">Error opening book</p>
              <p className="text-xs text-slate-400">{error}</p>
            </div>
          )}

          {/* Canvas + Text Layer Wrapper */}
          <div
            style={{ display: isLoading || error ? 'none' : 'inline-block' }}
            className="pdf-canvas-wrapper relative shadow-2xl rounded-sm border border-slate-800 bg-white"
          >
            {/* Real Canvas bitmap */}
            <canvas ref={canvasRef} className="block" />

            {/* Selectable Text Layer */}
            <div
              ref={textLayerRef}
              className="pdf-text-layer absolute top-0 left-0 overflow-hidden leading-none select-text cursor-text"
            />
          </div>

          {/* Save Word Popup / Mobile Sheet */}
          {popupPos && selectedWord && (
            <WordPopup
              word={selectedWord}
              pageNumber={currentPage}
              physicalPageNumber={physicalPage}
              context={selectedContext}
              position={popupPos}
              onSave={handleSaveWord}
              onCancel={() => {
                setSelectedWord('');
                setPopupPos(null);
                window.getSelection()?.removeAllRanges();
              }}
              isDuplicate={isSelectedWordDuplicate}
            />
          )}

          {/* Non-intrusive toast feedback */}
          {toastMessage && (
            <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-emerald-500/50 shadow-2xl px-4 py-2 rounded-full text-xs font-medium text-emerald-300 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 z-50">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{toastMessage}</span>
            </div>
          )}
        </div>

        {/* ── Saved Words Sidebar / Drawer ─────────────────────────────────── */}
        {sidebarOpen && (
          <aside className="fixed inset-y-0 right-0 z-30 w-72 md:static md:w-72 bg-slate-900/95 md:bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 select-none shadow-2xl md:shadow-none animate-in slide-in-from-right duration-200">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Bookmark className="w-3.5 h-3.5 text-blue-400" />
                <span>Collected Words</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {bookVocab.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={onNavigateToVocab}
                  className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline mr-1"
                >
                  Table →
                </button>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 text-slate-400 hover:text-white md:hidden"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Current Page Highlight Header */}
            {currentPageVocab.length > 0 && (
              <div className="px-3 py-1.5 bg-blue-950/40 border-b border-blue-900/40 text-[11px] text-blue-300 flex items-center justify-between">
                <span>On this page ({currentPageVocab.length}):</span>
                <span className="font-mono text-blue-400 font-bold">p.{physicalPage}</span>
              </div>
            )}

            {/* Words list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {bookVocab.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                  <Bookmark className="w-6 h-6 opacity-30" />
                  <p className="font-semibold text-slate-400">No words saved yet.</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Highlight or tap any unfamiliar word in the PDF reader to save it for annotations.
                  </p>
                </div>
              ) : (
                bookVocab.map((item) => {
                  const isCurrentPage = item.pageNumber === physicalPage;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        const targetPdfPage = item.pageNumber - (book.pageOffset || 0);
                        if (targetPdfPage >= 1 && targetPdfPage <= numPages) {
                          setCurrentPage(targetPdfPage);
                        }
                      }}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isCurrentPage
                          ? 'bg-blue-950/60 border-blue-500/50 shadow-sm'
                          : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono font-bold text-xs text-blue-300 capitalize">
                          {item.word}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 bg-slate-900/60 px-1.5 py-0.2 rounded border border-slate-800">
                            p.{item.pageNumber}
                          </span>
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-semibold uppercase ${
                              item.status === 'processed'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : item.status === 'printed'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>

                      {item.meaning ? (
                        <p className="text-[11px] text-slate-200 line-clamp-2">
                          {item.meaning}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-500 italic line-clamp-2">
                          &ldquo;{item.context}&rdquo;
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Action Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {bookVocab.filter((v) => v.status === 'pending').length} pending AI
              </span>
              <button
                onClick={onNavigateToVocab}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Process AI</span>
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* ── Reader Bottom Action Bar: Vocab and Print Buttons ── */}
      <div className="h-14 bg-slate-900/95 border-t border-slate-800 px-3 sm:px-4 flex items-center justify-between shrink-0 select-none z-20 shadow-lg">
        {/* Left: Return to Library / Books */}
        <button
          onClick={onNavigateToBooks}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors"
          title="Return to Books library"
        >
          <ChevronLeft className="w-4 h-4 text-blue-400" />
          <span>Books</span>
        </button>

        {/* Right: The Two Requested Options (Buttons): Vocab & Print */}
        <div className="flex items-center gap-2">
          {/* Button 1: Vocab Option */}
          <button
            onClick={onNavigateToVocab}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all shadow-sm active:scale-95"
            title="View vocabulary collected for this PDF"
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Vocab</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
              {bookVocab.length}
            </span>
          </button>

          {/* Button 2: Print Option */}
          <button
            onClick={onNavigateToPrint}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white text-xs font-bold transition-all shadow-md active:scale-95"
            title="Print vocabulary labels for this PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
            {bookVocab.filter((v) => v.status !== 'printed').length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-indigo-950 text-indigo-200 border border-indigo-700">
                {bookVocab.filter((v) => v.status !== 'printed').length}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
