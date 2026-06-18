/**
 * Removes undefined, null, empty string, and empty object values from an object.
 * Useful for building partial update payloads.
 */
export const cleanObject = (obj: Record<string, any>): Record<string, any> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => {
      if (value === undefined || value === null || value === '') return false;
      if (
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.keys(value).length === 0
      ) return false;
      return true;
    }),
  );
};
