import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type KeycloakCreateUserInput = {
  email: string;
  password: string;
  name: string;
};

/** Monta URLs do Admin API a partir da base do Keycloak (sem barra final). */
export function buildKeycloakAdminUrls(baseUrl: string, realm: string) {
  const base = baseUrl.replace(/\/$/, '');
  return {
    tokenUrl: `${base}/realms/master/protocol/openid-connect/token`,
    usersUrl: `${base}/admin/realms/${encodeURIComponent(realm)}/users`,
  };
}

export function splitDisplayName(name: string): {
  firstName: string;
  lastName: string;
} {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: 'Jogador', lastName: 'Pelada' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'Pelada' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

@Injectable()
export class KeycloakAdminClient {
  constructor(private readonly config: ConfigService) {}

  async createUser(input: KeycloakCreateUserInput): Promise<void> {
    const baseUrl = this.config.get<string>('KEYCLOAK_URL')?.trim();
    const realm = this.config.get<string>('KEYCLOAK_REALM')?.trim() || 'pelada';
    const adminUser = this.config.get<string>('KEYCLOAK_ADMIN')?.trim();
    const adminPassword = this.config.get<string>('KEYCLOAK_ADMIN_PASSWORD');

    if (!baseUrl || !adminUser || !adminPassword) {
      throw new ServiceUnavailableException(
        'Cadastro indisponível: Keycloak Admin não configurado.',
      );
    }

    const { tokenUrl, usersUrl } = buildKeycloakAdminUrls(baseUrl, realm);
    const accessToken = await this.fetchAdminToken(
      tokenUrl,
      adminUser,
      adminPassword,
    );
    const { firstName, lastName } = splitDisplayName(input.name);
    const email = input.email.trim().toLowerCase();

    let response: Response;
    try {
      response = await fetch(usersUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: email,
          email,
          enabled: true,
          emailVerified: true,
          firstName,
          lastName,
          credentials: [
            {
              type: 'password',
              value: input.password,
              temporary: false,
            },
          ],
        }),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Não foi possível contactar o Keycloak para criar a conta.',
      );
    }

    if (response.status === 201 || response.status === 204) {
      return;
    }
    if (response.status === 409) {
      throw new ConflictException('Já existe uma conta com este e-mail.');
    }

    throw new ServiceUnavailableException(
      'Keycloak recusou a criação da conta. Tente novamente mais tarde.',
    );
  }

  /** Issue #226 — atualiza o nome (firstName/lastName) da conta no Keycloak. */
  async updateUserName(sub: string, name: string): Promise<void> {
    const { firstName, lastName } = splitDisplayName(name);
    await this.adminRequest(`/${encodeURIComponent(sub)}`, 'PUT', { firstName, lastName });
  }

  /** Issue #226 — troca a senha da conta (já validada a senha atual). */
  async resetPassword(sub: string, newPassword: string): Promise<void> {
    await this.adminRequest(`/${encodeURIComponent(sub)}/reset-password`, 'PUT', {
      type: 'password',
      value: newPassword,
      temporary: false,
    });
  }

  /**
   * Issue #226 — confere a senha atual tentando um login (password grant) no
   * client público do app. `false` = senha errada; erro = IdP indisponível.
   */
  async verifyPassword(username: string, password: string): Promise<boolean> {
    const baseUrl = this.config.get<string>('KEYCLOAK_URL')?.trim();
    const realm = this.config.get<string>('KEYCLOAK_REALM')?.trim() || 'pelada';
    const clientId = this.config.get<string>('KEYCLOAK_CLIENT_ID')?.trim() || 'pelada-web';
    if (!baseUrl) {
      throw new ServiceUnavailableException('Keycloak não configurado.');
    }
    let response: Response;
    try {
      response = await fetch(
        `${baseUrl.replace(/\/$/, '')}/realms/${encodeURIComponent(realm)}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'password',
            client_id: clientId,
            username,
            password,
          }),
        },
      );
    } catch {
      throw new ServiceUnavailableException('Não foi possível contactar o Keycloak.');
    }
    if (response.ok) {
      return true;
    }
    if (response.status === 400 || response.status === 401) {
      return false;
    }
    throw new ServiceUnavailableException('Keycloak indisponível. Tente novamente.');
  }

  private async adminRequest(path: string, method: 'PUT', body: unknown): Promise<void> {
    const baseUrl = this.config.get<string>('KEYCLOAK_URL')?.trim();
    const realm = this.config.get<string>('KEYCLOAK_REALM')?.trim() || 'pelada';
    const adminUser = this.config.get<string>('KEYCLOAK_ADMIN')?.trim();
    const adminPassword = this.config.get<string>('KEYCLOAK_ADMIN_PASSWORD');
    if (!baseUrl || !adminUser || !adminPassword) {
      throw new ServiceUnavailableException('Keycloak Admin não configurado.');
    }
    const { tokenUrl, usersUrl } = buildKeycloakAdminUrls(baseUrl, realm);
    const token = await this.fetchAdminToken(tokenUrl, adminUser, adminPassword);
    let response: Response;
    try {
      response = await fetch(`${usersUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      throw new ServiceUnavailableException('Não foi possível contactar o Keycloak.');
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'O Keycloak recusou a alteração da conta. Tente novamente mais tarde.',
      );
    }
  }

  private async fetchAdminToken(
    tokenUrl: string,
    username: string,
    password: string,
  ): Promise<string> {
    let response: Response;
    try {
      response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: 'admin-cli',
          username,
          password,
        }),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Não foi possível autenticar no Keycloak Admin.',
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Credenciais do Keycloak Admin inválidas ou IdP indisponível.',
      );
    }

    const body = (await response.json()) as { access_token?: string };
    if (!body.access_token) {
      throw new ServiceUnavailableException(
        'Resposta inválida do Keycloak Admin (sem access_token).',
      );
    }
    return body.access_token;
  }
}
