import { jsPDF } from 'jspdf';
import { Book, VocabularyItem } from './types';

// Sample literary text across 3 pages with sophisticated vocabulary
export const SAMPLE_BOOK_TEXT: { page: number; title: string; paragraphs: string[] }[] = [
  {
    page: 1,
    title: 'Chapter I: The Discovery',
    paragraphs: [
      'The expedition entered an obscure valley late in the evening. The limestone precipices rose precipitously on either hand, casting gloomy shadows across the narrow defile.',
      'A dense mist clung tenaciously to the mossy rocks, obscuring our view of the subterranean caverns that lay concealed within the labyrinthine passages.',
      'Professor Sterling surveyed the formidable terrain with evident apprehension, murmuring that our quest was perilous and might prove completely futile without adequate provisions.',
      'Yet the intrepid botanist insisted on gathering several botanical specimens, examining each ephemeral blossom with meticulous attention to detail.'
    ]
  },
  {
    page: 2,
    title: 'Chapter II: The Ancient Inscription',
    paragraphs: [
      'Upon reaching the plateau, we stumbled upon an enigmatic monolith inscribed with arcane glyphs. The symbols seemed to defy all conventional linguistic decipherment.',
      'Even our most erudite scholar confessed his profound bewilderment, acknowledging that the script belonged to an epoch long preceding written antiquity.',
      'A relentless wind began to howl through the crags, making our mundane tasks of erecting shelters and igniting firewood feel monumental.',
      'The guide remained taciturn throughout the twilight hours, staring into the abyss as though listening to an elusive whisper carried upon the mountain breeze.'
    ]
  },
  {
    page: 3,
    title: 'Chapter III: The Sanctuary',
    paragraphs: [
      'At dawn, the sun broke through the gloom with startling luminescence, revealing a sequestered sanctuary carved directly into the porphyry stone.',
      'The architecture exhibited an astonishing equilibrium between rugged durability and delicate ornament, a testament to an ingenious forgotten civilization.',
      'We stood in reverent silence, contemplating the ephemeral nature of human empires compared to the steadfast serenity of the wilderness.',
      'Every step resonated through the vaulted colonnade, reminding us that we were mere ephemeral visitors in an eternal domain.'
    ]
  }
];

export function generateSamplePdfDataUrl(): string {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4'
  });

  SAMPLE_BOOK_TEXT.forEach((pageData, index) => {
    if (index > 0) {
      doc.addPage();
    }

    // Page header
    doc.setFont('times', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text('The Chronicles of Mount Solitude', 54, 60);

    doc.setFont('times', 'italic');
    doc.setFontSize(14);
    doc.setTextColor(71, 85, 105);
    doc.text(pageData.title, 54, 85);

    // Divider line
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(1);
    doc.line(54, 100, 540, 100);

    // Paragraphs
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);

    let currentY = 130;
    pageData.paragraphs.forEach(para => {
      const splitText = doc.splitTextToSize(para, 480);
      doc.text(splitText, 54, currentY);
      currentY += (splitText.length * 18) + 16;
    });

    // Page footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${pageData.page}  —  The Chronicles of Mount Solitude`, 54, 780);
  });

  return doc.output('datauristring');
}

export const DEFAULT_BOOK_ID = 'book-sample-1';

export const INITIAL_SAMPLE_BOOK: Book = {
  id: DEFAULT_BOOK_ID,
  title: 'The Chronicles of Mount Solitude',
  author: 'Arthur Vance',
  pdfFilename: 'mount_solitude_sample.pdf',
  pageOffset: 0,
  totalPages: 3,
  createdAt: new Date().toISOString(),
  wordCount: 8,
  processedCount: 8
};

export const INITIAL_SAMPLE_VOCABULARY: VocabularyItem[] = [
  {
    id: 'vocab-init-1',
    bookId: DEFAULT_BOOK_ID,
    word: 'precipices',
    pageNumber: 1,
    context: 'The limestone precipices rose precipitously on either hand, casting gloomy shadows.',
    meaning: 'steep, vertical rock cliffs or sheer drops',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'vocab-init-2',
    bookId: DEFAULT_BOOK_ID,
    word: 'tenaciously',
    pageNumber: 1,
    context: 'A dense mist clung tenaciously to the mossy rocks.',
    meaning: 'firmly, persistently, and refusing to let go',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'vocab-init-3',
    bookId: DEFAULT_BOOK_ID,
    word: 'labyrinthine',
    pageNumber: 1,
    context: 'concealed within the labyrinthine passages.',
    meaning: 'complicated, intricate, and maze-like',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'vocab-init-4',
    bookId: DEFAULT_BOOK_ID,
    word: 'formidable',
    pageNumber: 1,
    context: 'Professor Sterling surveyed the formidable terrain with evident apprehension.',
    meaning: 'inspiring respect or fear; dauntingly challenging',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'vocab-init-5',
    bookId: DEFAULT_BOOK_ID,
    word: 'enigmatic',
    pageNumber: 2,
    context: 'we stumbled upon an enigmatic monolith inscribed with arcane glyphs.',
    meaning: 'mysterious, puzzling, and difficult to comprehend',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'vocab-init-6',
    bookId: DEFAULT_BOOK_ID,
    word: 'arcane',
    pageNumber: 2,
    context: 'inscribed with arcane glyphs. The symbols seemed to defy all decipherment.',
    meaning: 'ancient, esoteric, and known to only a few',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'vocab-init-7',
    bookId: DEFAULT_BOOK_ID,
    word: 'luminescence',
    pageNumber: 3,
    context: 'the sun broke through the gloom with startling luminescence.',
    meaning: 'radiant, glowing light emitted without intense heat',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'vocab-init-8',
    bookId: DEFAULT_BOOK_ID,
    word: 'sequestered',
    pageNumber: 3,
    context: 'revealing a sequestered sanctuary carved directly into the stone.',
    meaning: 'quietly secluded, hidden away, and isolated',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
