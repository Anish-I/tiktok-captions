import { describe, it, expect } from 'vitest';
import { renderASS, hexToAssBgr, formatASSTime, type SubtitleStyle } from '../src/render/ass.js';
import { renderSRT, formatSRTTime } from '../src/render/srt.js';
import { groupIntoCues } from '../src/render/cues.js';
import { getPreset } from '../src/presets/catalog.js';
import type { Word } from '../src/transcribe/types.js';

const SAMPLE_WORDS: Word[] = [
  { text: 'Once', start: 0.0, end: 0.3 },
  { text: 'upon', start: 0.3, end: 0.6 },
  { text: 'a',    start: 0.6, end: 0.7 },
  { text: 'time', start: 0.7, end: 1.1 },
  { text: 'in',   start: 1.1, end: 1.3 },
  { text: 'a',    start: 1.3, end: 1.4 },
  { text: 'haunted', start: 1.4, end: 2.0 },
  { text: 'house.',  start: 2.0, end: 2.6 },
  { text: 'It', start: 2.8, end: 3.0 },
  { text: 'was', start: 3.0, end: 3.2 },
  { text: 'dark.', start: 3.2, end: 3.7 },
];

describe('hexToAssBgr', () => {
  it('converts white to BGR with opaque alpha', () => {
    expect(hexToAssBgr('#FFFFFF')).toBe('&H00FFFFFF');
  });
  it('reorders RGB into BGR', () => {
    expect(hexToAssBgr('#FF0000')).toBe('&H000000FF'); // R=FF -> ends in FF
    expect(hexToAssBgr('#0000FF')).toBe('&H00FF0000'); // B=FF -> starts in FF
  });
  it('handles bare hex (no #)', () => {
    expect(hexToAssBgr('00FF00')).toBe('&H0000FF00');
  });
  it('falls back to white for malformed input', () => {
    expect(hexToAssBgr('not-a-color')).toBe('&H00FFFFFF');
  });
});

describe('formatASSTime', () => {
  it('formats seconds as H:MM:SS.cc', () => {
    expect(formatASSTime(0)).toBe('0:00:00.00');
    expect(formatASSTime(65.42)).toBe('0:01:05.42');
    expect(formatASSTime(3661.5)).toBe('1:01:01.50');
  });
  it('clamps negative to zero', () => {
    expect(formatASSTime(-1)).toBe('0:00:00.00');
  });
});

describe('formatSRTTime', () => {
  it('formats seconds as HH:MM:SS,mmm', () => {
    expect(formatSRTTime(0)).toBe('00:00:00,000');
    expect(formatSRTTime(65.42)).toBe('00:01:05,420');
    expect(formatSRTTime(3661.001)).toBe('01:01:01,001');
  });
});

describe('groupIntoCues', () => {
  it('groups words into cues with maxWordsPerCue=5', () => {
    const cues = groupIntoCues(SAMPLE_WORDS, { maxWordsPerCue: 5, breakOnPunctuation: false });
    expect(cues.length).toBeGreaterThan(0);
    for (const c of cues) {
      expect(c.words.length).toBeLessThanOrEqual(5);
    }
  });

  it('breaks on punctuation', () => {
    const cues = groupIntoCues(SAMPLE_WORDS, { maxWordsPerCue: 99, breakOnPunctuation: true });
    // SAMPLE_WORDS has two sentence-ending tokens: "house." and "dark." → exactly 2 cues.
    expect(cues.length).toBe(2);
    expect(cues[0]!.text).toContain('Once upon a time');
    expect(cues[0]!.text).toContain('haunted house.');
    expect(cues[1]!.text).toContain('dark.');
  });

  it('preserves accurate cue start/end times', () => {
    const cues = groupIntoCues(SAMPLE_WORDS, { maxWordsPerCue: 5, breakOnPunctuation: false });
    expect(cues[0]!.start).toBe(0.0);
    expect(cues[cues.length - 1]!.end).toBe(3.7);
  });
});

