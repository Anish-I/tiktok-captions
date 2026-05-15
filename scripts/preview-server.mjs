// Local preview server: gallery of all 12 presets rendered with @font-face,
// plus a /api/pick endpoint that hits our compiled picker.
import { createServer } from 'node:http';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PRESET_CATALOG } from '../dist/presets/catalog.js';
import { pickPreset } from '../dist/presets/picker.js';
import { FONT_FILE_MAP } from '../dist/fonts/index.js';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ROOT = resolve(__dirname, '..');
const FONTS = join(ROOT, 'fonts');

const PORT = Number(process.env.PORT ?? 5555);
const HOST = '127.0.0.1';

// Map FONT_FILE_MAP entries to relative font URLs the page can fetch.
function fontUrl(family) {
  const entry = FONT_FILE_MAP[family];
  if (!entry) return null;
  const abs = entry.regular;
  if (abs === family || !existsSync(abs)) return null;
  return '/fonts/' + abs.replace(FONTS, '').split(/[\\/]/).filter(Boolean).join('/');
}

function fontFaceCss() {
  const fams = new Set();
  PRESET_CATALOG.forEach(p => fams.add(p.style.fontFamily));
  // Always include Montserrat Black too — sample 5 in the preset list.
  fams.add('Montserrat Black');

  const blocks = [];
  for (const fam of fams) {
    const url = fontUrl(fam);
    if (!url) continue;
    // Variable fonts: declare a weight range so font-weight: 900 etc work.
    const isVar = url.endsWith('-Variable.ttf');
    blocks.push(`
@font-face {
  font-family: '${fam}';
  src: url('${url}') format('truetype'${isVar ? '-variations' : ''});
  font-weight: ${isVar ? '100 900' : 'normal'};
  font-style: normal;
  font-display: swap;
}`.trim());
  }
  return blocks.join('\n');
}

const SAMPLE_BY_PRESET = {
  // Vibe presets
  horror: 'A WITCH lurked in the dark.',
  luxury: 'Champagne, please.',
  comedy: 'WAIT FOR IT...',
  gaming: 'GG NO RE',
  fitness: 'NO DAYS OFF',
  motivational: 'STAY HUNGRY',
  news: 'BREAKING: details incoming',
  podcast: 'Welcome back, friends',
  storytelling: 'Once upon a time...',
  educational: 'Step 1 of 3',
  wellness: 'Inhale. Exhale.',
  cinematic: 'IN A WORLD',
  // Submagic-inspired (round-7 renames: creator_clean -> editorial, pill_dark -> karaoke_dim)
  karaoke: 'TO GET STARTED',
  deep_diver: 'To get started',
  chromatic: 'TO GET',
  popline: 'TO GET STARTED',
  editorial: 'TO GET',
  karaoke_dim: 'TO GET STARTED',
  mozi: 'TO GET STARTED',
  glitch_infinite: 'STARTED',
  bounce_label: 'NEW',
  seamless_bounce: 'New started',
  baby_earthquake: 'New started',
  // Modern TikTok verticals
  grwm_soft: 'getting ready with you',
  day_vlog: 'today felt different',
  true_crime: 'WHAT HAPPENED NEXT',
};

const BASE_FONT_PX = 36;

function applyTextCase(text, mode) {
  switch (mode) {
    case 'uppercase':  return text.toUpperCase();
    case 'lowercase':  return text.toLowerCase();
    case 'capitalize': return text.replace(/\b\w/g, c => c.toUpperCase());
    default:           return text;
  }
}

