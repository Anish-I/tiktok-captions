import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildVsrArgs, resolveVsrPath, runVsr } from '../src/clean/vsr-wrapper.js';

/** Build a fake VSR repo on disk so resolveVsrPath / buildVsrArgs have something to anchor on. */
function fakeVsrRepo(): string {
  const root = mkdtempSync(join(tmpdir(), 'vsr-fake-'));
  mkdirSync(join(root, 'backend'), { recursive: true });
  writeFileSync(join(root, 'backend', 'main.py'), '# fake');
  return root;
}

describe('resolveVsrPath', () => {
  it('honours explicit path when backend/main.py exists', () => {
    const root = fakeVsrRepo();
    try {
      expect(resolveVsrPath(root)).toBe(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('throws a helpful error when nothing resolves', async () => {
    // Use vi.doMock so this test runs even on a machine where the sibling
    // ../../video-subtitle-remover clone actually exists.
    vi.resetModules();
    const prev = process.env.VSR_PATH;
    delete process.env.VSR_PATH;
    vi.doMock('node:fs', async () => {
      const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
      return { ...actual, existsSync: () => false };
    });
    try {
      const { resolveVsrPath: rvp } = await import('../src/clean/vsr-wrapper.js');
      expect(() => rvp('/does/not/exist')).toThrow(/video-subtitle-remover not found/);
    } finally {
      vi.doUnmock('node:fs');
      vi.resetModules();
      if (prev !== undefined) process.env.VSR_PATH = prev;
    }
  });
});

describe('buildVsrArgs', () => {
  const root = '/tmp/fake-vsr';
  const main = `${root}/backend/main.py`;

  it('includes input and output as the first flags', () => {
    const args = buildVsrArgs(
      { input: 'in.mp4', output: 'out.mp4' },
      root,
    );
    expect(args[0]).toBe(main);
    expect(args).toContain('--input');
    expect(args[args.indexOf('--input') + 1]).toBe('in.mp4');
    expect(args).toContain('--output');
    expect(args[args.indexOf('--output') + 1]).toBe('out.mp4');
  });

  it('emits --subtitle-area-coords once per coord with 4 numeric args', () => {
    const args = buildVsrArgs(
      {
        input: 'in.mp4',
        output: 'out.mp4',
        coords: [
          { yMin: 900, yMax: 1080, xMin: 0,   xMax: 1080 },
          { yMin: 100, yMax: 200,  xMin: 100, xMax: 980  },
        ],
      },
      root,
    );
    const indices = args
      .map((a, i) => (a === '--subtitle-area-coords' ? i : -1))
      .filter((i) => i >= 0);
    expect(indices.length).toBe(2);
    expect(args.slice(indices[0] + 1, indices[0] + 5)).toEqual(['900', '1080', '0', '1080']);
    expect(args.slice(indices[1] + 1, indices[1] + 5)).toEqual(['100', '200', '100', '980']);
  });

  it('passes --inpaint-mode when provided, omits when not', () => {
    const with_ = buildVsrArgs(
      { input: 'in.mp4', output: 'out.mp4', inpaintMode: 'lama' },
      root,
    );
    expect(with_).toContain('--inpaint-mode');
    expect(with_[with_.indexOf('--inpaint-mode') + 1]).toBe('lama');

    const without = buildVsrArgs({ input: 'in.mp4', output: 'out.mp4' }, root);
    expect(without).not.toContain('--inpaint-mode');
  });
});

describe('runVsr (no Python invocation)', () => {
  it('throws when input does not exist', async () => {
    await expect(runVsr({ input: '/no/such/file.mp4', output: '/tmp/out.mp4' }))
      .rejects.toThrow(/input not found/);
  });
});
