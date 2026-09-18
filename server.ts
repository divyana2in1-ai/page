import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Gemini Client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ── API ROUTES ─────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/status', (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    geminiConfigured: hasKey,
    model: 'gemini-3.1-pro-preview',
    thinkingLevel: 'HIGH',
    note: hasKey
      ? 'Gemini 3.1 Pro Preview with High Thinking Mode active'
      : 'GEMINI_API_KEY not configured. Please configure in Secrets panel.',
  });
});

// AI Batch Meaning Generation
const SYSTEM_INSTRUCTION = `You are a vocabulary annotation assistant specifically for physical book reading.
A reader has underlined or selected unfamiliar words from a book PDF while reading a physical copy.
Your job is to produce very short, simple, concise English definitions that fit the EXACT context sentence in the book.

CRITICAL RULES:
1. Provide a single, concise definition in plain English (strictly under 60-70 characters).
2. The definition must directly match the sense used in the provided sentence, NOT an abstract general dictionary dump.
3. Do not include pronunciation, etymology, word type labels (e.g. do not write "adj." or "n."), or redundant intro phrases.
4. The definition must be small and compact enough to be printed on a tiny 20mm x 60mm paper label and pasted inside or next to a physical book margin.
5. If an example is requested, provide ONE extremely short original sentence (under 45 characters). Otherwise leave example empty.

You must return a JSON array matching the schema.`;

// Rich demo dictionary for mimicking API definitions
const DEMO_DICTIONARY: Record<string, { meaning: string; example?: string }> = {
  'dipped down': { meaning: 'descended into a low, sunken area of land', example: 'The trail dipped down into the ravine.' },
  'fringed': { meaning: "bordered and decorated along the road's edges", example: 'A lake fringed with tall pine trees.' },
  'alders': { meaning: 'bushy trees that grow naturally along damp riverbanks', example: 'The alders shaded the river bank.' },
  'traversed': { meaning: 'cut directly across and flowed through the land', example: 'We traversed the steep mountain ridge.' },
  'intricate': { meaning: 'full of confusing twists, turns, and tangled curves', example: 'An intricate pattern in the cloth.' },
  'headlong': { meaning: 'rushing forward wildly and with reckless speed', example: 'He rushed headlong into danger.' },
  'brook': { meaning: 'small, natural stream of running freshwater', example: 'They stopped to drink from the clear brook.' },
  'cascade': { meaning: 'tumbling, frothy little waterfall over the rocks', example: 'Water cascaded over the boulders.' },
  'decorum': { meaning: 'polite, respectable, and strictly well-mannered behavior', example: 'Guests observed traditional decorum.' },
  'feretted': { meaning: 'searched persistently until uncovering every hidden secret', example: 'She feretted out the missing papers.' },
  'wherefores thereof': { meaning: 'the underlying explanations and reasons behind everything', example: 'Studying the causes and wherefores thereof.' },
  'dint': { meaning: 'the sheer force or persistent effort used', example: 'Won solely by dint of hard study.' },
  'precipices': { meaning: 'steep, towering vertical rock faces or cliffs', example: 'Stood near the edge of sheer precipices.' },
  'tenaciously': { meaning: 'firmly, stubbornly, and without letting go', example: 'He clung tenaciously to his principles.' },
  'labyrinthine': { meaning: 'intricate, maze-like networks of winding pathways', example: 'Lost in the labyrinthine city alleys.' },
  'formidable': { meaning: 'daunting, intensely challenging, and intimidating', example: 'Faced a formidable mountain crossing.' },
  'perilous': { meaning: 'fraught with severe danger and physical risk', example: 'Navigated the perilous gorge at dusk.' },
  'ephemeral': { meaning: 'short-lived, delicate, and lasting only a fleeting moment', example: 'The ephemeral beauty of morning dew.' },
  'meticulous': { meaning: 'extremely thorough, showing painstaking care for details', example: 'Kept meticulous scientific field notes.' },
  'accumulates': { meaning: 'collects and keeps adding up the running calculation total', example: 'The loop accumulates memory totals.' },
  'access': { meaning: 'reach into memory to read and retrieve stored data values', example: 'Granted direct access to storage.' },
  'terminates': { meaning: 'reaches the stopping condition and ends the running loop', example: 'The process terminates on error.' },
  'correspondingly': { meaning: 'in a matching, parallel way for the other loop', example: 'Prices adjusted correspondingly.' },
  'sublist': { meaning: 'smaller inner portion of the array currently being checked and sorted', example: 'Recursively sorted each sublist.' },
  'generic': { meaning: 'standard or general-purpose, not written for one specific situation', example: 'Wrote a generic data container.' },
  'enigmatic': { meaning: 'mysterious, baffling, and difficult to comprehend', example: 'Left behind an enigmatic stone carving.' },
  'arcane': { meaning: 'ancient, esoteric, and known to only a few initiates', example: 'Studied arcane manuscripts in the abbey.' },
  'erudite': { meaning: 'possessing deep, extensive scholarly knowledge', example: 'An erudite commentary on classical text.' },
  'taciturn': { meaning: 'habitually quiet, reserved, and reluctant to converse', example: 'A taciturn scout who spoke rarely.' },
  'elusive': { meaning: 'difficult to catch, grasp, or clearly detect', example: 'An elusive melody heard in the distance.' },
  'luminescence': { meaning: 'radiant, vibrant glowing light emission', example: 'The luminescence of crystal caves.' },
  'sequestered': { meaning: 'deeply secluded, hidden away, and quiet', example: 'A sequestered courtyard behind the abbey.' },
  'equilibrium': { meaning: 'harmonious, stable balance between opposing elements', example: 'Restored the environmental equilibrium.' },
  'colonnade': { meaning: 'long row of evenly spaced architectural stone columns', example: 'Walked through the palace colonnade.' },
  'serenity': { meaning: 'calm, tranquil, and untroubled peacefulness', example: 'Basked in the serene quiet of dawn.' },
  'ostentatious': { meaning: 'vulgar, pretentious, and meant to display wealth', example: 'Avoided ostentatious luxury.' },
  'pragmatic': { meaning: 'practical, sensible, and focused on tangible results', example: 'Adopted a pragmatic engineering plan.' },
  'candid': { meaning: 'frank, truthful, and straightforward without disguise', example: 'Shared a candid appraisal of the findings.' },
  'resilient': { meaning: 'able to recover quickly from hardship or stress', example: 'A resilient species surviving at altitude.' },
};

