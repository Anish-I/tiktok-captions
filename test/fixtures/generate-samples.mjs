// Emits sample .ass files for the user to eyeball.
import { generate } from '../../dist/pipeline.js';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', '..', 'samples');
mkdirSync(outDir, { recursive: true });

const words = [
  { text: 'Once',    start: 0.0, end: 0.4 },
  { text: 'upon',    start: 0.4, end: 0.7 },
  { text: 'a',       start: 0.7, end: 0.8 },
  { text: 'time',    start: 0.8, end: 1.2 },
  { text: 'in',      start: 1.2, end: 1.4 },
  { text: 'a',       start: 1.4, end: 1.5 },
  { text: 'haunted', start: 1.5, end: 2.1 },
  { text: 'house.',  start: 2.1, end: 2.7 },
  { text: 'The',     start: 2.9, end: 3.1 },
  { text: 'witch',   start: 3.1, end: 3.5 },
  { text: 'lived',   start: 3.5, end: 3.9 },
  { text: 'alone.',  start: 3.9, end: 4.5 },
];

const presets = ['horror', 'luxury', 'gaming', 'comedy', 'cinematic'];
for (const preset of presets) {
  const out = await generate({
    input: path.join(outDir, `${preset}.mp4`),
    preset,
    out: path.join(outDir, `${preset}.ass`),
    words,
  });
  console.log(`wrote ${preset} -> ${path.relative(process.cwd(), out.assPath)}`);
}
