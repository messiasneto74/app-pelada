import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
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

/**
 * `DEV_AUTH_BYPASS=true` aceita qualquer `Bearer` como autenticado — nunca
 * pode estar ativo junto de `NODE_ENV=production` (bug Médio da auditoria).
 */
export function assertNoDevAuthBypassInProduction(env: {
  NODE_ENV?: string;
  DEV_AUTH_BYPASS?: string;
}): void {
  if (env.NODE_ENV === 'production' && env.DEV_AUTH_BYPASS === 'true') {
    throw new Error(
      'DEV_AUTH_BYPASS=true não pode ser usado com NODE_ENV=production.',
    );
  }
}

/** CORS, validação global e formato de erro — usado em `main` e testes e2e. */
export function configureNestApp(app: INestApplication): void {
  const config = app.get(ConfigService);

  assertNoDevAuthBypassInProduction({
    NODE_ENV: config.get<string>('NODE_ENV'),
    DEV_AUTH_BYPASS: config.get<string>('DEV_AUTH_BYPASS'),
  });

  const origin = parseCorsOrigins(config.get<string>('CORS_ORIGIN'));

  app.use(helmet());
  app.enableCors({ origin, credentials: true });

  const expressApp = app as NestExpressApplication;
  expressApp.useBodyParser('json', { limit: '1mb' });
  expressApp.useBodyParser('urlencoded', { extended: true, limit: '1mb' });

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
    expressApp.useStaticAssets(resolve(process.cwd(), uploadDir), {
      prefix: '/uploads/',
    });
  }
}
