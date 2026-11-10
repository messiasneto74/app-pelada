import { describe, expect, it } from 'vitest';
import { e2eKeycloakCredentials, e2eUrls } from './e2e-env.mjs';

describe('e2e-env', () => {
  it('e2eUrls defaults', () => {
    const urls = e2eUrls({
      webUrl: 'http://localhost:4200',
      apiUrl: 'http://localhost:3000',
      keycloakIssuer: 'http://localhost:8080/realms/pelada',
    });
    expect(urls.webUrl).toBe('http://localhost:4200');
    expect(urls.apiUrl).toBe('http://localhost:3000');
    expect(urls.keycloakIssuer).toContain('realms/pelada');
  });

  it('e2eKeycloakCredentials defaults', () => {
    const creds = e2eKeycloakCredentials();
    expect(creds.username).toBe('dev');
    expect(creds.password).toContain('pelada');
  });
});
