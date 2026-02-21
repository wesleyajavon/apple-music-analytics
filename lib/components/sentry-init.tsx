'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/react';

/**
 * Composant client pour initialiser Sentry côté client
 * 
 * Ce composant s'exécute uniquement côté client et initialise Sentry
 * si ce n'est pas déjà fait via instrumentation-client.ts
 */
export function SentryInit() {
  useEffect(() => {
    console.log('🔧 SentryInit: Début de l\'initialisation...');
    
    // Vérifie si Sentry est déjà initialisé
    const sentryGlobal = typeof window !== 'undefined' ? (window as any).__SENTRY__ : null;
    
    // Vérifie de plusieurs façons si Sentry est déjà initialisé
    let isAlreadyInitialized = false;
    
    if (sentryGlobal) {
      // Méthode 1: Vérifie le hub et le client
      if (sentryGlobal.hub?.getClient() !== undefined) {
        isAlreadyInitialized = true;
        console.log('✅ Sentry déjà initialisé (détecté via hub.getClient)');
      }
      // Méthode 2: Vérifie le client directement
      else if (sentryGlobal.client !== undefined) {
        isAlreadyInitialized = true;
        console.log('✅ Sentry déjà initialisé (détecté via client)');
      }
      // Méthode 3: Vérifie getCurrentHub
      else if (sentryGlobal.getCurrentHub?.()?.getClient() !== undefined) {
        isAlreadyInitialized = true;
        console.log('✅ Sentry déjà initialisé (détecté via getCurrentHub)');
      }
      // Méthode 4: Si __SENTRY__ existe et a des propriétés, considérons-le comme initialisé
      else if (Object.keys(sentryGlobal).length > 0) {
        isAlreadyInitialized = true;
        console.log('✅ Sentry déjà initialisé (détecté via présence de __SENTRY__)');
      }
    }

    if (isAlreadyInitialized) {
      console.log('✅ Sentry est déjà initialisé, on ne réinitialise pas');
      return;
    }

    // Récupère le DSN depuis les variables d'environnement
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    console.log('🔧 SentryInit: DSN présent?', !!dsn);

    if (!dsn) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ NEXT_PUBLIC_SENTRY_DSN n\'est pas configuré. Sentry désactivé côté client.');
      }
      return;
    }

    // Initialise Sentry
    try {
      console.log('🔧 SentryInit: Initialisation de Sentry...');
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        
        // Performance Monitoring
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        
        // Integrations
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ],
        
        // Configuration du replay (session replay)
        replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        replaysOnErrorSampleRate: 1.0,
        
        // Ignore certaines erreurs communes
        ignoreErrors: [
          // Erreurs réseau communes
          'NetworkError',
          'Failed to fetch',
          'Network request failed',
          // Erreurs de navigateur
          'ResizeObserver loop limit exceeded',
          'Non-Error promise rejection captured',
        ],
        
        // Filtre les transactions pour éviter le bruit
        beforeSend(event, hint) {
          // En développement, on log aussi dans la console
          if (process.env.NODE_ENV === 'development') {
            console.error('📤 Sentry Event envoyé:', event);
            if (hint.originalException) {
              console.error('📤 Original Exception:', hint.originalException);
            }
          }
          return event;
        },
      });

      console.log('✅ Sentry initialisé côté client avec succès');
      console.log('🔍 Debug - window.__SENTRY__ après init:', (window as any).__SENTRY__);
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation de Sentry:', error);
    }
  }, []);

  // Ce composant ne rend rien
  return null;
}
