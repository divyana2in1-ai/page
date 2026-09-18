import React, { useState, useMemo } from 'react';
import {
  Printer,
  Download,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Layers,
  Scissors,
  BookOpen,
  Grid,
  Tag,
  RotateCcw,
  Type,
  FileText,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Book, VocabularyItem, PrintSettings, WordCasingStyle } from '../types';
import { SCREENSHOT_DEMO_VOCABULARY } from '../sampleBook';

interface PrintStudioProps {
  books: Book[];
  currentBook: Book | null;
  vocabulary: VocabularyItem[];
  printSettings: PrintSettings;
  onUpdatePrintSettings: (settings: PrintSettings) => void;
  onMarkAsPrinted: (vocabIds: string[]) => void;
  onNavigateToVocab: () => void;
  onLoadDemoVocab?: (items: VocabularyItem[]) => void;
}

const PAPER_DIMS_MM: Record<string, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
  Letter: { w: 215.9, h: 279.4 },
};

export interface PageBlockLayoutItem {
  pageNumber: number;
  entries: VocabularyItem[];
  xMm: number;
  yMm: number;
  wMm: number;
  hMm: number;
  sheetIndex: number;
}

export interface IndividualLabelLayoutItem {
  entry: VocabularyItem;
  xMm: number;
  yMm: number;
  wMm: number;
  hMm: number;
  sheetIndex: number;
}

