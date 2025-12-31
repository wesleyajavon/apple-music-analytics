/**
 * Classe d'erreur personnalisée pour les erreurs API côté client
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown
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

      const response = await fetch(url.toString(), {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
          errorData.details
        );
      }

      return response.json();
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

  /**
   * Méthode GET
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, string>,
    options?: ApiRequestOptions
  ): Promise<T> {
    // Si des paramètres sont fournis, les fusionner avec l'endpoint
    if (params && Object.keys(params).length > 0) {
      // Parser l'endpoint existant pour fusionner avec les nouveaux paramètres
      const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
      // Reconstruire l'endpoint avec les paramètres fusionnés (chemin + query)
      const queryString = url.searchParams.toString();
      const pathWithoutQuery = url.pathname.replace(this.baseUrl, '');
      endpoint = `${pathWithoutQuery}${queryString ? `?${queryString}` : ""}`;
    }

    return this.request<T>(endpoint, {
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
}

export const apiClient = new ApiClient();