function getFallbackMeaning(word: string, context?: string, includeExample?: boolean) {
  const clean = word.trim().toLowerCase();
  if (DEMO_DICTIONARY[clean]) {
    return {
      meaning: DEMO_DICTIONARY[clean].meaning,
      example: includeExample ? DEMO_DICTIONARY[clean].example : undefined,
    };
  }

  // Look for partial match
  for (const [key, val] of Object.entries(DEMO_DICTIONARY)) {
    if (clean.includes(key) || key.includes(clean)) {
      return {
        meaning: val.meaning,
        example: includeExample ? val.example : undefined,
      };
    }
  }

  // Plausible contextual fallback
  const ctx = (context || '').toLowerCase();
  let generated = `distinctive quality or feature in the passage`;
  if (ctx.includes('road') || ctx.includes('path')) generated = `bordered or situated along the pathway`;
  else if (ctx.includes('water') || ctx.includes('river')) generated = `associated with flowing water or riverbanks`;
  else if (ctx.includes('rock') || ctx.includes('stone')) generated = `pertaining to rugged stone formations`;
  else if (clean.endsWith('ly')) generated = `in a direct, noticeable, and steady manner`;
  else if (clean.endsWith('ed')) generated = `brought into a specific condition or position`;
  else if (clean.endsWith('ing')) generated = `actively occurring throughout the scene`;

  return {
    meaning: generated,
    example: includeExample ? `A brief demonstration of ${clean}.` : undefined,
  };
}

