'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { captureException, captureMessage, setUser, setTag, setContext } from '@/lib/utils/sentry';
import { RateLimitHealthWidget } from '@/lib/components/rate-limit-health-widget';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
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
  const t = useTranslations("sentry-test");
  const [testResult, setTestResult] = useState<string>('');
  const hasDsn = !!process.env.NEXT_PUBLIC_SENTRY_DSN;
  const [sentryInitialized, setSentryInitialized] = useState(false);
  const [isAdminResolved, setIsAdminResolved] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = createSupabaseBrowserClient();
    const allowedAdminUserIds = (process.env.NEXT_PUBLIC_ADMIN_USER_IDS ?? '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    async function resolveAdmin() {
      try {
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id ?? null;
        const allowed = !!userId && allowedAdminUserIds.includes(userId);
        if (!mounted) return;
        setIsAdminUser(allowed);
      } finally {
        if (mounted) setIsAdminResolved(true);
      }
    }

    resolveAdmin();
    return () => {
      mounted = false;
    };
  }, []);

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
      setTestResult(t("results.errorTestLaunched"));
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
        setTestResult(t("results.errorSent"));
      } catch (sentryError) {
        console.error('❌ Erreur lors de l\'envoi à Sentry:', sentryError);
        setTestResult(t("results.errorSendFailed"));
      }
    }
  };

  const handleTestAsyncError = async () => {
    try {
      setTestResult(t("results.asyncTestLaunched"));
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
        setTestResult(t("results.asyncSent"));
      } catch (sentryError) {
        console.error('❌ Erreur lors de l\'envoi à Sentry:', sentryError);
        setTestResult(t("results.errorSendFailed"));
      }
    }
  };

  const handleTestUnhandledError = () => {
    setTestResult(t("results.unhandledLaunched"));
    // Cette erreur ne sera pas catchée par try/catch
    // mais sera capturée par le Error Boundary
    setTimeout(() => {
      // @ts-ignore - intentionnel pour tester
      window.nonExistentFunction();
    }, 100);
    setTestResult(t("results.unhandledSent"));
  };

  const handleTestMessage = () => {
    setTestResult(t("results.messageTestLaunched"));
    captureMessage('Message de test depuis la page Sentry Test', 'info');
    setTestResult(t("results.messageInfoSent"));
  };

  const handleTestWarningMessage = () => {
    setTestResult(t("results.warningTestLaunched"));
    captureMessage('Message de warning de test', 'warning');
    setTestResult(t("results.messageWarningSent"));
  };

  const handleSetUser = () => {
    setTestResult(t("results.configuringUser"));
    setUser({
      id: 'test-user-123',
      email: 'test@example.com',
      username: 'test-user',
    });
    setTestResult(t("results.userConfigured"));
  };

  const handleSetTags = () => {
    setTestResult(t("results.configuringTags"));
    setTag('environment', 'test');
    setTag('feature', 'sentry-test-page');
    setTag('version', '1.0.0');
    setTestResult(t("results.tagsConfigured"));
  };

  const handleSetContext = () => {
    setTestResult(t("results.configuringContext"));
    setContext('testContext', {
      page: 'sentry-test',
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    });
    setTestResult(t("results.contextConfigured"));
  };

  const handleTestAPIError = async () => {
    try {
      setTestResult(t("results.apiTestLaunched"));
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
      setTestResult(t("results.apiSent"));
    }
  };

  if (!hasDsn) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🐛 {t("title")}
          </h1>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
            Outil de debug
          </span>
        </div>
        <div className="rounded-xl border-l-4 border-l-amber-500 bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 shadow-card p-6">
          <h2 className="text-xl font-semibold text-amber-800 dark:text-amber-200 mb-2">
            ⚠️ {t("notConfigured")}
          </h2>
          <p className="text-amber-700 dark:text-amber-300 mb-4 leading-relaxed">
            {t("configInstructions")}
          </p>
          <ol className="list-decimal list-inside space-y-2 text-amber-700 dark:text-amber-300 mb-4">
            <li>{t("step1")} — <a href="https://sentry.io" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-900 dark:hover:text-amber-100">sentry.io</a></li>
            <li>{t("step2")}</li>
            <li>{t("step3")}</li>
            <li>{t("step4")} :
              <pre className="mt-2 bg-amber-100/80 dark:bg-amber-900/40 p-3 rounded-lg text-sm overflow-x-auto font-mono">
{`SENTRY_DSN="https://xxxxx@xxxxx.ingest.sentry.io/xxxxx"
NEXT_PUBLIC_SENTRY_DSN="https://xxxxx@xxxxx.ingest.sentry.io/xxxxx"`}
              </pre>
            </li>
            <li>{t("step5")}</li>
          </ol>
        </div>
      </div>
    );
  }

  if (process.env.NODE_ENV === "production" && !isAdminResolved) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-card">
          <p className="text-gray-700 dark:text-gray-300">Vérification des droits admin...</p>
        </div>
      </div>
    );
  }

  if (process.env.NODE_ENV === "production" && !isAdminUser) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="rounded-xl border-l-4 border-l-red-500 bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-800 shadow-card p-6">
          <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
            Accès refusé
          </h2>
          <p className="text-red-700 dark:text-red-300">
            Cette page est réservée aux administrateurs en production.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          🐛 {t("title")}
        </h1>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-accent-violet/10 dark:bg-accent-violet/20 text-accent-violet border border-accent-violet/20">
          Outil de debug
        </span>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {t("subtitle")}
      </p>

      <RateLimitHealthWidget />

      {testResult && (
        <div className="mb-6 p-4 rounded-xl border-l-4 border-accent-cyan bg-accent-cyan/10 dark:bg-accent-cyan/20 border border-accent-cyan/20 shadow-card">
          <p className="text-gray-800 dark:text-gray-200">{testResult}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card p-6 mb-6 border-l-4 border-l-accent-emerald hover:shadow-card-hover transition-shadow">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          ✅ {t("sentryConfig")}
        </h2>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <strong>{t("dsnConfigured")}</strong> {hasDsn ? `✅ ${t("yes")}` : `❌ ${t("no")}`}
          </p>
          <p>
            <strong>{t("sentryInitialized")}</strong> {sentryInitialized ? `✅ ${t("yes")}` : `⚠️ ${t("notDetected")}`}
          </p>
          <p>
            <strong>{t("environment")}</strong> {process.env.NODE_ENV || 'development'}
          </p>
          {!sentryInitialized && hasDsn && (
            <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-amber-800 dark:text-amber-200 text-xs">
                ⚠️ {t("sentryNotInitWarning")}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tests d'erreurs */}
        <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card p-6 border-l-4 border-l-accent-rose hover:shadow-card-hover transition-shadow">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            🔴 {t("errorTests")}
          </h2>
          <div className="space-y-3">
            <button
              onClick={handleTestError}
              className="w-full bg-accent-rose hover:bg-accent-rose/90 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {t("jsError")}
            </button>
            <button
              onClick={handleTestAsyncError}
              className="w-full bg-accent-rose hover:bg-accent-rose/90 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {t("asyncError")}
            </button>
            <button
              onClick={handleTestUnhandledError}
              className="w-full bg-accent-rose hover:bg-accent-rose/90 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {t("unhandledError")}
            </button>
            <button
              onClick={handleTestAPIError}
              className="w-full bg-accent-rose hover:bg-accent-rose/90 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {t("apiError")}
            </button>
          </div>
        </div>

        {/* Tests de messages */}
        <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card p-6 border-l-4 border-l-accent-cyan hover:shadow-card-hover transition-shadow">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            💬 {t("messageTests")}
          </h2>
          <div className="space-y-3">
            <button
              onClick={handleTestMessage}
              className="w-full bg-accent-cyan hover:bg-accent-cyan/90 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {t("messageInfo")}
            </button>
            <button
              onClick={handleTestWarningMessage}
              className="w-full bg-accent-indigo hover:bg-accent-indigo/90 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {t("messageWarning")}
            </button>
          </div>
        </div>

        {/* Configuration */}
        <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card p-6 border-l-4 border-l-accent-emerald hover:shadow-card-hover transition-shadow">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            ⚙️ {t("configuration")}
          </h2>
          <div className="space-y-3">
            <button
              onClick={handleSetUser}
              className="w-full bg-accent-emerald hover:bg-accent-emerald/90 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {t("setUser")}
            </button>
            <button
              onClick={handleSetTags}
              className="w-full bg-accent-indigo hover:bg-accent-indigo/90 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {t("setTags")}
            </button>
            <button
              onClick={handleSetContext}
              className="w-full bg-accent-emerald hover:bg-accent-emerald/90 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {t("setContext")}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card p-6 border-l-4 border-l-accent-indigo hover:shadow-card-hover transition-shadow">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            📖 {t("howToSeeErrors")}
          </h2>
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-2">1. {t("openDashboardPrompt")}</p>
              <a 
                href="https://sentry.io/organizations/issues/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-block bg-accent-indigo hover:bg-accent-indigo/90 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                🔗 {t("openDashboard")}
              </a>
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white mb-2">2. {t("whereToLook")}</p>
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

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card p-6 border-l-4 border-l-accent-violet hover:shadow-card-hover transition-shadow">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          💡 {t("howToVerify")}
        </h2>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white mb-1">1. Vérifiez la console du navigateur :</p>
            <p className="ml-4">Ouvrez les outils de développement (F12 ou Cmd+Option+I), allez dans l&apos;onglet <strong>&quot;Console&quot;</strong>. Vous devriez voir des logs comme :</p>
            <pre className="mt-2 ml-4 bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-xs overflow-x-auto font-mono">
Sentry Event: {`{ type: 'error', ... }`}
</pre>
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white mb-1">2. Vérifiez l&apos;onglet Network :</p>
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
