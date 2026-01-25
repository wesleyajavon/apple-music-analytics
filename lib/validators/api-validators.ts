/**
 * Validateurs pour les paramètres d'API
 */

/**
 * Résultat de validation pour les plages de dates
 */
type DateRangeResult =
  | { success: true; start?: Date; end?: Date }
  | { success: false; error: string };

/**
 * Résultat de validation pour les plages de dates avec valeurs par défaut
 */
type DateRangeWithDefaultsResult =
  | { success: true; start: Date; end: Date }
  | { success: false; error: string };

/**
 * Valide une plage de dates optionnelle
 */
export function validateOptionalDateRange(
  startDateParam: string | null,
  endDateParam: string | null
): DateRangeResult {
  if (!startDateParam && !endDateParam) {
    return { success: true };
  }

  if ((startDateParam && !endDateParam) || (!startDateParam && endDateParam)) {
    return {
      success: false,
      error: "Les deux paramètres startDate et endDate doivent être fournis ensemble",
    };
  }

  const startDate = startDateParam ? new Date(startDateParam) : undefined;
  const endDate = endDateParam ? new Date(endDateParam) : undefined;

  if (startDate && isNaN(startDate.getTime())) {
    return {
      success: false,
      error: `Date de début invalide: ${startDateParam}`,
    };
  }

  if (endDate && isNaN(endDate.getTime())) {
    return {
      success: false,
      error: `Date de fin invalide: ${endDateParam}`,
    };
  }

  if (startDate && endDate && startDate > endDate) {
    return {
      success: false,
      error: "La date de début doit être antérieure à la date de fin",
    };
  }

  return { success: true, start: startDate, end: endDate };
}

/**
 * Valide une plage de dates requise
 */
export function validateRequiredDateRange(
  startDateParam: string | null,
  endDateParam: string | null
): DateRangeWithDefaultsResult {
  if (!startDateParam || !endDateParam) {
    return {
      success: false,
      error: "Les paramètres startDate et endDate sont requis",
    };
  }

  const startDate = new Date(startDateParam);
  const endDate = new Date(endDateParam);

  if (isNaN(startDate.getTime())) {
    return {
      success: false,
      error: `Date de début invalide: ${startDateParam}`,
    };
  }

  if (isNaN(endDate.getTime())) {
    return {
      success: false,
      error: `Date de fin invalide: ${endDateParam}`,
    };
  }

  if (startDate > endDate) {
    return {
      success: false,
      error: "La date de début doit être antérieure à la date de fin",
    };
  }

  return { success: true, start: startDate, end: endDate };
}

/**
 * Valide une plage de dates avec valeurs par défaut
 */
export function validateDateRangeWithDefaults(
  startDateParam: string | null,
  endDateParam: string | null,
  defaultStartDate: Date,
  defaultEndDate: Date
): DateRangeWithDefaultsResult {
  if (!startDateParam && !endDateParam) {
    return { success: true, start: defaultStartDate, end: defaultEndDate };
  }

  if ((startDateParam && !endDateParam) || (!startDateParam && endDateParam)) {
    return {
      success: false,
      error: "Les deux paramètres startDate et endDate doivent être fournis ensemble",
    };
  }

  const startDate = startDateParam ? new Date(startDateParam) : defaultStartDate;
  const endDate = endDateParam ? new Date(endDateParam) : defaultEndDate;

  if (isNaN(startDate.getTime())) {
    return {
      success: false,
      error: `Date de début invalide: ${startDateParam}`,
    };
  }

  if (isNaN(endDate.getTime())) {
    return {
      success: false,
      error: `Date de fin invalide: ${endDateParam}`,
    };
  }

  if (startDate > endDate) {
    return {
      success: false,
      error: "La date de début doit être antérieure à la date de fin",
    };
  }

  return { success: true, start: startDate, end: endDate };
}

/**
 * Valide une date optionnelle
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
      error: `Date invalide: ${dateParam}`,
    };
  }

  return date;
}

/**
 * Valide une période (day, week, month)
 */
export function validatePeriod(
  periodParam: string | null,
  defaultValue: "day" | "week" | "month" = "day"
): "day" | "week" | "month" | { error: string } {
  if (!periodParam) {
    return defaultValue;
  }

  const validPeriods = ["day", "week", "month"] as const;
  if (!validPeriods.includes(periodParam as typeof validPeriods[number])) {
    return {
      error: `Période invalide: ${periodParam}. Valeurs acceptées: ${validPeriods.join(", ")}`,
    };
  }

  return periodParam as "day" | "week" | "month";
}

/**
 * Options de validation pour les nombres
 */
export interface NumberValidationOptions {
  min?: number;
  max?: number;
  errorMessage?: string;
}

/**
 * Valide un entier optionnel
 */
export function validateOptionalInteger(
  intParam: string | null,
  options: NumberValidationOptions = {}
): number | undefined | { error: string } {
  if (!intParam) {
    return undefined;
  }

  const num = parseInt(intParam, 10);
  if (isNaN(num)) {
    return {
      error: options.errorMessage || `Entier invalide: ${intParam}`,
    };
  }

  if (options.min !== undefined && num < options.min) {
    return {
      error: options.errorMessage || `La valeur doit être supérieure ou égale à ${options.min}`,
    };
  }

  if (options.max !== undefined && num > options.max) {
    return {
      error: options.errorMessage || `La valeur doit être inférieure ou égale à ${options.max}`,
    };
  }

  return num;
}

/**
 * Valide un entier requis
 */
export function validateRequiredInteger(
  intParam: string | null,
  options: NumberValidationOptions = {}
): number | { error: string } {
  if (!intParam) {
    return {
      error: options.errorMessage || "Paramètre requis",
    };
  }

  const num = parseInt(intParam, 10);
  if (isNaN(num)) {
    return {
      error: options.errorMessage || `Entier invalide: ${intParam}`,
    };
  }

  if (options.min !== undefined && num < options.min) {
    return {
      error: options.errorMessage || `La valeur doit être supérieure ou égale à ${options.min}`,
    };
  }

  if (options.max !== undefined && num > options.max) {
    return {
      error: options.errorMessage || `La valeur doit être inférieure ou égale à ${options.max}`,
    };
  }

  return num;
}

/**
 * Valide un nombre décimal optionnel
 */
export function validateOptionalFloat(
  floatParam: string | null,
  options: NumberValidationOptions = {}
): number | undefined | { error: string } {
  if (!floatParam) {
    return undefined;
  }

  const num = parseFloat(floatParam);
  if (isNaN(num)) {
    return {
      error: options.errorMessage || `Nombre invalide: ${floatParam}`,
    };
  }

  if (options.min !== undefined && num < options.min) {
    return {
      error: options.errorMessage || `La valeur doit être supérieure ou égale à ${options.min}`,
    };
  }

  if (options.max !== undefined && num > options.max) {
    return {
      error: options.errorMessage || `La valeur doit être inférieure ou égale à ${options.max}`,
    };
  }

  return num;
}

/**
 * Valide un userId optionnel
 */
export function validateOptionalUserId(
  userIdParam: string | null
): string | undefined {
  if (!userIdParam || userIdParam.trim() === "") {
    return undefined;
  }

  return userIdParam.trim();
}