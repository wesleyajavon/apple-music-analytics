import { NextResponse } from "next/server";
import { logger } from "./logger";

/**
 * Classe d'erreur personnalisée pour l'application
 * Permet de distinguer les erreurs client (400) des erreurs serveur (500)
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    // Maintient le stack trace correct pour le debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Codes d'erreur standardisés
 */
export const ErrorCodes = {
  // Erreurs de validation (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_DATE_FORMAT: 'INVALID_DATE_FORMAT',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Erreurs d'authentification (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  
  // Erreurs de permissions (403)
  FORBIDDEN: 'FORBIDDEN',
  
  // Erreurs de ressource non trouvée (404)
  NOT_FOUND: 'NOT_FOUND',
  
  // Erreurs serveur (500)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
} as const;

/**
 * Helpers pour créer des erreurs courantes
 */
export const createValidationError = (
  message: string,
  details?: unknown
): AppError => {
  return new AppError(400, message, ErrorCodes.VALIDATION_ERROR, details);
};

export const createNotFoundError = (
  message: string = 'Resource not found',
  details?: unknown
): AppError => {
  return new AppError(404, message, ErrorCodes.NOT_FOUND, details);
};

export const createInternalError = (
  message: string = 'Internal server error',
  details?: unknown
): AppError => {
  return new AppError(500, message, ErrorCodes.INTERNAL_SERVER_ERROR, details);
};

/**
 * Gère les erreurs dans les routes API
 * 
 * @param error - L'erreur à gérer (peut être AppError, Error, ou unknown)
 * @param context - Contexte additionnel pour le logging (ex: route, userId)
 * @returns NextResponse avec le format d'erreur approprié
 */
export function handleApiError(
  error: unknown,
  context?: { route?: string; userId?: string; [key: string]: unknown }
): NextResponse {
  // Si c'est une AppError, on la retourne directement
  if (error instanceof AppError) {
    // Log seulement les erreurs serveur (500+) en production
    if (error.statusCode >= 500) {
      logger.errorWithStack(
        `API Error [${error.statusCode}]: ${error.message}`,
        error,
        {
          code: error.code,
          details: error.details,
          ...context,
        }
      );
    } else {
      // Log les erreurs client en debug/info
      logger.warn(`API Error [${error.statusCode}]: ${error.message}`, {
        code: error.code,
        details: error.details,
        ...context,
      });
    }

    const responseBody: {
      error: string;
      code?: string;
      details?: unknown;
    } = {
      error: error.message,
    };

    if (error.code) {
      responseBody.code = error.code;
    }

    if (error.details !== undefined) {
      responseBody.details = error.details;
    }

    return NextResponse.json(responseBody, { status: error.statusCode });
  }

  // Erreur inattendue - logging structuré
  logger.errorWithStack(
    'Unexpected error in API route',
    error,
    context
  );

  // Ne pas exposer les détails de l'erreur en production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const errorMessage = isDevelopment && error instanceof Error
    ? error.message
    : 'Internal server error';

  return NextResponse.json(
    {
      error: errorMessage,
      code: ErrorCodes.INTERNAL_SERVER_ERROR,
      ...(isDevelopment && error instanceof Error && { stack: error.stack }),
    },
    { status: 500 }
  );
}

