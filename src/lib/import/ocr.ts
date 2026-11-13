// ─── On-device screenshot reading ─────────────────────────
//
// Uses Tesseract (open-source OCR compiled to WebAssembly) inside the user's
// browser. The image never leaves the device and there is no per-use cost.
// The OCR engine and English language data are downloaded once from a CDN
// (no user data is sent); they can be self-hosted under /public later.
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
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', undefined, {
    logger: (m: { status: string; progress: number }) => onProgress?.({ status: m.status, progress: m.progress }),
  });
  try {
    const { data } = await worker.recognize(image);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
