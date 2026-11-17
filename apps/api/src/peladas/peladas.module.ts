import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MeModule } from '../me/me.module';
import { StorageModule } from '../storage/storage.module';
import { InvitesController } from './invites.controller';
import { PeladaInvitesService } from './pelada-invites.service';
import { PeladaPaymentsService } from './pelada-payments.service';
import { PeladaPlayersService } from './pelada-players.service';
import { PeladasController } from './peladas.controller';
import { MultipartPlayerPatchInterceptor } from './multipart-player-patch.interceptor';
import { PeladasService } from './peladas.service';

@Module({
  imports: [AuthModule, MeModule, StorageModule],
  controllers: [PeladasController, InvitesController],
  providers: [
    PeladasService,
    PeladaPlayersService,
    PeladaPaymentsService,
    PeladaInvitesService,
    MultipartPlayerPatchInterceptor,
  ],
})
export class PeladasModule {}
