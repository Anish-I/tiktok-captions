import { describe, it, expect, afterEach } from 'vitest';
import { rmSync, existsSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generate } from '../src/pipeline.js';
import type { Word } from '../src/transcribe/types.js';

const FIXTURE_WORDS: Word[] = [
  { text: 'Hello', start: 0.0, end: 0.4 },
  { text: 'world.', start: 0.4, end: 0.9 },
  { text: 'This', start: 1.0, end: 1.2 },
  { text: 'is',   start: 1.2, end: 1.3 },
  { text: 'a',    start: 1.3, end: 1.4 },
  { text: 'test.', start: 1.4, end: 1.9 },
];

const tmpDirs: string[] = [];
afterEach(() => {
  while (tmpDirs.length) {
    try { rmSync(tmpDirs.pop()!, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

const newTmp = () => {
  const d = mkdtempSync(join(tmpdir(), 'tiktok-caps-test-'));
  tmpDirs.push(d);
  return d;
};

describe('pipeline.generate', () => {
  it('writes .ass and .srt files when given pre-supplied words + explicit preset', async () => {
    const tmp = newTmp();
    const outPath = join(tmp, 'clip.ass');
    const result = await generate({
      input: join(tmp, 'fake.mp4'),    // never read because words are supplied
      preset: 'horror',
      out: outPath,
      words: FIXTURE_WORDS,
    });

    expect(result.preset.id).toBe('horror');
    expect(existsSync(result.assPath)).toBe(true);
    expect(existsSync(result.srtPath)).toBe(true);
    expect(result.srtPath.endsWith('.srt')).toBe(true);

    const ass = readFileSync(result.assPath, 'utf8');
    expect(ass).toContain('Style: Default,Creepster,');
    expect(ass).toContain('Dialogue:');
  });

  it('uses vibe -> keyword fallback when no preset given (no API key)', async () => {
    const tmp = newTmp();
    delete process.env.TOGETHER_API_KEY;
    const result = await generate({
      input: join(tmp, 'fake.mp4'),
      vibe: 'breaking news anchor',
      words: FIXTURE_WORDS,
      out: join(tmp, 'clip.ass'),
    });
    expect(result.preset.id).toBe('news');
    expect(result.pick?.source).toBe('keyword');
  });

  it('throws on unknown preset id', async () => {
    const tmp = newTmp();
    await expect(
      generate({
        input: join(tmp, 'fake.mp4'),
        preset: 'imaginary',
        words: FIXTURE_WORDS,
      }),
    ).rejects.toThrow(/unknown preset/);
  });

  it('throws when no vibe and no preset given', async () => {
    const tmp = newTmp();
    await expect(
      generate({
        input: join(tmp, 'fake.mp4'),
        words: FIXTURE_WORDS,
      }),
    ).rejects.toThrow(/vibe.*preset/);
  });
});
