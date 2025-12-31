import { createValidationError } from "@/lib/utils/error-handler";

/**
 * Options pour la validation d'une plage de dates
 */
export interface DateRangeOptions {
  /**
   * Si true, les dates sont requises
   * Si false, les dates sont optionnelles
   */
  required?: boolean;
  /**
   * Date de début par défaut si non fournie
   */
  defaultStartDate?: Date;
  /**
   * Date de fin par défaut si non fournie
   */
  defaultEndDate?: Date;
}

/**
 * Résultat de la validation d'une plage de dates optionnelle
 */
export type OptionalDateRangeResult =
  | { success: true; start?: Date; end?: Date }
  | { success: false; error: string };

/**
 * Résultat de la validation d'une plage de dates requise
 */
export type RequiredDateRangeResult =
  | { success: true; start: Date; end: Date }
  | { success: false; error: string };

/**
 * Valide une plage de dates optionnelle depuis les query parameters
 * 
 * @param startDateParam - Valeur du paramètre startDate (peut être null)
 * @param endDateParam - Valeur du paramètre endDate (peut être null)
 * @returns Résultat de validation avec dates parsées ou erreur
 * 
 * @example
 * ```typescript
 * const result = validateOptionalDateRange(startDate, endDate);
 * if (!result.success) {
 *   throw createValidationError(result.error);
 * }
 * const { start, end } = result; // start et end peuvent être undefined
 * ```
 */
export function validateOptionalDateRange(
  startDateParam: string | null,
  endDateParam: string | null
): OptionalDateRangeResult {
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (startDateParam) {
    startDate = new Date(startDateParam);
    if (isNaN(startDate.getTime())) {
      return {
        success: false,
        error: "Invalid startDate format. Use ISO 8601 format (YYYY-MM-DD)",
      };
    }
  }

  if (endDateParam) {
    endDate = new Date(endDateParam);
    if (isNaN(endDate.getTime())) {
      return {
        success: false,
        error: "Invalid endDate format. Use ISO 8601 format (YYYY-MM-DD)",
      };
    }
  }

  return {
    success: true,
    start: startDate,
    end: endDate,
  };
}

/**
 * Valide une plage de dates requise depuis les query parameters
 * 
 * @param startDateParam - Valeur du paramètre startDate (peut être null)
 * @param endDateParam - Valeur du paramètre endDate (peut être null)
 * @returns Résultat de validation avec dates parsées ou erreur
 * 
 * @example
 * ```typescript
 * const result = validateRequiredDateRange(startDate, endDate);
 * if (!result.success) {
 *   throw createValidationError(result.error);
 * }
 * const { start, end } = result; // start et end sont garantis d'être définis
 * ```
 */
export function validateRequiredDateRange(
  startDateParam: string | null,
  endDateParam: string | null
): RequiredDateRangeResult {
  if (!startDateParam || !endDateParam) {
    return {
      success: false,
      error: "startDate and endDate are required",
    };
  }

  const startDate = new Date(startDateParam);
  const endDate = new Date(endDateParam);

  if (isNaN(startDate.getTime())) {
    return {
      success: false,
      error: "Invalid startDate format. Use ISO 8601 format (YYYY-MM-DD)",
    };
  }

  if (isNaN(endDate.getTime())) {
    return {
      success: false,
      error: "Invalid endDate format. Use ISO 8601 format (YYYY-MM-DD)",
    };
  }

  return {
    success: true,
    start: startDate,
    end: endDate,
  };
}

/**
 * Valide une plage de dates avec valeurs par défaut
 * 
 * @param startDateParam - Valeur du paramètre startDate (peut être null)
 * @param endDateParam - Valeur du paramètre endDate (peut être null)
 * @param defaultStartDate - Date de début par défaut
 * @param defaultEndDate - Date de fin par défaut
 * @returns Résultat de validation avec dates parsées ou erreur
 * 
 * @example
 * ```typescript
 * const result = validateDateRangeWithDefaults(
 *   startDate, 
 *   endDate,
 *   new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
 *   new Date()
 * );
 * if (!result.success) {
 *   throw createValidationError(result.error);
 * }
 * const { start, end } = result; // start et end sont toujours définis
 * ```
 */
export function validateDateRangeWithDefaults(
  startDateParam: string | null,
  endDateParam: string | null,
  defaultStartDate: Date,
  defaultEndDate: Date
): RequiredDateRangeResult {
  const startDate = startDateParam ? new Date(startDateParam) : defaultStartDate;
  const endDate = endDateParam ? new Date(endDateParam) : defaultEndDate;

  if (isNaN(startDate.getTime())) {
    return {
      success: false,
      error: "Invalid startDate format. Use ISO 8601 format (YYYY-MM-DD)",
    };
  }

  if (isNaN(endDate.getTime())) {
    return {
      success: false,
      error: "Invalid endDate format. Use ISO 8601 format (YYYY-MM-DD)",
    };
  }

  return {
    success: true,
    start: startDate,
    end: endDate,
  };
}

