import { Module } from '@nestjs/common';
import { KeycloakAdminClient } from './keycloak-admin.client';
import { RegisterController } from './register.controller';
import { RegisterService } from './register.service';

@Module({
  controllers: [RegisterController],
  providers: [RegisterService, KeycloakAdminClient],
})
export class RegisterModule {}