// Format word casing according to settings
export function formatWordCasing(rawWord: string, casing: WordCasingStyle = 'capitalize'): string {
  if (!rawWord) return '';
  const trimmed = rawWord.trim();
  if (casing === 'uppercase') {
    return trimmed.toUpperCase();
  }
  if (casing === 'capitalize') {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
  return trimmed;
}

export const PrintStudio: React.FC<PrintStudioProps> = ({
  books,
  currentBook,
  vocabulary,
  printSettings,
  onUpdatePrintSettings,
  onMarkAsPrinted,
  onNavigateToVocab,
  onLoadDemoVocab,
}) => {
  const [selectedBookId, setSelectedBookId] = useState<string>(
    currentBook?.id || books[0]?.id || ''
  );
  const [filterPrinted, setFilterPrinted] = useState<'all' | 'unprinted'>('all');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [printSuccessMsg, setPrintSuccessMsg] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(1.0); // 0.7 to 1.5

  const activeBook = books.find((b) => b.id === selectedBookId) || currentBook || books[0];

  // Filter vocabulary for printable items (must have a definition/meaning)
  const printableEntries = useMemo(() => {
    return vocabulary
      .filter((v) => {
        if (selectedBookId && v.bookId !== selectedBookId) return false;
        if (!v.meaning || v.meaning.trim() === '') return false;
        if (filterPrinted === 'unprinted' && v.status === 'printed') return false;
        return true;
      })
      .sort((a, b) => {
        if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
        return a.word.localeCompare(b.word);
      });
  }, [vocabulary, selectedBookId, filterPrinted]);

  // Group printable entries by book page number
  const pageGroups = useMemo(() => {
    const map = new Map<number, VocabularyItem[]>();
    printableEntries.forEach((entry) => {
      const p = entry.pageNumber || 1;
      if (!map.has(p)) {
        map.set(p, []);
      }
      map.get(p)!.push(entry);
    });

    const sortedPages = Array.from(map.keys()).sort((a, b) => a - b);
    return sortedPages.map((page) => ({
      pageNumber: page,
      entries: map.get(page)!,
    }));
  }, [printableEntries]);

  // Paper Dimensions in mm
  const paperW =
    printSettings.paperSize === 'Custom'
      ? printSettings.customWidthMm
      : PAPER_DIMS_MM[printSettings.paperSize]?.w || 210;
  const paperH =
    printSettings.paperSize === 'Custom'
      ? printSettings.customHeightMm
      : PAPER_DIMS_MM[printSettings.paperSize]?.h || 297;

  const margin = printSettings.marginMm ?? 12;
  const gap = printSettings.gapMm ?? 6;
  const cols = Math.max(1, printSettings.columns ?? 2);
  const padding = printSettings.blockPaddingMm ?? 3.5;
  const fontSizePt = printSettings.fontSizePt ?? 8.5;
  const lineSpacing = printSettings.lineSpacing ?? 1.35;
  const itemGapMm = printSettings.itemSpacingMm ?? 1.5;
  const bottomExtraMm = printSettings.bottomExtraPaddingMm ?? 3.5;
  const fontFamily = printSettings.fontFamily ?? 'times';
  const casing = printSettings.casing ?? 'capitalize';
  const pageIndicator = printSettings.pageIndicator ?? 'none';
  const isPageBlocksMode = (printSettings.layoutMode ?? 'page-blocks') === 'page-blocks';

  // Usable area on paper
  const usableW = Math.max(20, paperW - 2 * margin);
  const blockW = Math.max(30, (usableW - (cols - 1) * gap) / cols);
  const innerContentW = Math.max(20, blockW - 2 * padding);

  // Line step in millimeters: 1 pt = 0.352778 mm
  const lineStepMm = (fontSizePt * 0.352778) * lineSpacing;

  // ── Calculate Layout for "One Block Per Page" Mode with Dynamic Height ────────
  const pageBlocksLayoutSheets = useMemo(() => {
    if (!isPageBlocksMode || pageGroups.length === 0) return [];

    // Use dummy jsPDF for exact text measurement
    const measureDoc = new jsPDF({ unit: 'mm' });
    const fontName = fontFamily === 'times' ? 'times' : 'helvetica';
    measureDoc.setFont(fontName, 'normal');
    measureDoc.setFontSize(fontSizePt);

    const headerHeightMm = pageIndicator === 'header' ? 7.0 : 0;

    // 1. Calculate truly dynamic heights for each page block
    const calculatedBlocks = pageGroups.map((group) => {
      let contentHeight = headerHeightMm;

      group.entries.forEach((entry, idx) => {
        const wordStr = formatWordCasing(entry.word, casing) + ': ';
        const defStr = entry.meaning?.trim() || '';

        measureDoc.setFont(fontName, 'bold');
        measureDoc.setFontSize(fontSizePt);
        const wordWidth = measureDoc.getTextWidth(wordStr);

        measureDoc.setFont(fontName, 'normal');
        measureDoc.setFontSize(fontSizePt);

        let linesCount = 1;
        const remainingWidthLine1 = innerContentW - wordWidth;

        if (remainingWidthLine1 > 10) {
          const words = defStr.split(/\s+/);
          let line1 = '';
          let wordIdx = 0;

          while (wordIdx < words.length) {
            const testStr = line1 ? `${line1} ${words[wordIdx]}` : words[wordIdx];
            if (measureDoc.getTextWidth(testStr) <= remainingWidthLine1) {
              line1 = testStr;
              wordIdx++;
            } else {
              break;
            }
          }

          if (wordIdx < words.length) {
            const restText = words.slice(wordIdx).join(' ');
            const restLines = measureDoc.splitTextToSize(restText, innerContentW);
            linesCount += restLines.length;
          }
        } else {
          // Word was too long to share line 1, definition starts on next line
          linesCount += 1;
          const restLines = measureDoc.splitTextToSize(defStr, innerContentW);
          linesCount += Math.max(0, restLines.length - 1);
        }

        // Each line takes lineStepMm
        contentHeight += linesCount * lineStepMm;
        if (idx < group.entries.length - 1) {
          contentHeight += itemGapMm;
        }
      });

      // Total block height is top padding + content + bottom padding + dynamic safety headroom
      const totalBlockH = Math.max(18, padding * 2 + contentHeight + bottomExtraMm);
      return {
        ...group,
        calculatedHeight: totalBlockH,
      };
    });

    // 2. Place blocks onto paper sheets using row-by-row multi-column grid
    const sheets: Array<{ sheetIndex: number; blocks: PageBlockLayoutItem[] }> = [];
    let currentSheetBlocks: PageBlockLayoutItem[] = [];
    let currentSheetIndex = 0;

    let currentY = margin;
    let blockIndex = 0;

    while (blockIndex < calculatedBlocks.length) {
      // Collect blocks for the current row (up to `cols` blocks)
      const rowBlocks: typeof calculatedBlocks = [];
      for (let c = 0; c < cols && blockIndex < calculatedBlocks.length; c++) {
        rowBlocks.push(calculatedBlocks[blockIndex]);
        blockIndex++;
      }

      // Determine max height among blocks in this row
      const maxRowH = Math.max(...rowBlocks.map((b) => b.calculatedHeight));

      // Check if this row fits on current sheet
      if (currentY + maxRowH > paperH - margin && currentSheetBlocks.length > 0) {
        sheets.push({ sheetIndex: currentSheetIndex, blocks: currentSheetBlocks });
        currentSheetBlocks = [];
        currentSheetIndex++;
        currentY = margin;
      }

      // Place blocks in row
      rowBlocks.forEach((block, colIdx) => {
        const xPos = margin + colIdx * (blockW + gap);
        currentSheetBlocks.push({
          pageNumber: block.pageNumber,
          entries: block.entries,
          xMm: xPos,
          yMm: currentY,
          wMm: blockW,
          hMm: block.calculatedHeight,
          sheetIndex: currentSheetIndex,
        });
      });

      currentY += maxRowH + gap;
    }

    if (currentSheetBlocks.length > 0) {
      sheets.push({ sheetIndex: currentSheetIndex, blocks: currentSheetBlocks });
    }

    return sheets;
  }, [
    isPageBlocksMode,
    pageGroups,
    paperW,
    paperH,
    margin,
    gap,
    cols,
    padding,
    fontSizePt,
    lineSpacing,
    lineStepMm,
    itemGapMm,
    bottomExtraMm,
    fontFamily,
    casing,
    pageIndicator,
    blockW,
    innerContentW,
  ]);

  // ── Calculate Layout for Individual Labels Mode ─────────────────────────────
  const individualLabelsSheets = useMemo(() => {
    if (isPageBlocksMode || printableEntries.length === 0) return [];

    const lw = printSettings.labelWidthMm || 60;
    const lh = printSettings.labelHeightMm || 20;
    const indCols = Math.max(1, printSettings.columns || 3);
    const indMargin = printSettings.marginMm || 10;
    const indGap = printSettings.gapMm || 3;

    const sheets: Array<{ sheetIndex: number; labels: IndividualLabelLayoutItem[] }> = [];
    let currentLabels: IndividualLabelLayoutItem[] = [];
    let sheetIdx = 0;
    let currentCol = 0;
    let currentY = indMargin;

    for (let i = 0; i < printableEntries.length; i++) {
      const entry = printableEntries[i];

      if (currentY + lh > paperH - indMargin) {
        if (currentCol < indCols - 1) {
          currentCol++;
          currentY = indMargin;
        } else {
          sheets.push({ sheetIndex: sheetIdx, labels: currentLabels });
          currentLabels = [];
          sheetIdx++;
          currentCol = 0;
          currentY = indMargin;
        }
      }

      const labelX = indMargin + currentCol * (lw + indGap);
      currentLabels.push({
        entry,
        xMm: labelX,
        yMm: currentY,
        wMm: lw,
        hMm: lh,
        sheetIndex: sheetIdx,
      });

      currentY += lh + indGap;
    }

    if (currentLabels.length > 0) {
      sheets.push({ sheetIndex: sheetIdx, labels: currentLabels });
    }

    return sheets;
  }, [isPageBlocksMode, printableEntries, paperH, printSettings]);

  // ── Download Printable Vector PDF (Exact Match with Dynamic Heights) ────────
  const generatePdf = async () => {
    if (printableEntries.length === 0) return;
    setIsGeneratingPdf(true);

    try {
      const orientation = paperW > paperH ? 'landscape' : 'portrait';
      const doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: [paperW, paperH],
      });

      const fontName = fontFamily === 'times' ? 'times' : 'helvetica';

      if (isPageBlocksMode) {
        // ── Render Page-Consolidated Blocks ──
        pageBlocksLayoutSheets.forEach((sheet, sheetIdx) => {
          if (sheetIdx > 0) {
            doc.addPage([paperW, paperH], orientation);
          }

          sheet.blocks.forEach((block) => {
            const { xMm, yMm, wMm, hMm, entries, pageNumber } = block;

            // Inner text positioning
            const innerX = xMm + padding;
            const contentW = wMm - padding * 2;
            let currentTextY = yMm + padding + (fontSizePt * 0.352778 * 0.85);

            // Optional Header / Badge
            if (pageIndicator === 'header') {
              doc.setFont(fontName, 'bold');
              doc.setFontSize(fontSizePt * 1.05);
              doc.setTextColor(30, 30, 30);
              doc.text(`PAGE ${pageNumber}`, innerX, currentTextY);
              currentTextY += 1.5;
              doc.setDrawColor(200, 200, 200);
              doc.setLineWidth(0.15);
              doc.line(innerX, currentTextY, innerX + contentW, currentTextY);
              currentTextY += lineStepMm + 1.0;
            } else if (pageIndicator === 'badge') {
              doc.setFont(fontName, 'bold');
              doc.setFontSize(Math.max(5.5, fontSizePt * 0.8));
              doc.setTextColor(100, 100, 100);
              doc.text(`p. ${pageNumber}`, xMm + wMm - padding, currentTextY, { align: 'right' });
            }

            // Render Each Word + Definition Line
            entries.forEach((entry, idx) => {
              const formattedWord = formatWordCasing(entry.word, casing);
              const boldPrefix = `${formattedWord}: `;
              const defText = entry.meaning?.trim() || '';

              doc.setFont(fontName, 'bold');
              doc.setFontSize(fontSizePt);
              doc.setTextColor(0, 0, 0);
              const prefixWidth = doc.getTextWidth(boldPrefix);

              doc.setFont(fontName, 'normal');
              doc.setFontSize(fontSizePt);
              doc.setTextColor(0, 0, 0);

              if (prefixWidth < contentW * 0.8) {
                // Word and colon in Bold
                doc.setFont(fontName, 'bold');
                doc.text(boldPrefix, innerX, currentTextY);

                // Definition in Normal weight
                doc.setFont(fontName, 'normal');
                const remainingWidthLine1 = contentW - prefixWidth;
                const words = defText.split(/\s+/);
                let line1Text = '';
                let wordIdx = 0;

                while (wordIdx < words.length) {
                  const testStr = line1Text ? `${line1Text} ${words[wordIdx]}` : words[wordIdx];
                  if (doc.getTextWidth(testStr) <= remainingWidthLine1) {
                    line1Text = testStr;
                    wordIdx++;
                  } else {
                    break;
                  }
                }

                if (line1Text) {
                  doc.text(line1Text, innerX + prefixWidth, currentTextY);
                }

                if (wordIdx < words.length) {
                  const restText = words.slice(wordIdx).join(' ');
                  const restLines = doc.splitTextToSize(restText, contentW);
                  for (let r = 0; r < restLines.length; r++) {
                    currentTextY += lineStepMm;
                    doc.text(restLines[r], innerX, currentTextY);
                  }
                }
              } else {
                // Long word prefix starts on its own line
                doc.setFont(fontName, 'bold');
                doc.text(boldPrefix, innerX, currentTextY);
                currentTextY += lineStepMm;

                doc.setFont(fontName, 'normal');
                const defLines = doc.splitTextToSize(defText, contentW);
                for (let d = 0; d < defLines.length; d++) {
                  doc.text(defLines[d], innerX, currentTextY);
                  if (d < defLines.length - 1) {
                    currentTextY += lineStepMm;
                  }
                }
              }

              // Step to next item
              if (idx < entries.length - 1) {
                currentTextY += lineStepMm + itemGapMm;
              }
            });

            // Calculate actual bottom reached by the text
            const actualBottomY = currentTextY + (fontSizePt * 0.352778 * 0.35) + padding + bottomExtraMm;
            const dynamicBoxH = Math.max(hMm, actualBottomY - yMm);

            // Draw Border Box with dynamically fitted height
            if (printSettings.showBorder) {
              doc.setDrawColor(0, 0, 0);
              doc.setLineWidth(0.25);
              if (printSettings.showDashedCutLine) {
                doc.setLineDashPattern([2, 1.5], 0);
              } else {
                doc.setLineDashPattern([], 0);
              }
              doc.rect(xMm, yMm, wMm, dynamicBoxH);
            }
          });
        });
      } else {
        // ── Render Individual Cutout Labels ──
        individualLabelsSheets.forEach((sheet, sheetIdx) => {
          if (sheetIdx > 0) {
            doc.addPage([paperW, paperH], orientation);
          }

          sheet.labels.forEach(({ entry, xMm, yMm, wMm, hMm }) => {
            if (printSettings.showBorder) {
              doc.setDrawColor(160, 160, 160);
              doc.setLineWidth(0.2);
              if (printSettings.showDashedCutLine) {
                doc.setLineDashPattern([1.5, 1.5], 0);
              } else {
                doc.setLineDashPattern([], 0);
              }
              doc.rect(xMm, yMm, wMm, hMm);
            }

            const padMm = 1.5;
            const textX = xMm + padMm;
            let textY = yMm + padMm + 2.5;

            if (printSettings.showPageNumber) {
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(5);
              doc.setTextColor(100, 100, 100);
              doc.text(`p.${entry.pageNumber}`, xMm + wMm - padMm, yMm + padMm + 2, { align: 'right' });
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(printSettings.fontSizeWordPt || 8);
            doc.setTextColor(0, 0, 0);
            doc.text(entry.word.toUpperCase(), textX, textY);
            textY += (printSettings.fontSizeWordPt || 8) * 0.4 + 1.2;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(printSettings.fontSizeMeaningPt || 6.5);
            doc.setTextColor(20, 20, 20);

            const maxTextWidth = wMm - padMm * 2;
            const meaningLines = doc.splitTextToSize(entry.meaning || '', maxTextWidth);
            meaningLines.slice(0, 3).forEach((line: string) => {
              if (textY < yMm + hMm - padMm) {
                doc.text(line, textX, textY);
                textY += (printSettings.fontSizeMeaningPt || 6.5) * 0.4 + 0.8;
              }
            });
          });
        });
      }

      const safeTitle = (activeBook?.title || 'Book_Vocabulary')
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_-]/g, '');
      const filename = `${safeTitle}_page_blocks.pdf`;
      doc.save(filename);

      onMarkAsPrinted(printableEntries.map((e) => e.id));
      setPrintSuccessMsg(`Generated ${printableEntries.length} words across ${isPageBlocksMode ? pageGroups.length : printableEntries.length} blocks!`);
      setTimeout(() => setPrintSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintNow = () => {
    window.print();
    onMarkAsPrinted(printableEntries.map((e) => e.id));
  };

  // Base preview scale factor: 2.8 px per mm
  const baseScale = 2.8;
  const effectiveScale = baseScale * previewZoom;

  const totalSheetsCount = isPageBlocksMode
    ? pageBlocksLayoutSheets.length
    : individualLabelsSheets.length;

  return (
    <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-950 text-slate-100 select-none">
      {/* ── Left Settings & Configuration Panel ──────────────────────────── */}
      <aside className="w-full md:w-88 bg-slate-900 border-r border-slate-800 p-4 md:p-5 overflow-y-auto shrink-0 space-y-4 text-xs">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Printer className="w-4 h-4 text-blue-400" />
              <span>Printable Annotation PDF</span>
            </h2>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Consolidate words into dynamic blocks per book page with automatic text fitting.
          </p>
        </div>

        {/* Layout Mode Switcher */}
        <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-800 flex gap-1">
          <button
            onClick={() =>
              onUpdatePrintSettings({
                ...printSettings,
                layoutMode: 'page-blocks',
              })
            }
            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
              isPageBlocksMode
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>One Block Per Page</span>
          </button>

          <button
            onClick={() =>
              onUpdatePrintSettings({
                ...printSettings,
                layoutMode: 'individual-labels',
              })
            }
            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
              !isPageBlocksMode
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Individual Labels</span>
          </button>
        </div>

        {/* Dynamic Sizing Status Banner */}
        {isPageBlocksMode && (
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/25 rounded-xl text-blue-300 text-[11px] flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
            <span>
              <strong>Dynamic block sizing active:</strong> each block automatically expands to comfortably wrap all vocabulary words without clipping.
            </span>
          </div>
        )}

        {/* Book Selector & Summary */}
        <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Book:</span>
            <select
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-white rounded px-2 py-1 max-w-[170px] truncate"
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-700/40">
            <span className="text-slate-400">Vocabulary ready:</span>
            <span className="font-mono font-bold text-blue-300">
              {printableEntries.length} words ({pageGroups.length} page blocks)
            </span>
          </div>

          {/* Quick Demo Preset */}
          {onLoadDemoVocab && (
            <div className="pt-1.5 flex justify-end">
              <button
                onClick={() => onLoadDemoVocab(SCREENSHOT_DEMO_VOCABULARY)}
                title="Load the 18 sample words from Page 1 & 2 directly from the screenshot"
                className="text-[10px] text-amber-400/90 hover:text-amber-300 underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Load Sample Screenshot Blocks (18 words)</span>
              </button>
            </div>
          )}

          {printableEntries.length === 0 && (
            <div className="text-[11px] text-amber-300/90 pt-1">
              No words with definitions yet.{' '}
              <button
                onClick={onNavigateToVocab}
                className="underline hover:text-white"
              >
                Generate meanings in Vocabulary tab →
              </button>
            </div>
          )}
        </div>

        {/* Paper Size */}
        <div className="space-y-2">
          <label className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span>Paper Sheet Format</span>
          </label>
          <select
            value={printSettings.paperSize}
            onChange={(e) =>
              onUpdatePrintSettings({
                ...printSettings,
                paperSize: e.target.value as any,
              })
            }
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="A4">A4 (210 × 297 mm)</option>
            <option value="Letter">Letter (216 × 279 mm)</option>
            <option value="A5">A5 (148 × 210 mm)</option>
            <option value="Custom">Custom Dimensions</option>
          </select>
        </div>

        {/* ── SETTINGS FOR "ONE BLOCK PER PAGE" MODE ── */}
        {isPageBlocksMode && (
          <>
            {/* Columns & Grid */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <label className="font-semibold text-slate-300 flex items-center justify-between">
                <span>Columns per Sheet</span>
                <span className="text-[10px] text-slate-400">
                  {cols === 2 ? '2 columns (like sample)' : `${cols} columns`}
                </span>
              </label>

              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    onClick={() =>
                      onUpdatePrintSettings({
                        ...printSettings,
                        columns: num,
                      })
                    }
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                      cols === num
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {num} {num === 1 ? 'Column' : 'Columns'}
                  </button>
                ))}
              </div>
            </div>

            {/* Typography & Styling */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <label className="font-semibold text-slate-300 block">
                Typography & Font Family
              </label>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Font:</span>
                <select
                  value={fontFamily}
                  onChange={(e) =>
                    onUpdatePrintSettings({
                      ...printSettings,
                      fontFamily: e.target.value as any,
                    })
                  }
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                >
                  <option value="times">Times New Roman (Book Serif)</option>
                  <option value="helvetica">Helvetica (Sans-Serif)</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Font Size:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={6}
                    max={14}
                    step={0.5}
                    value={fontSizePt}
                    onChange={(e) =>
                      onUpdatePrintSettings({
                        ...printSettings,
                        fontSizePt: parseFloat(e.target.value) || 8.5,
                      })
                    }
                    className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-center"
                  />
                  <span className="text-slate-500">pt</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Word Capitalization:</span>
                <select
                  value={casing}
                  onChange={(e) =>
                    onUpdatePrintSettings({
                      ...printSettings,
                      casing: e.target.value as any,
                    })
                  }
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                >
                  <option value="capitalize">Capitalized (Dipped down:)</option>
                  <option value="uppercase">UPPERCASE (DIPPED DOWN:)</option>
                  <option value="original">Original As Typed</option>
                </select>
              </div>
            </div>

            {/* Dynamic Spacing & Headroom Controls */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <label className="font-semibold text-slate-300 block">
                Dynamic Block Spacing & Padding
              </label>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Line Height Spacing:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1.15}
                    max={1.8}
                    step={0.05}
                    value={lineSpacing}
                    onChange={(e) =>
                      onUpdatePrintSettings({
                        ...printSettings,
                        lineSpacing: parseFloat(e.target.value) || 1.35,
                      })
                    }
                    className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-center"
                  />
                  <span className="text-slate-500">x</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Word Gap (Between entries):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0.5}
                    max={5}
                    step={0.5}
                    value={itemGapMm}
                    onChange={(e) =>
                      onUpdatePrintSettings({
                        ...printSettings,
                        itemSpacingMm: parseFloat(e.target.value) || 1.5,
                      })
                    }
                    className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-center"
                  />
                  <span className="text-slate-500">mm</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Inner Box Padding:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={0.5}
                    value={padding}
                    onChange={(e) =>
                      onUpdatePrintSettings({
                        ...printSettings,
                        blockPaddingMm: parseFloat(e.target.value) || 3.5,
                      })
                    }
                    className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-center"
                  />
                  <span className="text-slate-500">mm</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Bottom Extra Room:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={0.5}
                    value={bottomExtraMm}
                    onChange={(e) =>
                      onUpdatePrintSettings({
                        ...printSettings,
                        bottomExtraPaddingMm: parseFloat(e.target.value) || 3.5,
                      })
                    }
                    className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-center"
                  />
                  <span className="text-slate-500">mm</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Outer Sheet Margin:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={4}
                    max={30}
                    value={margin}
                    onChange={(e) =>
                      onUpdatePrintSettings({
                        ...printSettings,
                        marginMm: parseFloat(e.target.value) || 12,
                      })
                    }
                    className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-center"
                  />
                  <span className="text-slate-500">mm</span>
                </div>
              </div>
            </div>

            {/* Block Appearance & Borders */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="font-semibold text-slate-300 block">
                Block Appearance
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={printSettings.showBorder}
                  onChange={(e) =>
                    onUpdatePrintSettings({
                      ...printSettings,
                      showBorder: e.target.checked,
                    })
                  }
                  className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                />
                <span>Draw rectangular border box</span>
              </label>

              {printSettings.showBorder && (
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 pl-5 text-[11px]">
                  <input
                    type="checkbox"
                    checked={printSettings.showDashedCutLine}
                    onChange={(e) =>
                      onUpdatePrintSettings({
                        ...printSettings,
                        showDashedCutLine: e.target.checked,
                      })
                    }
                    className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span>Dashed scissor cut guide</span>
                </label>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">Page Indicator:</span>
                <select
                  value={pageIndicator}
                  onChange={(e) =>
                    onUpdatePrintSettings({
                      ...printSettings,
                      pageIndicator: e.target.value as any,
                    })
                  }
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                >
                  <option value="none">None (Pure words, like sample)</option>
                  <option value="badge">Top Badge (e.g. p. 1)</option>
                  <option value="header">Header Bar (e.g. PAGE 1)</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* ── SETTINGS FOR INDIVIDUAL LABELS MODE ── */}
        {!isPageBlocksMode && (
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="font-semibold text-slate-300 block">
              Individual Cutout Label Dimensions
            </label>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Width:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={30}
                  max={120}
                  value={printSettings.labelWidthMm || 60}
                  onChange={(e) =>
                    onUpdatePrintSettings({
                      ...printSettings,
                      labelWidthMm: parseFloat(e.target.value) || 60,
                    })
                  }
                  className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-center"
                />
                <span className="text-slate-500">mm</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Height:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={12}
                  max={60}
                  value={printSettings.labelHeightMm || 20}
                  onChange={(e) =>
                    onUpdatePrintSettings({
                      ...printSettings,
                      labelHeightMm: parseFloat(e.target.value) || 20,
                    })
                  }
                  className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-center"
                />
                <span className="text-slate-500">mm</span>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={printSettings.showPageNumber}
                onChange={(e) =>
                  onUpdatePrintSettings({
                    ...printSettings,
                    showPageNumber: e.target.checked,
                  })
                }
                className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
              />
              <span>Show page badge (p. 1)</span>
            </label>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <button
            onClick={generatePdf}
            disabled={isGeneratingPdf || printableEntries.length === 0}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
          >
            {isGeneratingPdf ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Download Printable PDF</span>
          </button>

          <button
            onClick={handlePrintNow}
            disabled={printableEntries.length === 0}
            className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Direct Browser Print</span>
          </button>

          {printSuccessMsg && (
            <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded text-center text-[11px] font-medium animate-in fade-in">
              {printSuccessMsg}
            </div>
          )}
        </div>
      </aside>

      {/* ── Right Live Scale Preview Area ─────────────────────────────────── */}
      <main className="flex-1 overflow-auto bg-slate-950/80 p-4 md:p-6 flex flex-col items-center">
        {/* Preview Status & Zoom Bar */}
        <div className="w-full max-w-4xl flex items-center justify-between mb-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">
              {isPageBlocksMode ? 'Dynamic Page Blocks' : 'Individual Labels'}
            </span>
            <span>•</span>
            <span>
              {paperW} × {paperH} mm ({printSettings.paperSize})
            </span>
            <span>•</span>
            <span>
              {totalSheetsCount} sheet{totalSheetsCount !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setPreviewZoom((z) => Math.max(0.6, parseFloat((z - 0.15).toFixed(2))))}
                title="Zoom Out"
                className="p-1 hover:text-white hover:bg-slate-800 rounded text-slate-400 transition-colors"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPreviewZoom(1.0)}
                title="Reset Zoom to 100%"
                className="px-2 py-0.5 text-[10px] font-mono text-slate-300 hover:text-white"
              >
                {Math.round(previewZoom * 100)}%
              </button>
              <button
                onClick={() => setPreviewZoom((z) => Math.min(1.8, parseFloat((z + 0.15).toFixed(2))))}
                title="Zoom In"
                className="p-1 hover:text-white hover:bg-slate-800 rounded text-slate-400 transition-colors"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="flex items-center gap-1 text-[11px] text-slate-300 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
              <Scissors className="w-3.5 h-3.5 text-blue-400" />
              <span>
                {isPageBlocksMode
                  ? 'Dynamic box fits all words per page'
                  : 'Cut individual labels'}
              </span>
            </span>
          </div>
        </div>

        {/* Blank state if no entries */}
        {printableEntries.length === 0 && (
          <div className="my-auto text-center p-12 text-slate-500 max-w-md">
            <Printer className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <h3 className="text-sm font-semibold text-slate-300 mb-1">
              No printable definitions found
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              To print physical annotation blocks, collect words in the PDF Reader and generate short meanings in the Vocabulary dashboard.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                onClick={onNavigateToVocab}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Go to Vocabulary Dashboard</span>
              </button>
              {onLoadDemoVocab && (
                <button
                  onClick={() => onLoadDemoVocab(SCREENSHOT_DEMO_VOCABULARY)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Load Sample Blocks</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Paper Sheets Preview */}
        <div className="space-y-10 pb-16">
          {/* ── 1. Dynamic Page Blocks Mode Sheets ── */}
          {isPageBlocksMode &&
            pageBlocksLayoutSheets.map((sheet) => (
              <div
                key={sheet.sheetIndex}
                style={{
                  width: `${paperW * effectiveScale}px`,
                  height: `${paperH * effectiveScale}px`,
                }}
                className="bg-white text-black shadow-2xl rounded-none relative border border-slate-400/40 select-text overflow-hidden print:m-0 print:border-none print:shadow-none"
              >
                {/* Paper watermark */}
                <div className="absolute bottom-1 right-2 text-[8px] text-slate-400 font-mono pointer-events-none select-none">
                  Sheet {sheet.sheetIndex + 1} of {pageBlocksLayoutSheets.length} • {activeBook?.title}
                </div>

                {/* Render each dynamic page block */}
                {sheet.blocks.map((block) => (
                  <div
                    key={`block-p${block.pageNumber}-${block.sheetIndex}`}
                    style={{
                      left: `${block.xMm * effectiveScale}px`,
                      top: `${block.yMm * effectiveScale}px`,
                      width: `${block.wMm * effectiveScale}px`,
                      minHeight: `${block.hMm * effectiveScale}px`,
                      padding: `${padding * effectiveScale}px`,
                      paddingBottom: `${(padding + bottomExtraMm) * effectiveScale}px`,
                      border: printSettings.showBorder
                        ? printSettings.showDashedCutLine
                          ? '1px dashed #000000'
                          : '1px solid #000000'
                        : 'none',
                      fontFamily:
                        fontFamily === 'times'
                          ? '"Times New Roman", Times, Georgia, serif'
                          : 'ui-sans-serif, system-ui, sans-serif',
                      fontSize: `${fontSizePt * 0.352778 * effectiveScale}px`,
                      lineHeight: `${lineStepMm * effectiveScale}px`,
                      boxSizing: 'border-box',
                    }}
                    className="absolute bg-white text-black"
                  >
                    {/* Header if enabled */}
                    {pageIndicator === 'header' && (
                      <div
                        style={{
                          fontSize: `${fontSizePt * 0.352778 * 1.05 * effectiveScale}px`,
                          marginBottom: `${1.5 * effectiveScale}px`,
                          borderBottomWidth: `${0.2 * effectiveScale}px`,
                        }}
                        className="font-bold border-b border-slate-300 pb-0.5 text-slate-800 uppercase tracking-wide"
                      >
                        Page {block.pageNumber}
                      </div>
                    )}

                    {/* Badge if enabled */}
                    {pageIndicator === 'badge' && (
                      <div
                        style={{
                          fontSize: `${Math.max(5.5, fontSizePt * 0.75) * 0.352778 * effectiveScale}px`,
                          top: `${1.5 * effectiveScale}px`,
                          right: `${2 * effectiveScale}px`,
                        }}
                        className="absolute font-bold text-slate-500 font-mono"
                      >
                        p.{block.pageNumber}
                      </div>
                    )}

                    {/* Word definitions list with dynamic spacing */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {block.entries.map((entry, idx) => (
                        <div
                          key={entry.id}
                          style={{
                            marginBottom: idx < block.entries.length - 1 ? `${itemGapMm * effectiveScale}px` : 0,
                          }}
                          className="text-black"
                        >
                          <span className="font-bold">
                            {formatWordCasing(entry.word, casing)}:{' '}
                          </span>
                          <span className="font-normal">{entry.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {/* ── 2. Individual Labels Mode Sheets ── */}
          {!isPageBlocksMode &&
            individualLabelsSheets.map((sheet) => (
              <div
                key={sheet.sheetIndex}
                style={{
                  width: `${paperW * effectiveScale}px`,
                  height: `${paperH * effectiveScale}px`,
                }}
                className="bg-white text-black shadow-2xl rounded-none relative border border-slate-400/40 select-text overflow-hidden print:m-0 print:border-none print:shadow-none"
              >
                <div className="absolute bottom-1 right-2 text-[8px] text-slate-400 font-mono pointer-events-none select-none">
                  Sheet {sheet.sheetIndex + 1} of {individualLabelsSheets.length} • {activeBook?.title}
                </div>

                {sheet.labels.map(({ entry, xMm, yMm, wMm, hMm }) => (
                  <div
                    key={entry.id}
                    style={{
                      left: `${xMm * effectiveScale}px`,
                      top: `${yMm * effectiveScale}px`,
                      width: `${wMm * effectiveScale}px`,
                      height: `${hMm * effectiveScale}px`,
                      border: printSettings.showBorder
                        ? printSettings.showDashedCutLine
                          ? '1px dashed #bbb'
                          : '1px solid #ccc'
                        : 'none',
                      padding: `${1.5 * effectiveScale}px`,
                    }}
                    className="absolute flex flex-col justify-between overflow-hidden bg-white hover:bg-amber-50/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-1 leading-none">
                      <span
                        style={{ fontSize: `${(printSettings.fontSizeWordPt || 8) * 0.352778 * effectiveScale}px` }}
                        className="font-bold tracking-tight font-mono text-black uppercase truncate"
                      >
                        {entry.word}
                      </span>
                      {printSettings.showPageNumber && (
                        <span
                          style={{ fontSize: `${(printSettings.fontSizeMeaningPt || 6.5) * 0.352778 * effectiveScale}px` }}
                          className="text-slate-500 font-bold font-mono shrink-0"
                        >
                          p.{entry.pageNumber}
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        fontSize: `${(printSettings.fontSizeMeaningPt || 6.5) * 0.352778 * effectiveScale}px`,
                        lineHeight: '1.25',
                      }}
                      className="text-slate-800 line-clamp-3 mt-0.5"
                    >
                      {entry.meaning}
                    </p>
                  </div>
                ))}
              </div>
            ))}
        </div>
      </main>
    </div>
  );
};
