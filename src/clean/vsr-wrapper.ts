import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve as pathResolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type InpaintMode = 'sttn-auto' | 'sttn-det' | 'lama' | 'propainter' | 'opencv';

export interface VsrCoords {
  yMin: number;
  yMax: number;
  xMin: number;
  xMax: number;
}

export interface RunVsrOptions {
  input: string;
  output: string;
  coords?: VsrCoords[];
  inpaintMode?: InpaintMode;
  pythonBin?: string;
  vsrPath?: string;
}

export interface VsrRunResult {
  output: string;
  exitCode: number;
}

/**
 * Resolve the VSR repo path. Search order:
 *   1. `opts.vsrPath` (explicit override)
 *   2. `$VSR_PATH` env var
 *   3. sibling clone at `<this-repo>/../video-subtitle-remover`
 */
export function resolveVsrPath(explicit?: string): string {
  const candidates = [
    explicit,
    process.env.VSR_PATH,
    pathResolve(__dirname, '../../../video-subtitle-remover'),
  ].filter((p): p is string => !!p);

  for (const c of candidates) {
    if (existsSync(join(c, 'backend', 'main.py'))) return c;
  }

  throw new Error(
    `video-subtitle-remover not found. Set $VSR_PATH or clone it to ` +
    `${pathResolve(__dirname, '../../../video-subtitle-remover')} ` +
    `(see README.md "Removing burned-in subtitles").`,
  );
}

/** Build the argv `python backend/main.py` should receive. Exported for testing. */
export function buildVsrArgs(opts: RunVsrOptions, vsrRoot: string): string[] {
  const args = [
    join(vsrRoot, 'backend', 'main.py'),
    '--input', opts.input,
    '--output', opts.output,
  ];
  if (opts.inpaintMode) args.push('--inpaint-mode', opts.inpaintMode);
  for (const c of opts.coords ?? []) {
    args.push('--subtitle-area-coords',
      String(c.yMin), String(c.yMax), String(c.xMin), String(c.xMax));
  }
  return args;
}

/**
 * Run video-subtitle-remover against `input`, writing the cleaned MP4 to `output`.
 * Spawns Python as a subprocess; streams stderr through so users see VSR's progress.
 * Resolves with the exit code on success; throws on non-zero exit.
 */
export async function runVsr(opts: RunVsrOptions): Promise<VsrRunResult> {
  if (!existsSync(opts.input)) throw new Error(`input not found: ${opts.input}`);

  const vsrRoot = resolveVsrPath(opts.vsrPath);
  const python = opts.pythonBin ?? process.env.PYTHON_BIN ?? 'python3';
  const args = buildVsrArgs(opts, vsrRoot);
  const absOutput = isAbsolute(opts.output) ? opts.output : pathResolve(process.cwd(), opts.output);

  return new Promise((resolveP, rejectP) => {
    const child = spawn(python, args, {
      cwd: vsrRoot,
      stdio: ['ignore', 'inherit', 'inherit'],
    });

    child.on('error', (err) => rejectP(new Error(`failed to spawn python: ${err.message}`)));
    child.on('close', (code) => {
      if (code === 0) resolveP({ output: absOutput, exitCode: 0 });
      else rejectP(new Error(`video-subtitle-remover exited with code ${code}`));
    });
  });
}
