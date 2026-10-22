import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureNestApp } from './bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureNestApp(app);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}
bootstrap();
