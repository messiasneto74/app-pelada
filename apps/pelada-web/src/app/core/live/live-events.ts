import { inject, Injectable, NgZone } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { Observable, share } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Issue #233 — aviso da API: algo mudou nesta pelada. */
export type LiveChange = {
  peladaId: string;
  scope: string;
  matchId: string | null;
  at: string;
};

/** Espera entre reconexões (2 s, 4 s, 8 s… até 30 s). */
export function liveReconnectDelayMs(attempt: number): number {
  return Math.min(30_000, 2_000 * 2 ** Math.max(0, attempt));
}

/**
 * Issue #233 — lê um fluxo Server-Sent Events em pedaços e devolve cada
 * evento completo (`event:` + `data:`), guardando o resto pro próximo pedaço.
 */
export function parseSseChunk(
  buffer: string,
): { events: Array<{ type: string; data: string }>; rest: string } {
  const events: Array<{ type: string; data: string }> = [];
  const normalized = buffer.replace(/\r\n/g, '\n');
  const blocks = normalized.split('\n\n');
  const rest = blocks.pop() ?? '';
  for (const block of blocks) {
    let type = 'message';
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) type = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
    }
    if (data.length) {
      events.push({ type, data: data.join('\n') });
    }
  }
  return { events, rest };
}

/**
 * Issue #233 — conexão única com `GET /peladas/:id/live` (avisos instantâneos)
 * enquanto alguma tela da pelada estiver aberta. Usa `fetch` (o EventSource do
 * navegador não manda o header `Authorization`) e roda fora da zona do Angular.
 * Caiu a conexão: tenta de novo sozinho. Sem login: não conecta (as telas
 * continuam com a busca de tempos em tempos).
 */
@Injectable({ providedIn: 'root' })
export class LiveEventsService {
  private readonly zone = inject(NgZone);
  private readonly oauth = inject(OAuthService, { optional: true });
  private readonly streams = new Map<string, Observable<LiveChange>>();
  private readonly connectedPeladas = new Set<string>();
  fetchFn: typeof fetch = (...args) => fetch(...args);

  /** `true` enquanto o fluxo da pelada está aberto (a tela pode buscar menos). */
  isConnected(peladaId: string): boolean {
    return this.connectedPeladas.has(peladaId);
  }

  changes(peladaId: string): Observable<LiveChange> {
    let stream = this.streams.get(peladaId);
    if (!stream) {
      stream = new Observable<LiveChange>((subscriber) => {
        const abort = new AbortController();
        let attempt = 0;
        let timer: ReturnType<typeof setTimeout> | null = null;
        const schedule = () => {
          if (abort.signal.aborted) return;
          timer = setTimeout(run, liveReconnectDelayMs(attempt++));
        };
        const run = async () => {
          const token = this.accessToken();
          if (!token) {
            return; // sem login: fica só a busca de tempos em tempos da tela
          }
          try {
            const res = await this.fetchFn(`${environment.apiUrl}/peladas/${peladaId}/live`, {
              headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
              signal: abort.signal,
              cache: 'no-store',
            });
            if (!res.ok || !res.body) {
              throw new Error(`live ${res.status}`);
            }
            this.connectedPeladas.add(peladaId);
            attempt = 0;
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buf = '';
            for (;;) {
              const { value, done } = await reader.read();
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              const parsed = parseSseChunk(buf);
              buf = parsed.rest;
              for (const ev of parsed.events) {
                if (ev.type === 'change') {
                  try {
                    subscriber.next(JSON.parse(ev.data) as LiveChange);
                  } catch {
                    /* aviso malformado: ignora */
                  }
                }
              }
            }
          } catch {
            /* sem rede / API fora / token vencido: tenta de novo */
          }
          this.connectedPeladas.delete(peladaId);
          schedule();
        };
        this.zone.runOutsideAngular(() => void run());
        return () => {
          abort.abort();
          if (timer) clearTimeout(timer);
          this.connectedPeladas.delete(peladaId);
          this.streams.delete(peladaId);
        };
      }).pipe(share());
      this.streams.set(peladaId, stream);
    }
    return stream;
  }

  private accessToken(): string | null {
    try {
      return this.oauth?.getAccessToken?.() || null;
    } catch {
      return null;
    }
  }
}
