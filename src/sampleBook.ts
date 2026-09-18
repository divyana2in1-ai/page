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
  wordCount: 4,
  processedCount: 2
};

export const SCREENSHOT_DEMO_VOCABULARY: VocabularyItem[] = [
  // Page 1 Block items
  {
    id: 'demo-1-1',
    bookId: DEFAULT_BOOK_ID,
    word: 'Dipped down',
    pageNumber: 1,
    context: 'The road dipped down into the shaded valley between the hills.',
    meaning: 'descended into a low, sunken area of land',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-1-2',
    bookId: DEFAULT_BOOK_ID,
    word: 'Fringed',
    pageNumber: 1,
    context: 'The path was fringed with wild ferns and wildflowers.',
    meaning: "bordered and decorated along the road's edges",
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-1-3',
    bookId: DEFAULT_BOOK_ID,
    word: 'Alders',
    pageNumber: 1,
    context: 'Dense thickets of alders leaned over the water.',
    meaning: 'bushy trees that grow naturally along damp riverbanks',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-1-4',
    bookId: DEFAULT_BOOK_ID,
    word: 'Traversed',
    pageNumber: 1,
    context: 'The small stream traversed the rocky meadows.',
    meaning: 'cut directly across and flowed through the land',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-1-5',
    bookId: DEFAULT_BOOK_ID,
    word: 'Intricate',
    pageNumber: 1,
    context: 'An intricate web of branches shaded the forest floor.',
    meaning: 'full of confusing twists, turns, and tangled curves',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-1-6',
    bookId: DEFAULT_BOOK_ID,
    word: 'Headlong',
    pageNumber: 1,
    context: 'The carriage plunged headlong into the darkening pass.',
    meaning: 'rushing forward wildly and with reckless speed',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-1-7',
    bookId: DEFAULT_BOOK_ID,
    word: 'Brook',
    pageNumber: 1,
    context: 'A gentle brook bubbled over polished limestone pebbles.',
    meaning: 'small, natural stream of running freshwater',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-1-8',
    bookId: DEFAULT_BOOK_ID,
    word: 'Cascade',
    pageNumber: 1,
    context: 'We paused beside a miniature cascade spraying fine mist.',
    meaning: 'tumbling, frothy little waterfall over the rocks',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-1-9',
    bookId: DEFAULT_BOOK_ID,
    word: 'Decorum',
    pageNumber: 1,
    context: 'She maintained composure and strict decorum despite the trial.',
    meaning: 'polite, respectable, and strictly well-mannered behavior',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-1-10',
    bookId: DEFAULT_BOOK_ID,
    word: 'Feretted',
    pageNumber: 1,
    context: 'The detective feretted through the dusty archives.',
    meaning: 'searched persistently until uncovering every hidden secret',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-1-11',
    bookId: DEFAULT_BOOK_ID,
    word: 'Wherefores thereof',
    pageNumber: 1,
    context: 'He questioned the origins and wherefores thereof.',
    meaning: 'the underlying explanations and reasons behind everything',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-1-12',
    bookId: DEFAULT_BOOK_ID,
    word: 'Dint',
    pageNumber: 1,
    context: 'They succeeded solely by dint of sheer perseverance.',
    meaning: 'the sheer force or persistent effort used',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // Page 2 Block items
  {
    id: 'demo-2-1',
    bookId: DEFAULT_BOOK_ID,
    word: 'Accumulates',
    pageNumber: 2,
    context: 'The algorithm accumulates partial sums across the array.',
    meaning: 'collects and keeps adding up the running calculation total into register R0',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-2-2',
    bookId: DEFAULT_BOOK_ID,
    word: 'Access',
    pageNumber: 2,
    context: 'Programs access the memory hierarchy with byte precision.',
    meaning: 'reach into memory to read and retrieve stored data values',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-2-3',
    bookId: DEFAULT_BOOK_ID,
    word: 'Terminates',
    pageNumber: 2,
    context: 'The iteration terminates once the sentinel value is encountered.',
    meaning: 'reaches the stopping condition and ends the running loop',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-2-4',
    bookId: DEFAULT_BOOK_ID,
    word: 'Correspondingly',
    pageNumber: 2,
    context: 'The inner loop counter advances correspondingly.',
    meaning: 'in a matching, parallel way for the other loop',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-2-5',
    bookId: DEFAULT_BOOK_ID,
    word: 'Sublist',
    pageNumber: 2,
    context: 'Each partition operates on an isolated sublist.',
    meaning: 'smaller inner portion of the array currently being checked and sorted',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demo-2-6',
    bookId: DEFAULT_BOOK_ID,
    word: 'Generic',
    pageNumber: 2,
    context: 'The module implements a generic sorting template.',
    meaning: 'standard or general-purpose, not written for one specific situation',
    status: 'processed',
    aiProcessed: true,
    printed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const INITIAL_SAMPLE_VOCABULARY: VocabularyItem[] = SCREENSHOT_DEMO_VOCABULARY;
