export interface Book {
  id: string;
  title: string;
  author?: string;
  pdfFilename: string;
  pdfDataUrl?: string;
  pageOffset: number; // e.g. -5 if PDF page 20 is physical book page 15
  totalPages?: number;
  createdAt: string;
  wordCount?: number;
  processedCount?: number;
}

export type VocabStatus = 'pending' | 'processed' | 'printed';

export interface VocabularyItem {
  id: string;
  bookId: string;
  word: string;
  pageNumber: number;
  context: string;
  meaning?: string;
  example?: string;
  notes?: string;
  status: VocabStatus;
  aiProcessed: boolean;
  printed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PrintLayoutMode = 'page-blocks' | 'individual-labels';
export type BlockFontFamily = 'times' | 'helvetica';
export type PageIndicatorStyle = 'none' | 'badge' | 'header';
export type WordCasingStyle = 'capitalize' | 'uppercase' | 'original';

export interface PrintSettings {
  layoutMode: PrintLayoutMode; // 'page-blocks' (One block per page, matching user request!) vs 'individual-labels'
  paperSize: 'A4' | 'A5' | 'Letter' | 'Custom';
  customWidthMm: number;
  customHeightMm: number;
  
  // Page Blocks Mode (One block per book page)
  columns: number; // default 2 columns (matching screenshot!)
  fontFamily: BlockFontFamily; // 'times' (Serif) or 'helvetica' (Sans)
  fontSizePt: number; // default 8.5pt
  blockPaddingMm: number; // default 3.5mm
  marginMm: number; // outer margin of sheet (default 12mm)
  gapMm: number; // gap between blocks (default 6mm)
  showBorder: boolean; // default true
  showDashedCutLine: boolean; // default false (crisp solid line like screenshot)
  pageIndicator: PageIndicatorStyle; // 'none' (screenshot style), 'badge', 'header'
  casing: WordCasingStyle; // 'capitalize' (screenshot style), 'uppercase', 'original'
  lineSpacing: number; // e.g. 1.35
  itemSpacingMm?: number; // spacing between words (default 1.5mm)
  bottomExtraPaddingMm?: number; // extra bottom breathing room (default 3.0mm)

  // Individual Labels Mode (Legacy / small cutout labels)
  labelWidthMm: number;
  labelHeightMm: number;
  fontSizeWordPt: number;
  fontSizeMeaningPt: number;
  showPageNumber: boolean;
  showExample: boolean;
  groupByPage: boolean;
}

export interface GenerateMeaningsRequest {
  vocabIds?: string[];
  bookId?: string;
  includeExample?: boolean;
  bookTitle?: string;
  entries?: Array<{
    id: string;
    word: string;
    page_number: number;
    context: string;
  }>;
}

export interface GeneratedMeaningItem {
  id: string;
  word: string;
  meaning: string;
  example?: string;
}
