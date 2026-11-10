import type { MatchDrawDetailDto } from '../../core/match/match-draw-api.model';
import type { RosterPlayer } from '../../core/roster/roster-player.model';
import {
  formatRosterRating,
  rosterPositionLabel,
} from '../../core/roster/roster-list.logic';
import { placeholderRosterPlayer } from './sorteio-view.logic';

export const SHARE_IMAGE_WIDTH_PX = 720;

export type ShareLineKind = 'title' | 'team' | 'player' | 'summary' | 'blank';

export type DrawShareLine = {
  kind: ShareLineKind;
  text: string;
};

/** Linhas para preview, canvas e testes (história 61 / §3.5-SHARE). */
export function buildDrawShareLines(
  draw: MatchDrawDetailDto,
  rosterById: ReadonlyMap<string, RosterPlayer>,
  options?: { hideRatings?: boolean },
): DrawShareLine[] {
  const hide = options?.hideRatings ?? false;
  const lines: DrawShareLine[] = [
    { kind: 'title', text: 'Times sorteados' },
    { kind: 'blank', text: '' },
  ];
  for (const team of [...draw.teams].sort((a, b) => a.sortOrder - b.sortOrder)) {
    lines.push({ kind: 'team', text: team.name });
    for (const pid of team.playerIds) {
      const p = rosterById.get(pid) ?? placeholderRosterPlayer(pid);
      const pos = rosterPositionLabel(p);
      const rating =
        hide || p.rating === null
          ? ''
          : ` · nota ${formatRosterRating(p.rating)}`;
      lines.push({
        kind: 'player',
        text: `· ${p.displayName} (${pos})${rating}`,
      });
    }
    lines.push({ kind: 'blank', text: '' });
  }
  const summary = draw.metrics.summaryText.trim();
  if (summary.length > 0) {
    lines.push({ kind: 'summary', text: summary });
  }
  return lines;
}

/** Texto WhatsApp (mesmo formato da §3.5). */
export function buildDrawShareText(
  draw: MatchDrawDetailDto,
  rosterById: ReadonlyMap<string, RosterPlayer>,
  options?: { hideRatings?: boolean },
): string {
  const lines = buildDrawShareLines(draw, rosterById, options);
  const out: string[] = [];
  for (const line of lines) {
    if (line.kind === 'blank') {
      out.push('');
    } else if (line.kind === 'player') {
      out.push(`  ${line.text}`);
    } else {
      out.push(line.text);
    }
  }
  return out.join('\n').trim();
}

const LINE_HEIGHT_PX: Record<ShareLineKind, number> = {
  title: 32,
  team: 28,
  player: 24,
  summary: 26,
  blank: 10,
};

const PADDING_PX = 32;

export function measureDrawShareImageHeight(
  lines: readonly DrawShareLine[],
): number {
  const body = lines.reduce((h, l) => h + LINE_HEIGHT_PX[l.kind], 0);
  return PADDING_PX * 2 + body;
}

function fontForKind(kind: ShareLineKind): string {
  switch (kind) {
    case 'title':
      return 'bold 22px system-ui, sans-serif';
    case 'team':
      return 'bold 17px system-ui, sans-serif';
    case 'summary':
      return 'italic 14px system-ui, sans-serif';
    default:
      return '15px system-ui, sans-serif';
  }
}

function colorForKind(kind: ShareLineKind): string {
  if (kind === 'summary') {
    return '#5a6b52';
  }
  return '#1c2418';
}

export function renderDrawShareImage(
  lines: readonly DrawShareLine[],
): HTMLCanvasElement {
  const height = measureDrawShareImageHeight(lines);
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_IMAGE_WIDTH_PX;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D indisponível');
  }
  ctx.fillStyle = '#f4f7ef';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let y = PADDING_PX;
  for (const line of lines) {
    if (line.kind !== 'blank' && line.text.length > 0) {
      ctx.fillStyle = colorForKind(line.kind);
      ctx.font = fontForKind(line.kind);
      const x = line.kind === 'player' ? PADDING_PX + 12 : PADDING_PX;
      ctx.fillText(line.text, x, y + LINE_HEIGHT_PX[line.kind] * 0.72);
    }
    y += LINE_HEIGHT_PX[line.kind];
  }
  return canvas;
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Falha ao gerar PNG'));
        }
      },
      'image/png',
      0.92,
    );
  });
}

export async function buildDrawShareImageBlob(
  draw: MatchDrawDetailDto,
  rosterById: ReadonlyMap<string, RosterPlayer>,
  options?: { hideRatings?: boolean },
): Promise<Blob> {
  const lines = buildDrawShareLines(draw, rosterById, options);
  const canvas = renderDrawShareImage(lines);
  return canvasToPngBlob(canvas);
}

export type CopyTextResult = 'copied' | 'unavailable' | 'failed';

export async function tryCopyShareText(text: string): Promise<CopyTextResult> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return 'unavailable';
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export function canNativeShareFiles(): boolean {
  if (typeof navigator === 'undefined' || typeof File === 'undefined') {
    return false;
  }
  if (!navigator.share) {
    return false;
  }
  try {
    const probe = new File(['x'], 'probe.png', { type: 'image/png' });
    return navigator.canShare?.({ files: [probe] }) ?? false;
  } catch {
    return false;
  }
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
