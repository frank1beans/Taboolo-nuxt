import { defineEventHandler, createError, getRouterParam } from 'h3';
import { Types } from 'mongoose';
import { Project, EstimateItem } from '#models';
import { listEstimates } from '#services/EstimateService';
import { listOffers } from '#services/OfferService';
import { serializeDoc, serializeDocs } from '#utils/serialize';

export const buildProjectContext = async (id: string) => {
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID is required' });
  }

  let projectObjectId: Types.ObjectId;
  try {
    projectObjectId = new Types.ObjectId(id);
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid project id' });
  }

  const project = await Project.findById(projectObjectId).lean();

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' });
  }

  const estimates = await listEstimates(id);
  const estimateObjectIds = estimates.map((est) => new Types.ObjectId(est._id));

  // Fetch associated offers from the new Offer collection
  const offers = await listOffers(id);

  // Map: EstimateID -> RoundNum -> Map<CompanyName, OfferInfo>
  const hierarchyMap = new Map<string, Map<number, Map<string, { mode: string, id: string }>>>();

  // Group offers by estimate_id -> round -> company
  offers.forEach((offer) => {
    const estId = offer.estimate_id?.toString();
    if (!estId) return;

    if (!hierarchyMap.has(estId)) {
      hierarchyMap.set(estId, new Map());
    }

    const roundMap = hierarchyMap.get(estId)!;
    const roundNum = offer.round_number || 0;

    if (roundNum > 0) {
      if (!roundMap.has(roundNum)) {
        roundMap.set(roundNum, new Map());
      }
      if (offer.company_name) {
        roundMap.get(roundNum)!.set(offer.company_name, {
          mode: offer.mode || 'detailed', // Default to detailed for legacy
          id: offer._id.toString(),
        });
      }
    }
  });

  // Calculate total amount for each estimate
  const totalsAgg = estimateObjectIds.length
    ? await EstimateItem.aggregate([
      {
        $match: {
          project_id: projectObjectId,
          'project.estimate_id': { $in: estimateObjectIds },
        },
      },
      { $addFields: { pli_oid: { $toObjectId: '$price_list_item_id' } } },
      {
        $lookup: {
          from: 'pricelistitems',
          localField: 'pli_oid',
          foreignField: '_id',
          as: 'price_item',
        },
      },
      { $unwind: { path: '$price_item', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          calculatedAmount: {
            $cond: {
              if: { $gt: ['$project.amount', null] },
              then: '$project.amount',
              else: { $multiply: ['$project.quantity', { $ifNull: ['$price_item.price', 0] }] },
            },
          },
        },
      },
      {
        $group: {
          _id: '$project.estimate_id',
          totalAmount: { $sum: '$calculatedAmount' },
        },
      },
    ])
    : [];

  const totalsMap = new Map<string, number>();
  totalsAgg.forEach((row) => {
    const idStr = row._id?.toString();
    if (idStr) {
      totalsMap.set(idStr, row.totalAmount || 0);
    }
  });

  const serializedProject = serializeDoc(project);
  const serializedEstimates = serializeDocs(estimates);

  return {
    ...serializedProject,
    estimates: serializedEstimates.map((est, idx) => {
      const rawEstimate = estimates[idx];
      const estimateId = rawEstimate?._id?.toString?.() ?? est.id;
      const roundMap = estimateId ? hierarchyMap.get(estimateId) : undefined;

      const rounds = roundMap
        ? Array.from(roundMap.keys()).sort((a, b) => a - b).map((rNum) => {
          const companyMap = roundMap.get(rNum)!;
          const companiesInRound = Array.from(companyMap.keys()).sort().map((cName) => {
            const info = companyMap.get(cName)!;
            return {
              id: cName,
              name: cName,
              offerMode: info.mode,
              offerId: info.id,
            };
          });

          return {
            id: String(rNum),
            name: `Round ${rNum} `,
            companies: companiesInRound,
          };
        })
        : [];

      const companies = rounds.flatMap((r) => r.companies || []);
      const computedTotal = estimateId ? totalsMap.get(estimateId) : undefined;

      return {
        ...est,
        project_id: (est as { project_id?: string | Types.ObjectId }).project_id?.toString?.()
          ?? (est as { project_id?: string }).project_id,
        priceCatalog: est.price_list_id
          ? {
            id: est.price_list_id,
            name: est.name ? `Listino ${est.name} ` : `Listino ${est.price_list_id} `,
          }
          : undefined,
        rounds,
        companies,
        roundsCount: rounds.length,
        companiesCount: companies.length,
        total_amount: typeof computedTotal === 'number' ? computedTotal : (est.total_amount ?? 0),
      };
    }),
  };
};

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  return buildProjectContext(id ?? '');
});
