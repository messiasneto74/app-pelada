import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

/**
 * Plugins Capacitor (`App`, `Browser`) são `Proxy` com um `get` trap que
 * fabrica uma função nova a cada acesso (ver `registerPlugin` no core) — por
 * isso `spyOn(Browser, 'open')` não substitui nada de fato em teste. Este
 * wrapper expõe métodos reais (spyable) por cima dos plugins.
 */
export const nativeBridge = {
  openInSystemBrowser(url: string): Promise<void> {
    return Browser.open({ url });
  },
  closeSystemBrowser(): Promise<void> {
    return Browser.close();
  },
  onAppUrlOpen(callback: (event: URLOpenListenerEvent) => void): void {
    void App.addListener('appUrlOpen', callback);
  },
};
