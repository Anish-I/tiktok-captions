import { writeFileSync } from 'node:fs';
import { dirname, extname, basename, resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

import { transcribeWithWhisperCpp } from './transcribe/whisper-cpp.js';
import type { Word, TranscribeOptions } from './transcribe/types.js';
import { groupIntoCues, type CueOptions } from './render/cues.js';
import { renderASS } from './render/ass.js';
import { renderSRT } from './render/srt.js';
import { pickPreset, type PickResult } from './presets/picker.js';
import { getPreset, type VibePreset } from './presets/catalog.js';

export interface GenerateOptions {
  /** Input audio or video file. */
  input: string;
  /** Free-form vibe phrase to map to a preset (e.g. "horror"). */
  vibe?: string;
  /** Explicit preset id — skips the picker entirely. */
  preset?: string;
  /** Output file path. Extension determines format: .ass or .srt. Both are emitted alongside. */
  out?: string;
  /** Pre-supplied word list (skip transcription). Useful for tests. */
  words?: Word[];
  /** Forwarded to whisper.cpp. */
  transcribe?: TranscribeOptions;
  /** Forwarded to cue builder. */
  cues?: CueOptions;
  /** Reference video dimensions for font scaling. Defaults to 1080x1920 (vertical). */
  videoWidth?: number;
  videoHeight?: number;
}

export interface GenerateResult {
  preset: VibePreset;
  pick: PickResult | null;
  words: Word[];
  cues: ReturnType<typeof groupIntoCues>;
  assPath: string;
  srtPath: string;
  ass: string;
  srt: string;
}

/** End-to-end: transcribe (or skip) -> pick preset -> render ASS + SRT -> write to disk. */
export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  if (!opts.input) throw new Error('input is required');

  // 1. Resolve preset (explicit id wins; else LLM/keyword picker).
  let preset: VibePreset;
  let pick: PickResult | null = null;
  if (opts.preset) {
    const found = getPreset(opts.preset);
    if (!found) throw new Error(`unknown preset id: ${opts.preset}`);
    preset = found;
  } else if (opts.vibe) {
    pick = await pickPreset(opts.vibe);
    preset = pick.preset;
  } else {
    throw new Error('either `vibe` or `preset` is required');
  }

  // Apply tweaks from picker (only ones that have a clean effect on the preset clone).
  if (pick?.tweaks?.caseTransform === 'uppercase') {
    preset = { ...preset, style: { ...preset.style, textCase: 'uppercase' } };
  }

  // 2. Get word-level timestamps (from caller or from whisper.cpp).
  const words = opts.words ?? await transcribeWithWhisperCpp(opts.input, opts.transcribe);
  if (words.length === 0) throw new Error('no transcribed words');

  // 3. Group into cues, render.
  const cues = groupIntoCues(words, opts.cues);
  const ass = renderASS(cues, preset.style, {
    videoWidth: opts.videoWidth ?? 1080,
    videoHeight: opts.videoHeight ?? 1920,
  });
  const srt = renderSRT(cues);

  // 4. Decide output paths.
  const requestedOut = opts.out ?? swapExt(opts.input, '.ass');
  const outDir = dirname(resolve(requestedOut));
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const assPath = ensureExt(requestedOut, '.ass');
  const srtPath = swapExt(assPath, '.srt');
  writeFileSync(assPath, ass, 'utf8');
  writeFileSync(srtPath, srt, 'utf8');

  return { preset, pick, words, cues, assPath, srtPath, ass, srt };
}

function swapExt(p: string, ext: string): string {
  const dir = dirname(p);
  const stem = basename(p, extname(p));
  return resolve(dir, `${stem}${ext}`);
}
function ensureExt(p: string, ext: string): string {
  return extname(p).toLowerCase() === ext ? p : swapExt(p, ext);
}
