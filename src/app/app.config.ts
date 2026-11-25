import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { backendAuthInterceptor } from './shared/interceptors/backend-auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Tier 3: el morph entre vistas lo hace el navegador, no una timeline.
    // `skipInitialTransition` evita que la primera pintura se transicione
    // desde un snapshot vacío.
    provideRouter(routes, withViewTransitions({ skipInitialTransition: true })),
    provideHttpClient(withInterceptors([backendAuthInterceptor]))
  ]
};
