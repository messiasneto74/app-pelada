import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { resolve } from 'node:path';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

function parseCorsOrigins(raw: string | undefined): string | string[] {
  const value = raw?.trim() || 'http://localhost:4200';
  const origins = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return origins.length === 1 ? origins[0] : origins;
}

/** CORS, validação global e formato de erro — usado em `main` e testes e2e. */
export function configureNestApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  const origin = parseCorsOrigins(config.get<string>('CORS_ORIGIN'));

  app.enableCors({ origin, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const uploadDir = config.get<string>('UPLOAD_DIR');
  if (uploadDir?.trim()) {
    const expressApp = app as NestExpressApplication;
    expressApp.useStaticAssets(resolve(process.cwd(), uploadDir), {
      prefix: '/uploads/',
    });
  }
}
