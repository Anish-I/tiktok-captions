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

function renderHTML() {
  const css = fontFaceCss();
  const cards = PRESET_CATALOG.map(p => {
    const s = p.style;
    const sampleByPreset = {
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
    };
    const sample = sampleByPreset[p.id] ?? 'Sample caption text';
    const text = (function(){
      switch (s.textCase) {
        case 'uppercase':  return sample.toUpperCase();
        case 'lowercase':  return sample.toLowerCase();
        case 'capitalize': return sample.replace(/\b\w/g, c => c.toUpperCase());
        default:           return sample;
      }
    })();

    const fontWeight = s.bold || /Black|ExtraBold/.test(s.fontFamily) ? 900 : 600;
    const cssFontFamily = s.fontFamily === 'Montserrat Black' ? 'Montserrat' : s.fontFamily;
    const outlineCss =
      s.outlineColor === 'transparent'
        ? ''
        : `-webkit-text-stroke: 2px ${s.outlineColor};
            text-shadow:
              -2px -2px 0 ${s.outlineColor},
               2px -2px 0 ${s.outlineColor},
              -2px  2px 0 ${s.outlineColor},
               2px  2px 0 ${s.outlineColor},
               0 0 12px ${s.shadowColor};`;

    return `
<article class="card" data-preset="${p.id}">
  <header>
    <span class="id">${p.id}</span>
    <span class="font">${s.fontFamily}</span>
  </header>
  <div class="stage" style="
    background: radial-gradient(circle at 30% 20%, #1a1a1a, #0a0a0a);
    background-image:
      radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      radial-gradient(circle at 30% 20%, #1a1a1a, #0a0a0a);
    background-size: 22px 22px, cover;
  ">
    <span class="caption" style="
      font-family: '${cssFontFamily}', sans-serif;
      font-weight: ${fontWeight};
      font-style: ${s.italic ? 'italic' : 'normal'};
      color: ${s.primaryColor};
      letter-spacing: 0.4px;
      ${outlineCss}
    ">${escapeHtml(text)}</span>
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
  min-height: 150px;
  display: flex; align-items: center; justify-content: center;
  padding: 22px 18px;
}
.card .caption {
  font-size: 36px;
  line-height: 1.2;
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
