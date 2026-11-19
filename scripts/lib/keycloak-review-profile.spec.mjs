import { describe, expect, it, vi } from 'vitest';
import {
  disableReviewProfile,
  findReviewProfileExecution,
  getAdminToken,
  isDisabled,
} from './keycloak-review-profile.mjs';

const BASE_URL = 'http://localhost:8080';
const REALM = 'pelada';

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

describe('keycloak-review-profile', () => {
  describe('getAdminToken', () => {
    it('retorna access_token quando autenticação ok', async () => {
      const fetchFn = vi
        .fn()
        .mockResolvedValue(jsonResponse({ access_token: 'tok-1' }));

      const token = await getAdminToken({
        fetchFn,
        baseUrl: BASE_URL,
        adminUser: 'admin',
        adminPass: 'secret',
      });

      expect(token).toBe('tok-1');
      expect(fetchFn).toHaveBeenCalledWith(
        `${BASE_URL}/realms/master/protocol/openid-connect/token`,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('lança erro quando HTTP não-ok', async () => {
      const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}, false, 401));
      await expect(
        getAdminToken({
          fetchFn,
          baseUrl: BASE_URL,
          adminUser: 'admin',
          adminPass: 'errada',
        }),
      ).rejects.toThrow(/HTTP 401/);
    });

    it('lança erro quando resposta não tem access_token', async () => {
      const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}));
      await expect(
        getAdminToken({
          fetchFn,
          baseUrl: BASE_URL,
          adminUser: 'admin',
          adminPass: 'secret',
        }),
      ).rejects.toThrow(/access_token/);
    });
  });

  describe('findReviewProfileExecution / isDisabled', () => {
    it('acha a execução pelo providerId', () => {
      const executions = [
        { providerId: 'idp-create-user-if-unique', requirement: 'ALTERNATIVE' },
        { providerId: 'idp-review-profile', requirement: 'REQUIRED', id: 'e1' },
      ];
      const found = findReviewProfileExecution(executions);
      expect(found?.id).toBe('e1');
      expect(isDisabled(found)).toBe(false);
    });

    it('retorna null quando não encontrada', () => {
      expect(findReviewProfileExecution([])).toBeNull();
    });

    it('isDisabled lida com execução ausente', () => {
      expect(isDisabled(null)).toBe(false);
    });
  });

  describe('disableReviewProfile', () => {
    it('desativa quando está REQUIRED', async () => {
      const execution = {
        id: 'e1',
        providerId: 'idp-review-profile',
        requirement: 'REQUIRED',
      };
      const fetchFn = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse([execution]))
        .mockResolvedValueOnce(jsonResponse({}));

      const result = await disableReviewProfile({
        fetchFn,
        baseUrl: BASE_URL,
        realm: REALM,
        token: 'tok-1',
      });

      expect(result).toEqual({ changed: true });
      const putCall = fetchFn.mock.calls[1];
      expect(putCall[1].method).toBe('PUT');
      expect(JSON.parse(putCall[1].body)).toEqual(
        expect.objectContaining({ id: 'e1', requirement: 'DISABLED' }),
      );
    });

    it('não chama PUT quando já está DISABLED', async () => {
      const execution = {
        id: 'e1',
        providerId: 'idp-review-profile',
        requirement: 'DISABLED',
      };
      const fetchFn = vi.fn().mockResolvedValue(jsonResponse([execution]));

      const result = await disableReviewProfile({
        fetchFn,
        baseUrl: BASE_URL,
        realm: REALM,
        token: 'tok-1',
      });

      expect(result).toEqual({ changed: false });
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('lança erro quando listagem falha', async () => {
      const fetchFn = vi.fn().mockResolvedValue(jsonResponse({}, false, 404));
      await expect(
        disableReviewProfile({
          fetchFn,
          baseUrl: BASE_URL,
          realm: REALM,
          token: 'tok-1',
        }),
      ).rejects.toThrow(/Falha ao listar/);
    });

    it('lança erro quando execução não existe no fluxo', async () => {
      const fetchFn = vi.fn().mockResolvedValue(jsonResponse([]));
      await expect(
        disableReviewProfile({
          fetchFn,
          baseUrl: BASE_URL,
          realm: REALM,
          token: 'tok-1',
        }),
      ).rejects.toThrow(/não encontrada/);
    });

    it('lança erro quando PUT falha', async () => {
      const execution = {
        id: 'e1',
        providerId: 'idp-review-profile',
        requirement: 'REQUIRED',
      };
      const fetchFn = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse([execution]))
        .mockResolvedValueOnce(jsonResponse({}, false, 500));

      await expect(
        disableReviewProfile({
          fetchFn,
          baseUrl: BASE_URL,
          realm: REALM,
          token: 'tok-1',
        }),
      ).rejects.toThrow(/Falha ao desativar/);
    });
  });
});
