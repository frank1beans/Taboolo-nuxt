import { ProjectRepository, type ProjectListParams, type ProjectListResult } from '#repositories/ProjectRepository';
import { listEstimates } from '#services/EstimateService';
import { listOffers } from '#services/OfferService';
import { AppError } from '#utils/AppError';
import { CreateProjectSchema, UpdateProjectSchema, ProjectListParamsSchema } from '../validation/project.schema';
import { objectIdSchema } from '../validation';
import type { Project } from '../../types';

export { type ProjectListParams, type ProjectListResult };

/**
 * Service for managing Projects.
 */

export async function getProjectOverview(id: string) {
    // Validate ID
    const validId = objectIdSchema.parse(id);

    const project = await ProjectRepository.findById(validId);
    if (!project) {
        throw AppError.notFound(`Project with id ${id} not found`);
    }

    // Fetch associated estimates
    const estimates = await listEstimates(validId);

    // Fetch associated offers
    const offers = await listOffers(validId);

    // Group offers by baseline estimate
    const offersByEstimate = offers.reduce((acc, offer) => {
        const estId = offer.estimate_id?.toString();
        if (estId) {
            if (!acc[estId]) acc[estId] = [];
            acc[estId].push(offer);
        }
        return acc;
    }, {} as Record<string, typeof offers>);

    // Enrich estimates with rounds and companies
    // Note: We are doing this transformation here in the Service to keep the API layer thin.
    // Ideally, we might want typed interfaces for these enriched structures if reused elsewhere.
    const enrichedEstimates = estimates.map((est) => {
        // EstimateRepository returns standard IEstimate objects (plain JS objects)
        // If they come from Mongoose.lean(), they might still have _id if not serialized.
        // Let's check safely. Defaulting to 'id' if '_id' is absent or vice-versa.
        const estAny = est as any;
        const estId = estAny._id?.toString() || estAny.id;
        const estOffers = offersByEstimate[estId] || [];

        // Extract unique rounds
        const uniqueRounds = Array.from(new Set(estOffers.map(o => o.round_number || 1))).sort((a, b) => a - b);
        const rounds = uniqueRounds.map(r => ({ id: String(r), name: `Round ${r} ` }));

        // Extract unique companies
        const uniqueCompanies = Array.from(new Set(estOffers.map((o: any) => o.company_name))).filter(Boolean).sort();
        const companies = uniqueCompanies.map((c: string) => ({ id: c, name: c }));

        return {
            ...est,
            rounds,
            companies,
            roundsCount: rounds.length,
            companiesCount: companies.length
        };
    });

    return {
        ...project,
        estimates: enrichedEstimates,
    };
}

export async function listProjects(params: ProjectListParams): Promise<ProjectListResult> {
    const validParams = ProjectListParamsSchema.parse(params);
    return ProjectRepository.findAll(validParams);
}

export async function getProjectById(id: string) {
    const validId = objectIdSchema.parse(id);
    const project = await ProjectRepository.findById(validId);

    if (!project) {
        throw AppError.notFound(`Project with id ${id} not found`);
    }

    return project;
}

export async function createProject(data: unknown) {
    const validData = CreateProjectSchema.parse(data);
    return ProjectRepository.create(validData);
}

export async function updateProject(id: string, data: unknown) {
    const validId = objectIdSchema.parse(id);
    const validData = UpdateProjectSchema.parse(data);

    const project = await ProjectRepository.update(validId, validData);
    if (!project) {
        throw AppError.notFound(`Project with id ${id} not found`);
    }

    return project;
}

export async function deleteProject(id: string) {
    const validId = objectIdSchema.parse(id);
    const result = await ProjectRepository.delete(validId);

    if (!result) {
        throw AppError.notFound(`Project with id ${id} not found`);
    }

    return result;
}
