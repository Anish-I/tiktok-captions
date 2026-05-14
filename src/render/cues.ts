import type { Word } from '../transcribe/types.js';

export interface Cue {
  text: string;
  start: number;
  end: number;
  words: Word[];
}

export interface CueOptions {
  maxWordsPerCue?: number;
  maxCueDurationSec?: number;
  /** Break on sentence punctuation (`.`, `!`, `?`). */
  breakOnPunctuation?: boolean;
}

const DEFAULTS: Required<CueOptions> = {
  maxWordsPerCue: 5,
  maxCueDurationSec: 4,
  breakOnPunctuation: true,
};

/**
 * Group word-level timestamps into displayable subtitle cues.
 * Punctuation, max word count, and max duration all force a cue boundary.
 */
export function groupIntoCues(words: Word[], opts: CueOptions = {}): Cue[] {
  const cfg = { ...DEFAULTS, ...opts };
  const cues: Cue[] = [];

  let buffer: Word[] = [];
  const flush = () => {
    if (buffer.length === 0) return;
    const text = buffer.map(w => w.text).join(' ').trim();
    cues.push({
      text,
      start: buffer[0]!.start,
      end: buffer[buffer.length - 1]!.end,
      words: buffer,
    });
    buffer = [];
  };

  for (const w of words) {
    buffer.push(w);
    const cueDuration = buffer[buffer.length - 1]!.end - buffer[0]!.start;
    const endsWithPunct = cfg.breakOnPunctuation && /[.!?]$/.test(w.text.trim());
    const tooLong = buffer.length >= cfg.maxWordsPerCue;
    const tooLongDur = cueDuration >= cfg.maxCueDurationSec;
    if (endsWithPunct || tooLong || tooLongDur) flush();
  }
  flush();
  return cues;
}
