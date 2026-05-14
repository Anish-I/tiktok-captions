import type { Cue } from './cues.js';

/** SRT time format: HH:MM:SS,mmm */
export function formatSRTTime(seconds: number): string {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const ms = Math.round((total - Math.floor(total)) * 1000);
  return (
    String(h).padStart(2, '0') + ':' +
    String(m).padStart(2, '0') + ':' +
    String(s).padStart(2, '0') + ',' +
    String(ms).padStart(3, '0')
  );
}

export function renderSRT(cues: Cue[]): string {
  const lines: string[] = [];
  cues.forEach((cue, i) => {
    lines.push(String(i + 1));
    lines.push(`${formatSRTTime(cue.start)} --> ${formatSRTTime(cue.end)}`);
    lines.push(cue.text);
    lines.push('');
  });
  return lines.join('\n');
}
