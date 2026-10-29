import { BadRequestException } from '@nestjs/common';
import { PhotoStorageService } from './photo-storage.service';

describe('PhotoStorageService', () => {
  const config = {
    get: (key: string) =>
      key === 'UPLOAD_DIR' ? './uploads-test' : 'http://localhost:3000/uploads',
  };
  let service: PhotoStorageService;

  beforeEach(() => {
    service = new PhotoStorageService(config as never);
  });

  it('rejeita mime inválido', () => {
    expect(() =>
      service.assertValidUpload({
        mimetype: 'image/gif',
        size: 10,
      } as Express.Multer.File),
    ).toThrow(BadRequestException);
  });

  it('rejeita arquivo maior que 5 MB', () => {
    expect(() =>
      service.assertValidUpload({
        mimetype: 'image/jpeg',
        size: 5 * 1024 * 1024 + 1,
      } as Express.Multer.File),
    ).toThrow(BadRequestException);
  });
});
