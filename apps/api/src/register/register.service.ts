import { Injectable } from '@nestjs/common';
import { KeycloakAdminClient } from './keycloak-admin.client';
import { RegisterDto } from './register.dto';

@Injectable()
export class RegisterService {
  constructor(private readonly keycloakAdmin: KeycloakAdminClient) {}

  async register(dto: RegisterDto): Promise<{ ok: true }> {
    await this.keycloakAdmin.createUser({
      email: dto.email,
      password: dto.password,
      name: dto.name,
    });
    return { ok: true };
  }
}
