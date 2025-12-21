
import type { ClientSession } from 'mongoose';
import { Types } from 'mongoose';
import { Estimate, EstimateItem, Offer, OfferItem, PriceList, PriceListItem, WbsNode } from '#models';
import { normalizeTextFields } from '#utils/normalize';

type EstimateInput = {
  _id?: string;
  id?: string;
  name?: string;
  type?: string;
  discipline?: string;
  revision?: string;
  is_baseline?: boolean;
  company?: string;
  round_number?: number;
  total_amount?: number;
  delta_vs_project?: number;
  delta_percentage?: number;
  notes?: string;
  file_name?: string;
  delivery_date?: string | Date;
  price_list_id?: string;
  source_preventivo_id?: string;
  import_run_id?: string;
  matching_report?: unknown;
};

type EstimateItemEntry = {
  wbs_levels?: Array<{ level?: number; code?: string }>;
  wbs6_code?: string;
  wbs7_code?: string;
  code?: string;
  progressive?: number;
  order?: number;
  quantity?: number;
  unit_price?: number;
  amount?: number;
  total_amount?: number;
  total_amount?: number;
  notes?: string;
  // description/extended removed - sourced from PL
  unit?: string;
};

type EstimateItemDoc = {
  project_id: Types.ObjectId;
  wbs_ids: Types.ObjectId[];
  code: string;
  // description/extended removed
  unit?: string;
  progressive?: number;
  order: number;
  import_run_id?: string;
  source_preventivo_id?: string;
  project: {
    estimate_id: Types.ObjectId;
    quantity: number;
    unit_price: number;
    amount: number;
    notes?: string;
  };
  offers: unknown[];
};

const normalizeType = (value: string | undefined): 'project' | 'offer' => {
  return value === 'project' ? 'project' : 'offer';
};

/**
 * Upsert an estimate document in MongoDB.
 * Accepts data coming from the Python importer (already mapped by python-mappers.ts).
 */
