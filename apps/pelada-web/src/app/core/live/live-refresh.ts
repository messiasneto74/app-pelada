import { DestroyRef, DOCUMENT, inject, Injectable, NgZone } from '@angular/core';

/** Issue #233 — de quanto em quanto tempo as telas da partida buscam a versão nova. */
export const LIVE_REFRESH_MS = 5000;

/**
 * Issue #233 — atualização automática pra todos: chama `refresh` a cada
 * `intervalMs` enquanto a tela estiver aberta e visível (para com o celular
 * apagado / app em segundo plano e volta sozinho). O intervalo roda fora da
 * zona do Angular (não deixa a app "instável" pra sempre) e só volta pra ela
 * pra aplicar a atualização.
 */
@Injectable({ providedIn: 'root' })
export class LiveRefreshService {
  private readonly zone = inject(NgZone);
  private readonly doc = inject(DOCUMENT);

  start(destroyRef: DestroyRef, refresh: () => void, intervalMs = LIVE_REFRESH_MS): void {
    const id = this.zone.runOutsideAngular(() =>
      setInterval(() => {
        if (this.doc.visibilityState === 'visible') {
          this.zone.run(refresh);
        }
      }, intervalMs),
    );
    destroyRef.onDestroy(() => clearInterval(id));
  }
}