describe('renderASS', () => {
  const style: SubtitleStyle = {
    fontFamily: 'Creepster',
    fontSize: 32,
    primaryColor: '#8B0000',
    outlineColor: '#000000',
    shadowColor: '#1a0000',
    bold: false,
    italic: false,
    alignment: 'center',
    showShadow: true,
    textCase: 'uppercase',
  };

  it('emits a valid V4+ ASS header', () => {
    const cues = groupIntoCues(SAMPLE_WORDS);
    const ass = renderASS(cues, style);
    expect(ass).toContain('[Script Info]');
    expect(ass).toContain('ScriptType: v4.00+');
    expect(ass).toContain('[V4+ Styles]');
    expect(ass).toContain('[Events]');
    expect(ass).toContain('Style: Default,Creepster,');
  });

  it('encodes hex colors as BGR', () => {
    const cues = groupIntoCues(SAMPLE_WORDS);
    const ass = renderASS(cues, style);
    // 8B0000 -> BGR 00008B -> &H0000008B
    expect(ass).toContain('&H0000008B');
  });

  it('emits one Dialogue line per cue', () => {
    const cues = groupIntoCues(SAMPLE_WORDS);
    const ass = renderASS(cues, style);
    const dialogueLines = ass.split('\n').filter(l => l.startsWith('Dialogue:'));
    expect(dialogueLines.length).toBe(cues.length);
  });

  it('applies uppercase textCase', () => {
    const cues = groupIntoCues(SAMPLE_WORDS);
    const ass = renderASS(cues, style);
    expect(ass).toContain('ONCE UPON');
    expect(ass).not.toContain('Once upon');
  });

  it('escapes ASS curly braces in text', () => {
    const cues = [{ text: 'use {curly} braces', start: 0, end: 1, words: [] as Word[] }];
    const ass = renderASS(cues, { ...style, textCase: 'normal' });
    expect(ass).toContain('use \\{curly\\} braces');
  });

  it('scales font size relative to video height', () => {
    const cues = groupIntoCues(SAMPLE_WORDS);
    const at1080 = renderASS(cues, style, { videoHeight: 1080 });
    const at1920 = renderASS(cues, style, { videoHeight: 1920 });
    // larger video => larger emitted font size for the Default style row.
    const fontSize = (s: string) => Number(s.split('\n').find(l => l.startsWith('Style: Default'))!.split(',')[2]);
    expect(fontSize(at1920)).toBeGreaterThan(fontSize(at1080));
  });
});

describe('renderASS with horror preset (end-to-end)', () => {
  it('produces a complete ASS file referencing Creepster + the preset primary color', () => {
    const horror = getPreset('horror')!;
    const cues = groupIntoCues(SAMPLE_WORDS);
    const ass = renderASS(cues, horror.style);

    expect(ass).toMatch(/Style: Default,Creepster,/);
    // Derive expected BGR from the preset itself so this test stays valid as
    // colors get tuned by future critique/iteration.
    expect(ass).toContain(hexToAssBgr(horror.style.primaryColor));
    expect(ass.split('\nDialogue:').length).toBe(cues.length + 1); // header + N events
  });
});

describe('renderASS borderStyle=box (sticker / pill captions)', () => {
  const baseBoxStyle: SubtitleStyle = {
    fontFamily: 'Roboto',
    fontSize: 26,
    primaryColor: '#FFFFFF',
    outlineColor: '#0A0A0A',  // becomes the box bg
    shadowColor: '#000000',
    bold: true,
    italic: false,
    alignment: 'center',
    showShadow: true,
    textCase: 'uppercase',
    borderStyle: 'box',
  };

  it('emits ASS BorderStyle=3 when borderStyle is box', () => {
    const cues = groupIntoCues(SAMPLE_WORDS);
    const ass = renderASS(cues, baseBoxStyle);
    const styleRow = ass.split('\n').find(l => l.startsWith('Style: Default'))!;
    // BorderStyle is column 16 (1-indexed): Name, Fontname, Fontsize, Primary,
    // Secondary, Outline, BackColour, Bold, Italic, Underline, StrikeOut,
    // ScaleX, ScaleY, Spacing, Angle, BorderStyle, ...
    const fields = styleRow.replace(/^Style: /, '').split(',');
    expect(fields[15]).toBe('3');
  });

  it('points BackColour at the outline color when in box mode (so libass paints the pill)', () => {
    const cues = groupIntoCues(SAMPLE_WORDS);
    const ass = renderASS(cues, baseBoxStyle);
    const styleRow = ass.split('\n').find(l => l.startsWith('Style: Default'))!;
    const fields = styleRow.replace(/^Style: /, '').split(',');
    // outline color #0A0A0A -> BGR 0A0A0A -> &H000A0A0A
    expect(fields[5]).toBe('&H000A0A0A');  // OutlineColour
    expect(fields[6]).toBe('&H000A0A0A');  // BackColour matches outline for box mode
  });

  it('outline mode (default) keeps BorderStyle=1 and BackColour transparent', () => {
    const cues = groupIntoCues(SAMPLE_WORDS);
    const outlineOnly = { ...baseBoxStyle, borderStyle: 'outline' as const };
    const ass = renderASS(cues, outlineOnly);
    const fields = ass.split('\n').find(l => l.startsWith('Style: Default'))!
      .replace(/^Style: /, '').split(',');
    expect(fields[15]).toBe('1');
    expect(fields[6]).toBe('&H00000000');
  });
});

describe('renderSRT', () => {
  it('emits valid SRT format', () => {
    const cues = groupIntoCues(SAMPLE_WORDS);
    const srt = renderSRT(cues);
    expect(srt).toMatch(/^1\n/);
    expect(srt).toContain(' --> ');
    expect(srt).toMatch(/\n\n/);
  });
});
