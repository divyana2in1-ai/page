import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to resolve Gemini client from request or environment
function resolveGeminiClient(customApiKey?: string): { client: GoogleGenAI | null; source: string } {
  const apiKey = (customApiKey && customApiKey.trim()) || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { client: null, source: 'none' };
  }
  return {
    client: new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    }),
    source: customApiKey ? 'custom' : 'env',
  };
}

// ── API ROUTES ─────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/status', (req, res) => {
  const hasEnvKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    hasServerKey: hasEnvKey,
    defaultModel: 'gemini-3.8-flash',
    note: hasEnvKey
      ? 'Server-side GEMINI_API_KEY configured'
      : 'No server GEMINI_API_KEY. Custom user API key can be set in App Settings.',
  });
});

// Endpoint to verify a user-provided or env Gemini API Key
app.post('/api/gemini/verify', async (req, res) => {
  try {
    const customKey = (req.headers['x-gemini-api-key'] as string) || req.body.apiKey;
    const model = req.body.model || 'gemini-3.8-flash';
    const { client } = resolveGeminiClient(customKey);

    if (!client) {
      return res.status(400).json({
        success: false,
        error: 'No Gemini API key provided. Please enter a valid Gemini API key.',
      });
    }

    // Run a lightweight test generation
    const response = await client.models.generateContent({
      model,
      contents: 'Respond with the single word "READY".',
    });

    const text = response.text?.trim() || '';
    if (text) {
      return res.json({
        success: true,
        message: 'Gemini API key is valid and connected successfully!',
        model,
      });
    }

    return res.json({
      success: true,
      message: 'Gemini responded successfully.',
      model,
    });
  } catch (error: any) {
    console.error('Gemini verification failed:', error);
    let errMsg = error.message || 'Failed to verify Gemini API key. Please check that the key is correct and active.';
    try {
      const parsed = JSON.parse(errMsg);
      if (parsed?.error?.message) {
        errMsg = parsed.error.message;
      }
    } catch {}

    return res.status(400).json({
      success: false,
      error: errMsg,
    });
  }
});

// AI Batch Meaning Generation System Instruction
const SYSTEM_INSTRUCTION = `You are a vocabulary annotation assistant specifically for physical book reading.
A reader has underlined or selected unfamiliar words from a book PDF while reading a physical paper copy.
Your job is to produce very short, simple, concise English definitions that fit the EXACT context sentence in the book.

CRITICAL RULES:
1. Provide a single, concise definition in plain English (strictly under 65 characters).
2. The definition must directly match the sense used in the provided sentence, NOT an abstract general dictionary dump.
3. Do not include pronunciation, etymology, word type labels (e.g. do not write "adj." or "n."), or redundant intro phrases.
4. The definition must be small and compact enough to be printed on a tiny paper label and pasted inside or next to a physical book margin.
5. If an example is requested, provide ONE extremely short original sentence (under 45 characters). Otherwise leave example empty.

You must return a JSON array matching the schema.`;

app.post('/api/vocabulary/generate-meanings', async (req, res) => {
  try {
    const { entries, bookTitle, includeExample, model: requestedModel } = req.body;
    const customKey = (req.headers['x-gemini-api-key'] as string) || req.body.apiKey;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'No vocabulary entries provided to process' });
    }

    const { client: ai } = resolveGeminiClient(customKey);

    if (!ai) {
      return res.status(400).json({
        error:
          'Gemini API Key is not configured. Please open App Settings (gear icon) in the header to enter your Google Gemini API key.',
        needsKey: true,
      });
    }

    // Format words list
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

    const modelToUse = requestedModel || 'gemini-3.8-flash';

    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: promptText,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
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
    let parsedResults: any[] = [];
    try {
      parsedResults = JSON.parse(rawText);
    } catch {
      const clean = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResults = JSON.parse(clean);
    }

    const resultsMap = new Map<string, any>();
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
          meaning: match.meaning || 'Contextual definition',
          example: includeExample ? match.example : undefined,
        };
      }
      return {
        id: String(entry.id),
        word: entry.word,
        meaning: 'Definition based on context',
        example: includeExample ? `Usage in context.` : undefined,
      };
    });

    return res.json({
      processed: finalResults.length,
      results: finalResults,
    });
  } catch (error: any) {
    console.error('Gemini generate-meanings error:', error);
    let errMsg = error.message || 'Failed to generate vocabulary meanings with Gemini AI';
    try {
      const parsed = JSON.parse(errMsg);
      if (parsed?.error?.message) {
        errMsg = parsed.error.message;
      }
    } catch {}

    return res.status(500).json({
      error: errMsg,
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
