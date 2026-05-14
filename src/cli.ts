#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate } from './pipeline.js';
import { pickPreset, keywordPick } from './presets/picker.js';
import { PRESET_CATALOG, listPresetIds, getPreset } from './presets/catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pkgPath = join(__dirname, '..', 'package.json');
const pkg = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, 'utf8')) : { version: '0.0.0' };

const program = new Command();
program
  .name('tiktok-caps')
  .description('Vibe-driven TikTok-style subtitle generator.')
  .version(pkg.version);

program
  .command('generate')
  .description('Transcribe a clip and emit styled .ass + .srt subtitle files.')
  .argument('<input>', 'audio or video file')
  .option('-v, --vibe <phrase>', 'free-form vibe phrase, e.g. "horror"')
  .option('-p, --preset <id>', `explicit preset id (one of: ${listPresetIds().join(', ')})`)
  .option('-o, --out <path>', 'output path (.ass extension). The matching .srt is written alongside.')
  .option('--width <px>', 'reference video width', (v) => Number(v))
  .option('--height <px>', 'reference video height', (v) => Number(v))
  .option('--max-words <n>', 'max words per cue (default 5)', (v) => Number(v))
  .option('--model <path>', 'whisper.cpp model path (overrides $WHISPER_CPP_MODEL)')
  .option('--threads <n>', 'whisper.cpp threads', (v) => Number(v))
  .option('--language <code>', 'force language (e.g. en)')
  .action(async (input: string, opts) => {
    if (!opts.vibe && !opts.preset) {
      program.error('one of --vibe or --preset is required.');
    }
    const result = await generate({
      input,
      vibe: opts.vibe,
      preset: opts.preset,
      out: opts.out,
      videoWidth: opts.width,
      videoHeight: opts.height,
      cues: opts.maxWords ? { maxWordsPerCue: opts.maxWords } : undefined,
      transcribe: {
        model: opts.model,
        threads: opts.threads,
        language: opts.language,
      },
    });

    process.stdout.write(`preset: ${result.preset.id} (${result.preset.label})\n`);
    if (result.pick) {
      process.stdout.write(`picker: ${result.pick.source}`);
      if (result.pick.rationale) process.stdout.write(` — ${result.pick.rationale}`);
      process.stdout.write('\n');
    }
    process.stdout.write(`cues:   ${result.cues.length}\n`);
    process.stdout.write(`wrote:  ${result.assPath}\n`);
    process.stdout.write(`wrote:  ${result.srtPath}\n`);
  });

program
  .command('pick')
  .description('Run the preset picker on a vibe phrase. Prints the chosen preset, no transcription.')
  .argument('<vibe>', 'free-form vibe phrase')
  .action(async (vibe: string) => {
    const result = await pickPreset(vibe);
    process.stdout.write(
      JSON.stringify({
        presetId: result.preset.id,
        label: result.preset.label,
        source: result.source,
        rationale: result.rationale ?? null,
        tweaks: result.tweaks ?? null,
      }, null, 2) + '\n',
    );
  });

program
  .command('keyword')
  .description('Run only the keyword fallback (skip LLM). Useful for debugging.')
  .argument('<vibe>', 'vibe phrase')
  .action((vibe: string) => {
    const preset = keywordPick(vibe);
    process.stdout.write(`${preset.id} (${preset.label})\n`);
  });

program
  .command('presets')
  .description('List all available presets.')
  .action(() => {
    const max = Math.max(...PRESET_CATALOG.map(p => p.id.length));
    for (const p of PRESET_CATALOG) {
      process.stdout.write(`${p.id.padEnd(max)}  ${p.style.fontFamily.padEnd(22)}  ${p.description}\n`);
    }
  });

program
  .command('show')
  .description('Print a preset definition as JSON.')
  .argument('<id>', 'preset id')
  .action((id: string) => {
    const p = getPreset(id);
    if (!p) {
      process.stderr.write(`unknown preset: ${id}\n`);
      process.exit(1);
    }
    process.stdout.write(JSON.stringify(p, null, 2) + '\n');
  });

program.parseAsync().catch((err) => {
  process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
