
import { z } from 'zod';
import { commonSchemas } from './index';

export const EstimateSchema = z.object({
    project_id: commonSchemas.id,
    name: z.string().min(1, 'Name is required'),
    type: z.enum(['project', 'offer']),
    is_baseline: z.boolean().default(false),

    // Optional fields
    discipline: z.string().optional(),
    revision: z.string().optional(),
    company: z.string().optional(),
    round_number: z.number().int().optional(),
    total_amount: z.number().optional(),
    delta_vs_project: z.number().optional(),
    delta_percentage: z.number().optional(),
    notes: z.string().optional(),
    file_name: z.string().optional(),
    delivery_date: z.string().datetime().optional(),
    price_list_id: z.string().optional().refine((val) => !val || /^[0-9a-fA-F]{24}$/.test(val), "Invalid ObjectId"),
    source_preventivo_id: z.string().optional().refine((val) => !val || /^[0-9a-fA-F]{24}$/.test(val), "Invalid ObjectId"),
    import_run_id: z.string().optional(),
    matching_report: z.record(z.string(), z.unknown()).optional(),
});

export const CreateEstimateSchema = EstimateSchema;
export const UpdateEstimateSchema = EstimateSchema.partial();
