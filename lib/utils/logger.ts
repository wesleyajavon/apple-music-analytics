/**
 * Système de logging structuré pour l'application
 *
 * Fournit des méthodes de logging avec différents niveaux et contexte structuré.
 * Intègre Sentry pour le tracking d'erreurs en production.
 * Utilise lib/utils/sentry.ts pour éviter les problèmes d'import ESM avec @sentry/nextjs.
 */

import { captureException, captureMessage } from './sentry';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  private shouldLog(level: LogLevel): boolean {
    // En production, on peut filtrer les logs de debug
    const env = process.env.NODE_ENV || 'development';
    if (env === 'production' && level === 'debug') {
      return false;
    }
    return true;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));

      // Envoie les warnings à Sentry en production
      if (process.env.NODE_ENV === 'production') {
        captureMessage(message, 'warning');
      }
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, context));

      // Envoie les erreurs à Sentry
      if (context) {
        captureException(new Error(message), context);
      } else {
        captureMessage(message, 'error');
      }
    }
  }

  /**
   * Log une erreur avec son stack trace
   */
  errorWithStack(message: string, error: unknown, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
      error: error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
    };

    this.error(message, errorContext);

    // Envoie l'erreur à Sentry avec le contexte
    captureException(
      error instanceof Error ? error : new Error(String(error)),
      context
    );
  }
}

export const logger = new Logger();






