import { DestroyRef, DOCUMENT, inject, Injectable, NgZone } from '@angular/core';
import { debounceTime } from 'rxjs';
import { PeladaContextService } from '../pelada/pelada-context.service';
import { LiveEventsService } from './live-events';

/** Issue #233 — sem a conexão instantânea, de quanto em quanto tempo a tela busca de novo. */
export const LIVE_REFRESH_MS = 5000;

/** Issue #233 — com a conexão instantânea aberta, busca de garantia só a cada 30 s. */
export const LIVE_SAFETY_REFRESH_MS = 30_000;

/** Junta avisos que chegam juntos (ex.: fechar lista + sortear) numa busca só. */
export const LIVE_EVENT_DEBOUNCE_MS = 150;

/**
 * Issue #233 — atualização das telas da pelada pra todos.
 *
 * - **Instantâneo:** a cada aviso da API (`LiveEventsService`, alguém gravou
 *   algo nesta pelada) chama `refresh` na hora.
 * - **Garantia:** enquanto o aviso instantâneo não está conectado (sem rede,
 *   API antiga, sem login), busca a cada `intervalMs`; conectado, só a cada 30 s.
 * - Para com o celular apagado / app em segundo plano e, ao voltar, atualiza na hora.
 *
 * Tudo roda fora da zona do Angular (não deixa a app "instável" pra sempre) e
 * só volta pra ela pra aplicar a atualização.
 */
@Injectable({ providedIn: 'root' })
export class LiveRefreshService {
  private readonly zone = inject(NgZone);
  private readonly doc = inject(DOCUMENT);
  private readonly events = inject(LiveEventsService);
  private readonly peladaContext = inject(PeladaContextService);

  start(destroyRef: DestroyRef, refresh: () => void, intervalMs = LIVE_REFRESH_MS): void {
    const peladaId = this.peladaContext.getActivePelada()?.id ?? null;
    let lastRun = Date.now();
    const run = () => {
      lastRun = Date.now();
      this.zone.run(refresh);
    };
    const visible = () => this.doc.visibilityState === 'visible';

    const id = this.zone.runOutsideAngular(() =>
      setInterval(() => {
        if (!visible()) return;
        const live = peladaId !== null && this.events.isConnected(peladaId);
        if (!live || Date.now() - lastRun >= LIVE_SAFETY_REFRESH_MS) {
          run();
        }
      }, intervalMs),
    );

    const sub = peladaId
      ? this.zone.runOutsideAngular(() =>
          this.events
            .changes(peladaId)
            .pipe(debounceTime(LIVE_EVENT_DEBOUNCE_MS))
            .subscribe(() => {
              if (visible()) run();
            }),
        )
      : null;

    const onVisible = () => {
      if (visible()) run();
    };
    this.doc.addEventListener('visibilitychange', onVisible);

    destroyRef.onDestroy(() => {
      clearInterval(id);
      sub?.unsubscribe();
      this.doc.removeEventListener('visibilitychange', onVisible);
    });
  }
}