/** Build the inline CSS for a styled caption span based on a SubtitleStyle-like object. */
function captionCss(style, scale = 1) {
  const fontWeight = style.bold || /Black|ExtraBold/.test(style.fontFamily) ? 900 : 600;
  const cssFontFamily = style.fontFamily === 'Montserrat Black' ? 'Montserrat' : style.fontFamily;
  const oc = style.outlineColor === 'transparent' ? null : style.outlineColor;
  const isBox = style.borderStyle === 'box';
  const chromatic = style.effects?.chromaticAberration;
  const glitchOffset = style.effects?.glitchOffset;
  const px = Math.round(BASE_FONT_PX * scale);

  let modeCss;
  if (chromatic) {
    modeCss = `text-shadow:
        -2px 0 #00FFFF,
         2px 0 #FF1493,
         0 2px #FFFF00,
         0 0 0 #000;`;
  } else if (glitchOffset) {
    modeCss = `text-shadow:
        3px 3px 0 ${glitchOffset},
        ${oc ? `-3px -3px 0 ${oc},` : ''}
        0 0 8px ${style.shadowColor};
      ${oc ? `-webkit-text-stroke: 2px ${oc}; paint-order: stroke fill;` : ''}`;
  } else if (isBox) {
    modeCss = `background-color: ${oc ?? '#000'};
      padding: 6px 16px;
      border-radius: 10px;
      -webkit-box-decoration-break: clone;
      box-decoration-break: clone;
      box-shadow: 0 6px 18px ${style.shadowColor};`;
  } else if (oc) {
    modeCss = `-webkit-text-stroke: 3px ${oc};
      paint-order: stroke fill;
      text-shadow: ${style.showShadow ? `0 3px 10px ${style.shadowColor}` : 'none'};`;
  } else {
    modeCss = `text-shadow: ${style.showShadow ? `0 3px 10px ${style.shadowColor}` : 'none'};`;
  }

  return `font-family: '${cssFontFamily}', sans-serif;
    font-weight: ${fontWeight};
    font-style: ${style.italic ? 'italic' : 'normal'};
    color: ${style.primaryColor};
    font-size: ${px}px;
    letter-spacing: 0.4px;
    line-height: 1.12;
    display: inline-block;
    ${modeCss}`;
}

/** Merge a PresetLine onto a base SubtitleStyle. */
function mergeLine(base, line) {
  return {
    ...base,
    ...(line.primaryColor && { primaryColor: line.primaryColor }),
    ...(line.outlineColor && { outlineColor: line.outlineColor }),
    ...(line.shadowColor && { shadowColor: line.shadowColor }),
    ...(line.fontFamily && { fontFamily: line.fontFamily }),
    ...(line.textCase && { textCase: line.textCase }),
    ...(line.borderStyle && { borderStyle: line.borderStyle }),
    ...(line.bold !== undefined && { bold: line.bold }),
  };
}

/** Render a single inline word with per-word overrides on top of the preset's base style. */
function renderWord(word, baseStyle) {
  const fontFamily = word.fontFamily ?? baseStyle.fontFamily;
  const cssFontFamily = fontFamily === 'Montserrat Black' ? 'Montserrat' : fontFamily;
  const isBold = word.bold ?? (baseStyle.bold || /Black|ExtraBold/.test(fontFamily));
  const isItalic = word.italic ?? baseStyle.italic;
  const fontWeight = isBold ? 900 : 600;
  const color = word.primaryColor ?? baseStyle.primaryColor;
  const px = Math.round(BASE_FONT_PX * (word.scale ?? 1));
  const bgCss = word.bg
    ? `background:${word.bg}; padding: 0 0.22em; border-radius: 0.14em; -webkit-text-stroke: 0; text-shadow: none;`
    : '';
  // Explicit inter-word margin instead of relying on text whitespace — flex
  // parents collapse whitespace between span children, so this guarantees
  // visible word separation in every rendering context.
  return `<span class="word" style="
    font-family: '${cssFontFamily}', sans-serif;
    font-weight: ${fontWeight};
    font-style: ${isItalic ? 'italic' : 'normal'};
    color: ${color};
    font-size: ${px}px;
    line-height: 1.12;
    margin-right: 0.32em;
    ${bgCss}
  ">${escapeHtml(word.text)}</span>`;
}

function renderSpan(htmlBody, style, scale = 1) {
  return `<span class="caption" style="${captionCss(style, scale).replace(/\s+/g, ' ')}">${htmlBody}</span>`;
}

/** Wrap one word with its own highlight pill (karaoke-style). */
function applyHighlightWord(text, hint) {
  const words = text.split(' ');
  const idx = hint.index;
  if (!words[idx]) return escapeHtml(text);
  const before = words.slice(0, idx).map(escapeHtml).join(' ');
  const after  = words.slice(idx + 1).map(escapeHtml).join(' ');
  const hl = `<span style="
    background:${hint.bg};
    color:${hint.color ?? '#0A0A0A'};
    -webkit-text-stroke: 0;
    text-shadow: none;
    padding: 0 0.22em;
    border-radius: 0.14em;
    display: inline-block;
    line-height: 1;
  ">${escapeHtml(words[idx])}</span>`;
  return [before, hl, after].filter(s => s).join(' ');
}

function wrapLine(spanHtml) {
  return `<div class="caption-line">${spanHtml}</div>`;
}

