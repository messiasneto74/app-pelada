import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PhotoStorageService } from './photo-storage.service';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [PhotoStorageService],
  exports: [PhotoStorageService],
})
export class StorageModule {}
