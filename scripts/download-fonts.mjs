// Downloads SIL-OFL / Apache fonts from the canonical Google Fonts mirrors.
// Modern google/fonts ships single-file variable fonts ([wght].ttf); Roboto lives
// in its own googlefonts/roboto repo. Skips files already present.
import { mkdirSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONTS_ROOT = resolve(__dirname, '..', 'fonts');

const RAW = 'https://raw.githubusercontent.com';

// folder => array of [absolute url, local filename] pairs.
const FONTS = {
  'Anton': [
    [`${RAW}/google/fonts/main/ofl/anton/Anton-Regular.ttf`, 'Anton-Regular.ttf'],
    [`${RAW}/google/fonts/main/ofl/anton/OFL.txt`, 'OFL.txt'],
  ],
  'Bangers': [
    [`${RAW}/google/fonts/main/ofl/bangers/Bangers-Regular.ttf`, 'Bangers-Regular.ttf'],
    [`${RAW}/google/fonts/main/ofl/bangers/OFL.txt`, 'OFL.txt'],
  ],
  'Bebas_Neue': [
    [`${RAW}/google/fonts/main/ofl/bebasneue/BebasNeue-Regular.ttf`, 'BebasNeue-Regular.ttf'],
    [`${RAW}/google/fonts/main/ofl/bebasneue/OFL.txt`, 'OFL.txt'],
  ],
  'Creepster': [
    [`${RAW}/google/fonts/main/ofl/creepster/Creepster-Regular.ttf`, 'Creepster-Regular.ttf'],
    [`${RAW}/google/fonts/main/ofl/creepster/OFL.txt`, 'OFL.txt'],
  ],
  'DM_Serif_Display': [
    [`${RAW}/google/fonts/main/ofl/dmserifdisplay/DMSerifDisplay-Regular.ttf`, 'DMSerifDisplay-Regular.ttf'],
    [`${RAW}/google/fonts/main/ofl/dmserifdisplay/OFL.txt`, 'OFL.txt'],
  ],
  'Fira_Sans_Condensed': [
    [`${RAW}/google/fonts/main/ofl/firasanscondensed/FiraSansCondensed-Regular.ttf`, 'FiraSansCondensed-Regular.ttf'],
    [`${RAW}/google/fonts/main/ofl/firasanscondensed/FiraSansCondensed-Bold.ttf`,    'FiraSansCondensed-Bold.ttf'],
    [`${RAW}/google/fonts/main/ofl/firasanscondensed/FiraSansCondensed-Black.ttf`,   'FiraSansCondensed-Black.ttf'],
    [`${RAW}/google/fonts/main/ofl/firasanscondensed/OFL.txt`, 'OFL.txt'],
  ],
  'Gabarito': [
    // Variable font (weight 400-900). Browsers can pick weights via font-weight: 100 900.
    [`${RAW}/google/fonts/main/ofl/gabarito/Gabarito%5Bwght%5D.ttf`, 'Gabarito-Variable.ttf'],
    [`${RAW}/google/fonts/main/ofl/gabarito/OFL.txt`, 'OFL.txt'],
  ],
  'Montserrat': [
    [`${RAW}/google/fonts/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf`, 'Montserrat-Variable.ttf'],
    [`${RAW}/google/fonts/main/ofl/montserrat/OFL.txt`, 'OFL.txt'],
  ],
  'Orbitron': [
    [`${RAW}/google/fonts/main/ofl/orbitron/Orbitron%5Bwght%5D.ttf`, 'Orbitron-Variable.ttf'],
    [`${RAW}/google/fonts/main/ofl/orbitron/OFL.txt`, 'OFL.txt'],
  ],
  'Pacifico': [
    [`${RAW}/google/fonts/main/ofl/pacifico/Pacifico-Regular.ttf`, 'Pacifico-Regular.ttf'],
    [`${RAW}/google/fonts/main/ofl/pacifico/OFL.txt`, 'OFL.txt'],
  ],
  'Permanent_Marker': [
    [`${RAW}/google/fonts/main/apache/permanentmarker/PermanentMarker-Regular.ttf`, 'PermanentMarker-Regular.ttf'],
    [`${RAW}/google/fonts/main/apache/permanentmarker/LICENSE.txt`, 'LICENSE.txt'],
  ],
  'Playfair_Display': [
    [`${RAW}/google/fonts/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf`,       'PlayfairDisplay-Variable.ttf'],
    [`${RAW}/google/fonts/main/ofl/playfairdisplay/PlayfairDisplay-Italic%5Bwght%5D.ttf`,'PlayfairDisplay-Italic-Variable.ttf'],
    [`${RAW}/google/fonts/main/ofl/playfairdisplay/OFL.txt`, 'OFL.txt'],
  ],
  'Poppins': [
    [`${RAW}/google/fonts/main/ofl/poppins/Poppins-Regular.ttf`,  'Poppins-Regular.ttf'],
    [`${RAW}/google/fonts/main/ofl/poppins/Poppins-Bold.ttf`,     'Poppins-Bold.ttf'],
    [`${RAW}/google/fonts/main/ofl/poppins/Poppins-ExtraBold.ttf`,'Poppins-ExtraBold.ttf'],
    [`${RAW}/google/fonts/main/ofl/poppins/Poppins-Black.ttf`,    'Poppins-Black.ttf'],
    [`${RAW}/google/fonts/main/ofl/poppins/Poppins-Thin.ttf`,     'Poppins-Thin.ttf'],
    [`${RAW}/google/fonts/main/ofl/poppins/OFL.txt`, 'OFL.txt'],
  ],
  'Press_Start_2P': [
    [`${RAW}/google/fonts/main/ofl/pressstart2p/PressStart2P-Regular.ttf`, 'PressStart2P-Regular.ttf'],
    [`${RAW}/google/fonts/main/ofl/pressstart2p/OFL.txt`, 'OFL.txt'],
  ],
  'Roboto': [
    // Roboto lives in its own repo, not google/fonts.
    [`${RAW}/googlefonts/roboto/main/src/hinted/Roboto-Regular.ttf`, 'Roboto-Regular.ttf'],
    [`${RAW}/googlefonts/roboto/main/src/hinted/Roboto-Bold.ttf`,    'Roboto-Bold.ttf'],
    [`${RAW}/googlefonts/roboto/main/src/hinted/Roboto-Black.ttf`,   'Roboto-Black.ttf'],
    [`${RAW}/googlefonts/roboto/main/LICENSE`, 'LICENSE.txt'],
  ],
  'Rubik': [
    [`${RAW}/google/fonts/main/ofl/rubik/Rubik%5Bwght%5D.ttf`, 'Rubik-Variable.ttf'],
    [`${RAW}/google/fonts/main/ofl/rubik/OFL.txt`, 'OFL.txt'],
  ],
  'Teko': [
    [`${RAW}/google/fonts/main/ofl/teko/Teko%5Bwght%5D.ttf`, 'Teko-Variable.ttf'],
    [`${RAW}/google/fonts/main/ofl/teko/OFL.txt`, 'OFL.txt'],
  ],
};

async function fetchTo(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, buf);
  return buf.length;
}

async function main() {
  mkdirSync(FONTS_ROOT, { recursive: true });
  const tasks = [];
  for (const [folder, files] of Object.entries(FONTS)) {
    for (const [url, name] of files) {
      const dest = join(FONTS_ROOT, folder, name);
      if (existsSync(dest) && statSync(dest).size > 100) continue;
      tasks.push({ url, dest, folder, name });
    }
  }
  console.log(`downloading ${tasks.length} files into ${FONTS_ROOT}`);
  let done = 0, failed = 0, totalBytes = 0;
  const CONCURRENCY = 6;
  const queue = tasks.slice();
  async function worker() {
    while (queue.length) {
      const t = queue.shift();
      try {
        const size = await fetchTo(t.url, t.dest);
        totalBytes += size;
        done++;
        process.stdout.write(`ok ${done}/${tasks.length} ${(totalBytes/1024).toFixed(0)}KB  ${t.folder}/${t.name}\n`);
      } catch (err) {
        failed++;
        process.stdout.write(`FAIL ${t.folder}/${t.name}: ${err.message}\n  ${t.url}\n`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`done. ok=${done} failed=${failed} totalKB=${(totalBytes/1024).toFixed(0)}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch(err => { console.error(err); process.exit(1); });
