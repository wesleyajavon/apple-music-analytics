/**
 * Utility functions for transforming DTOs
 * Handles conversion of Prisma types (like bigint) to JavaScript types
 */

/**
 * Transforms bigint values to numbers in an object
 * 
 * @param obj - Object that may contain bigint values
 * @returns Object with bigint values converted to numbers
 * 
 * @example
 * ```typescript
 * const result = transformBigIntToNumber({
 *   id: '123',
 *   count: BigInt(100),
 *   name: 'test'
 * });
 * // { id: '123', count: 100, name: 'test' }
 * ```
 */
export function transformBigIntToNumber<T extends Record<string, unknown>>(
  obj: T
): { [K in keyof T]: T[K] extends bigint ? number : T[K] } {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key,
      typeof value === 'bigint' ? Number(value) : value,
    ])
  ) as { [K in keyof T]: T[K] extends bigint ? number : T[K] };
}

/**
 * Transforms an array of objects, converting bigint values to numbers
 * 
 * @param arr - Array of objects that may contain bigint values
 * @returns Array with bigint values converted to numbers
 */
export function transformBigIntArrayToNumber<T extends Record<string, unknown>>(
  arr: T[]
): Array<{ [K in keyof T]: T[K] extends bigint ? number : T[K] }> {
  return arr.map(transformBigIntToNumber);
}

