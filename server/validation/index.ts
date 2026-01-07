
import { z } from 'zod';
import { Types } from 'mongoose';

/**
 * Validates a standard MongoDB ObjectId string
 */
export const objectIdSchema = z.string().refine((val) => Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId',
});

/**
 * Common schemas reused across the application
 */
export const commonSchemas = {
    id: objectIdSchema,
    pagination: z.object({
        page: z.coerce.number().int().positive().default(1),
        pageSize: z.coerce.number().int().positive().max(200).default(50),
        sortField: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
        search: z.string().optional(),
    }),
};
