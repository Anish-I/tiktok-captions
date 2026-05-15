import type { SubtitleStyle, BorderStyle, TextCase } from '../render/ass.js';

export type PresetId =
  // Original vibe presets
  | 'horror'
  | 'luxury'
  | 'comedy'
  | 'gaming'
  | 'fitness'
  | 'motivational'
  | 'news'
  | 'podcast'
  | 'storytelling'
  | 'educational'
  | 'wellness'
  | 'cinematic'
  // TikTok-editor-inspired styles (modeled after Submagic Karaoke / Deep Diver /
  // Pod P / Popline / Beasty / Youshaei / Mozi / Glitch Infinite / Bounce Label).
  // v1 is static; word-highlight and animation arrive in v2.
  | 'karaoke'
  | 'deep_diver'
  | 'chromatic'        // was: pod_p
  | 'popline'
  | 'editorial'        // was: creator_clean / beasty (round-7: actual visual is italic serif, not bold sans)
  | 'karaoke_dim'      // was: pill_dark / youshaei (round-7: no pill, karaoke-grey dim aesthetic)
  | 'mozi'
  | 'glitch_infinite'
  | 'bounce_label'
  | 'seamless_bounce'
  | 'baby_earthquake'
  // Modern TikTok verticals (codex r6 swarm: missing native vibes)
  | 'grwm_soft'
  | 'day_vlog'
  | 'true_crime';

/**
 * Per-line styling override for compound compositions. Each PresetLine is one
 * visual row in the gallery rendering. Fields override the preset's base style
 * for THIS LINE ONLY — anything left undefined inherits from the preset.
 *
 * Example: Seamless Bounce composition is two lines —
 *   - line 1: "NEW" in box style (yellow pill, dark text)
 *   - line 2: "STARTED" plain green text on dark
 */
export interface PresetLine {
  text: string;
  primaryColor?: string;
  outlineColor?: string;
  shadowColor?: string;
  fontFamily?: string;
  textCase?: TextCase;
  borderStyle?: BorderStyle;
  /** Relative size multiplier vs the preset's base fontSize (e.g. 1.2 for big). */
  scale?: number;
  /** Force bold on a single weighted family (variable fonts). */
  bold?: boolean;
}

/**
 * Per-word styling override for karaoke-state compositions. Each WordSpec is
 * one inline word in the gallery rendering. Words are joined by spaces (no
 * line break between them — use `lines` for that).
 *
 * Use this to express the "current word vivid, upcoming words dim" aesthetic
 * shared by Submagic's Youshaei, Deep Diver, and Karaoke presets.
 */
export interface WordSpec {
  text: string;
  /** Override text color for this word (e.g. dim '#888' for upcoming words). */
  primaryColor?: string;
  /** Pill background behind this word (karaoke highlight). */
  bg?: string;
  /** Override font for this word (rare — e.g. italicizing only a name). */
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  /** Relative size multiplier vs the preset's base fontSize. */
  scale?: number;
}

/**
 * Preview-only metadata: gallery rendering hints, NOT subtitle output.
 * The ASS renderer ignores this entire field. Use it to convey compositional
 * intent (multi-line layouts, word-highlights, CRT scanlines) for v1's gallery
 * while we save the actual word-level/animation work for v2.
 */
export interface PresetPreviewHints {
  /** Override the gallery sample text. */
  sampleText?: string;
  /**
   * Multi-element composition: one styled span per line, stacked vertically.
   * Takes precedence over `sampleText`, `highlightWord`, and `words`.
   */
  lines?: PresetLine[];
  /**
   * Per-word inline styling — same line, different colors/weights per word.
   * Used for karaoke-state variants (one word vivid, rest dimmed grey).
   * Takes precedence over `sampleText` + `highlightWord`.
   */
  words?: WordSpec[];
  /** Highlight one word with a colored background pill (karaoke base). */
  highlightWord?: {
    /** Zero-based word index in the sample text. */
    index: number;
    /** Background color of the highlight pill (e.g. "#39FF14"). */
    bg: string;
    /** Override the highlighted word's text color (default: #0A0A0A). */
    color?: string;
  };
  /** Stack the sample text vertically, one word per line. Cheap Popline mode. */
  stackWords?: boolean;
  /** Overlay subtle CRT scanlines (Pod P / glitch aesthetic). */
  scanlines?: boolean;
}

