import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { keywordPick, pickPreset } from '../src/presets/picker.js';

describe('keywordPick (deterministic fallback)', () => {
  it('matches "spooky witch story" to horror or storytelling', () => {
    const p = keywordPick('spooky witch story');
    expect(['horror', 'storytelling']).toContain(p.id);
  });

  it('matches "workout grind" to fitness', () => {
    expect(keywordPick('workout grind').id).toBe('fitness');
  });

  it('matches "esports stream highlights" to gaming', () => {
    expect(keywordPick('esports stream highlights').id).toBe('gaming');
  });

  it('matches "breaking news anchor" to news', () => {
    expect(keywordPick('breaking news anchor').id).toBe('news');
  });

  it('matches "premium wine" to luxury', () => {
    expect(keywordPick('premium wine').id).toBe('luxury');
  });

  it('matches "yoga meditation" to wellness', () => {
    expect(keywordPick('yoga meditation').id).toBe('wellness');
  });

  it('matches "epic movie trailer" to cinematic', () => {
    expect(keywordPick('epic movie trailer').id).toBe('cinematic');
  });

  it('exact preset id wins as bonus', () => {
    expect(keywordPick('horror').id).toBe('horror');
    expect(keywordPick('comedy').id).toBe('comedy');
  });

  it('returns the first preset for nonsense input rather than throwing', () => {
    const p = keywordPick('xyzzy qux');
    expect(p).toBeTruthy();
  });
});

describe('pickPreset', () => {
  const originalKey = process.env.TOGETHER_API_KEY;
  beforeEach(() => { delete process.env.TOGETHER_API_KEY; });
  afterEach(() => { process.env.TOGETHER_API_KEY = originalKey; });

  it('returns source=explicit when given a real preset id', async () => {
    const result = await pickPreset('horror');
    expect(result.source).toBe('explicit');
    expect(result.preset.id).toBe('horror');
  });

  it('returns source=keyword when no API key is set', async () => {
    const result = await pickPreset('gym hardcore workout');
    expect(result.source).toBe('keyword');
    expect(result.preset.id).toBe('fitness');
  });

  it('throws on empty vibe', async () => {
    await expect(pickPreset('   ')).rejects.toThrow(/non-empty/);
  });
});

describe('pickPreset with mocked LLM', () => {
  beforeEach(() => { vi.resetModules(); });

  it('returns source=llm when Together responds with a valid presetId', async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            presetId: 'horror',
            rationale: 'spooky => horror',
          }),
        },
      }],
    });
    vi.doMock('openai', () => ({
      default: class { chat = { completions: { create } }; constructor(_: unknown) {} },
    }));
    const { pickPreset: pp } = await import('../src/presets/picker.js');
    const result = await pp('spooky cottagecore witch', { togetherApiKey: 'fake' });
    expect(result.source).toBe('llm');
    expect(result.preset.id).toBe('horror');
    expect(result.rationale).toBe('spooky => horror');
    expect(create).toHaveBeenCalledOnce();
  });

  it('falls back to keyword when LLM returns an invalid presetId', async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ presetId: 'imaginary' }) } }],
    });
    vi.doMock('openai', () => ({
      default: class { chat = { completions: { create } }; constructor(_: unknown) {} },
    }));
    const { pickPreset: pp } = await import('../src/presets/picker.js');
    const result = await pp('workout', { togetherApiKey: 'fake' });
    expect(result.source).toBe('keyword');
    expect(result.preset.id).toBe('fitness');
  });

  it('falls back to keyword when LLM throws', async () => {
    const create = vi.fn().mockRejectedValue(new Error('boom'));
    vi.doMock('openai', () => ({
      default: class { chat = { completions: { create } }; constructor(_: unknown) {} },
    }));
    const { pickPreset: pp } = await import('../src/presets/picker.js');
    const result = await pp('esports', { togetherApiKey: 'fake' });
    expect(result.source).toBe('keyword');
    expect(result.preset.id).toBe('gaming');
  });
});
