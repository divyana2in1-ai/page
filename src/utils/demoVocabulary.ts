import { VocabularyItem } from '../types';

export interface DemoWordEntry {
  word: string;
  pageNumber: number;
  context: string;
  meaning: string;
  example?: string;
}

export const DEMO_WORDS_BANK: DemoWordEntry[] = [
  // Page 1: Chapter 1 & Landscape
  {
    word: 'dipped down',
    pageNumber: 1,
    context: 'The road dipped down into the shaded valley between the hills.',
    meaning: 'descended into a low, sunken area of land',
    example: 'The trail dipped down into the ravine.',
  },
  {
    word: 'fringed',
    pageNumber: 1,
    context: 'The path was fringed with wild ferns and wildflowers.',
    meaning: "bordered and decorated along the road's edges",
    example: 'A lake fringed with tall pine trees.',
  },
  {
    word: 'alders',
    pageNumber: 1,
    context: 'Dense thickets of alders leaned over the water.',
    meaning: 'bushy trees that grow naturally along damp riverbanks',
    example: 'The alders shaded the river bank.',
  },
  {
    word: 'traversed',
    pageNumber: 1,
    context: 'The small stream traversed the rocky meadows.',
    meaning: 'cut directly across and flowed through the land',
    example: 'We traversed the steep mountain ridge.',
  },
  {
    word: 'intricate',
    pageNumber: 1,
    context: 'An intricate web of branches shaded the forest floor.',
    meaning: 'full of confusing twists, turns, and tangled curves',
    example: 'An intricate pattern woven into the cloth.',
  },
  {
    word: 'headlong',
    pageNumber: 1,
    context: 'The carriage plunged headlong into the darkening pass.',
    meaning: 'rushing forward wildly and with reckless speed',
    example: 'He rushed headlong into danger.',
  },
  {
    word: 'brook',
    pageNumber: 1,
    context: 'A gentle brook bubbled over polished limestone pebbles.',
    meaning: 'small, natural stream of running freshwater',
    example: 'They stopped to drink from the clear brook.',
  },
  {
    word: 'cascade',
    pageNumber: 1,
    context: 'We paused beside a miniature cascade spraying fine mist.',
    meaning: 'tumbling, frothy little waterfall over the rocks',
    example: 'Water cascaded over the boulders.',
  },
  {
    word: 'decorum',
    pageNumber: 1,
    context: 'She maintained composure and strict decorum despite the trial.',
    meaning: 'polite, respectable, and strictly well-mannered behavior',
    example: 'Guests observed traditional decorum.',
  },
  {
    word: 'feretted',
    pageNumber: 1,
    context: 'The detective feretted through the dusty archives.',
    meaning: 'searched persistently until uncovering every hidden secret',
    example: 'She feretted out the missing documents.',
  },
  {
    word: 'wherefores thereof',
    pageNumber: 1,
    context: 'He questioned the origins and wherefores thereof.',
    meaning: 'the underlying explanations and reasons behind everything',
    example: 'Studying the causes and wherefores thereof.',
  },
  {
    word: 'dint',
    pageNumber: 1,
    context: 'They succeeded solely by dint of sheer perseverance.',
    meaning: 'the sheer force or persistent effort used',
    example: 'Won the prize by dint of hard study.',
  },
  {
    word: 'precipices',
    pageNumber: 1,
    context: 'The limestone precipices rose precipitously on either hand, casting gloomy shadows.',
    meaning: 'steep, towering vertical rock faces or cliffs',
    example: 'Stood near the edge of sheer precipices.',
  },
  {
    word: 'tenaciously',
    pageNumber: 1,
    context: 'A dense mist clung tenaciously to the mossy rocks.',
    meaning: 'firmly, stubbornly, and without letting go',
    example: 'He clung tenaciously to his principles.',
  },
  {
    word: 'labyrinthine',
    pageNumber: 1,
    context: 'Subterranean caverns lay concealed within labyrinthine passages.',
    meaning: 'intricate, maze-like networks of winding pathways',
    example: 'Lost in the labyrinthine city alleys.',
  },
  {
    word: 'formidable',
    pageNumber: 1,
    context: 'Professor Sterling surveyed the formidable terrain with evident apprehension.',
    meaning: 'daunting, intensely challenging, and intimidating',
    example: 'Faced a formidable mountain crossing.',
  },
  {
    word: 'perilous',
    pageNumber: 1,
    context: 'Our quest was perilous and might prove completely futile without adequate provisions.',
    meaning: 'fraught with severe danger and physical risk',
    example: 'Navigated the perilous gorge at dusk.',
  },
  {
    word: 'ephemeral',
    pageNumber: 1,
    context: 'Examining each ephemeral blossom with meticulous attention to detail.',
    meaning: 'short-lived, delicate, and lasting only a fleeting moment',
    example: 'The ephemeral beauty of morning dew.',
  },
  {
    word: 'meticulous',
    pageNumber: 1,
    context: 'Yet the intrepid botanist examined each specimen with meticulous care.',
    meaning: 'extremely thorough, showing painstaking care for details',
    example: 'Kept meticulous scientific field notes.',
  },

  // Page 2: Ancient Inscription / Analytical
  {
    word: 'accumulates',
    pageNumber: 2,
    context: 'The algorithm accumulates partial sums across the array.',
    meaning: 'collects and keeps adding up the running calculation total',
    example: 'The loop accumulates memory totals.',
  },
  {
    word: 'access',
    pageNumber: 2,
    context: 'Programs access the memory hierarchy with byte precision.',
    meaning: 'reach into memory to read and retrieve stored data values',
    example: 'Granted direct access to storage.',
  },
  {
    word: 'terminates',
    pageNumber: 2,
    context: 'The iteration terminates once the sentinel value is encountered.',
    meaning: 'reaches the stopping condition and ends the running loop',
    example: 'The process terminates on error.',
  },
  {
    word: 'correspondingly',
    pageNumber: 2,
    context: 'The inner loop counter advances correspondingly.',
    meaning: 'in a matching, parallel way for the other loop',
    example: 'Prices adjusted correspondingly.',
  },
  {
    word: 'sublist',
    pageNumber: 2,
    context: 'Each partition operates on an isolated sublist.',
    meaning: 'smaller inner portion of the array currently being checked and sorted',
    example: 'Recursively sorted each sublist.',
  },
  {
    word: 'generic',
    pageNumber: 2,
    context: 'The module implements a generic sorting template.',
    meaning: 'standard or general-purpose, not written for one specific situation',
    example: 'Wrote a generic data container.',
  },
  {
    word: 'enigmatic',
    pageNumber: 2,
    context: 'Upon reaching the plateau, we stumbled upon an enigmatic monolith.',
    meaning: 'mysterious, baffling, and difficult to comprehend',
    example: 'Left behind an enigmatic stone carving.',
  },
  {
    word: 'arcane',
    pageNumber: 2,
    context: 'The monolith was inscribed with arcane glyphs defying linguistic decipherment.',
    meaning: 'ancient, esoteric, and known to only a few initiates',
    example: 'Studied arcane manuscripts in the abbey.',
  },
  {
    word: 'erudite',
    pageNumber: 2,
    context: 'Even our most erudite scholar confessed his profound bewilderment.',
    meaning: 'possessing deep, extensive scholarly knowledge',
    example: 'An erudite commentary on classical text.',
  },
  {
    word: 'taciturn',
    pageNumber: 2,
    context: 'The guide remained taciturn throughout the twilight hours.',
    meaning: 'habitually quiet, reserved, and reluctant to converse',
    example: 'A taciturn scout who spoke only when vital.',
  },
  {
    word: 'elusive',
    pageNumber: 2,
    context: 'Staring into the abyss as though listening to an elusive whisper.',
    meaning: 'difficult to catch, grasp, or clearly detect',
    example: 'An elusive melody heard in the distance.',
  },

  // Page 3: Sanctuary & Architecture
  {
    word: 'luminescence',
    pageNumber: 3,
    context: 'The sun broke through the gloom with startling luminescence.',
    meaning: 'radiant, vibrant glowing light emission',
    example: 'The luminescence of crystal caves.',
  },
  {
    word: 'sequestered',
    pageNumber: 3,
    context: 'Revealing a sequestered sanctuary carved directly into the porphyry stone.',
    meaning: 'deeply secluded, hidden away, and quiet',
    example: 'A sequestered courtyard behind the abbey.',
  },
  {
    word: 'equilibrium',
    pageNumber: 3,
    context: 'An astonishing equilibrium between rugged durability and delicate ornament.',
    meaning: 'harmonious, stable balance between opposing elements',
    example: 'Restored the environmental equilibrium.',
  },
  {
    word: 'colonnade',
    pageNumber: 3,
    context: 'Every step resonated through the vaulted colonnade.',
    meaning: 'long row of evenly spaced architectural stone columns',
    example: 'Walked through the palace colonnade.',
  },
  {
    word: 'serenity',
    pageNumber: 3,
    context: 'Contemplating the steadfast serenity of the wilderness.',
    meaning: 'calm, tranquil, and untroubled peacefulness',
    example: 'Basked in the serene quiet of dawn.',
  },
  {
    word: 'resonate',
    pageNumber: 3,
    context: 'Our footsteps resonated through the vaulted colonnade.',
    meaning: 'echoed deeply with full, vibrating acoustic sound',
    example: 'The chime resonated across the valley.',
  },

  // Page 4: Narrative & Characters
  {
    word: 'ostentatious',
    pageNumber: 4,
    context: 'His ostentatious attire drew disapproving glances from the assembly.',
    meaning: 'vulgar, pretentious, and meant to display wealth',
    example: 'Avoided ostentatious luxury.',
  },
  {
    word: 'pragmatic',
    pageNumber: 4,
    context: 'She proposed a pragmatic resolution to the council dispute.',
    meaning: 'practical, sensible, and focused on tangible results',
    example: 'Adopted a pragmatic engineering plan.',
  },
  {
    word: 'candid',
    pageNumber: 4,
    context: 'Her candid remarks left no doubt regarding her intentions.',
    meaning: 'frank, truthful, and straightforward without disguise',
    example: 'Shared a candid appraisal of the findings.',
  },
  {
    word: 'resilient',
    pageNumber: 4,
    context: 'The alpine vegetation proved remarkably resilient to freezing storms.',
    meaning: 'able to recover quickly from hardship or stress',
    example: 'A resilient species surviving at high altitude.',
  },
];