function renderCardBody(preset) {
  const base = preset.style;
  const hints = preset.preview ?? {};

  // Multi-line composition takes precedence.
  if (hints.lines && hints.lines.length > 0) {
    return hints.lines.map(line => {
      const merged = mergeLine(base, line);
      const cased = applyTextCase(line.text, merged.textCase);
      return wrapLine(renderSpan(escapeHtml(cased), merged, line.scale ?? 1));
    }).join('');
  }

  // Per-word styling (karaoke-state): each word gets its own color/bold/bg.
  if (hints.words && hints.words.length > 0) {
    // Apply preset textCase to each word's text. Words are joined with no separator
    // because each word span carries its own margin-right (whitespace would be
    // collapsed by flex parents anyway).
    const wordsHtml = hints.words
      .map(w => renderWord({ ...w, text: applyTextCase(w.text, base.textCase) }, base))
      .join('');

    // For box-style presets (deep_diver), the WHOLE row sits inside one pill —
    // wrap the word row in the preset's outline-mode span. For outline-style
    // presets (karaoke_dim), wrap in an inline-block span so the parent .caption-line
    // (display: flex) doesn't collapse text whitespace between word spans.
    if (base.borderStyle === 'box') {
      return wrapLine(renderSpan(wordsHtml, base));
    }
    return wrapLine(`<span style="display: inline-block;">${wordsHtml}</span>`);
  }

  let text = hints.sampleText ?? SAMPLE_BY_PRESET[preset.id] ?? 'Sample caption text';
  text = applyTextCase(text, base.textCase);

  if (hints.stackWords) {
    return text.split(/\s+/).filter(Boolean)
      .map(w => wrapLine(renderSpan(escapeHtml(w), base)))
      .join('');
  }

  if (hints.highlightWord) {
    return wrapLine(renderSpan(applyHighlightWord(text, hints.highlightWord), base));
  }

  return wrapLine(renderSpan(escapeHtml(text), base));
}

