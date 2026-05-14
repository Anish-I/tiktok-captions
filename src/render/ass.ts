import { getFontFilePath } from '../fonts/index.js';
import type { Cue } from './cues.js';

export type Alignment = 'left' | 'center' | 'right';
export type TextCase = 'normal' | 'uppercase' | 'lowercase' | 'capitalize';
export type BorderStyle = 'outline' | 'box';

export interface SubtitleStyle {
  fontFamily: string;
  fontSize: number;          // Reference size in points (will be scaled by video height).
  primaryColor: string;      // #RRGGBB — text fill (or text-on-box for box style)
  outlineColor: string;      // #RRGGBB | 'transparent' — outline ring, OR box bg if borderStyle='box'
  shadowColor: string;       // #RRGGBB — soft drop shadow / glow
  bold: boolean;
  italic: boolean;
  alignment: Alignment;
  showShadow: boolean;
  textCase?: TextCase;
  scale?: number;            // User-supplied font-size multiplier (default 1.0).
  marginV?: number;          // Bottom margin in px at 1080p reference (default 120).
  /**
   * `outline` = traditional stroke around glyph (ASS BorderStyle=1, libass default).
   * `box`     = opaque box background — outlineColor becomes the box fill, glyph
   *             sits in front. ASS BorderStyle=3. Used by sticker-style captions
   *             (Submagic "Youshaei" black box, "Deep Diver" cream pill).
   */
  borderStyle?: BorderStyle;
  /**
   * Optional preview-only visual effects. The ASS renderer ignores these — they
   * exist so the gallery can show a static approximation of v2 animations.
   */
  effects?: {
    /** RGB chromatic aberration (Pod P style). Preview only. */
    chromaticAberration?: boolean;
    /** Hard offset double-image (Glitch Infinite style). Hex color of the offset. */
    glitchOffset?: string;
  };
}

export interface RenderASSOptions {
  videoWidth?: number;
  videoHeight?: number;
}

const DEFAULT_W = 1920;
const DEFAULT_H = 1080;
const REFERENCE_H = 1080;

/** Convert #RRGGBB -> &HAABBGGRR (ASS uses BGR ordering, alpha first, alpha=00 means opaque). */
export function hexToAssBgr(hex: string, alpha = '00'): string {
  const clean = hex.replace('#', '').toUpperCase();
  if (clean.length !== 6) return `&H${alpha}FFFFFF`;
  const r = clean.substring(0, 2);
  const g = clean.substring(2, 4);
  const b = clean.substring(4, 6);
  return `&H${alpha}${b}${g}${r}`;
}

const alignmentCode = (a: Alignment): number => {
  switch (a) {
    case 'left':  return 1;
    case 'right': return 3;
    default:      return 2; // center, bottom
  }
};

const applyTextCase = (text: string, mode: TextCase | undefined): string => {
  switch (mode) {
    case 'uppercase':  return text.toUpperCase();
    case 'lowercase':  return text.toLowerCase();
    case 'capitalize': return text.replace(/\b\w/g, c => c.toUpperCase());
    default:           return text;
  }
};

/** ASS time format: H:MM:SS.cc (centiseconds, single-digit hour). */
export function formatASSTime(seconds: number): string {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const cs = Math.round((total - Math.floor(total)) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
};

/**
 * Render a styled ASS subtitle file from cues + style.
 *
 * Ported from smart-clip's `convertSRTToASS` (auto-subtitles.service.ts lines 1904-2075),
 * with the SRT parsing layer removed in favour of typed Cue[] input.
 */
export function renderASS(cues: Cue[], style: SubtitleStyle, opts: RenderASSOptions = {}): string {
  const videoWidth = opts.videoWidth ?? DEFAULT_W;
  const videoHeight = opts.videoHeight ?? DEFAULT_H;

  const fontFile = getFontFilePath(style.fontFamily, style.bold);
  const fontnameForAss = style.fontFamily; // libass resolves the family name; the .ttf is on the font path.

  const userScale = style.scale ?? 1;
  const videoScaleFactor = videoHeight / REFERENCE_H;
  const finalSize = Math.round(style.fontSize * userScale * videoScaleFactor * 2.5);

  const transparentOutline = style.outlineColor === 'transparent';
  const isBox = style.borderStyle === 'box';
  const borderStyleCode = isBox ? 3 : 1;          // ASS BorderStyle: 1=outline+shadow, 3=opaque box
  const borderWidth = isBox ? 4 : (transparentOutline ? 0 : 3);
  const shadowDepth = style.showShadow && !isBox ? 3 : 0;

  const primary = hexToAssBgr(style.primaryColor);
  const outline = transparentOutline ? '&H00000000' : hexToAssBgr(style.outlineColor);
  const shadow  = hexToAssBgr(style.shadowColor);

  const bold = style.bold ? 1 : 0;
  const italic = style.italic ? 1 : 0;
  const alignment = alignmentCode(style.alignment);

  const marginV = style.marginV ?? 120;
  const marginL = 10;
  const marginR = 10;

  const header =
    `[Script Info]\n` +
    `Title: tiktok-captions\n` +
    `ScriptType: v4.00+\n` +
    `PlayResX: ${videoWidth}\n` +
    `PlayResY: ${videoHeight}\n\n` +
    `[V4+ Styles]\n` +
    `Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n` +
    // BackColour is the box fill when BorderStyle=3 — point it at the outline color too.
    `Style: Default,${fontnameForAss},${finalSize},${primary},&H000000FF,${outline},${isBox ? outline : '&H00000000'},${bold},${italic},0,0,100,100,0,0,${borderStyleCode},${borderWidth},${shadowDepth},${alignment},${marginL},${marginR},${marginV},1\n\n` +
    `[Events]\n` +
    `Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;

  const events = cues.map(cue => {
    const text = applyTextCase(cue.text, style.textCase)
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\n/g, '\\N');
    const startASS = formatASSTime(cue.start);
    const endASS   = formatASSTime(cue.end);
    return `Dialogue: 0,${startASS},${endASS},Default,,0,0,0,,${text}`;
  }).join('\n');

  // Suppress unused-variable diagnostic without affecting runtime; left for future fontconfig hookup.
  void fontFile;

  return header + events + '\n';
}
