import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MeModule } from '../me/me.module';
import { StorageModule } from '../storage/storage.module';
import { PeladasController } from './peladas.controller';
import { PeladasService } from './peladas.service';

@Module({
  imports: [AuthModule, MeModule, StorageModule],
  controllers: [PeladasController],
  providers: [PeladasService],
})
export class PeladasModule {}
