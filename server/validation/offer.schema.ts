
import { z } from 'zod';
import { commonSchemas } from './index';
import { EstimateSchema } from './estimate.schema';

// Offer is essentially an Estimate but often with specific contexts
// Reuse EstimateSchema base but enforce 'offer' type if needed, 
// or define specific Offer fields.
// For now, it mirrors EstimateSchema but we can tighten it.

export const OfferSchema = EstimateSchema.extend({
    // Add offer-specific validations if any
    type: z.literal('offer'),
    estimate_id: commonSchemas.id,
    company_name: z.string().min(1, 'Company name is required'),
    company_id: commonSchemas.id.optional(),
    mode: z.enum(['detailed', 'aggregated']).optional(),
    status: z.enum(['draft', 'submitted', 'accepted', 'rejected']).optional(),
    date: z.string().datetime().optional(),
    discount_percentage: z.number().optional(),
    description: z.string().optional(),
});

export const CreateOfferSchema = OfferSchema;
export const UpdateOfferSchema = OfferSchema.partial();
