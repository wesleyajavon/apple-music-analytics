import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger } from '../logger';

const mockCaptureException = vi.fn();
const mockCaptureMessage = vi.fn();

vi.mock('../sentry', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
}));

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('debug', () => {
    it('should log debug message in development', () => {
      logger.debug('test debug');
      expect(console.debug).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T.*\] \[DEBUG\] test debug/)
      );
    });

    it('should not log debug in production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      logger.debug('test debug');
      expect(console.debug).not.toHaveBeenCalled();
    });

    it('should include context when provided', () => {
      logger.debug('test', { key: 'value' });
      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('{"key":"value"}')
      );
    });
  });

  describe('info', () => {
    it('should log info message', () => {
      logger.info('test info');
      expect(console.info).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T.*\] \[INFO\] test info/)
      );
    });

    it('should include context when provided', () => {
      logger.info('test', { userId: '123' });
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('{"userId":"123"}')
      );
    });
  });

  describe('warn', () => {
    it('should log warn message in development without calling Sentry', () => {
      logger.warn('test warn');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T.*\] \[WARN\] test warn/)
      );
      expect(mockCaptureMessage).not.toHaveBeenCalled();
    });

    it('should call captureMessage in production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      logger.warn('production warning');
      expect(console.warn).toHaveBeenCalled();
      expect(mockCaptureMessage).toHaveBeenCalledWith('production warning', 'warning');
    });
  });

  describe('error', () => {
    it('should log error and call captureMessage when no context', () => {
      logger.error('test error');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T.*\] \[ERROR\] test error/)
      );
      expect(mockCaptureMessage).toHaveBeenCalledWith('test error', 'error');
      expect(mockCaptureException).not.toHaveBeenCalled();
    });

    it('should call captureException when context is provided', () => {
      const context = { userId: '123', action: 'test' };
      logger.error('test error', context);
      expect(console.error).toHaveBeenCalled();
      expect(mockCaptureException).toHaveBeenCalledWith(
        expect.any(Error),
        context
      );
      expect(mockCaptureException.mock.calls[0][0].message).toBe('test error');
      expect(mockCaptureMessage).not.toHaveBeenCalled();
    });
  });

  describe('errorWithStack', () => {
    it('should log error with Error instance and call captureException', () => {
      const error = new Error('stack error');
      const context = { requestId: 'req-1' };
      logger.errorWithStack('Something failed', error, context);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Something failed')
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('stack error')
      );
      expect(mockCaptureException).toHaveBeenCalledWith(error, context);
    });

    it('should handle non-Error values by converting to Error', () => {
      logger.errorWithStack('Failed', 'string error');

      expect(console.error).toHaveBeenCalled();
      // captureException is called twice: once from this.error() (with message), once from explicit call (with converted error)
      expect(mockCaptureException).toHaveBeenCalledTimes(2);
      const sentryError = mockCaptureException.mock.calls[1][0];
      expect(sentryError).toBeInstanceOf(Error);
      expect(sentryError.message).toBe('string error');
    });

    it('should include error details in context', () => {
      const error = new Error('detailed error');
      error.name = 'CustomError';
      logger.errorWithStack('Log message', error);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('CustomError')
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('detailed error')
      );
      expect(mockCaptureException).toHaveBeenCalledWith(error, undefined);
    });
  });
});
