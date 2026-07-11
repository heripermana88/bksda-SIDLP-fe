import {
  ApplicationConfig,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import {
  provideHttpClient,
  withInterceptors,
  withFetch,
} from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { isDevMode } from '@angular/core';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // ── Zoneless Change Detection (Angular 21) ──────────────
    provideZonelessChangeDetection(),

    // ── Router dengan input binding (params as signals) ─────
    provideRouter(routes, withComponentInputBinding()),

    // ── HTTP Client + auth interceptor ──────────────────────
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor])
    ),

    // ── PWA Service Worker ───────────────────────────────────
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
