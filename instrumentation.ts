/**
 * Fichier d'instrumentation Next.js
 * 
 * Ce fichier est exécuté au démarrage du serveur Next.js
 * et permet d'initialiser des outils comme Sentry
 * 
 * L'initialisation côté client se fait via SentryInit dans app/layout.tsx
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 * @see https://docs.sentry.dev/platforms/javascript/guides/nextjs/manual-setup/
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialisation côté serveur
    try {
      await import('./sentry.server.config');
    } catch (error) {
      // Sentry non disponible, on continue sans
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to load Sentry server config:', error);
      }
    }
  }
}
