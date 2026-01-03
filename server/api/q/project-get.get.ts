import { QueryKeys } from '~/types/queries';
import { createQueryHandler, defineQuery } from '#utils/registry';
import { Project } from '#models/project.schema';

export default createQueryHandler(defineQuery({
    id: QueryKeys.PROJECT_GET,
    scope: 'public',
    handler: async (event, args) => {
        try {
            const { id } = args;
            console.log(`[PROJECT_GET] Fetching ${id}`);
            const project = await Project.findById(id).lean(); // Use lean() via Mongoose if needed
            if (!project) {
                console.log(`[PROJECT_GET] Not found ${id}`);
                throw createError({ statusCode: 404, message: 'Project not found' });
            }
            console.log(`[PROJECT_GET] Found`, project.name);

            return {
                id: project._id.toString(),
                name: project.name,
                code: project.code,
                description: project.description,
                business_unit: project.business_unit,
                status: project.status,
                created_at: project.created_at ? new Date(project.created_at).toISOString() : new Date().toISOString(),
                updated_at: project.updated_at ? new Date(project.updated_at).toISOString() : new Date().toISOString()
            };
        } catch (e: any) {
            console.error('[PROJECT_GET] Error:', e);
            throw createError({ statusCode: 500, message: e.message || 'Server Error', stack: e.stack });
        }
    }
}));
