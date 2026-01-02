import { NextRequest } from "next/server";
import { createValidationError } from "@/lib/utils/error-handler";
import {
  validateOptionalDateRange,
  validateRequiredDateRange,
  validateDateRangeWithDefaults,
  validateOptionalDate,
  validatePeriod,
  validateOptionalInteger,
  validateRequiredInteger,
  validateOptionalFloat,
  validateOptionalUserId,
} from "@/lib/validators/api-validators";

/**
 * Type helper pour vérifier si une valeur est une erreur
 */
function isError<T>(value: T | { error: string }): value is { error: string } {
  return typeof value === "object" && value !== null && "error" in value;
}

/**
 * Extrait et valide une plage de dates optionnelle depuis les query parameters
 * Lance une erreur de validation si les dates sont invalides
 * 
 * @param request - Request Next.js
 * @returns Objet avec start et end dates (optionnelles)
 */
export function extractOptionalDateRange(request: NextRequest): {
  startDate?: Date;
  endDate?: Date;
} {
  const { searchParams } = new URL(request.url);
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  const result = validateOptionalDateRange(startDateParam, endDateParam);
  if (!result.success) {
    throw createValidationError(result.error, {
      startDate: startDateParam,
      endDate: endDateParam,
    });
  }

  return {
    startDate: result.start,
    endDate: result.end,
  };
}

/**
 * Extrait et valide une plage de dates requise depuis les query parameters
 * Lance une erreur de validation si les dates sont manquantes ou invalides
 * 
 * @param request - Request Next.js
 * @returns Objet avec start et end dates (toujours définies)
 */
export function extractRequiredDateRange(request: NextRequest): {
  startDate: Date;
  endDate: Date;
} {
  const { searchParams } = new URL(request.url);
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  const result = validateRequiredDateRange(startDateParam, endDateParam);
  if (!result.success) {
    throw createValidationError(result.error, {
      startDate: startDateParam,
      endDate: endDateParam,
    });
  }

  return {
    startDate: result.start,
    endDate: result.end,
  };
}

/**
 * Extrait et valide une plage de dates avec valeurs par défaut depuis les query parameters
 * Lance une erreur de validation si les dates sont invalides
 * 
 * @param request - Request Next.js
 * @param defaultStartDate - Date de début par défaut
 * @param defaultEndDate - Date de fin par défaut
 * @returns Objet avec start et end dates (toujours définies)
 */
export function extractDateRangeWithDefaults(
  request: NextRequest,
  defaultStartDate: Date,
  defaultEndDate: Date
): {
  startDate: Date;
  endDate: Date;
} {
  const { searchParams } = new URL(request.url);
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  const result = validateDateRangeWithDefaults(
    startDateParam,
    endDateParam,
    defaultStartDate,
    defaultEndDate
  );
  if (!result.success) {
    throw createValidationError(result.error, {
      startDate: startDateParam,
      endDate: endDateParam,
    });
  }

  return {
    startDate: result.start,
    endDate: result.end,
  };
}

/**
 * Extrait et valide une date optionnelle depuis les query parameters
 * 
 * @param request - Request Next.js
 * @param paramName - Nom du paramètre (default: "date")
 * @returns Date ou undefined
 */
export function extractOptionalDate(
  request: NextRequest,
  paramName: string = "date"
): Date | undefined {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get(paramName);

  const result = validateOptionalDate(dateParam);
  if (isError(result)) {
    throw createValidationError(result.error, { [paramName]: dateParam });
  }

  return result;
}

/**
 * Extrait et valide une période depuis les query parameters
 * 
 * @param request - Request Next.js
 * @param defaultValue - Valeur par défaut (default: "day")
 * @returns Période validée
 */
export function extractPeriod(
  request: NextRequest,
  defaultValue: "day" | "week" | "month" = "day"
): "day" | "week" | "month" {
  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period");

  const result = validatePeriod(periodParam, defaultValue);
  if (isError(result)) {
    throw createValidationError(result.error, { period: periodParam });
  }

  return result;
}

/**
 * Extrait et valide un entier optionnel depuis les query parameters
 * 
 * @param request - Request Next.js
 * @param paramName - Nom du paramètre
 * @param options - Options de validation
 * @returns Entier ou undefined
 */
export function extractOptionalInteger(
  request: NextRequest,
  paramName: string,
  options: {
    min?: number;
    max?: number;
    errorMessage?: string;
  } = {}
): number | undefined {
  const { searchParams } = new URL(request.url);
  const intParam = searchParams.get(paramName);

  const result = validateOptionalInteger(intParam, options);
  if (isError(result)) {
    throw createValidationError(
      result.error,
      { [paramName]: intParam }
    );
  }

  return result;
}

/**
 * Extrait et valide un entier requis depuis les query parameters
 * 
 * @param request - Request Next.js
 * @param paramName - Nom du paramètre
 * @param options - Options de validation
 * @returns Entier
 */
export function extractRequiredInteger(
  request: NextRequest,
  paramName: string,
  options: {
    min?: number;
    max?: number;
    errorMessage?: string;
  } = {}
): number {
  const { searchParams } = new URL(request.url);
  const intParam = searchParams.get(paramName);

  const result = validateRequiredInteger(intParam, options);
  if (isError(result)) {
    throw createValidationError(
      result.error,
      { [paramName]: intParam }
    );
  }

  return result;
}

/**
 * Extrait et valide un nombre décimal optionnel depuis les query parameters
 * 
 * @param request - Request Next.js
 * @param paramName - Nom du paramètre
 * @param options - Options de validation
 * @returns Nombre ou undefined
 */
export function extractOptionalFloat(
  request: NextRequest,
  paramName: string,
  options: {
    min?: number;
    max?: number;
    errorMessage?: string;
  } = {}
): number | undefined {
  const { searchParams } = new URL(request.url);
  const floatParam = searchParams.get(paramName);

  const result = validateOptionalFloat(floatParam, options);
  if (isError(result)) {
    throw createValidationError(
      result.error,
      { [paramName]: floatParam }
    );
  }

  return result;
}

/**
 * Extrait et valide un userId optionnel depuis les query parameters
 * 
 * @param request - Request Next.js
 * @returns userId ou undefined
 */
export function extractOptionalUserId(request: NextRequest): string | undefined {
  const { searchParams } = new URL(request.url);
  const userIdParam = searchParams.get("userId");

  return validateOptionalUserId(userIdParam);
}

/**
 * Extrait un paramètre string optionnel depuis les query parameters
 * 
 * @param request - Request Next.js
 * @param paramName - Nom du paramètre
 * @returns String ou undefined
 */
export function extractOptionalString(
  request: NextRequest,
  paramName: string
): string | undefined {
  const { searchParams } = new URL(request.url);
  return searchParams.get(paramName) || undefined;
}




