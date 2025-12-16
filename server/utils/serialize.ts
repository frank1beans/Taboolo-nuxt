/**
 * Utility functions to serialize MongoDB documents for client consumption
 * This fixes the issue where MongoDB ObjectIds and other non-serializable types
 * cause rendering problems in Nuxt/Vue
 */

/**
 * Convert a single MongoDB document to a plain JSON object
 * Removes _id and __v, adds id as string
 */
export function serializeDoc<T extends Record<string, any>>(doc: T | null | undefined): any {
  if (!doc) return doc;

  const { _id, __v, ...rest } = doc;

  return {
    ...rest,
    id: rest.id || _id?.toString() || undefined,
  };
}

/**
 * Convert an array of MongoDB documents to plain JSON objects
 */
export function serializeDocs<T extends Record<string, any>>(docs: T[]): any[] {
  return docs.map(doc => serializeDoc(doc));
}
