/**
 * Configuration Sentry côté serveur pour Next.js App Router
 * 
 * Ce fichier est chargé par instrumentation.ts pour initialiser
 * Sentry côté serveur Next.js
 * 
 * @see https://docs.sentry.dev/platforms/javascript/guides/nextjs/manual-setup/
 */

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Integrations
    integrations: [
      Sentry.prismaIntegration(),
      Sentry.httpIntegration(),
    ],
    
    // Ignore certaines erreurs communes
    ignoreErrors: [
      'NEXT_REDIRECT',
      'NEXT_NOT_FOUND',
      // Annulation de requêtes RSC/prefetch (navigation rapide)
      'ECANCELED',
      'AbortError',
    ],
    
    // Configuration pour les routes API
    beforeSend(event, hint) {
      // En développement, on log aussi dans la console
      if (process.env.NODE_ENV === 'development') {
        console.error('Sentry Server Event:', event);
        if (hint.originalException) {
          console.error('Original Exception:', hint.originalException);
        }
      }
      return event;
    },
  });
} else {
  if (process.env.NODE_ENV === 'development') {
    console.warn('Sentry DSN not configured. Server-side error tracking disabled.');
  }
}

export default Sentry;