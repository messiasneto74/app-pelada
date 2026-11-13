import { ApplicationConfig, provideAppInitializer, provideZoneChangeDetection, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideOAuthClient } from 'angular-oauth2-oidc';

import { routes } from './app.routes';
import { authBearerInterceptor } from './auth/auth-bearer.interceptor';
import { AuthService } from './auth/auth.service';
import { environment } from '../environments/environment';
import { assertProductionEnvironmentConfigured } from '../environments/environment-guard';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authBearerInterceptor])),
    provideOAuthClient(),
    provideAppInitializer(() => assertProductionEnvironmentConfigured(environment)),
    provideAppInitializer(() => inject(AuthService).init()),
  ],
};
