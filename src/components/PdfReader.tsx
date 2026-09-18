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
  AlertCircle
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
}

export const PdfReader: React.FC<PdfReaderProps> = ({
  book,
  vocabulary,
  onSaveWord,
  onUpdateBookOffset,
  onNavigateToVocab,
}) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(book.totalPages || 1);
  const [scale, setScale] = useState<number>(1.3);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

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

  const physicalPage = currentPage + (book.pageOffset || 0);

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

        // Support data URL or base64
        const loadingTask = pdfjsLib.getDocument(dataUrl);
        const loadedDoc = await loadingTask.promise;

        if (!isMounted) return;
        setPdfDoc(loadedDoc);
        setNumPages(loadedDoc.numPages);
        setCurrentPage(1);
        setIsLoading(false);
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
  }, [book.id, book.pdfDataUrl]);

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

      // Base logical viewport (CSS pixels)
      const viewport = page.getViewport({ scale });
      const dpr = window.devicePixelRatio || 1;

      // 1. Setup Canvas (sharp pixel density)
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 2. Setup Text Layer (matches CSS width/height exactly)
      const textLayer = textLayerRef.current;
      textLayer.innerHTML = '';
      textLayer.style.width = `${Math.floor(viewport.width)}px`;
      textLayer.style.height = `${Math.floor(viewport.height)}px`;

      // Render Canvas
      const renderContext = {
        canvasContext: ctx,
        viewport,
      };
      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;

      // Render Text Layer
      const textContent = await page.getTextContent();
      const pdfjsLib = window.pdfjsLib;

      if (pdfjsLib && pdfjsLib.renderTextLayer) {
        pdfjsLib.renderTextLayer({
          textContent,
          container: textLayer,
          viewport,
          textDivs: [],
        });
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

  // ── Context Extraction Helper ───────────────────────────────────────────
  const extractContextSentence = (selectedText: string, textLayerEl: HTMLElement): string => {
    try {
      // Gather all text lines from text layer
      const spans = Array.from(textLayerEl.querySelectorAll('span'));
      const fullPageText = spans.map((s) => s.textContent).join(' ').replace(/\s+/g, ' ');

      const cleanWord = selectedText.trim();
      const wordIdx = fullPageText.toLowerCase().indexOf(cleanWord.toLowerCase());

      if (wordIdx === -1) return cleanWord;

      // Find sentence boundaries: period, exclamation, question mark, or start/end
      const beforeText = fullPageText.slice(0, wordIdx);
      const afterText = fullPageText.slice(wordIdx + cleanWord.length);

      const sentenceStart = Math.max(
        beforeText.lastIndexOf('. '),
        beforeText.lastIndexOf('! '),
        beforeText.lastIndexOf('? '),
        0
      );

      const endMatch = afterText.search(/[.!?](\s|$)/);
      const sentenceEnd = endMatch !== -1 ? wordIdx + cleanWord.length + endMatch + 1 : fullPageText.length;

      let sentence = fullPageText.slice(sentenceStart === 0 ? 0 : sentenceStart + 2, sentenceEnd).trim();

      // Cap context to clean readable length if sentence is overly long
      if (sentence.length > 250) {
        sentence = sentence.slice(0, 240) + '…';
      }
      return sentence;
    } catch {
      return selectedText;
    }
  };

  // ── Word Selection Handling ────────────────────────────────────────────
  const handleSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;

    const anchorNode = sel.anchorNode;
    if (!anchorNode) return;

    const el = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : (anchorNode as HTMLElement);
    const textLayer = el?.closest('.pdf-text-layer') as HTMLElement;
    if (!textLayer) return;

    const raw = sel.toString().trim();
    if (!raw || raw.length < 2) return;

    const word = normalizeWord(raw);
    if (!word || word.length < 2) return;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const context = extractContextSentence(word, textLayer);

    setSelectedWord(word);
    setSelectedContext(context);
    setPopupPos({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }, []);

  // Listen for selection changes
  useEffect(() => {
    const onSelectionChange = () => {
      handleSelection();
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [handleSelection]);

  // Touch long-press support
  const touchTimerRef = useRef<any>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchTimerRef.current = setTimeout(() => {
      handleSelection();
    }, 450);
  };
  const handleTouchEnd = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
  };

  // ── Save Word from Popup ────────────────────────────────────────────────
  const handleSaveWord = () => {
    if (!selectedWord) return;

    onSaveWord({
      bookId: book.id,
      word: selectedWord,
      pageNumber: physicalPage,
      context: selectedContext,
    });

    showToast(`Saved "${selectedWord}" — Page ${physicalPage}`);
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

  // Check if current selected word is already recorded
  const isSelectedWordDuplicate = bookVocab.some(
    (v) => v.word.toLowerCase() === selectedWord.toLowerCase() && v.pageNumber === physicalPage
  );

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-slate-950 overflow-hidden select-none">
      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between gap-3 text-slate-200 z-20">
        {/* Left: Book title & Physical Page info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 truncate max-w-[200px]">
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="truncate">{book.title}</span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Physical vs PDF page indicator */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60 text-xs">
            <span className="font-medium text-slate-100">
              Page {physicalPage}
            </span>
            {book.pageOffset !== 0 && (
              <span className="text-[10px] text-slate-400">
                (PDF {currentPage})
              </span>
            )}
            <button
              onClick={() => {
                setTempOffset(book.pageOffset || 0);
                setEditingOffset(!editingOffset);
              }}
              className="text-slate-400 hover:text-slate-200 ml-1 p-0.5"
              title="Configure physical page offset"
            >
              <Settings2 className="w-3 h-3" />
            </button>
          </div>

          {/* Offset popover editor */}
          {editingOffset && (
            <div className="absolute top-14 left-44 z-50 bg-slate-900 border border-slate-700 shadow-2xl p-3 rounded-lg w-64 text-xs">
              <div className="font-semibold text-white mb-1">Physical Page Offset</div>
              <p className="text-[11px] text-slate-400 mb-2">
                If the PDF page 20 corresponds to printed book page 15, set offset to -5.
              </p>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-slate-300">Offset:</label>
                <input
                  type="number"
                  value={tempOffset}
                  onChange={(e) => setTempOffset(parseInt(e.target.value) || 0)}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white w-20 text-center"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditingOffset(false)}
                  className="px-2 py-1 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onUpdateBookOffset(book.id, tempOffset);
                    setEditingOffset(false);
                  }}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium"
                >
                  Save Offset
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Center: Page navigation & Zoom */}
        <div className="flex items-center gap-2">
          {/* Prev / Page / Next */}
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-colors"
            title="Previous Page (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 text-xs text-slate-300 bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
            <input
              type="number"
              min={1}
              max={numPages}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val >= 1 && val <= numPages) setCurrentPage(val);
              }}
              className="w-8 text-center bg-transparent border-b border-slate-600 focus:outline-none focus:border-blue-400 text-white"
            />
            <span className="text-slate-500">/</span>
            <span>{numPages}</span>
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-colors"
            title="Next Page (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded border border-slate-700">
            <button
              onClick={() => setScale((s) => Math.max(0.6, s - 0.15))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1 text-slate-300 min-w-[38px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (containerRef.current) {
                  const containerWidth = containerRef.current.clientWidth - 48;
                  setScale(Math.max(0.7, Math.min(2.0, containerWidth / 600)));
                }
              }}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 ml-0.5"
              title="Fit to Width"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Search & Sidebar Toggle */}
        <div className="flex items-center gap-2">
          {/* PDF Search Input */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search PDF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') performSearch(searchQuery);
              }}
              className="pl-7 pr-7 py-1 bg-slate-800 border border-slate-700 text-xs rounded-md text-white placeholder-slate-500 w-32 focus:w-44 transition-all focus:outline-none focus:border-blue-500"
            />
            {searchMatches.length > 0 && (
              <div className="absolute right-1.5 flex items-center gap-0.5 text-[10px] text-slate-400">
                <span>{currentMatchIdx + 1}/{searchMatches.length}</span>
                <button onClick={prevSearchResult} className="hover:text-white px-0.5">▲</button>
                <button onClick={nextSearchResult} className="hover:text-white px-0.5">▼</button>
              </div>
            )}
          </div>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-1.5 rounded-md border text-xs flex items-center gap-1 transition-colors ${
              sidebarOpen
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Saved Words Sidebar"
          >
            {sidebarOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            <span className="hidden xl:inline">Sidebar</span>
          </button>
        </div>
      </div>

      {/* ── Main Workspace: Reader + Sidebar ──────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* PDF Viewport */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-slate-900/60 flex flex-col items-center py-6 px-4 relative scroll-smooth"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {isLoading && (
            <div className="flex flex-col items-center justify-center my-auto gap-3 text-slate-400 py-20">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Rendering PDF pages...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center my-auto gap-3 text-red-400 py-20 max-w-md text-center">
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

          {/* Floating Save Word Popup */}
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

          {/* Non-intrusive bottom toast feedback */}
          {toastMessage && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-emerald-500/50 shadow-xl px-4 py-2 rounded-full text-xs font-medium text-emerald-300 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 z-50">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{toastMessage}</span>
            </div>
          )}
        </div>

        {/* ── Saved Words Sidebar ────────────────────────────────────────── */}
        {sidebarOpen && (
          <aside className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 z-10 select-none">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Bookmark className="w-3.5 h-3.5 text-blue-400" />
                <span>Collected Words</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {bookVocab.length}
                </span>
              </div>
              <button
                onClick={onNavigateToVocab}
                className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline"
              >
                View Table →
              </button>
            </div>

            {/* Current Page Highlight Header if any */}
            {currentPageVocab.length > 0 && (
              <div className="px-3 py-1.5 bg-blue-950/40 border-b border-blue-900/40 text-[11px] text-blue-300 flex items-center justify-between">
                <span>On this page ({currentPageVocab.length}):</span>
                <span className="font-mono text-blue-400">p.{physicalPage}</span>
              </div>
            )}

            {/* Words list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {bookVocab.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                  <Bookmark className="w-6 h-6 opacity-30" />
                  <p>No words saved yet.</p>
                  <p className="text-[11px] text-slate-600">
                    Double-click or long-press any unfamiliar word in the PDF.
                  </p>
                </div>
              ) : (
                bookVocab.map((item) => {
                  const isCurrentPage = item.pageNumber === physicalPage;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        // Jump reader to this word's PDF page
                        const targetPdfPage = item.pageNumber - (book.pageOffset || 0);
                        if (targetPdfPage >= 1 && targetPdfPage <= numPages) {
                          setCurrentPage(targetPdfPage);
                        }
                      }}
                      className={`p-2 rounded-lg border transition-all cursor-pointer ${
                        isCurrentPage
                          ? 'bg-blue-950/60 border-blue-500/50 shadow-sm'
                          : 'bg-slate-800/50 border-slate-750 hover:bg-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono font-bold text-xs text-blue-300">
                          {item.word}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 bg-slate-900/60 px-1 py-0.2 rounded border border-slate-800">
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
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Process Meanings</span>
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
