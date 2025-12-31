/**
 * Utility functions to serialize MongoDB documents for client consumption
 * This fixes the issue where MongoDB ObjectIds and other non-serializable types
 * cause rendering problems in Nuxt/Vue
 */

/**
 * Convert a single MongoDB document to a plain JSON object
 * Removes _id and __v, adds id as string
 */
export function serializeDoc<T = Record<string, unknown>>(doc: any): T | null | undefined {
  if (!doc) return doc;

  // Handle simple objects vs Mongoose documents if necessary, though .lean() usually gives simple objects
  const { _id, __v, ...rest } = doc;

  return {
    ...rest,
    id: (rest as any).id ?? _id?.toString() ?? undefined,
  } as T;
}

/**
 * Convert an array of MongoDB documents to plain JSON objects
 */
export function serializeDocs<T = Record<string, unknown>>(docs: any[]): T[] {
  return docs.map(doc => serializeDoc<T>(doc) as T);
}