/**
 * Valide une date optionnelle
 * 
 * @param dateParam - Valeur du paramètre date (peut être null)
 * @returns Date parsée ou undefined, ou erreur
 */
export function validateOptionalDate(
  dateParam: string | null
): Date | undefined | { error: string } {
  if (!dateParam) {
    return undefined;
  }

  const date = new Date(dateParam);
  if (isNaN(date.getTime())) {
    return {
      error: `Invalid date format. Use ISO 8601 format (YYYY-MM-DD)`,
    };
  }

  return date;
}

/**
 * Valide une période d'agrégation
 * 
 * @param periodParam - Valeur du paramètre period (peut être null)
 * @param defaultValue - Valeur par défaut si non fournie
 * @returns Période validée ou erreur
 */
export function validatePeriod(
  periodParam: string | null,
  defaultValue: "day" | "week" | "month" = "day"
): "day" | "week" | "month" | { error: string } {
  const period = (periodParam || defaultValue) as string;

  if (!["day", "week", "month"].includes(period)) {
    return {
      error: "Invalid period. Must be 'day', 'week', or 'month'",
    };
  }

  return period as "day" | "week" | "month";
}

/**
 * Valide un entier optionnel
 * 
 * @param intParam - Valeur du paramètre (peut être null)
 * @param options - Options de validation
 * @returns Entier parsé ou undefined, ou erreur
 */
export function validateOptionalInteger(
  intParam: string | null,
  options: {
    min?: number;
    max?: number;
    errorMessage?: string;
  } = {}
): number | undefined | { error: string } {
  if (!intParam) {
    return undefined;
  }

  const value = parseInt(intParam, 10);
  if (isNaN(value)) {
    return {
      error: options.errorMessage || `Invalid integer: ${intParam}`,
    };
  }

  if (options.min !== undefined && value < options.min) {
    return {
      error: options.errorMessage || `Value must be >= ${options.min}`,
    };
  }

  if (options.max !== undefined && value > options.max) {
    return {
      error: options.errorMessage || `Value must be <= ${options.max}`,
    };
  }

  return value;
}

/**
 * Valide un entier requis
 * 
 * @param intParam - Valeur du paramètre (peut être null)
 * @param options - Options de validation
 * @returns Entier parsé ou erreur
 */
export function validateRequiredInteger(
  intParam: string | null,
  options: {
    min?: number;
    max?: number;
    errorMessage?: string;
  } = {}
): number | { error: string } {
  if (!intParam) {
    return {
      error: options.errorMessage || "Integer parameter is required",
    };
  }

  const value = parseInt(intParam, 10);
  if (isNaN(value)) {
    return {
      error: options.errorMessage || `Invalid integer: ${intParam}`,
    };
  }

  if (options.min !== undefined && value < options.min) {
    return {
      error: options.errorMessage || `Value must be >= ${options.min}`,
    };
  }

  if (options.max !== undefined && value > options.max) {
    return {
      error: options.errorMessage || `Value must be <= ${options.max}`,
    };
  }

  return value;
}

/**
 * Valide un nombre décimal optionnel
 * 
 * @param floatParam - Valeur du paramètre (peut être null)
 * @param options - Options de validation
 * @returns Nombre parsé ou undefined, ou erreur
 */
export function validateOptionalFloat(
  floatParam: string | null,
  options: {
    min?: number;
    max?: number;
    errorMessage?: string;
  } = {}
): number | undefined | { error: string } {
  if (!floatParam) {
    return undefined;
  }

  const value = parseFloat(floatParam);
  if (isNaN(value)) {
    return {
      error: options.errorMessage || `Invalid number: ${floatParam}`,
    };
  }

  if (options.min !== undefined && value < options.min) {
    return {
      error: options.errorMessage || `Value must be >= ${options.min}`,
    };
  }

  if (options.max !== undefined && value > options.max) {
    return {
      error: options.errorMessage || `Value must be <= ${options.max}`,
    };
  }

  return value;
}

/**
 * Valide un userId optionnel
 * 
 * @param userIdParam - Valeur du paramètre userId (peut être null)
 * @returns userId ou undefined
 */
export function validateOptionalUserId(
  userIdParam: string | null
): string | undefined {
  return userIdParam || undefined;
}

