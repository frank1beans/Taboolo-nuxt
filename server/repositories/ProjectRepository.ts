import { Project as ProjectModel, type IProject } from '#models';
import type { Project } from '../../types';
import { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';
import { serializeDoc } from '#utils/serialize';

export type ProjectListParams = {
    page?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    filters?: Record<string, any>;
};

export type ProjectListResult = {
    projects: Project[];
    total: number;
};

// Helper: Convert Mongoose Doc to Project Interface
function docToProject(doc: any): Project {
    if (!doc) return null as unknown as Project;
    // serializeDoc handles _id -> id and dates -> strings
    return serializeDoc(doc) as unknown as Project;
}

/**
 * Repository for Project data access.
 * Encapsulates all Mongoose-specific logic for Projects.
 */
export const ProjectRepository = {
    /**
     * Find projects with pagination, sorting, and filtering.
     */
    async findAll(params: ProjectListParams): Promise<ProjectListResult> {
        const {
            page = 1,
            pageSize = 50,
            sortField = 'created_at',
            sortOrder = 'desc',
            search,
            filters,
        } = params;

        const skip = (page - 1) * pageSize;
        const sortDirection = sortOrder === 'asc' ? 1 : -1;

        // Helpers
        const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Build filter query
        const query: Record<string, unknown> = {};

        // Quick search
        if (search) {
            const searchRegex = new RegExp(escapeRegex(String(search)), 'i');
            query.$or = [
                { code: searchRegex },
                { name: searchRegex },
                { description: searchRegex },
                { business_unit: searchRegex },
            ];
        }

        // Column filters
        if (filters) {
            try {
                Object.entries(filters).forEach(([field, rawConfig]) => {
                    if (!rawConfig || typeof rawConfig !== 'object') return;
                    const config = rawConfig as { filter?: unknown; type?: string };
                    if (config.filter !== undefined) {
                        if (config.type === 'equals') {
                            query[field] = config.filter;
                        } else if (config.type === 'contains') {
                            query[field] = new RegExp(escapeRegex(String(config.filter)), 'i');
                        } else if (config.type === 'notBlank') {
                            query[field] = { $nin: [null, ''] };
                        }
                    }
                });
            } catch (err) {
                console.error('[ProjectRepository] Error parsing filters:', err);
            }
        }

        // Execute queries
        const [projects, total] = await Promise.all([
            ProjectModel.find(query)
                .sort({ [sortField]: sortDirection })
                .skip(skip)
                .limit(pageSize)
                .lean(),
            ProjectModel.countDocuments(query),
        ]);

        return { projects: projects.map(docToProject), total };
    },

    /**
     * Find project by ID.
     */
    async findById(id: string): Promise<Project | null> {
        const doc = await ProjectModel.findById(id).lean();
        return doc ? docToProject(doc) : null;
    },

    /**
     * Create a new project.
     */
    async create(data: Partial<Project>): Promise<Project> {
        const doc = await ProjectModel.create(data);
        return docToProject(doc.toObject());
    },

    /**
     * Update a project by ID.
     */
    async update(id: string, data: Partial<Project>): Promise<Project | null> {
        const doc = await ProjectModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
        return doc ? docToProject(doc) : null;
    },

    /**
     * Delete a project by ID.
     */
    async delete(id: string): Promise<Project | null> {
        const doc = await ProjectModel.findByIdAndDelete(id).lean();
        return doc ? docToProject(doc) : null;
    }
};
