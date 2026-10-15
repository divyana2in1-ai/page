// Gemini API Key & Model Configuration Utility

const STORAGE_KEY_GEMINI_API = 'book_vocab_gemini_api_key';
const STORAGE_KEY_GEMINI_MODEL = 'book_vocab_gemini_model';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

export const AVAILABLE_MODELS = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', desc: 'Fast, accurate & cost-effective (Recommended)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Stable, high throughput' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', desc: 'Advanced reasoning & high thinking' },
];

export function getStoredGeminiKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_GEMINI_API) || '';
  } catch {
    return '';
  }
}

export function saveStoredGeminiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY_GEMINI_API, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_GEMINI_API);
    }
  } catch (err) {
    console.error('Failed to save Gemini key', err);
  }
}

export function clearStoredGeminiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_GEMINI_API);
  } catch {}
}

export function getStoredGeminiModel(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_GEMINI_MODEL) || DEFAULT_GEMINI_MODEL;
  } catch {
    return DEFAULT_GEMINI_MODEL;
  }
}

export function saveStoredGeminiModel(model: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_GEMINI_MODEL, model);
  } catch {}
}

export async function verifyGeminiApiKey(
  apiKey: string,
  model: string = DEFAULT_GEMINI_MODEL
): Promise<{ success: boolean; message: string; model?: string }> {
  try {
    const res = await fetch('/api/gemini/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-api-key': apiKey.trim(),
      },
      body: JSON.stringify({
        apiKey: apiKey.trim(),
        model,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        message: data.error || data.message || `Verification failed with HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      message: data.message || 'Gemini API key verified successfully!',
      model: data.model || model,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to reach verification endpoint.',
    };
  }
}
