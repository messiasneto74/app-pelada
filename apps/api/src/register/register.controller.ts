import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RegisterDto } from './register.dto';
import { RegisterService } from './register.service';

/**
 * Provisionamento público de usuário no Keycloak (não é login/token).
 * Mantém a UI de cadastro no Angular sem expor admin-cli no browser.
 */
@Controller()
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  @Post('register')
  @HttpCode(201)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  register(@Body() body: RegisterDto) {
    return this.registerService.register(body);
  }
}
