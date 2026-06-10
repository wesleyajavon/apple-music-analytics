/**
 * Classe d'erreur personnalisée pour les erreurs API côté client
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown,
    public rateLimit?: ParsedRateLimitHeaders
  ) {
    super(message);
    this.name = 'ApiError';
    // Maintient le stack trace correct pour le debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

/**
 * Options de configuration pour les requêtes API
 */
export interface ApiRequestOptions extends RequestInit {
  timeout?: number; // Timeout en millisecondes (défaut: 10000)
  retries?: number; // Nombre de tentatives (défaut: 3)
}

export type ApiSuccess<T> = {
  data: T;
  rateLimit?: ParsedRateLimitHeaders;
};

export type ParsedRateLimitHeaders = {
  limit?: number;
  remaining?: number;
  resetAt?: Date;
  retryAfterSeconds?: number;
};

function parseOptionalInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Parse rate limit headers exposed by API routes.
 * - X-RateLimit-Limit
 * - X-RateLimit-Remaining
 * - X-RateLimit-Reset (unix seconds)
 * - Retry-After (seconds)
 */
export function parseRateLimitHeaders(headers: Headers): ParsedRateLimitHeaders {
  const limit = parseOptionalInt(headers.get("X-RateLimit-Limit"));
  const remaining = parseOptionalInt(headers.get("X-RateLimit-Remaining"));
  const resetUnix = parseOptionalInt(headers.get("X-RateLimit-Reset"));
  const retryAfterSeconds = parseOptionalInt(headers.get("Retry-After"));

  return {
    limit,
    remaining,
    resetAt: resetUnix !== undefined ? new Date(resetUnix * 1000) : undefined,
    retryAfterSeconds,
  };
}

type ApiResponse<T> = {
  data?: T;
  error?: string;
  code?: string;
  details?: unknown;
};

