'use client';

import { useEffect } from 'react';
import { scrubSentryEvent } from '@/lib/utils/sentry-scrub';
import type { Integration } from '@sentry/core';
import * as Sentry from '@sentry/react';

type SentryInitProps = {
  enableReplay?: boolean;
};

/**
 * Initialise Sentry côté client uniquement après consentement errorMonitoring.
 */
export function SentryInit({ enableReplay = false }: SentryInitProps) {
  useEffect(() => {
    const sentryGlobal = typeof window !== 'undefined' ? (window as Window & { __SENTRY__?: { hub?: { getClient: () => unknown }; client?: unknown; getCurrentHub?: () => { getClient: () => unknown } } }).__SENTRY__ : null;

    let isAlreadyInitialized = false;

    if (sentryGlobal) {
      if (sentryGlobal.hub?.getClient() !== undefined) {
        isAlreadyInitialized = true;
      } else if (sentryGlobal.client !== undefined) {
        isAlreadyInitialized = true;
      } else if (sentryGlobal.getCurrentHub?.()?.getClient() !== undefined) {
        isAlreadyInitialized = true;
      } else if (Object.keys(sentryGlobal).length > 0) {
        isAlreadyInitialized = true;
      }
    }

    if (isAlreadyInitialized) {
      return;
    }

    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

    if (!dsn) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('NEXT_PUBLIC_SENTRY_DSN is not configured. Sentry disabled on client.');
      }
      return;
    }

    try {
      const integrations: Integration[] = [Sentry.browserTracingIntegration()];

      if (enableReplay) {
        integrations.push(
          Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
          })
        );
      }

      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        integrations,
        replaysSessionSampleRate: enableReplay && process.env.NODE_ENV === 'production' ? 0.1 : enableReplay ? 1.0 : 0,
        replaysOnErrorSampleRate: enableReplay ? 1.0 : 0,
        ignoreErrors: [
          'NetworkError',
          'Failed to fetch',
          'Network request failed',
          'ResizeObserver loop limit exceeded',
          'Non-Error promise rejection captured',
        ],
        beforeSend(event) {
          return scrubSentryEvent(event);
        },
      });
    } catch (error) {
      console.error('Sentry client initialization failed:', error);
    }
  }, [enableReplay]);

  return null;
}
