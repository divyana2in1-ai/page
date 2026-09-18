/**
 * Robust PDF.js dynamic loader
 * Uses PDF.js 3.11.174 which provides stable Canvas + TextLayer API across all browsers
 */

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

const PDFJS_SCRIPT_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let loadPromise: Promise<any> | null = null;

export function loadPdfJs(): Promise<any> {
  if (window.pdfjsLib) {
    return Promise.resolve(window.pdfjsLib);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${PDFJS_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
        resolve(window.pdfjsLib);
      });
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.src = PDFJS_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
        resolve(window.pdfjsLib);
      } else {
        reject(new Error('PDF.js script loaded but window.pdfjsLib not defined'));
      }
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load PDF.js from CDN'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