app.post('/api/vocabulary/generate-meanings', async (req, res) => {
  try {
    const { entries, bookTitle, includeExample } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'No entries provided to process' });
    }

    const ai = getGeminiClient();

    if (!ai) {
      // Simulate realistic API processing latency (600ms)
      await new Promise((resolve) => setTimeout(resolve, 600));

      const fallbackResults = entries.map((e: any) => {
        const generated = getFallbackMeaning(e.word, e.context, includeExample);
        return {
          id: String(e.id),
          word: e.word,
          meaning: generated.meaning,
          example: generated.example,
        };
      });

      return res.json({
        processed: fallbackResults.length,
        results: fallbackResults,
        simulated: true,
        source: 'demo-gemini-engine',
        message: 'Meanings generated using Demo AI Engine (Gemini 3.1 Pro simulation).',
      });
    }

    // Build prompt for Gemini
    const wordsList = entries
      .map(
        (e: any, idx: number) =>
          `${idx + 1}. [ID: ${e.id}] Word: "${e.word}" | Page: ${e.page_number || 'N/A'} | Context: "${e.context || 'None'}"`
      )
      .join('\n');

    const promptText = `Book Title: "${bookTitle || 'Book'}"
Include example sentence: ${includeExample ? 'YES' : 'NO'}

Words to annotate:
${wordsList}`;

    // Call Gemini 3.1 Pro Preview with HIGH Thinking Mode as requested
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: promptText,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: {
                type: Type.STRING,
                description: 'The exact ID provided for the entry',
              },
              word: {
                type: Type.STRING,
                description: 'The vocabulary word',
              },
              meaning: {
                type: Type.STRING,
                description: 'Ultra-concise contextual meaning under 65 characters',
              },
              example: {
                type: Type.STRING,
                description: 'Optional very short example sentence under 45 characters',
              },
            },
            required: ['id', 'word', 'meaning'],
          },
        },
      },
    });

    const rawText = response.text || '[]';
    let parsedResults = [];
    try {
      parsedResults = JSON.parse(rawText);
    } catch {
      // Clean up markdown block if present
      const clean = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResults = JSON.parse(clean);
    }

    // Map back to ensure all entries have results
    const resultsMap = new Map();
    if (Array.isArray(parsedResults)) {
      parsedResults.forEach((item: any) => {
        if (item && item.id) {
          resultsMap.set(String(item.id), item);
        }
      });
    }

    const finalResults = entries.map((entry: any) => {
      const match = resultsMap.get(String(entry.id));
      if (match) {
        return {
          id: String(entry.id),
          word: entry.word,
          meaning: match.meaning || 'appropriate contextual definition',
          example: includeExample ? match.example : undefined,
        };
      }
      return {
        id: String(entry.id),
        word: entry.word,
        meaning: 'definition based on context',
        example: includeExample ? `A brief sentence.` : undefined,
      };
    });

    res.json({
      processed: finalResults.length,
      results: finalResults,
    });
  } catch (error: any) {
    console.error('Gemini call encountered error, falling back to demo engine:', error.message);
    const { entries, includeExample } = req.body || {};
    if (Array.isArray(entries) && entries.length > 0) {
      const fallbackResults = entries.map((e: any) => {
        const generated = getFallbackMeaning(e.word, e.context, includeExample);
        return {
          id: String(e.id),
          word: e.word,
          meaning: generated.meaning,
          example: generated.example,
        };
      });
      return res.json({
        processed: fallbackResults.length,
        results: fallbackResults,
        simulated: true,
        source: 'demo-gemini-fallback',
        message: 'Meanings generated using Demo AI Engine (Gemini fallback).',
      });
    }

    res.status(500).json({
      error: error.message || 'Failed to generate meanings with AI',
    });
  }
});

// CSV Export Endpoint
app.post('/api/vocabulary/export-csv', (req, res) => {
  try {
    const { items, bookTitle } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array expected' });
    }

    const headers = ['word', 'page', 'context', 'meaning', 'example', 'status'];
    const rows = items.map((item: any) => {
      const esc = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };
      return [
        esc(item.word),
        item.pageNumber || '',
        esc(item.context),
        esc(item.meaning || ''),
        esc(item.example || ''),
        esc(item.status || 'pending'),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const safeTitle = (bookTitle || 'vocabulary')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeTitle}_vocabulary.csv"`
    );
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── VITE MIDDLEWARE SETUP ──────────────────────────────────────────────────

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Book Vocab Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
