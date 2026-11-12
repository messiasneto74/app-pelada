import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
  ValidationPipe,
} from '@nestjs/common';
import { normalizePatchPlayerBody } from '../common/normalize-patch-player-body';

/** Multipart no PATCH jogador: sem conversão implícita de "false" → true. */
@Injectable()
export class PatchPlayerBodyPipe implements PipeTransform {
  private readonly validate = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
  });

  async transform(value: unknown, metadata: ArgumentMetadata) {
    const normalized =
      value && typeof value === 'object'
        ? normalizePatchPlayerBody(value as Record<string, unknown>)
        : value;
    return this.validate.transform(normalized, metadata);
  }
}