/**
 * Return an authentic contextual meaning for any word, matching against
 * our dictionary or generating a context-aware definition.
 */
export function getRealisticMeaning(
  word: string,
  context?: string,
  includeExample: boolean = false
): { meaning: string; example?: string } {
  const cleanWord = word.trim().toLowerCase();
  
  // Try exact or partial match in DEMO_WORDS_BANK
  const matched = DEMO_WORDS_BANK.find(
    (item) =>
      item.word.toLowerCase() === cleanWord ||
      cleanWord.includes(item.word.toLowerCase()) ||
      item.word.toLowerCase().includes(cleanWord)
  );

  if (matched) {
    return {
      meaning: matched.meaning,
      example: includeExample ? matched.example : undefined,
    };
  }

  // Generate plausible contextual definitions if not explicitly in bank
  const ctx = (context || '').toLowerCase();
  let generatedMeaning = `characterized by ${cleanWord} in the given passage`;

  if (ctx.includes('road') || ctx.includes('path') || ctx.includes('trail')) {
    generatedMeaning = `situated or extending along the pathway or terrain`;
  } else if (ctx.includes('water') || ctx.includes('river') || ctx.includes('stream')) {
    generatedMeaning = `associated with moving water or riverbanks`;
  } else if (ctx.includes('rock') || ctx.includes('stone') || ctx.includes('cliff')) {
    generatedMeaning = `pertaining to rugged stone or geological formations`;
  } else if (ctx.includes('sound') || ctx.includes('voice') || ctx.includes('whisper')) {
    generatedMeaning = `audible expression or acoustic resonance in the scene`;
  } else if (ctx.includes('manner') || ctx.includes('behavior') || ctx.includes('remained')) {
    generatedMeaning = `demonstrating a particular demeanor or composure`;
  } else if (cleanWord.endsWith('ly')) {
    generatedMeaning = `in a direct, noticeable, and continuous manner`;
  } else if (cleanWord.endsWith('ed')) {
    generatedMeaning = `brought into a specific condition or position`;
  } else if (cleanWord.endsWith('ing')) {
    generatedMeaning = `actively occurring throughout the surrounding context`;
  } else {
    generatedMeaning = `distinctive quality or feature described in context`;
  }

  return {
    meaning: generatedMeaning,
    example: includeExample ? `A notable demonstration of ${cleanWord}.` : undefined,
  };
}

/**
 * Picks random demo words that do not yet exist in the current list,
 * ready to be added to state.
 */
export function pickRandomDemoWords(
  count: number = 6,
  existingWordTexts: string[] = [],
  bookId: string = 'book-sample-1'
): Omit<VocabularyItem, 'id' | 'createdAt' | 'updatedAt'>[] {
  const existingSet = new Set(existingWordTexts.map((w) => w.trim().toLowerCase()));
  
  // Filter candidates that are not yet in the book
  let candidates = DEMO_WORDS_BANK.filter(
    (item) => !existingSet.has(item.word.toLowerCase())
  );

  // If all are already added, reuse pool with fresh shuffle
  if (candidates.length < count) {
    candidates = [...DEMO_WORDS_BANK];
  }

  // Shuffle candidates
  const shuffled = [...candidates].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);

  return selected.map((item) => ({
    bookId,
    word: item.word,
    pageNumber: item.pageNumber,
    context: item.context,
    meaning: item.meaning,
    example: item.example,
    status: 'processed' as const,
    aiProcessed: true,
    printed: false,
  }));
}
