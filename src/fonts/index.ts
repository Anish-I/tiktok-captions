import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FONTS_ROOT = join(__dirname, '..', '..', 'fonts');

const getFontPath = (folder: string, file: string): string => {
  return join(FONTS_ROOT, folder, file);
};

interface FontEntry {
  regular: string;
  bold?: string;
}

/**
 * Many Google Fonts ship as single-file variable fonts (one .ttf carries all
 * weights). libass and CSS @font-face both pick a weight from these via the
 * font-weight axis. We point both "regular" and "bold" at the same .ttf for
 * those families.
 */
export const FONT_FILE_MAP: Record<string, FontEntry> = {
  'Anton':                { regular: getFontPath('Anton', 'Anton-Regular.ttf') },
  'Bangers':              { regular: getFontPath('Bangers', 'Bangers-Regular.ttf') },
  'Bebas Neue':           { regular: getFontPath('Bebas_Neue', 'BebasNeue-Regular.ttf') },
  'Creepster':            { regular: getFontPath('Creepster', 'Creepster-Regular.ttf') },
  'DM Serif Display':     { regular: getFontPath('DM_Serif_Display', 'DMSerifDisplay-Regular.ttf') },
  'Fira Sans Condensed':  { regular: getFontPath('Fira_Sans_Condensed', 'FiraSansCondensed-Regular.ttf'), bold: getFontPath('Fira_Sans_Condensed', 'FiraSansCondensed-Black.ttf') },
  'Gabarito':             { regular: getFontPath('Gabarito', 'Gabarito-Variable.ttf'),   bold: getFontPath('Gabarito', 'Gabarito-Variable.ttf') },
  'Montserrat':           { regular: getFontPath('Montserrat', 'Montserrat-Variable.ttf'), bold: getFontPath('Montserrat', 'Montserrat-Variable.ttf') },
  'Montserrat Black':     { regular: getFontPath('Montserrat', 'Montserrat-Variable.ttf'), bold: getFontPath('Montserrat', 'Montserrat-Variable.ttf') },
  'Orbitron':             { regular: getFontPath('Orbitron', 'Orbitron-Variable.ttf'),   bold: getFontPath('Orbitron', 'Orbitron-Variable.ttf') },
  'Pacifico':             { regular: getFontPath('Pacifico', 'Pacifico-Regular.ttf') },
  'Permanent Marker':     { regular: getFontPath('Permanent_Marker', 'PermanentMarker-Regular.ttf') },
  'Playfair Display':     { regular: getFontPath('Playfair_Display', 'PlayfairDisplay-Variable.ttf'), bold: getFontPath('Playfair_Display', 'PlayfairDisplay-Variable.ttf') },
  'Poppins':              { regular: getFontPath('Poppins', 'Poppins-Regular.ttf'),      bold: getFontPath('Poppins', 'Poppins-Black.ttf') },
  'Press Start 2P':       { regular: getFontPath('Press_Start_2P', 'PressStart2P-Regular.ttf') },
  'Roboto':               { regular: getFontPath('Roboto', 'Roboto-Regular.ttf'),        bold: getFontPath('Roboto', 'Roboto-Black.ttf') },
  'Rubik':                { regular: getFontPath('Rubik', 'Rubik-Variable.ttf'),         bold: getFontPath('Rubik', 'Rubik-Variable.ttf') },
  'Teko':                 { regular: getFontPath('Teko', 'Teko-Variable.ttf'),           bold: getFontPath('Teko', 'Teko-Variable.ttf') },
  'Arial':                { regular: 'Arial' },
};

export function getFontFilePath(fontFamily: string, bold = false): string {
  const entry = FONT_FILE_MAP[fontFamily] ?? FONT_FILE_MAP['Arial']!;
  const candidate = bold && entry.bold ? entry.bold : entry.regular;

  // System font (e.g. "Arial") — libass will look it up via fontconfig.
  if (candidate === fontFamily) return fontFamily;

  if (existsSync(candidate)) return candidate;

  // Soft fallback: still emit the font NAME so libass can try the host's
  // installed font registry. Tests will catch missing-font regressions.
  return fontFamily;
}

export function fontsRoot(): string {
  return FONTS_ROOT;
}
