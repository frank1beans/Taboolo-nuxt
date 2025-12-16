import { defineEventHandler, createError, getRouterParam } from 'h3';
import { Types } from 'mongoose';
import { Estimate, EstimateItem, Project } from '#models';
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

  const offerAgg = estimateObjectIds.length
    ? await EstimateItem.aggregate([
      {
        $match: {
          project_id: projectObjectId,
          'offers.estimate_id': { $in: estimateObjectIds },
        },
      },
      { $unwind: '$offers' },
      {
        $match: {
          'offers.estimate_id': { $in: estimateObjectIds },
        },
      },
      {
        $group: {
          _id: '$offers.estimate_id',
          rounds: { $addToSet: '$offers.round_number' },
          companies: { $addToSet: '$offers.company' },
        },
      },
    ])
    : [];

  const offerMap = new Map<
    string,
    {
      rounds: number[];
      companies: string[];
    }
  >();

  offerAgg.forEach((row) => {
    const idStr = row._id?.toString();
    if (!idStr) return;
    const rounds = (row.rounds || []).filter(
      (round: number | null | undefined) => round !== null && round !== undefined,
    ) as number[];
    const companies = (row.companies || []).filter((company: string | null | undefined) => company) as string[];
    offerMap.set(idStr, { rounds, companies });
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
      const offerInfo = offerMap.get(estimateId);
      const rounds = (offerInfo?.rounds ?? []).map((roundNumber) => ({
        id: `${estimateId}-${roundNumber}`,
        name: `Round ${roundNumber}`,
      }));
      const companies = (offerInfo?.companies ?? []).map((companyName) => ({
        id: `${estimateId}-${companyName}`,
        name: companyName,
      }));

      return {
        id: estimateId,
        name: est.name,
        priceCatalog: est.price_list_id
          ? { id: est.price_list_id, name: `Listino ${est.price_list_id}` }
          : undefined,
        rounds,
        companies,
        roundsCount: rounds.length,
        companiesCount: companies.length,
        totalAmount: totalsMap.get(estimateId) || 0,
      };
    }),
  };
});
