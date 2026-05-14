import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import type { TranscribeOptions, Word } from './types.js';

/** Run a command, capture stdout/stderr. Rejects on non-zero exit. */
function run(bin: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    p.stdout.on('data', d => { stdout += d.toString(); });
    p.stderr.on('data', d => { stderr += d.toString(); });
    p.on('error', reject);
    p.on('close', code => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${basename(bin)} exited ${code}\nstderr:\n${stderr}`));
    });
  });
}

/** Decode any audio/video file to 16kHz mono 16-bit wav. */
async function toWav16k(inputPath: string, outputPath: string, ffmpegBin: string): Promise<void> {
  await run(ffmpegBin, [
    '-y',
    '-i', inputPath,
    '-vn',
    '-ac', '1',
    '-ar', '16000',
    '-sample_fmt', 's16',
    outputPath,
  ]);
}

interface WhisperJsonToken {
  text?: string;
  offsets?: { from: number; to: number };
  timestamps?: { from: string; to: string };
  t_dtw?: number;
  p?: number;
}

interface WhisperJsonSegment {
  text?: string;
  offsets?: { from: number; to: number };
  timestamps?: { from: string; to: string };
  tokens?: WhisperJsonToken[];
  words?: WhisperJsonToken[];
}

interface WhisperJson {
  transcription?: WhisperJsonSegment[];
  result?: { language?: string };
}

/**
 * Parse whisper.cpp's `--output-json-full` format into a flat Word[].
 * whisper.cpp's JSON shape varies; we accept both `tokens` and `words` keys
 * and use millisecond offsets when present, falling back to "HH:MM:SS,mmm" strings.
 */
function parseWhisperJson(json: WhisperJson): Word[] {
  const words: Word[] = [];
  const segments = json.transcription ?? [];

  const parseOffsetMs = (ms: number) => ms / 1000;
  const parseTimestamp = (ts: string): number => {
    // "HH:MM:SS,mmm" or "HH:MM:SS.mmm"
    const m = /^(\d+):(\d+):(\d+)[,.](\d+)$/.exec(ts.trim());
    if (!m) return 0;
    return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000;
  };

  for (const seg of segments) {
    const tokens = seg.tokens ?? seg.words ?? [];
    if (tokens.length > 0) {
      for (const tok of tokens) {
        const raw = (tok.text ?? '').trim();
        if (!raw) continue;
        // Skip whisper.cpp's special tokens like [_BEG_], [_SOT_], etc.
        if (/^\[_/.test(raw) || /^\[BLANK_AUDIO\]$/i.test(raw)) continue;
        let start = 0, end = 0;
        if (tok.offsets) {
          start = parseOffsetMs(tok.offsets.from);
          end = parseOffsetMs(tok.offsets.to);
        } else if (tok.timestamps) {
          start = parseTimestamp(tok.timestamps.from);
          end = parseTimestamp(tok.timestamps.to);
        }
        words.push({ text: raw, start, end, confidence: tok.p });
      }
    } else if (seg.text) {
      // No token-level data — split segment text proportionally across its duration.
      let segStart = 0, segEnd = 0;
      if (seg.offsets) {
        segStart = parseOffsetMs(seg.offsets.from);
        segEnd = parseOffsetMs(seg.offsets.to);
      } else if (seg.timestamps) {
        segStart = parseTimestamp(seg.timestamps.from);
        segEnd = parseTimestamp(seg.timestamps.to);
      }
      const parts = seg.text.trim().split(/\s+/).filter(Boolean);
      const step = parts.length > 0 ? (segEnd - segStart) / parts.length : 0;
      parts.forEach((p, i) => {
        words.push({
          text: p,
          start: segStart + i * step,
          end: segStart + (i + 1) * step,
        });
      });
    }
  }
  return words;
}

/**
 * Transcribe an audio/video file to word-level timestamps using whisper.cpp.
 *
 * Requires WHISPER_CPP_BIN (or opts.bin) and WHISPER_CPP_MODEL (or opts.model).
 * ffmpeg must be on PATH (or opts.ffmpeg).
 */
export async function transcribeWithWhisperCpp(
  inputPath: string,
  opts: TranscribeOptions = {},
): Promise<Word[]> {
  const bin = opts.bin ?? process.env.WHISPER_CPP_BIN;
  const model = opts.model ?? process.env.WHISPER_CPP_MODEL;
  const ffmpegBin = opts.ffmpeg ?? process.env.FFMPEG_BIN ?? 'ffmpeg';

  if (!bin) throw new Error('WHISPER_CPP_BIN not set (export it or pass opts.bin).');
  if (!model) throw new Error('WHISPER_CPP_MODEL not set (export it or pass opts.model).');
  if (!existsSync(bin)) throw new Error(`whisper.cpp binary not found at: ${bin}`);
  if (!existsSync(model)) throw new Error(`whisper model not found at: ${model}`);
  if (!existsSync(inputPath)) throw new Error(`input not found: ${inputPath}`);

  const work = mkdtempSync(join(tmpdir(), 'tiktok-caps-'));
  const wavPath = join(work, 'audio.wav');
  await toWav16k(inputPath, wavPath, ffmpegBin);

  // whisper.cpp writes <wavPath>.json next to the input file when --output-json-full is set.
  const jsonPath = wavPath + '.json';
  const args = [
    '--model', model,
    '--file', wavPath,
    '--output-json-full',
    '--no-prints',
  ];
  if (opts.language) args.push('--language', opts.language);
  if (opts.threads)  args.push('--threads', String(opts.threads));

  await run(bin, args);

  if (!existsSync(jsonPath)) {
    throw new Error(`whisper.cpp did not produce expected JSON at ${jsonPath}`);
  }
  const raw = readFileSync(jsonPath, 'utf8');
  const parsed = JSON.parse(raw) as WhisperJson;
  return parseWhisperJson(parsed);
}