export interface VibePreset {
  id: PresetId;
  label: string;
  description: string;
  tags: string[];
  style: SubtitleStyle;
  /** Gallery-only rendering hints. Ignored by the ASS renderer. */
  preview?: PresetPreviewHints;
}

export const PRESET_CATALOG: VibePreset[] = [
  {
    id: 'horror',
    label: 'Horror',
    description: 'Gothic blood-red on bone outline',
    tags: ['horror', 'spooky', 'gothic', 'scary', 'halloween', 'dark', 'blood', 'creepy', 'haunted', 'witch', 'ghost'],
    // Codex: black-outline-on-horror is the real failure. Bone outline gives the
    // blood color something to bleed against and keeps readability on dark bg.
    style: {
      fontFamily: 'Creepster',
      fontSize: 32, primaryColor: '#C1121F', outlineColor: '#F2E8D8', shadowColor: '#000000',
      bold: false, italic: false, alignment: 'center', showShadow: true, textCase: 'uppercase',
    },
  },
  {
    id: 'luxury',
    label: 'Luxury',
    description: 'Premium serif, cream + bronze',
    tags: ['luxury', 'classy', 'elegant', 'premium', 'fashion', 'wine', 'expensive', 'high-end', 'designer'],
    style: {
      fontFamily: 'DM Serif Display',
      fontSize: 30, primaryColor: '#F5E6C8', outlineColor: '#3D2817', shadowColor: '#1a0f08',
      bold: false, italic: false, alignment: 'center', showShadow: true, textCase: 'capitalize',
    },
  },
  {
    id: 'comedy',
    label: 'Comedy',
    description: 'Bangers yellow, meme energy',
    tags: ['comedy', 'funny', 'meme', 'joke', 'lol', 'sketch', 'viral', 'humor', 'laugh', 'prank'],
    style: {
      fontFamily: 'Bangers',
      fontSize: 36, primaryColor: '#FFFF00', outlineColor: '#000000', shadowColor: '#000000',
      bold: false, italic: false, alignment: 'center', showShadow: true, textCase: 'uppercase',
    },
  },
  {
    id: 'gaming',
    label: 'Gaming',
    description: 'Pixel arcade neon green (retro/Twitch nostalgia — large minimum size required)',
    tags: ['gaming', 'game', 'esports', 'twitch', 'pixel', 'retro', 'arcade', 'streamer', 'rpg', 'fps'],
    // Round-6 (claude typography): Press Start 2P at <40pt smears on phone screens
    // (8x8 pixel grid). Bumped fontSize 22→40 so the rendered output stays legible.
    style: {
      fontFamily: 'Press Start 2P',
      fontSize: 40, primaryColor: '#39FF14', outlineColor: '#000000', shadowColor: '#003300',
      bold: false, italic: false, alignment: 'center', showShadow: true, textCase: 'uppercase',
    },
  },
  {
    id: 'fitness',
    label: 'Fitness',
    description: 'Hardcore red on white',
    tags: ['fitness', 'workout', 'gym', 'motivation', 'intense', 'hardcore', 'lift', 'cardio', 'gains', 'training'],
    style: {
      fontFamily: 'Gabarito',
      fontSize: 32, primaryColor: '#FF4444', outlineColor: '#FFFFFF', shadowColor: '#000000',
      bold: true, italic: false, alignment: 'center', showShadow: true, textCase: 'uppercase',
    },
  },
  {
    id: 'motivational',
    label: 'Motivational',
    description: 'Yellow Anton, hustle energy',
    tags: ['motivation', 'motivational', 'inspire', 'mindset', 'hustle', 'grind', 'success', 'wealth', 'mindfulness'],
    style: {
      fontFamily: 'Anton',
      fontSize: 32, primaryColor: '#FFE600', outlineColor: '#000000', shadowColor: '#333300',
      bold: false, italic: false, alignment: 'center', showShadow: true, textCase: 'uppercase',
    },
  },
  {
    id: 'news',
    label: 'News',
    description: 'Clean white sans on black',
    tags: ['news', 'breaking', 'journalism', 'anchor', 'headline', 'report', 'press', 'media'],
    style: {
      fontFamily: 'Roboto',
      fontSize: 26, primaryColor: '#FFFFFF', outlineColor: '#000000', shadowColor: '#000000',
      bold: true, italic: false, alignment: 'center', showShadow: true, textCase: 'normal',
    },
  },
  {
    id: 'podcast',
    label: 'Podcast',
    description: 'Heavy Montserrat, conversational',
    tags: ['podcast', 'interview', 'conversation', 'host', 'talk', 'discussion', 'chat', 'guest'],
    style: {
      fontFamily: 'Montserrat Black',
      fontSize: 28, primaryColor: '#FFFFFF', outlineColor: '#1a1a1a', shadowColor: '#000000',
      bold: true, italic: false, alignment: 'center', showShadow: true, textCase: 'normal',
    },
  },
  {
    id: 'storytelling',
    label: 'Storytelling',
    description: 'Playfair beige, literary warmth',
    tags: ['story', 'storytelling', 'narrative', 'drama', 'once-upon-a-time', 'tale', 'fairy-tale', 'novel', 'memoir'],
    // Codex: keep literary warmth but the brown outline blends into dark bg.
    // Lighter buttercream outline keeps separation; deep coffee shadow for depth.
    style: {
      fontFamily: 'Playfair Display',
      fontSize: 28, primaryColor: '#F5F5DC', outlineColor: '#E6CFA3', shadowColor: '#2A160C',
      bold: false, italic: true, alignment: 'center', showShadow: true, textCase: 'capitalize',
    },
  },
  {
    id: 'educational',
    label: 'Educational',
    description: 'Deep navy Poppins on white outline',
    tags: ['educational', 'education', 'tutorial', 'learn', 'explain', 'lesson', 'teach', 'how-to', 'study', 'school', 'class'],
    // Round-6 (claude a11y critique): #4A90E2 on medium-gray bg was 1.3:1 — catastrophic WCAG AA
    // fail. Dropped to #1F4E8B (deep navy) which clears 4.5:1 against gray and pairs better
    // with the white outline already in use.
    style: {
      fontFamily: 'Poppins',
      fontSize: 26, primaryColor: '#1F4E8B', outlineColor: '#FFFFFF', shadowColor: '#0a1f3a',
      bold: true, italic: false, alignment: 'center', showShadow: true, textCase: 'normal',
    },
  },
  {
    id: 'wellness',
    label: 'Wellness',
    description: 'Deeper teal Roboto, mindful',
    tags: ['wellness', 'yoga', 'calm', 'mindful', 'health', 'meditation', 'breathing', 'spa', 'self-care', 'zen'],
    // Round-6 (claude a11y): #00D9B1 was 2.7:1 vs gray. Darkened to #00876D for AA compliance
    // while preserving the calm-teal personality.
    style: {
      fontFamily: 'Roboto',
      fontSize: 26, primaryColor: '#00876D', outlineColor: '#FFFFFF', shadowColor: '#003a30',
      bold: false, italic: false, alignment: 'center', showShadow: true, textCase: 'capitalize',
    },
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    description: 'Heavy white sans, silver outline',
    tags: ['cinematic', 'trailer', 'epic', 'vista', 'dramatic', 'music-video', 'film', 'movie', 'travel'],
    // Codex: 1a1a1a outline matched the dark bg, edges disappeared. Silver outline
    // separates from any background while keeping the cool film-trailer mood.
    style: {
      fontFamily: 'Fira Sans Condensed',
      fontSize: 30, primaryColor: '#FFFFFF', outlineColor: '#D8D8D8', shadowColor: '#000000',
      bold: true, italic: false, alignment: 'center', showShadow: true, textCase: 'uppercase',
    },
  },

  // -------------------------------------------------------------------------
  // TikTok-editor-inspired presets (Submagic Karaoke/Deep Diver/etc).
  // Static for v1; word-highlight + animation in v2.
  // -------------------------------------------------------------------------
  {
    id: 'karaoke',
    label: 'Karaoke',
    description: 'Bold caps with one word highlighted (v2: rolls per word)',
    tags: ['karaoke', 'highlight', 'word', 'sing', 'lyric', 'song', 'music', 'tiktok', 'submagic'],
    style: {
      fontFamily: 'Montserrat Black',
      fontSize: 30, primaryColor: '#FFFFFF', outlineColor: '#000000', shadowColor: '#000000',
      bold: true, italic: false, alignment: 'center', showShadow: true, textCase: 'uppercase',
    },
    preview: {
      sampleText: 'TO GET STARTED',
      highlightWord: { index: 1, bg: '#39FF14', color: '#000000' },
    },
  },
  {
    id: 'deep_diver',
    label: 'Deep Diver',
    description: 'Cream pill with karaoke-dim: current word bold black, upcoming words dim grey',
    tags: ['sticker', 'pill', 'cream', 'minimalist', 'aesthetic', 'lifestyle', 'vlog', 'soft', 'karaoke', 'reveal'],
    // Round-7: matches Submagic Deep Diver more accurately — the pill shows
    // word-by-word reveal state (bold current + dim upcoming) instead of all words equal.
    style: {
      fontFamily: 'Poppins',
      fontSize: 26, primaryColor: '#1A1A1A', outlineColor: '#F5F5DC', shadowColor: '#00000066',
      bold: true, italic: false, alignment: 'center', showShadow: true, textCase: 'capitalize',
      borderStyle: 'box',
    },
    preview: {
      // The whole row sits inside one cream pill (the preset's box) — words inside
      // share the pill bg. Bold "To" + dim "get started" simulates karaoke state.
      sampleText: 'To get started',
      words: [
        { text: 'To',      primaryColor: '#0A0A0A', bold: true },
        { text: 'get',     primaryColor: '#888888', bold: false },
        { text: 'started', primaryColor: '#888888', bold: false },
      ],
    },
  },
  {
    id: 'chromatic',
    label: 'Chromatic',
    description: 'Hot-pink magenta with cyan chromatic offset + CRT scanlines (Submagic "Pod P")',
    tags: ['chromatic', 'glitch', 'rgb', 'cyberpunk', 'vhs', 'retro', 'rave', 'cyber', 'crt', 'scanlines', 'pod_p', 'pod', 'magenta', 'pink'],
    // Round-7: Submagic's Pod P uses MAGENTA as primary (not white). The cyan/yellow
    // shadows are offsets behind/around the magenta fill — that's the chromatic effect.
    style: {
      fontFamily: 'Anton',
      fontSize: 32, primaryColor: '#FF1493', outlineColor: 'transparent', shadowColor: '#000000',
      bold: false, italic: false, alignment: 'center', showShadow: false, textCase: 'uppercase',
      effects: { chromaticAberration: true },
    },
    preview: { scanlines: true },
  },
  {
    id: 'popline',
    label: 'Popline',
    description: 'Stacked condensed white caps with a violet swipe highlight through one word',
    tags: ['popline', 'tall', 'condensed', 'stacked', 'editorial', 'clean', 'swipe', 'highlight', 'violet'],
    style: {
      fontFamily: 'Bebas Neue',
      fontSize: 32, primaryColor: '#FFFFFF', outlineColor: '#000000', shadowColor: '#00000088',
      bold: false, italic: false, alignment: 'center', showShadow: true, textCase: 'uppercase',
    },
    // Round-7: Submagic Popline has a violet/purple highlight passing through one of
    // the stacked lines (the "current" word). Express via per-line styling.
    preview: {
      lines: [
        { text: 'TO' },
        { text: 'GET',     primaryColor: '#FFFFFF', outlineColor: '#8A2BE2', borderStyle: 'box' },
        { text: 'STARTED' },
      ],
    },
  },
  {
    id: 'editorial',
    label: 'Editorial',
    description: 'Tiny italic serif in muted grey — quiet/literary tone (Submagic "Beasty")',
    tags: ['editorial', 'serif', 'italic', 'literary', 'quiet', 'essay', 'subtle', 'understated', 'beasty'],
    // Round-7: Submagic's "Beasty" is NOT a MrBeast big-bold caption — it's a TINY
    // ITALIC SERIF, dark/quiet, very literary. Renamed to match the actual visual.
    style: {
      fontFamily: 'DM Serif Display',
      fontSize: 22, primaryColor: '#B5B5B5', outlineColor: 'transparent', shadowColor: '#00000044',
      bold: false, italic: true, alignment: 'center', showShadow: false, textCase: 'uppercase',
    },
    preview: { sampleText: 'TO GET' },
  },
  {
    id: 'karaoke_dim',
    label: 'Karaoke Dim',
    description: 'Single word in vivid color + rest of line dim grey (Submagic "Youshaei")',
    tags: ['karaoke', 'dim', 'grey', 'reveal', 'youshaei', 'word-state', 'highlight', 'current-word'],
    // Round-7: Submagic's Youshaei is NOT a black box pill — it's karaoke-dim where
    // the current word is teal/green and upcoming words are dim grey. No pill at all.
    style: {
      fontFamily: 'Montserrat Black',
      fontSize: 26, primaryColor: '#FFFFFF', outlineColor: 'transparent', shadowColor: '#000000AA',
      bold: true, italic: false, alignment: 'center', showShadow: true, textCase: 'uppercase',
    },
    preview: {
      sampleText: 'TO GET STARTED',
      words: [
        { text: 'TO',      primaryColor: '#00D9B1' },           // current — teal vivid
        { text: 'GET',     primaryColor: '#888888' },           // upcoming — dim
        { text: 'STARTED', primaryColor: '#888888' },           // upcoming — dim
      ],
    },
  },
  {
    id: 'mozi',
    label: 'Mozi',
    description: '2-line stack: white top line + lime green bottom line (the emphasis word)',
    tags: ['mozi', 'neon', 'lime', 'two-color', 'emphasis', 'attention', 'reaction', 'callout', 'highlight'],
    // Round-7: Submagic's Mozi is TWO-COLOR — top line white "TO GET", bottom line
    // lime green "STARTED" (the punchline word emphasized). NOT all-lime as I had it.
    style: {
      fontFamily: 'Teko',
      fontSize: 36, primaryColor: '#FFFFFF', outlineColor: '#000000', shadowColor: '#003300',
      bold: true, italic: false, alignment: 'center', showShadow: true, textCase: 'uppercase',
    },
    preview: {
      lines: [
        { text: 'TO GET',  primaryColor: '#FFFFFF' },   // setup line, plain white
        { text: 'STARTED', primaryColor: '#39FF14' },   // punchline word in lime
      ],
    },
  },
  {
    id: 'glitch_infinite',
    label: 'Glitch Infinite',
    description: 'Yellow pill label + red glitch text below',
    tags: ['glitch', 'broken', 'distort', 'error', 'hack', 'datamosh', 'edgy'],
    style: {
      fontFamily: 'Rubik',
      fontSize: 30, primaryColor: '#FFFF00', outlineColor: '#000000', shadowColor: '#FF0033',
      bold: true, italic: false, alignment: 'center', showShadow: true, textCase: 'uppercase',
      effects: { glitchOffset: '#FF0033' },
    },
    preview: {
      lines: [
        { text: 'New',     primaryColor: '#0A0A0A', outlineColor: '#FFE600', borderStyle: 'box', textCase: 'capitalize', scale: 0.75 },
        { text: 'started', primaryColor: '#FFFF00', outlineColor: '#000000', borderStyle: 'outline', textCase: 'lowercase', scale: 1.1 },
      ],
      scanlines: true,
    },
  },
  {
    id: 'bounce_label',
    label: 'Bounce Label',
    description: 'Bold dark Rubik inside yellow pill (single-line label)',
    tags: ['label', 'pill', 'highlight', 'callout', 'yellow', 'pop'],
    style: {
      fontFamily: 'Rubik',
      fontSize: 28, primaryColor: '#0A0A0A', outlineColor: '#FFE600', shadowColor: '#00000088',
      bold: true, italic: false, alignment: 'center', showShadow: true, textCase: 'uppercase',
      borderStyle: 'box',
    },
    preview: { sampleText: 'NEW' },
  },
  {
    id: 'seamless_bounce',
    label: 'Seamless Bounce',
    description: 'Yellow pill "New" + lime "started". Shares the static layout with baby_earthquake; the v2 motion pass adds the bounce/spring animation.',
    tags: ['seamless', 'bounce', 'pop', 'spring', 'elastic', 'callout', 'announcement', 'new'],
    style: {
      fontFamily: 'Rubik',
      fontSize: 28, primaryColor: '#0A0A0A', outlineColor: '#FFE600', shadowColor: '#00000088',
      bold: true, italic: false, alignment: 'center', showShadow: true, textCase: 'uppercase',
      borderStyle: 'box',
    },
    preview: {
      lines: [
        { text: 'New',     primaryColor: '#0A0A0A', outlineColor: '#FFE600', borderStyle: 'box', textCase: 'capitalize', scale: 0.8 },
        { text: 'started', primaryColor: '#39FF14', outlineColor: '#000000', borderStyle: 'outline', textCase: 'lowercase', fontFamily: 'Rubik', scale: 1.0 },
      ],
    },
  },
  {
    id: 'baby_earthquake',
    label: 'Baby Earthquake',
    description: 'Yellow pill "New" + lime "started". Shares the static layout with seamless_bounce; the v2 motion pass adds the shake/earthquake animation.',
    tags: ['baby', 'earthquake', 'shake', 'rumble', 'impact', 'shock', 'tremor', 'callout', 'new'],
    style: {
      fontFamily: 'Rubik',
      fontSize: 28, primaryColor: '#0A0A0A', outlineColor: '#FFE600', shadowColor: '#00000088',
      bold: true, italic: false, alignment: 'center', showShadow: true, textCase: 'uppercase',
      borderStyle: 'box',
    },
    preview: {
      lines: [
        { text: 'New',     primaryColor: '#0A0A0A', outlineColor: '#FFE600', borderStyle: 'box', textCase: 'capitalize', scale: 0.8 },
        { text: 'started', primaryColor: '#39FF14', outlineColor: '#000000', borderStyle: 'outline', textCase: 'lowercase', fontFamily: 'Rubik', scale: 1.0 },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Modern TikTok verticals (codex round-6 swarm: missing native-platform vibes)
  // -------------------------------------------------------------------------
  {
    id: 'grwm_soft',
    label: 'GRWM Soft',
    description: 'Soft cream Poppins lowercase, beauty/fashion vlog aesthetic',
    tags: ['grwm', 'getready', 'beauty', 'fashion', 'soft', 'aesthetic', 'morning', 'routine', 'makeup', 'skincare', 'cottagecore', 'pink'],
    style: {
      fontFamily: 'Poppins',
      fontSize: 24, primaryColor: '#FFF5F0', outlineColor: '#C9A091', shadowColor: '#3a1f1a66',
      bold: false, italic: false, alignment: 'center', showShadow: true, textCase: 'lowercase',
    },
  },
  {
    id: 'day_vlog',
    label: 'Day Vlog',
    description: 'Minimal lowercase Poppins on subtle outline — daily vlog aesthetic',
    tags: ['vlog', 'day', 'daily', 'lifestyle', 'minimal', 'casual', 'diary', 'journal', 'simple'],
    style: {
      fontFamily: 'Poppins',
      fontSize: 22, primaryColor: '#F4F4F4', outlineColor: '#1A1A1A', shadowColor: '#00000066',
      bold: false, italic: false, alignment: 'center', showShadow: true, textCase: 'normal',
    },
  },
  {
    id: 'true_crime',
    label: 'True Crime',
    description: 'Cold off-white Roboto with deep navy outline — narration / documentary',
    tags: ['truecrime', 'true-crime', 'crime', 'mystery', 'documentary', 'narration', 'whisper', 'detective', 'unsolved', 'investigation', 'cold', 'serious'],
    style: {
      fontFamily: 'Roboto',
      fontSize: 26, primaryColor: '#E8E4DC', outlineColor: '#0C1B2E', shadowColor: '#000000AA',
      bold: true, italic: false, alignment: 'center', showShadow: true, textCase: 'normal',
    },
  },
];

const BY_ID: Record<string, VibePreset> = Object.fromEntries(
  PRESET_CATALOG.map(p => [p.id, p])
);

export function getPreset(id: string): VibePreset | undefined {
  return BY_ID[id];
}

export function listPresetIds(): PresetId[] {
  return PRESET_CATALOG.map(p => p.id);
}
