import OpenAI from 'openai';
import { PRESET_CATALOG, getPreset, type PresetId, type VibePreset } from './catalog.js';
import { pickerSchema, type PickerOutput } from './schema.js';

export interface PickResult {
  preset: VibePreset;
  source: 'llm' | 'keyword' | 'explicit';
  rationale?: string;
  tweaks?: { colorIntensity?: 'muted' | 'normal' | 'vivid'; caseTransform?: 'normal' | 'uppercase' };
}

export interface PickOptions {
  /** Override env. If neither is set, picker falls straight to keyword scoring. */
  togetherApiKey?: string;
  model?: string;
  baseUrl?: string;
}

const DEFAULT_MODEL = 'meta-llama/Llama-4-Maverick-17B-128E-Instruct';
const DEFAULT_BASE_URL = 'https://api.together.xyz/v1';

const SYSTEM = `You are a caption stylist for short-form TikTok-style videos. Given a user's "vibe" phrase, pick the SINGLE best presetId from the provided list. Return JSON only.`;

/** Pick a preset by explicit ID, the LLM stylist, or keyword fallback. */
export async function pickPreset(vibe: string, opts: PickOptions = {}): Promise<PickResult> {
  const trimmed = vibe.trim();
  if (!trimmed) throw new Error('vibe must be a non-empty string');

  // 1. Exact preset id => skip everything.
  const direct = getPreset(trimmed);
  if (direct) return { preset: direct, source: 'explicit' };

  // 2. LLM stylist (if key is configured).
  const key = opts.togetherApiKey ?? process.env.TOGETHER_API_KEY;
  if (key) {
    try {
      const out = await callLLM(trimmed, key, opts);
      const preset = getPreset(out.presetId);
      if (preset) {
        return {
          preset,
          source: 'llm',
          rationale: out.rationale,
          tweaks: {
            colorIntensity: out.colorIntensity,
            caseTransform: out.caseTransform,
          },
        };
      }
    } catch (err) {
      // Swallow and fall through to keyword. Caller can re-enable verbose logging
      // by setting DEBUG_PICKER=1.
      if (process.env.DEBUG_PICKER) {
        // eslint-disable-next-line no-console
        console.error('[picker] LLM call failed, falling back to keyword:', err);
      }
    }
  }

  // 3. Keyword fallback.
  return { preset: keywordPick(trimmed), source: 'keyword' };
}

async function callLLM(vibe: string, apiKey: string, opts: PickOptions): Promise<PickerOutput> {
  const client = new OpenAI({
    apiKey,
    baseURL: opts.baseUrl ?? DEFAULT_BASE_URL,
  });

  const catalogSummary = PRESET_CATALOG.map(p => ({
    id: p.id,
    label: p.label,
    description: p.description,
    tags: p.tags.slice(0, 8),
  }));

  const resp = await client.chat.completions.create({
    model: opts.model ?? DEFAULT_MODEL,
    temperature: 0.2,
    response_format: { type: 'json_schema', json_schema: pickerSchema() },
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content:
          `Vibe phrase: "${vibe}"\n\n` +
          `Available presets (JSON):\n${JSON.stringify(catalogSummary)}\n\n` +
          `Pick the single presetId that best matches this vibe.`,
      },
    ],
  });

  const content = resp.choices[0]?.message?.content;
  if (!content) throw new Error('LLM returned empty content');
  const parsed = JSON.parse(content) as PickerOutput;
  return parsed;
}

/** Token-overlap scoring against each preset's tag list. Deterministic. */
export function keywordPick(vibe: string): VibePreset {
  const tokens = vibe
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  let best: VibePreset = PRESET_CATALOG[0]!;
  let bestScore = -1;

  for (const preset of PRESET_CATALOG) {
    const tagSet = new Set(preset.tags.map(t => t.toLowerCase()));
    let score = 0;
    for (const tok of tokens) {
      if (tagSet.has(tok)) score += 2;
      // Substring match (e.g. 'horrors' ~ 'horror', 'gaming' ~ 'game').
      else if (preset.tags.some(t => tok.includes(t) || t.includes(tok))) score += 1;
      // ID match.
      if (tok === preset.id) score += 3;
    }
    if (score > bestScore) {
      bestScore = score;
      best = preset;
    }
  }
  return best;
}

export type { PresetId };
