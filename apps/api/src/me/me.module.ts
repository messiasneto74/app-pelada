import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { KeycloakAdminClient } from '../register/keycloak-admin.client';
import { StorageModule } from '../storage/storage.module';
import { MeController } from './me.controller';
import { MeProfileService } from './me-profile.service';
import { MeService } from './me.service';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [MeController],
  providers: [MeService, MeProfileService, KeycloakAdminClient],
  exports: [MeService],
})
export class MeModule {}
