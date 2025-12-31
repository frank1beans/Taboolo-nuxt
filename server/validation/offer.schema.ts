
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
});

export const CreateOfferSchema = OfferSchema;
export const UpdateOfferSchema = OfferSchema.partial();
