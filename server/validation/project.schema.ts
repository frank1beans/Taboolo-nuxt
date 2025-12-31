
import { z } from 'zod';
import { commonSchemas } from './index';

export const CreateProjectSchema = z.object({
    code: z.string().min(1, 'Project code is required').max(50),
    name: z.string().min(1, 'Project name is required'),
    description: z.string().optional(),
    status: z.enum(['setup', 'in_progress', 'closed']).default('setup'),
    business_unit: z.string().optional(),
    start_date: z.string().datetime().optional(), // Expects ISO string
    end_date: z.string().datetime().optional(),
    manager: z.string().optional(),
    location: z.string().optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

export const ProjectListParamsSchema = commonSchemas.pagination.extend({
    filters: z.record(z.string(), z.unknown()).optional(),
});
