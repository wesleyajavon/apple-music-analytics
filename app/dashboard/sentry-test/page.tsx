'use client';

import { useState, useEffect } from 'react';
import { captureException, captureMessage, setUser, setTag, setContext } from '@/lib/utils/sentry';
import * as Sentry from '@sentry/nextjs';

/**
 * Page de test pour Sentry
 * 
 * Permet de tester différents types d'événements Sentry :
 * - Erreurs JavaScript
 * - Messages
 * - Contexte utilisateur
 * - Tags et contexte personnalisé
 */
export default function SentryTestPage() {
  const [testResult, setTestResult] = useState<string>('');
  const hasDsn = !!process.env.NEXT_PUBLIC_SENTRY_DSN;
  const [sentryInitialized, setSentryInitialized] = useState(false);

  useEffect(() => {
    // Vérifie si Sentry est initialisé (avec un petit délai pour laisser le temps à l'init)
    const checkSentry = () => {
      try {
        // Méthode 1: Vérifie via window.__SENTRY__
        const sentryGlobal = typeof window !== 'undefined' ? (window as any).__SENTRY__ : null;
        let isInitialized = false;

        if (sentryGlobal) {
          // Plusieurs façons de vérifier selon la version de Sentry
          if (sentryGlobal.hub?.getClient() !== undefined) {
            isInitialized = true;
          } else if (sentryGlobal.client !== undefined) {
            isInitialized = true;
          } else if (sentryGlobal.getCurrentHub?.()?.getClient() !== undefined) {
            isInitialized = true;
          } else if (Object.keys(sentryGlobal).length > 0) {
            // Si __SENTRY__ existe avec des propriétés, Sentry est probablement initialisé
            isInitialized = true;
          }
        }

        setSentryInitialized(isInitialized);
        if (isInitialized) {
          console.log('✅ Sentry est initialisé côté client');
        } else {
          console.warn('⚠️ Sentry ne semble pas être initialisé côté client');
          if (sentryGlobal) {
            console.log('Debug - window.__SENTRY__ existe mais client non détecté:', sentryGlobal);
          }
        }
      } catch (error) {
        console.error('❌ Erreur lors de la vérification de Sentry:', error);
        setSentryInitialized(false);
      }
    };

    // Vérifie immédiatement
    checkSentry();
    // Vérifie aussi après un court délai (pour laisser le temps à instrumentation-client.ts de s'exécuter)
    const timeout = setTimeout(checkSentry, 500);
    return () => clearTimeout(timeout);
  }, []);

  const handleTestError = () => {
    try {
      setTestResult('Test d\'erreur lancé...');
      // Lance une erreur intentionnelle
      const testError = new Error('Erreur de test Sentry - Ceci est une erreur intentionnelle pour tester le monitoring');
      console.log('🚀 Lancement de l\'erreur de test:', testError);
      throw testError;
    } catch (error) {
      console.log('🔍 Erreur capturée, envoi à Sentry...', error);
      try {
        captureException(error, {
          testPage: true,
          testType: 'manual-error',
          timestamp: new Date().toISOString(),
        });
        console.log('✅ captureException appelé avec succès');
        setTestResult('✅ Erreur envoyée à Sentry ! Vérifiez votre dashboard Sentry et la console (F12).');
      } catch (sentryError) {
        console.error('❌ Erreur lors de l\'envoi à Sentry:', sentryError);
        setTestResult('❌ Erreur lors de l\'envoi à Sentry. Vérifiez la console (F12).');
      }
    }
  };

  const handleTestAsyncError = async () => {
    try {
      setTestResult('Test d\'erreur asynchrone lancé...');
      console.log('🚀 Lancement de l\'erreur asynchrone de test...');
      // Simule une erreur asynchrone
      await new Promise((_, reject) => {
        setTimeout(() => {
          const asyncError = new Error('Erreur asynchrone de test Sentry');
          console.log('🔍 Erreur asynchrone capturée:', asyncError);
          reject(asyncError);
        }, 100);
      });
    } catch (error) {
      console.log('🔍 Erreur asynchrone dans catch, envoi à Sentry...', error);
      try {
        captureException(error, {
          testPage: true,
          testType: 'async-error',
          timestamp: new Date().toISOString(),
        });
        console.log('✅ captureException (async) appelé avec succès');
        setTestResult('✅ Erreur asynchrone envoyée à Sentry ! Vérifiez votre dashboard Sentry et la console (F12).');
      } catch (sentryError) {
        console.error('❌ Erreur lors de l\'envoi à Sentry:', sentryError);
        setTestResult('❌ Erreur lors de l\'envoi à Sentry. Vérifiez la console (F12).');
      }
    }
  };

  const handleTestUnhandledError = () => {
    setTestResult('Test d\'erreur non gérée lancé...');
    // Cette erreur ne sera pas catchée par try/catch
    // mais sera capturée par le Error Boundary
    setTimeout(() => {
      // @ts-ignore - intentionnel pour tester
      window.nonExistentFunction();
    }, 100);
    setTestResult('⚠️ Erreur non gérée envoyée (elle devrait apparaître dans Sentry)');
  };

  const handleTestMessage = () => {
    setTestResult('Test de message lancé...');
    captureMessage('Message de test depuis la page Sentry Test', 'info');
    setTestResult('✅ Message info envoyé à Sentry !');
  };

  const handleTestWarningMessage = () => {
    setTestResult('Test de message warning lancé...');
    captureMessage('Message de warning de test', 'warning');
    setTestResult('✅ Message warning envoyé à Sentry !');
  };

  const handleSetUser = () => {
    setTestResult('Configuration utilisateur...');
    setUser({
      id: 'test-user-123',
      email: 'test@example.com',
      username: 'test-user',
    });
    setTestResult('✅ Utilisateur configuré dans Sentry !');
  };

  const handleSetTags = () => {
    setTestResult('Configuration tags...');
    setTag('environment', 'test');
    setTag('feature', 'sentry-test-page');
    setTag('version', '1.0.0');
    setTestResult('✅ Tags configurés ! Prochaines erreurs/messages incluront ces tags.');
  };

  const handleSetContext = () => {
    setTestResult('Configuration contexte...');
    setContext('testContext', {
      page: 'sentry-test',
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    });
    setTestResult('✅ Contexte configuré ! Prochaines erreurs/messages incluront ce contexte.');
  };

  const handleTestAPIError = async () => {
    try {
      setTestResult('Test d\'erreur API lancé...');
      // Test avec une route API qui lance une erreur
      const response = await fetch('/api/test-sentry-error');
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
    } catch (error) {
      captureException(error, {
        testPage: true,
        testType: 'api-error',
      });
      setTestResult('✅ Erreur API envoyée à Sentry !');
    }
  };

  if (!hasDsn) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            ⚠️ Sentry non configuré
          </h2>
          <p className="text-yellow-700 dark:text-yellow-300 mb-4">
            Pour activer Sentry, vous devez configurer les variables d&apos;environnement :
          </p>
          <ol className="list-decimal list-inside space-y-2 text-yellow-700 dark:text-yellow-300 mb-4">
            <li>Créez un compte sur <a href="https://sentry.io" target="_blank" rel="noopener noreferrer" className="underline">sentry.io</a> (plan gratuit disponible)</li>
            <li>Créez un nouveau projet Next.js dans Sentry</li>
            <li>Copiez votre DSN (Data Source Name)</li>
            <li>Ajoutez ces variables dans votre fichier <code className="bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded">.env.local</code> :
              <pre className="mt-2 bg-yellow-100 dark:bg-yellow-900 p-3 rounded text-sm overflow-x-auto">
{`SENTRY_DSN="https://xxxxx@xxxxx.ingest.sentry.io/xxxxx"
NEXT_PUBLIC_SENTRY_DSN="https://xxxxx@xxxxx.ingest.sentry.io/xxxxx"`}
              </pre>
            </li>
            <li>Redémarrez votre serveur de développement</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          🐛 Test Sentry
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Utilisez cette page pour tester l&apos;intégration Sentry et voir les événements apparaître dans votre dashboard Sentry.
        </p>
      </div>

      {testResult && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-blue-800 dark:text-blue-200">{testResult}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          ✅ Configuration Sentry
        </h2>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <strong>DSN configuré :</strong> {hasDsn ? '✅ Oui' : '❌ Non'}
          </p>
          <p>
            <strong>Sentry initialisé :</strong> {sentryInitialized ? '✅ Oui' : '⚠️ Non détecté'}
          </p>
          <p>
            <strong>Environnement :</strong> {process.env.NODE_ENV || 'development'}
          </p>
          {!sentryInitialized && hasDsn && (
            <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
              <p className="text-yellow-800 dark:text-yellow-200 text-xs">
                ⚠️ Sentry ne semble pas être initialisé. Vérifiez que <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">instrumentation-client.ts</code> est bien chargé. 
                Essayez de recharger la page ou vérifiez la console du navigateur.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tests d'erreurs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            🔴 Tests d&apos;erreurs
          </h2>
          <div className="space-y-3">
            <button
              onClick={handleTestError}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Erreur JavaScript
            </button>
            <button
              onClick={handleTestAsyncError}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Erreur Asynchrone
            </button>
            <button
              onClick={handleTestUnhandledError}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Erreur Non Gérée
            </button>
            <button
              onClick={handleTestAPIError}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Erreur API (côté serveur)
            </button>
          </div>
        </div>

        {/* Tests de messages */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            💬 Tests de messages
          </h2>
          <div className="space-y-3">
            <button
              onClick={handleTestMessage}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Message Info
            </button>
            <button
              onClick={handleTestWarningMessage}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Message Warning
            </button>
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            ⚙️ Configuration
          </h2>
          <div className="space-y-3">
            <button
              onClick={handleSetUser}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Définir Utilisateur
            </button>
            <button
              onClick={handleSetTags}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Définir Tags
            </button>
            <button
              onClick={handleSetContext}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Définir Contexte
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            📖 Comment voir les erreurs dans Sentry
          </h2>
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-2">1. Ouvrez votre dashboard Sentry :</p>
              <a 
                href="https://sentry.io/organizations/issues/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                🔗 Ouvrir Sentry Dashboard
              </a>
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-2">2. Où chercher :</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Dans la barre latérale gauche, cliquez sur <strong>&quot;Issues&quot;</strong> (ou &quot;Problèmes&quot;)</li>
                <li>Vous verrez une liste de toutes les erreurs capturées</li>
                <li>Cherchez l&apos;erreur avec le message : <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">&quot;Erreur de test Sentry - Ceci est une erreur...&quot;</code></li>
                <li>Cliquez sur l&apos;erreur pour voir les détails (stack trace, contexte, etc.)</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-2">3. Vérifiez aussi :</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>La console du navigateur (F12) - en développement, les événements sont aussi loggés ici</li>
                <li>L&apos;onglet <strong>&quot;Network&quot;</strong> - vous devriez voir une requête vers <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">sentry.io/api/.../store/</code></li>
                <li>Attendez 5-10 secondes si l&apos;erreur n&apos;apparaît pas immédiatement</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          💡 Comment vérifier que ça fonctionne
        </h2>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white mb-1">1. Vérifiez la console du navigateur :</p>
            <p className="ml-4">Ouvrez les outils de développement (F12 ou Cmd+Option+I), allez dans l&apos;onglet <strong>&quot;Console&quot;</strong>. Vous devriez voir des logs comme :</p>
            <pre className="mt-2 ml-4 bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs overflow-x-auto">
Sentry Event: {`{ type: 'error', ... }`}
</pre>
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white mb-1">2. Vérifiez l'onglet Network :</p>
            <p className="ml-4">Dans les outils de développement, allez dans l&apos;onglet <strong>&quot;Network&quot;</strong>, rafraîchissez, puis cliquez à nouveau sur un bouton. Vous devriez voir une requête vers <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">sentry.io/api/.../store/</code> avec un statut 200.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white mb-1">3. Dans Sentry Dashboard :</p>
            <p className="ml-4">Les événements peuvent prendre 5-10 secondes à apparaître. Si vous ne voyez rien après 30 secondes, vérifiez que votre DSN est correct dans <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">.env.local</code>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
