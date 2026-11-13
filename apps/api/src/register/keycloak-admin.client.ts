import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type KeycloakCreateUserInput = {
  email: string;
  password: string;
  name?: string;
};

/** Monta URLs do Admin API a partir da base do Keycloak (sem barra final). */
export function buildKeycloakAdminUrls(baseUrl: string, realm: string) {
  const base = baseUrl.replace(/\/$/, '');
  return {
    tokenUrl: `${base}/realms/master/protocol/openid-connect/token`,
    usersUrl: `${base}/admin/realms/${encodeURIComponent(realm)}/users`,
  };
}

export function splitDisplayName(name: string | undefined): {
  firstName: string;
  lastName: string;
} {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) {
    return { firstName: '', lastName: '' };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
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
          firstName: firstName || undefined,
          lastName: lastName || undefined,
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
