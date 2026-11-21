// Copies the screenshot reader (Tesseract worker, WASM core, English data)
// from node_modules into public/ocr, so the app serves it itself and the
// browser never calls a third-party CDN while reading a screenshot.
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const out = join(process.cwd(), 'public', 'ocr');
mkdirSync(out, { recursive: true });

const tess = dirname(require.resolve('tesseract.js/package.json'));
const core = dirname(require.resolve('tesseract.js-core/package.json'));
const eng = dirname(require.resolve('@tesseract.js-data/eng/package.json'));

copyFileSync(join(tess, 'dist', 'worker.min.js'), join(out, 'worker.min.js'));
// LSTM-only builds (all the app uses); the worker picks SIMD or not at runtime.
for (const f of readdirSync(core).filter((f) => f.endsWith('-lstm.wasm.js'))) {
  copyFileSync(join(core, f), join(out, f));
}
copyFileSync(join(eng, '4.0.0_best_int', 'eng.traineddata.gz'), join(out, 'eng.traineddata.gz'));
console.log('OCR assets copied to public/ocr');