export class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private defaultRetries: number;

  constructor(
    baseUrl: string = "/api",
    defaultTimeout: number = 10000,
    defaultRetries: number = 3
  ) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = defaultTimeout;
    this.defaultRetries = defaultRetries;
  }

  /**
   * Méthode privée centralisée pour toutes les requêtes HTTP
   * Gère le retry automatique, le timeout, et les erreurs réseau
   */
  private async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {},
    retriesRemaining?: number,
    initialRetries?: number
  ): Promise<T> {
    const timeout = options.timeout ?? this.defaultTimeout;
    const maxRetries = retriesRemaining ?? options.retries ?? this.defaultRetries;
    // Stocker le nombre initial de retries pour le calcul du délai
    const initialRetriesCount = initialRetries ?? maxRetries;
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);

    // Extraire retries et timeout des options avant de les passer à fetch
    const { timeout: _, retries: __, ...fetchOptions } = options;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url.toString(), {
          ...fetchOptions,
          signal: controller.signal,
        });

        const parsedRateLimit = parseRateLimitHeaders(response.headers);

        if (!response.ok) {
          // Tenter de parser le body JSON pour obtenir les détails d'erreur
          let errorData: ApiResponse<never> = {};
          try {
            errorData = await response.json();
          } catch {
            // Si le parsing JSON échoue, on utilise les valeurs par défaut
            errorData = {};
          }

          const errorMessage =
            errorData.error ||
            response.statusText ||
            `HTTP ${response.status}`;

          throw new ApiError(
            response.status,
            errorMessage,
            errorData.code,
            errorData.details,
            parsedRateLimit
          );
        }

        return await response.json();
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      // Gestion du timeout (AbortError)
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new ApiError(
          408,
          `Request timeout after ${timeout}ms`,
          'TIMEOUT'
        );
        
        // Les timeouts sont retryables
        if (maxRetries > 0 && this.isRetryable(timeoutError)) {
          await this.delay(this.getRetryDelay(maxRetries, initialRetriesCount));
          return this.request<T>(endpoint, options, maxRetries - 1, initialRetriesCount);
        }
        
        throw timeoutError;
      }

      // Si c'est déjà une ApiError, on la propage directement
      if (error instanceof ApiError) {
        // Retry uniquement pour les erreurs retryables
        if (maxRetries > 0 && this.isRetryable(error)) {
          await this.delay(this.getRetryDelay(maxRetries, initialRetriesCount));
          return this.request<T>(endpoint, options, maxRetries - 1, initialRetriesCount);
        }
        
        throw error;
      }

      // Erreurs réseau (pas de réponse du serveur)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError = new ApiError(
          0,
          'Network error: Unable to reach the server',
          'NETWORK_ERROR'
        );
        
        // Les erreurs réseau sont retryables
        if (maxRetries > 0 && this.isRetryable(networkError)) {
          await this.delay(this.getRetryDelay(maxRetries, initialRetriesCount));
          return this.request<T>(endpoint, options, maxRetries - 1, initialRetriesCount);
        }
        
        throw networkError;
      }

      // Erreur inattendue
      throw new ApiError(
        500,
        error instanceof Error ? error.message : 'Unknown error occurred',
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * Détermine si une erreur est retryable
   * - Erreurs réseau (0, 408 timeout)
   * - Erreurs serveur (500-599)
   * - Certaines erreurs client spécifiques (429 Too Many Requests)
   */
  private isRetryable(error: ApiError): boolean {
    // Timeout et erreurs réseau
    if (error.statusCode === 0 || error.statusCode === 408) {
      return true;
    }

    // Erreurs serveur (5xx)
    if (error.statusCode >= 500 && error.statusCode < 600) {
      return true;
    }

    // Quota produit Groq — ne pas retenter (évite de multiplier les échecs / bruit)
    if (error.statusCode === 429 && error.code === "GROQ_DAILY_QUOTA_EXCEEDED") {
      return false;
    }

    // Too Many Requests (429) - peut être retryable
    if (error.statusCode === 429) {
      return true;
    }

    // Les autres erreurs client (4xx) ne sont généralement pas retryables
    return false;
  }

  /**
   * Calcule le délai avant retry avec exponential backoff
   * @param retriesRemaining - Nombre de retries restants
   * @param initialRetries - Nombre initial de retries
   */
  private getRetryDelay(retriesRemaining: number, initialRetries: number): number {
    const baseDelay = 1000; // 1 seconde de base
    const attemptNumber = initialRetries - retriesRemaining + 1;
    // Exponential backoff: 1s, 2s, 4s...
    return baseDelay * Math.pow(2, attemptNumber - 1);
  }

  /**
   * Délai asynchrone pour le retry
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildEndpointWithParams(
    endpoint: string,
    params?: Record<string, string>
  ): string {
    if (!params || Object.keys(params).length === 0) return endpoint;
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    const queryString = url.searchParams.toString();
    const pathWithoutQuery = url.pathname.replace(this.baseUrl, "");
    return `${pathWithoutQuery}${queryString ? `?${queryString}` : ""}`;
  }

  private async requestWithMeta<T>(
    endpoint: string,
    options: ApiRequestOptions = {},
    retriesRemaining?: number,
    initialRetries?: number
  ): Promise<ApiSuccess<T>> {
    const timeout = options.timeout ?? this.defaultTimeout;
    const maxRetries = retriesRemaining ?? options.retries ?? this.defaultRetries;
    const initialRetriesCount = initialRetries ?? maxRetries;
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
    const { timeout: _, retries: __, ...fetchOptions } = options;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url.toString(), {
          ...fetchOptions,
          signal: controller.signal,
        });

        const parsedRateLimit = parseRateLimitHeaders(response.headers);

        if (!response.ok) {
          let errorData: ApiResponse<never> = {};
          try {
            errorData = await response.json();
          } catch {
            errorData = {};
          }
          const errorMessage =
            errorData.error || response.statusText || `HTTP ${response.status}`;
          throw new ApiError(
            response.status,
            errorMessage,
            errorData.code,
            errorData.details,
            parsedRateLimit
          );
        }

        return {
          data: await response.json(),
          rateLimit: parsedRateLimit,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        const timeoutError = new ApiError(
          408,
          `Request timeout after ${timeout}ms`,
          "TIMEOUT"
        );
        if (maxRetries > 0 && this.isRetryable(timeoutError)) {
          await this.delay(this.getRetryDelay(maxRetries, initialRetriesCount));
          return this.requestWithMeta<T>(
            endpoint,
            options,
            maxRetries - 1,
            initialRetriesCount
          );
        }
        throw timeoutError;
      }

      if (error instanceof ApiError) {
        if (maxRetries > 0 && this.isRetryable(error)) {
          await this.delay(this.getRetryDelay(maxRetries, initialRetriesCount));
          return this.requestWithMeta<T>(
            endpoint,
            options,
            maxRetries - 1,
            initialRetriesCount
          );
        }
        throw error;
      }

      if (error instanceof TypeError && error.message.includes("fetch")) {
        const networkError = new ApiError(
          0,
          "Network error: Unable to reach the server",
          "NETWORK_ERROR"
        );
        if (maxRetries > 0 && this.isRetryable(networkError)) {
          await this.delay(this.getRetryDelay(maxRetries, initialRetriesCount));
          return this.requestWithMeta<T>(
            endpoint,
            options,
            maxRetries - 1,
            initialRetriesCount
          );
        }
        throw networkError;
      }

      throw new ApiError(
        500,
        error instanceof Error ? error.message : "Unknown error occurred",
        "UNKNOWN_ERROR"
      );
    }
  }

  /**
   * Méthode GET
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, string>,
    options?: ApiRequestOptions
  ): Promise<T> {
    endpoint = this.buildEndpointWithParams(endpoint, params);

    return this.request<T>(endpoint, {
      ...options,
      method: "GET",
    });
  }

  async getWithMeta<T>(
    endpoint: string,
    params?: Record<string, string>,
    options?: ApiRequestOptions
  ): Promise<ApiSuccess<T>> {
    endpoint = this.buildEndpointWithParams(endpoint, params);
    return this.requestWithMeta<T>(endpoint, {
      ...options,
      method: "GET",
    });
  }

  /**
   * Méthode POST
   */
  async post<T>(
    endpoint: string,
    data: unknown,
    options?: ApiRequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: JSON.stringify(data),
    });
  }

  async postWithMeta<T>(
    endpoint: string,
    data: unknown,
    options?: ApiRequestOptions
  ): Promise<ApiSuccess<T>> {
    return this.requestWithMeta<T>(endpoint, {
      ...options,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: JSON.stringify(data),
    });
  }

  async patch<T>(
    endpoint: string,
    data: unknown,
    options?: ApiRequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient();
