import { describe, it, expect } from 'vitest';
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
} from '@/lib/validators/api-validators';

describe('api-validators', () => {
  describe('validateOptionalDateRange', () => {
    it('should return success when both params are null', () => {
      const result = validateOptionalDateRange(null, null);
      expect(result.success).toBe(true);
      expect(result).not.toHaveProperty('start');
      expect(result).not.toHaveProperty('end');
    });

    it('should return success when both params are undefined', () => {
      const result = validateOptionalDateRange(undefined as any, undefined as any);
      expect(result.success).toBe(true);
    });

    it('should return error when only startDate is provided', () => {
      const result = validateOptionalDateRange('2024-01-01', null);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('doivent être fournis ensemble');
      }
    });

    it('should return error when only endDate is provided', () => {
      const result = validateOptionalDateRange(null, '2024-01-31');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('doivent être fournis ensemble');
      }
    });

    it('should return success with valid date range', () => {
      const result = validateOptionalDateRange('2024-01-01', '2024-01-31');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.start).toBeInstanceOf(Date);
        expect(result.end).toBeInstanceOf(Date);
        expect(result.start?.getTime()).toBe(new Date('2024-01-01').getTime());
        expect(result.end?.getTime()).toBe(new Date('2024-01-31').getTime());
      }
    });

    it('should return error for invalid startDate', () => {
      const result = validateOptionalDateRange('invalid-date', '2024-01-31');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Date de début invalide');
      }
    });

    it('should return error for invalid endDate', () => {
      const result = validateOptionalDateRange('2024-01-01', 'invalid-date');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Date de fin invalide');
      }
    });

    it('should return error when startDate is after endDate', () => {
      const result = validateOptionalDateRange('2024-01-31', '2024-01-01');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('antérieure à la date de fin');
      }
    });

    it('should accept dates with time components', () => {
      const result = validateOptionalDateRange(
        '2024-01-01T00:00:00Z',
        '2024-01-31T23:59:59Z'
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.start).toBeInstanceOf(Date);
        expect(result.end).toBeInstanceOf(Date);
      }
    });

    it('should accept same start and end date', () => {
      const result = validateOptionalDateRange('2024-01-01', '2024-01-01');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.start?.getTime()).toBe(result.end?.getTime());
      }
    });

    it('should handle empty string params as falsy', () => {
      const result = validateOptionalDateRange('', '');
      // Empty strings are falsy, so should return success without dates
      expect(result.success).toBe(true);
    });
  });

  describe('validateRequiredDateRange', () => {
    it('should return error when startDate is missing', () => {
      const result = validateRequiredDateRange(null, '2024-01-31');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('sont requis');
      }
    });

    it('should return error when endDate is missing', () => {
      const result = validateRequiredDateRange('2024-01-01', null);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('sont requis');
      }
    });

    it('should return error when both are missing', () => {
      const result = validateRequiredDateRange(null, null);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('sont requis');
      }
    });

    it('should return success with valid date range', () => {
      const result = validateRequiredDateRange('2024-01-01', '2024-01-31');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.start).toBeInstanceOf(Date);
        expect(result.end).toBeInstanceOf(Date);
        expect(result.start.getTime()).toBe(new Date('2024-01-01').getTime());
        expect(result.end.getTime()).toBe(new Date('2024-01-31').getTime());
      }
    });

    it('should return error for invalid startDate', () => {
      const result = validateRequiredDateRange('invalid-date', '2024-01-31');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Date de début invalide');
      }
    });

    it('should return error for invalid endDate', () => {
      const result = validateRequiredDateRange('2024-01-01', 'invalid-date');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Date de fin invalide');
      }
    });

    it('should return error when startDate is after endDate', () => {
      const result = validateRequiredDateRange('2024-01-31', '2024-01-01');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('antérieure à la date de fin');
      }
    });

    it('should accept same start and end date', () => {
      const result = validateRequiredDateRange('2024-01-01', '2024-01-01');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.start.getTime()).toBe(result.end.getTime());
      }
    });
  });

  describe('validateDateRangeWithDefaults', () => {
    const defaultStart = new Date('2024-01-01');
    const defaultEnd = new Date('2024-12-31');

    it('should return defaults when both params are null', () => {
      const result = validateDateRangeWithDefaults(null, null, defaultStart, defaultEnd);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.start.getTime()).toBe(defaultStart.getTime());
        expect(result.end.getTime()).toBe(defaultEnd.getTime());
      }
    });

    it('should return error when only startDate is provided', () => {
      const result = validateDateRangeWithDefaults('2024-06-01', null, defaultStart, defaultEnd);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('doivent être fournis ensemble');
      }
    });

    it('should return error when only endDate is provided', () => {
      const result = validateDateRangeWithDefaults(null, '2024-06-30', defaultStart, defaultEnd);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('doivent être fournis ensemble');
      }
    });

    it('should return success with valid provided dates', () => {
      const result = validateDateRangeWithDefaults(
        '2024-06-01',
        '2024-06-30',
        defaultStart,
        defaultEnd
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.start.getTime()).toBe(new Date('2024-06-01').getTime());
        expect(result.end.getTime()).toBe(new Date('2024-06-30').getTime());
      }
    });

    it('should return error for invalid startDate', () => {
      const result = validateDateRangeWithDefaults(
        'invalid-date',
        '2024-06-30',
        defaultStart,
        defaultEnd
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Date de début invalide');
      }
    });

    it('should return error for invalid endDate', () => {
      const result = validateDateRangeWithDefaults(
        '2024-06-01',
        'invalid-date',
        defaultStart,
        defaultEnd
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Date de fin invalide');
      }
    });

    it('should return error when startDate is after endDate', () => {
      const result = validateDateRangeWithDefaults(
        '2024-06-30',
        '2024-06-01',
        defaultStart,
        defaultEnd
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('antérieure à la date de fin');
      }
    });

    it('should use defaults when provided dates are invalid but both are null', () => {
      const result = validateDateRangeWithDefaults(null, null, defaultStart, defaultEnd);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.start).toBe(defaultStart);
        expect(result.end).toBe(defaultEnd);
      }
    });

    it('should handle empty string params as falsy and use defaults', () => {
      const result = validateDateRangeWithDefaults('', '', defaultStart, defaultEnd);
      // Empty strings are falsy, so should return defaults
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.start.getTime()).toBe(defaultStart.getTime());
        expect(result.end.getTime()).toBe(defaultEnd.getTime());
      }
    });
  });

  describe('validateOptionalDate', () => {
    it('should return undefined when param is null', () => {
      const result = validateOptionalDate(null);
      expect(result).toBeUndefined();
    });

    it('should return undefined when param is empty string', () => {
      const result = validateOptionalDate('');
      expect(result).toBeUndefined();
    });

    it('should return Date object for valid date string', () => {
      const result = validateOptionalDate('2024-01-01');
      expect(result).toBeInstanceOf(Date);
      if (result instanceof Date) {
        expect(result.getTime()).toBe(new Date('2024-01-01').getTime());
      }
    });

    it('should return error object for invalid date string', () => {
      const result = validateOptionalDate('invalid-date');
      expect(result).toHaveProperty('error');
      if (typeof result === 'object' && 'error' in result) {
        expect(result.error).toContain('Date invalide');
      }
    });

    it('should accept ISO date strings', () => {
      const result = validateOptionalDate('2024-01-01T00:00:00Z');
      expect(result).toBeInstanceOf(Date);
    });

    it('should return error for malformed date strings', () => {
      const result = validateOptionalDate('2024-13-45');
      expect(result).toHaveProperty('error');
    });
  });

  describe('validatePeriod', () => {
    it('should return default value when param is null', () => {
      const result = validatePeriod(null);
      expect(result).toBe('day');
    });

    it('should return default value when param is undefined', () => {
      const result = validatePeriod(undefined as any);
      expect(result).toBe('day');
    });

    it('should return custom default value when provided', () => {
      const result = validatePeriod(null, 'week');
      expect(result).toBe('week');
    });

    it('should return "day" for valid day period', () => {
      const result = validatePeriod('day');
      expect(result).toBe('day');
    });

    it('should return "week" for valid week period', () => {
      const result = validatePeriod('week');
      expect(result).toBe('week');
    });

    it('should return "month" for valid month period', () => {
      const result = validatePeriod('month');
      expect(result).toBe('month');
    });

    it('should return error for invalid period', () => {
      const result = validatePeriod('invalid');
      expect(result).toHaveProperty('error');
      if (typeof result === 'object' && 'error' in result) {
        expect(result.error).toContain('Période invalide');
        expect(result.error).toContain('day, week, month');
      }
    });

    it('should return default value for empty string (falsy)', () => {
      const result = validatePeriod('');
      // Empty string is falsy, so it returns the default value
      expect(result).toBe('day');
    });

    it('should be case-sensitive', () => {
      const result = validatePeriod('Day');
      expect(result).toHaveProperty('error');
    });
  });

  describe('validateOptionalInteger', () => {
    it('should return undefined when param is null', () => {
      const result = validateOptionalInteger(null);
      expect(result).toBeUndefined();
    });

    it('should return undefined when param is empty string', () => {
      const result = validateOptionalInteger('');
      expect(result).toBeUndefined();
    });

    it('should return number for valid integer string', () => {
      const result = validateOptionalInteger('42');
      expect(result).toBe(42);
    });

    it('should return number for negative integer', () => {
      const result = validateOptionalInteger('-10');
      expect(result).toBe(-10);
    });

    it('should return error for invalid integer string', () => {
      const result = validateOptionalInteger('not-a-number');
      expect(result).toHaveProperty('error');
      if (typeof result === 'object' && 'error' in result) {
        expect(result.error).toContain('Entier invalide');
      }
    });

    it('should truncate float string to integer (parseInt behavior)', () => {
      const result = validateOptionalInteger('3.14');
      // parseInt truncates the decimal part, so '3.14' becomes 3
      expect(result).toBe(3);
    });

    it('should respect min option', () => {
      const result = validateOptionalInteger('5', { min: 10 });
      expect(result).toHaveProperty('error');
      if (typeof result === 'object' && 'error' in result) {
        expect(result.error).toContain('supérieure ou égale à 10');
      }
    });

    it('should respect max option', () => {
      const result = validateOptionalInteger('15', { max: 10 });
      expect(result).toHaveProperty('error');
      if (typeof result === 'object' && 'error' in result) {
        expect(result.error).toContain('inférieure ou égale à 10');
      }
    });

    it('should accept value at min boundary', () => {
      const result = validateOptionalInteger('10', { min: 10 });
      expect(result).toBe(10);
    });

    it('should accept value at max boundary', () => {
      const result = validateOptionalInteger('10', { max: 10 });
      expect(result).toBe(10);
    });

    it('should accept value within min and max range', () => {
      const result = validateOptionalInteger('15', { min: 10, max: 20 });
      expect(result).toBe(15);
    });

    it('should use custom error message when provided', () => {
      const result = validateOptionalInteger('invalid', { errorMessage: 'Custom error' });
      expect(result).toHaveProperty('error');
      if (typeof result === 'object' && 'error' in result) {
        expect(result.error).toBe('Custom error');
      }
    });

    it('should use custom error message for min violation', () => {
      const result = validateOptionalInteger('5', { min: 10, errorMessage: 'Too small' });
      expect(result).toHaveProperty('error');
      if (typeof result === 'object' && 'error' in result) {
        expect(result.error).toBe('Too small');
      }
    });

    it('should use custom error message for max violation', () => {
      const result = validateOptionalInteger('15', { max: 10, errorMessage: 'Too large' });
      expect(result).toHaveProperty('error');
      if (typeof result === 'object' && 'error' in result) {
        expect(result.error).toBe('Too large');
      }
    });

    it('should handle zero value', () => {
      const result = validateOptionalInteger('0');
      expect(result).toBe(0);
    });

    it('should handle large integers', () => {
      const result = validateOptionalInteger('999999');
      expect(result).toBe(999999);
    });
  });

  describe('validateRequiredInteger', () => {
    it('should return error when param is null', () => {
      const result = validateRequiredInteger(null);
      expect(result).toHaveProperty('error');
      if (typeof result === 'object' && 'error' in result) {
        expect(result.error).toContain('Paramètre requis');
      }
    });

    it('should return error when param is empty string', () => {
      const result = validateRequiredInteger('');
      expect(result).toHaveProperty('error');
    });

    it('should return number for valid integer string', () => {
      const result = validateRequiredInteger('42');
      expect(result).toBe(42);
    });

    it('should return error for invalid integer string', () => {
      const result = validateRequiredInteger('not-a-number');
      expect(result).toHaveProperty('error');
      if (typeof result === 'object' && 'error' in result) {
        expect(result.error).toContain('Entier invalide');
      }
    });

    it('should respect min option', () => {
      const result = validateRequiredInteger('5', { min: 10 });
      expect(result).toHaveProperty('error');
      if (typeof result === 'object' && 'error' in result) {
        expect(result.error).toContain('supérieure ou égale à 10');
      }
    });

    it('should respect max option', () => {
      const result = validateRequiredInteger('15', { max: 10 });
      expect(result).toHaveProperty('error');
      if (typeof result === 'object' && 'error' in result) {
        expect(result.error).toContain('inférieure ou égale à 10');
      }
    });

    it('should accept value at boundaries', () => {
      expect(validateRequiredInteger('10', { min: 10 })).toBe(10);
      expect(validateRequiredInteger('10', { max: 10 })).toBe(10);
    });

    it('should use custom error message when provided', () => {
      const result = validateRequiredInteger(null, { errorMessage: 'Required field' });
      expect(result).toHaveProperty('error');
      if (typeof result === 'object' && 'error' in result) {
        expect(result.error).toBe('Required field');
      }
    });

    it('should use custom error message for validation errors', () => {
      const result = validateRequiredInteger('invalid', { errorMessage: 'Invalid input' });
      expect(result).toHaveProperty('error');
      if (typeof result === 'object' && 'error' in result) {
        expect(result.error).toBe('Invalid input');
      }
    });

    it('should handle negative integers', () => {
      const result = validateRequiredInteger('-5');
      expect(result).toBe(-5);
    });

    it('should handle zero', () => {
      const result = validateRequiredInteger('0');
      expect(result).toBe(0);
    });
  });

  describe('validateOptionalFloat', () => {
    it('should return undefined when param is null', () => {
      const result = validateOptionalFloat(null);
      expect(result).toBeUndefined();
    });

    it('should return undefined when param is empty string', () => {
      const result = validateOptionalFloat('');
      expect(result).toBeUndefined();
    });

    it('should return number for valid float string', () => {
      const result = validateOptionalFloat('3.14');
      expect(result).toBe(3.14);
    });

    it('should return number for integer string', () => {
      const result = validateOptionalFloat('42');
      expect(result).toBe(42);
    });

    it('should return number for negative float', () => {
      const result = validateOptionalFloat('-3.14');
      expect(result).toBe(-3.14);
    });

    it('should return error for invalid float string', () => {
      const result = validateOptionalFloat('not-a-number');
      expect(result).toHaveProperty('error');
      if (typeof result === 'object' && 'error' in result) {
        expect(result.error).toContain('Nombre invalide');
      }
    });

    it('should respect min option', () => {
      const result = validateOptionalFloat('5.5', { min: 10 });
      expect(result).toHaveProperty('error');
      if (typeof result === 'object' && 'error' in result) {
        expect(result.error).toContain('supérieure ou égale à 10');
      }
    });

    it('should respect max option', () => {
      const result = validateOptionalFloat('15.5', { max: 10 });
      expect(result).toHaveProperty('error');
      if (typeof result === 'object' && 'error' in result) {
        expect(result.error).toContain('inférieure ou égale à 10');
      }
    });

    it('should accept value at min boundary', () => {
      const result = validateOptionalFloat('10.0', { min: 10 });
      expect(result).toBe(10);
    });

    it('should accept value at max boundary', () => {
      const result = validateOptionalFloat('10.0', { max: 10 });
      expect(result).toBe(10);
    });

    it('should accept value within range', () => {
      const result = validateOptionalFloat('15.5', { min: 10, max: 20 });
      expect(result).toBe(15.5);
    });

    it('should use custom error message when provided', () => {
      const result = validateOptionalFloat('invalid', { errorMessage: 'Custom error' });
      expect(result).toHaveProperty('error');
      if (typeof result === 'object' && 'error' in result) {
        expect(result.error).toBe('Custom error');
      }
    });

    it('should handle scientific notation', () => {
      const result = validateOptionalFloat('1e2');
      expect(result).toBe(100);
    });

    it('should handle decimal with leading zero', () => {
      const result = validateOptionalFloat('0.5');
      expect(result).toBe(0.5);
    });

    it('should handle very small decimals', () => {
      const result = validateOptionalFloat('0.0001');
      expect(result).toBe(0.0001);
    });
  });

  describe('validateOptionalUserId', () => {
    it('should return undefined when param is null', () => {
      const result = validateOptionalUserId(null);
      expect(result).toBeUndefined();
    });

    it('should return undefined when param is empty string', () => {
      const result = validateOptionalUserId('');
      expect(result).toBeUndefined();
    });

    it('should return undefined when param is only whitespace', () => {
      const result = validateOptionalUserId('   ');
      expect(result).toBeUndefined();
    });

    it('should return trimmed string for valid userId', () => {
      const result = validateOptionalUserId('user123');
      expect(result).toBe('user123');
    });

    it('should trim whitespace from userId', () => {
      const result = validateOptionalUserId('  user123  ');
      expect(result).toBe('user123');
    });

    it('should return trimmed string with internal spaces', () => {
      const result = validateOptionalUserId('  user 123  ');
      expect(result).toBe('user 123');
    });

    it('should handle userId with special characters', () => {
      const result = validateOptionalUserId('user-123_test');
      expect(result).toBe('user-123_test');
    });

    it('should handle long userId strings', () => {
      const longUserId = 'a'.repeat(100);
      const result = validateOptionalUserId(longUserId);
      expect(result).toBe(longUserId);
    });

    it('should handle userId with unicode characters', () => {
      const result = validateOptionalUserId('user-émoji-🎵');
      expect(result).toBe('user-émoji-🎵');
    });
  });
});