export async function upsertEstimate(projectId: string, data: EstimateInput) {
  const projectObjectId = new Types.ObjectId(projectId);
  const estimateId = data._id || data.id || undefined;

  const payload = {
    project_id: projectObjectId,
    name: data.name ?? 'Unnamed',
    type: normalizeType(data.type),
    discipline: data.discipline,
    revision: data.revision,
    is_baseline: Boolean(data.is_baseline),
    company: data.company,
    round_number: data.round_number,
    total_amount: data.total_amount,
    delta_vs_project: data.delta_vs_project,
    delta_percentage: data.delta_percentage,
    notes: data.notes,
    file_name: data.file_name,
    delivery_date: data.delivery_date ? new Date(data.delivery_date) : undefined,
    price_list_id: data.price_list_id,
    source_preventivo_id: data.source_preventivo_id,
    import_run_id: data.import_run_id,
    matching_report: data.matching_report,
  };

  if (estimateId) {
    return Estimate.findByIdAndUpdate(
      estimateId,
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  return Estimate.create(payload);
}

/**
 * Best-effort upsert for multiple estimates (e.g., batch import).
 */
export async function upsertEstimatesBatch(
  projectId: string,
  estimates: EstimateInput[] = [],
) {
  const saved: Record<string, unknown> = {};

  for (const estimate of estimates) {
    const doc = await upsertEstimate(projectId, estimate);
    const key = estimate.code || estimate.name || estimate.id || doc._id.toString();
    saved[key] = doc;
  }

  return saved;
}

/**
 * Persist estimate items coming from SIX import.
 */
export async function upsertEstimateItems(
  projectId: string,
  estimateId: string,
  items: EstimateItemEntry[] = [],
  wbs6Map: Record<string, string> = {},
  wbs7Map: Record<string, string> = {},
  importRunId?: string,
  sourcePreventivoId?: string,
) {
  if (!items.length) return;
  const projectObjectId = new Types.ObjectId(projectId);
  const estimateObjectId = new Types.ObjectId(estimateId);

  // Remove previous items for this estimate to avoid duplicates
  await EstimateItem.deleteMany({ 'project.estimate_id': estimateObjectId, project_id: projectObjectId });

  const buildWbsCodes = (entry: EstimateItemEntry) => {
    let w6: string | undefined;
    let w7: string | undefined;
    const levels = Array.isArray(entry.wbs_levels) ? entry.wbs_levels : [];
    for (const lvl of levels) {
      if (lvl?.level === 6 && !w6) w6 = lvl.code;
      if (lvl?.level === 7 && !w7) w7 = lvl.code;
    }
    if (!w6 && entry.wbs6_code) w6 = entry.wbs6_code;
    if (!w7 && entry.wbs7_code) w7 = entry.wbs7_code;
    return { w6, w7 };
  };

  const docs = items
    .map<EstimateItemDoc | null>((entry) => {
      const { w6, w7 } = buildWbsCodes(entry);
      const wbs6Id = w6 ? wbs6Map[w6] : undefined;
      // if (!wbs6Id) return null; // skip items without a mapped WBS6
      // Adapting to wbs_ids array
      const ids: Types.ObjectId[] = [];
      if (wbs6Id) ids.push(new Types.ObjectId(wbs6Id));
      if (w7) { const id7 = wbs7Map[w7]; if (id7) ids.push(new Types.ObjectId(id7)); }

      const { unit } = normalizeTextFields(entry);

      return {
        project_id: projectObjectId,
        wbs_ids: ids,
        code: entry.code ?? '',
        // description fields removed - rely on PL
        unit: (unit as string) || undefined,
        progressive: entry.progressive ?? entry.order,
        order: entry.order ?? 0,
        import_run_id: importRunId,
        source_preventivo_id: sourcePreventivoId,
        project: {
          estimate_id: estimateObjectId,
          quantity: entry.quantity ?? 0,
          unit_price: entry.unit_price ?? 0,
          amount: entry.amount ?? entry.total_amount ?? 0,
          notes: entry.notes,
        },
        offers: [],
      };
    })
    .filter((doc): doc is EstimateItemDoc => doc !== null);

  if (docs.length) {
    await EstimateItem.insertMany(docs, { ordered: false });
  }
}

/**
 * Delete an estimate and all related data (items, price lists/items, WBS, OFFERS) in a single helper.
 * Accepts optional session to participate in a wider transaction.
 */
export async function deleteEstimateCascade(
  projectId: string,
  estimateId: string,
  session?: ClientSession,
) {
  const projectObjectId = new Types.ObjectId(projectId);
  const estimateObjectId = new Types.ObjectId(estimateId);
  const opts = session ? { session } : undefined;

  // 1. Delete associated Offers and OfferItems
  console.log(`[EstimateService] Finding Offers for Est ${estimateId}...`);
  const offers = await Offer.find({
    project_id: projectObjectId,
    estimate_id: estimateObjectId
  }, '_id', opts);

  const offerIds = offers.map(o => o._id);
  console.log(`[EstimateService] Found ${offerIds.length} Offers to delete`);

  let deletedOfferItems = 0;
  if (offerIds.length > 0) {
    console.log(`[EstimateService] Deleting OfferItems for ${offerIds.length} offers...`);
    const offerItemsResult = await OfferItem.deleteMany({
      offer_id: { $in: offerIds }
    }, opts);
    deletedOfferItems = offerItemsResult.deletedCount ?? 0;
    console.log(`[EstimateService] Deleted ${deletedOfferItems} OfferItems`);
  }

  console.log(`[EstimateService] Deleting Offers...`);
  const offersResult = await Offer.deleteMany({
    project_id: projectObjectId,
    estimate_id: estimateObjectId
  }, opts);
  console.log(`[EstimateService] Deleted ${offersResult.deletedCount} Offers`);

  // 2. Existing Deletions
  console.log(`[EstimateService] Deleting EstimateItems for Est ${estimateId}...`);
  const itemsResult = await EstimateItem.deleteMany({
    project_id: projectObjectId,
    'project.estimate_id': estimateObjectId,
  }, opts);
  console.log(`[EstimateService] Deleted ${itemsResult.deletedCount} EstimateItems`);

  console.log(`[EstimateService] Deleting PriceListItems for Est ${estimateId}...`);
  const priceItemsResult = await PriceListItem.deleteMany({
    project_id: projectObjectId,
    estimate_id: estimateObjectId,
  }, opts);
  console.log(`[EstimateService] Deleted ${priceItemsResult.deletedCount} PriceListItems`);

  console.log(`[EstimateService] Deleting PriceLists for Est ${estimateId}...`);
  const priceListsResult = await PriceList.deleteMany({
    project_id: projectObjectId,
    estimate_id: estimateObjectId,
  }, opts);
  console.log(`[EstimateService] Deleted ${priceListsResult.deletedCount} PriceLists`);

  console.log(`[EstimateService] Deleting WBS for Est ${estimateId}...`);
  const wbsResult = await WbsNode.deleteMany({
    project_id: projectObjectId,
    estimate_id: estimateObjectId,
  }, opts);
  console.log(`[EstimateService] Deleted ${wbsResult.deletedCount} WBSNodes`);

  console.log(`[EstimateService] Deleting Estimate doc ${estimateId}...`);
  const estimateResult = await Estimate.deleteOne({
    _id: estimateObjectId,
    project_id: projectObjectId,
  }, opts);
  console.log(`[EstimateService] Deleted ${estimateResult.deletedCount} Estimate doc`);

  return {
    deletedOffers: offersResult.deletedCount ?? 0,
    deletedOfferItems,
    deletedItems: itemsResult.deletedCount ?? 0,
    deletedPriceItems: priceItemsResult.deletedCount ?? 0,
    deletedPriceLists: priceListsResult.deletedCount ?? 0,
    deletedWbs: wbsResult.deletedCount ?? 0,
    deletedEstimates: estimateResult.deletedCount ?? 0,
  };
}
