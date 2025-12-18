import { defineEventHandler, createError, getRouterParam } from 'h3';
import { Types } from 'mongoose';
import { Estimate, EstimateItem, Project, Offer } from '#models';
import { serializeDoc } from '#utils/serialize';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

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

  const estimates = await Estimate.find({ project_id: id }).sort({ created_at: -1 }).lean();
  const estimateObjectIds = estimates.map((est) => new Types.ObjectId(est._id));

  // Fetch associated offers from the new Offer collection
  const offers = await Offer.find({ project_id: id }).lean();

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
          id: offer._id.toString()
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
      { $addFields: { pli_oid: { $toObjectId: "$price_list_item_id" } } },
      {
        $lookup: {
          from: 'pricelistitems',
          localField: 'pli_oid',
          foreignField: '_id',
          as: 'price_item'
        }
      },
      { $unwind: { path: '$price_item', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          calculatedAmount: {
            $cond: {
              if: { $gt: ['$project.amount', null] },
              then: '$project.amount',
              else: { $multiply: ['$project.quantity', { $ifNull: ['$price_item.price', 0] }] }
            }
          }
        }
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

  return {
    ...serializedProject,
    estimates: estimates.map((est) => {
      const estimateId = est._id.toString();
      const roundMap = hierarchyMap.get(estimateId);

      const rounds = roundMap
        ? Array.from(roundMap.keys()).sort((a, b) => a - b).map(rNum => {
          const companyMap = roundMap.get(rNum)!;
          const companiesInRound = Array.from(companyMap.keys()).sort().map(cName => {
            const info = companyMap.get(cName)!;
            return {
              id: cName, // Company Name as ID for now
              name: cName,
              offerMode: info.mode,
              offerId: info.id
            };
          });

          return {
            id: String(rNum),
            name: `Round ${rNum}`,
            companies: companiesInRound
          };
        })
        : [];

      // Legacy flat companies list just in case needed, or empty
      const companies = rounds.flatMap(r => r.companies || []);

      return {
        id: estimateId,
        name: est.name,
        priceCatalog: est.price_list_id
          ? {
            id: est.price_list_id,
            name: est.name ? `Listino ${est.name}` : `Listino ${est.price_list_id}`,
          }
          : undefined,
        rounds,
        companies, // Kept for backward compat if any
        roundsCount: rounds.length,
        companiesCount: companies.length,
        totalAmount: totalsMap.get(estimateId) || 0,
      };
    }),
  };
});