function renderHTML() {
  const css = fontFaceCss();
  const cards = PRESET_CATALOG.map(p => {
    const s = p.style;
    const hints = p.preview ?? {};
    const body = renderCardBody(p);

    return `
<article class="card" data-preset="${p.id}">
  <header>
    <span class="id">${p.id}</span>
    <span class="font">${s.fontFamily}</span>
  </header>
  <div class="stage${hints.scanlines ? ' scanlines' : ''}">
    <div class="caption-stack">${body}</div>
  </div>
  <footer>
    <span class="swatch" style="background:${s.primaryColor};border-color:${s.outlineColor}"></span>
    <span class="meta">${p.description}</span>
    <button class="copy" data-id="${p.id}">copy id</button>
  </footer>
</article>`.trim();
  }).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>tiktok-captions · preset gallery</title>
<style>
${css}

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0b0b0c;
  color: #e8e8ea;
  min-height: 100vh;
}
header.top {
  padding: 28px 40px 14px;
  display: flex; align-items: baseline; justify-content: space-between; gap: 24px;
  border-bottom: 1px solid #1f1f22;
}
header.top h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.2px; }
header.top .subtitle { color: #888; font-size: 13px; }
.picker {
  padding: 22px 40px 8px;
  display: flex; gap: 10px; align-items: center;
}
.picker input {
  flex: 1; max-width: 560px;
  background: #16161a; color: #e8e8ea;
  border: 1px solid #2a2a30; border-radius: 8px;
  font-size: 15px; padding: 11px 14px;
  outline: none;
}
.picker input:focus { border-color: #4a90e2; }
.picker button {
  background: #4a90e2; color: white;
  border: 0; border-radius: 8px; font-size: 14px; font-weight: 600;
  padding: 11px 18px; cursor: pointer;
}
.picker button:hover { background: #5a9eea; }
.picker .result {
  margin-left: 8px; font-size: 13px; color: #bbb;
  font-family: 'JetBrains Mono', ui-monospace, Consolas, monospace;
}
.picker .result strong { color: #4a90e2; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 18px;
  padding: 22px 40px 60px;
}
.card {
  background: #131316;
  border: 1px solid #232328;
  border-radius: 12px;
  overflow: hidden;
  transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
}
.card.highlight {
  border-color: #4a90e2;
  box-shadow: 0 0 0 1px #4a90e2, 0 12px 30px rgba(74,144,226,.25);
  transform: translateY(-2px);
}
.card header {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 14px 18px 10px;
  border-bottom: 1px solid #1d1d22;
}
.card header .id {
  font-size: 13px; font-weight: 800; letter-spacing: 0.5px;
  text-transform: uppercase; color: #e8e8ea;
}
.card header .font {
  font-size: 11px; color: #777; font-family: 'JetBrains Mono', monospace;
}
.card .stage {
  min-height: 160px;
  position: relative;
  display: flex; align-items: center; justify-content: center;
  padding: 22px 18px;
  overflow: hidden;
  background: radial-gradient(circle at 30% 20%, #1a1a1a, #0a0a0a);
  background-image:
    radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    radial-gradient(circle at 30% 20%, #1a1a1a, #0a0a0a);
  background-size: 22px 22px, cover;
}
.card .stage.scanlines::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: repeating-linear-gradient(
    0deg,
    rgba(255,255,255,0.06) 0,
    rgba(255,255,255,0.06) 1px,
    transparent 1px,
    transparent 4px
  );
  mix-blend-mode: overlay;
}
.card .caption-stack {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  word-break: break-word;
  max-width: 100%;
}
.card .caption-line {
  line-height: 1;
  display: flex;
  justify-content: center;
}
.card .caption {
  text-align: center;
  word-break: break-word;
}
.card footer {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px 12px;
  border-top: 1px solid #1d1d22;
  background: #0f0f12;
}
.swatch {
  width: 16px; height: 16px; border-radius: 4px;
  border: 1.5px solid;
}
.meta { flex: 1; font-size: 12px; color: #888; }
.copy {
  background: transparent; color: #888;
  border: 1px solid #2a2a30; border-radius: 6px;
  font-size: 11px; padding: 5px 9px; cursor: pointer;
  font-family: 'JetBrains Mono', monospace;
}
.copy:hover { color: #e8e8ea; border-color: #4a90e2; }
.copy.copied { background: #4a90e2; color: white; border-color: #4a90e2; }
</style>
</head>
<body>
<header class="top">
  <div>
    <h1>tiktok-captions · preset gallery</h1>
    <div class="subtitle">12 hand-tuned vibe presets · bundled SIL-OFL fonts · open a .ass in CapCut / Premiere / ffmpeg</div>
  </div>
  <div class="subtitle">localhost · :${PORT}</div>
</header>

<div class="picker">
  <input id="vibe" type="text" placeholder='Type a vibe: "spooky cottagecore witch tutorial", "epic NBA game highlights"…' autofocus>
  <button id="pickBtn">Pick</button>
  <span class="result" id="pickResult"></span>
</div>

<div class="grid">
${cards}
</div>

<script>
const input = document.getElementById('vibe');
const btn = document.getElementById('pickBtn');
const result = document.getElementById('pickResult');

async function doPick() {
  const v = input.value.trim();
  if (!v) return;
  result.textContent = 'thinking...';
  document.querySelectorAll('.card.highlight').forEach(c => c.classList.remove('highlight'));
  try {
    const r = await fetch('/api/pick', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ vibe: v })
    });
    const j = await r.json();
    if (j.error) { result.textContent = 'error: ' + j.error; return; }
    result.innerHTML = '<strong>' + j.presetId + '</strong> (via ' + j.source + ')' + (j.rationale ? ' — ' + j.rationale : '');
    const card = document.querySelector('.card[data-preset="' + j.presetId + '"]');
    if (card) {
      card.classList.add('highlight');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } catch (e) { result.textContent = 'error: ' + e.message; }
}

btn.addEventListener('click', doPick);
input.addEventListener('keydown', e => { if (e.key === 'Enter') doPick(); });

document.querySelectorAll('.copy').forEach(b => b.addEventListener('click', async (ev) => {
  const id = ev.currentTarget.dataset.id;
  try {
    await navigator.clipboard.writeText(id);
    ev.currentTarget.classList.add('copied');
    ev.currentTarget.textContent = 'copied!';
    setTimeout(() => { ev.currentTarget.classList.remove('copied'); ev.currentTarget.textContent = 'copy id'; }, 1100);
  } catch {}
}));
</script>
</body>
</html>`;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const MIME = {
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  const url = req.url ?? '/';
  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(renderHTML());
    return;
  }

  if (url.startsWith('/fonts/')) {
    const safe = decodeURIComponent(url).replace(/\.\./g, '');
    const path = join(ROOT, safe);
    if (existsSync(path) && statSync(path).isFile()) {
      res.writeHead(200, {
        'content-type': MIME[extname(path).toLowerCase()] ?? 'application/octet-stream',
        'cache-control': 'public, max-age=86400',
      });
      res.end(readFileSync(path));
      return;
    }
    res.writeHead(404).end('font not found: ' + safe);
    return;
  }

  if (url === '/api/pick' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const { vibe } = JSON.parse(body);
      const pick = await pickPreset(String(vibe || ''));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        presetId: pick.preset.id,
        label: pick.preset.label,
        source: pick.source,
        rationale: pick.rationale ?? null,
        tweaks: pick.tweaks ?? null,
      }));
    } catch (err) {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    }
    return;
  }

  res.writeHead(404).end('not found');
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`preview ready  →  http://${HOST}:${PORT}\n`);
});
