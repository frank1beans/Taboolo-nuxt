import { defineEventHandler, createError, getRouterParam } from 'h3';
import { Project, Estimate, Offer } from '#models';
import { serializeDoc, serializeDocs } from '#utils/serialize';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  try {
    const project = await Project.findById(id).lean();

    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found',
      });
    }

    // Fetch associated estimates
    const estimates = await Estimate.find({ project_id: id }).sort({ created_at: -1 }).lean();

    // Fetch associated offers
    const offers = await Offer.find({ project_id: id }).lean();

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
    const enrichedEstimates = estimates.map((est) => {
      const estId = est._id.toString();
      const estOffers = offersByEstimate[estId] || [];

      // Extract unique rounds
      const uniqueRounds = Array.from(new Set(estOffers.map(o => o.round_number || 1))).sort((a, b) => a - b);
      const rounds = uniqueRounds.map(r => ({ id: String(r), name: `Round ${r}` }));

      // Extract unique companies
      const uniqueCompanies = Array.from(new Set(estOffers.map(o => o.company_name))).filter(Boolean).sort();
      const companies = uniqueCompanies.map(c => ({ id: c, name: c }));

      return {
        ...est,
        rounds,
        companies,
        roundsCount: rounds.length,
        companiesCount: companies.length
      };
    });

    return {
      ...serializeDoc(project),
      estimates: serializeDocs(enrichedEstimates),
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching project details',
      cause: error,
    });
  }
});
