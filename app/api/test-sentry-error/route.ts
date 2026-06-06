import { captureException } from '@/lib/utils/sentry';
import { NextResponse } from 'next/server';

/**
 * Route API de test pour Sentry côté serveur
 * 
 * Lance une erreur intentionnelle pour tester la capture d'erreurs côté serveur
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    // Lance une erreur intentionnelle
    throw new Error('Erreur de test Sentry côté serveur - Route API de test');
  } catch (error) {
    // Capture l'erreur dans Sentry
    captureException(error, {
      route: '/api/test-sentry-error',
      testType: 'api-error-test',
    });
    
    // Retourne une erreur HTTP
    return NextResponse.json(
      { error: 'Test error for Sentry' },
      { status: 500 }
    );
  }
}
