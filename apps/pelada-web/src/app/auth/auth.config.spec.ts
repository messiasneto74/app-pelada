import { Capacitor } from '@capacitor/core';
import { buildAuthConfig, NATIVE_REDIRECT_URI } from './auth.config';
import { nativeBridge } from './native-bridge';

describe('buildAuthConfig', () => {
  const originalIsNativePlatform = Capacitor.isNativePlatform;

  afterEach(() => {
    Capacitor.isNativePlatform = originalIsNativePlatform;
  });

  it('navegador: redirectUri aponta pra /entrar e openUri navega na mesma aba', () => {
    Capacitor.isNativePlatform = () => false;
    const config = buildAuthConfig();
    expect(config.redirectUri).toBe(`${window.location.origin}/entrar`);
    expect(typeof config.openUri).toBe('function');
  });

  it('app nativo: redirectUri é o deep link e openUri abre o navegador do sistema', () => {
    Capacitor.isNativePlatform = () => true;
    const openSpy = spyOn(nativeBridge, 'openInSystemBrowser').and.resolveTo();
    const config = buildAuthConfig();
    expect(config.redirectUri).toBe(NATIVE_REDIRECT_URI);
    config.openUri?.('https://auth.example.com/authorize?x=1');
    expect(openSpy).toHaveBeenCalledWith('https://auth.example.com/authorize?x=1');
  });
});
