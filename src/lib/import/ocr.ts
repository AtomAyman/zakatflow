// ─── On-device screenshot reading ─────────────────────────
//
// Privacy first: the screenshot is read inside the user's browser with
// Tesseract (open-source OCR compiled to WebAssembly). The image is never
// uploaded, stored or kept after reading; only the rows the user ticks on the
// review screen are saved, to their own Sheet.
//
// The reader itself (worker, WASM core, English data) is served by this app
// from /ocr (copied from node_modules by scripts/copy-ocr-assets.mjs), so no
// third-party server is contacted, not even a CDN. The English data is cached
// in the browser after the first use.
//
// Loaded on demand so the rest of the app does not pay for it.

export interface OcrProgress {
  status: string;
  progress: number; // 0..1
}


export async function readImageText(
  image: File | Blob,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
  const { createWorker, OEM } = await import('tesseract.js');
  // Absolute, because the worker starts from a blob URL where relative paths don't resolve.
  const base = `${window.location.origin}/ocr`;
  const worker = await createWorker('eng', OEM.LSTM_ONLY, {
    workerPath: `${base}/worker.min.js`,
    corePath: base,
    langPath: base,
    logger: (m: { status: string; progress: number }) => onProgress?.({ status: m.status, progress: m.progress }),
  });
  try {
    const { data } = await worker.recognize(image);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
