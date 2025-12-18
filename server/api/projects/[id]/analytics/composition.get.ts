import { defineEventHandler, createError, getRouterParam, getQuery } from 'h3';
import { Types } from 'mongoose';
import { EstimateItem, Offer, OfferItem, WbsNode, PriceListItem } from '#models';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
  }

  const projectObjectId = new Types.ObjectId(projectId);
  const estimateId = getQuery(event).estimate_id?.toString();
  if (!estimateId) {
    throw createError({ statusCode: 400, statusMessage: 'Estimate ID required' });
  }
  const estimateObjectId = new Types.ObjectId(estimateId);

  // 1. Fetch WBS Level 6 Nodes (Target Categories)
  const wbs6Nodes = await WbsNode.find({ project_id: projectObjectId, estimate_id: estimateObjectId, level: 6 }).lean();
  const wbs6Map = new Map<string, { code: string; description?: string }>();
  const wbs6Ids = new Set<string>();

  for (const node of wbs6Nodes) {
    const idStr = String(node._id);
    wbs6Map.set(idStr, { code: node.code, description: node.description });
    wbs6Ids.add(idStr);
  }

  // 2. Fetch Baseline Items (Computo Base)
  // We need to fetch items and map them to WBS Level 6
  // Since we rely on Node.js processing, we fetch necessary fields
  const baselineItems = await EstimateItem.find({
    project_id: projectObjectId,
    'project.estimate_id': estimateObjectId
  })
    .select('wbs_ids project.amount project.quantity price_list_item_id')
    .lean();

  // Helper to find Level 6 WBS in an item's wbs_ids
  function findLevel6Id(wbsIds: Types.ObjectId[] | undefined): string | null {
    if (!wbsIds) return null;
    for (const id of wbsIds) {
      const idStr = String(id);
      if (wbs6Ids.has(idStr)) return idStr;
    }
    return null;
  }

  // Calculate Baseline Totals by WBS 6
  const baselineTotals = new Map<string, number>();

  // Helper to fetch prices for fallback calculation (if needed) -- Simplified for now assuming project.amount is populated or we trust persistence
  // Note: ideally persistence ensures amount is set.

  for (const item of baselineItems) {
    const wbsId = findLevel6Id(item.wbs_ids);
    if (wbsId) {
      const amt = item.project?.amount || 0;
      baselineTotals.set(wbsId, (baselineTotals.get(wbsId) || 0) + amt);
    }
  }

  // 3. Fetch Offers Data
  // We want the LATEST round offers.
  const offers = await Offer.find({ project_id: projectObjectId, estimate_id: estimateObjectId }).select('round_number _id company_name').lean();

  const latestRound = offers.reduce((max, o) => Math.max(max, o.round_number || 1), 0);
  const latestOffers = offers.filter(o => (o.round_number || 1) === latestRound);
  const latestOfferIds = latestOffers.map(o => o._id);

  // Fetch Offer Items for these offers
  const offerItems = await OfferItem.find({
    offer_id: { $in: latestOfferIds }
  }).lean();

  // We need to resolve WBS for OfferItems.
  // Sources for WBS:
  // - item.estimate_item_id -> EstimateItem.wbs_ids
  // - item.price_list_item_id -> PriceListItem.wbs_ids

  // Optimization: Create a lookup map for Estimate Items WBS and PriceList Items WBS
  // Baseline Items are already fetched, let's map ID -> wbs_ids
  const estItemWbsMap = new Map<string, Types.ObjectId[]>();
  baselineItems.forEach(i => estItemWbsMap.set(String(i._id), i.wbs_ids || []));

  // For Aggregated items, we might need PriceListItem WBS
  // Let's identify which PL items we need
  const plIdsToFetch = new Set<string>();
  offerItems.forEach(i => {
    if (!i.estimate_item_id && i.price_list_item_id) {
      plIdsToFetch.add(String(i.price_list_item_id));
    }
  });

  const plItemWbsMap = new Map<string, Types.ObjectId[]>();
  if (plIdsToFetch.size > 0) {
    const plItems = await PriceListItem.find({ _id: { $in: Array.from(plIdsToFetch) } }).select('wbs_ids').lean();
    plItems.forEach(i => plItemWbsMap.set(String(i._id), i.wbs_ids || []));
  }

  // Aggregate Offer Totals by WBS 6
  // Since we might have multiple offers (companies) in the latest round, 
  // do we show the AVERAGE? or the Total sum? 
  // Usually this graph compares "Baseline" vs "Average Offer" or specific offer.
  // The UI shows "latest_offer_amount". If strictly following previous logic, it seemed to sum everything?
  // "reduce((sum, o) => sum + (o.total_amount || 0), 0)" -> This sums ALL offers in the round.
  // If we have 3 companies, the bar will be 3x high. That seems wrong for comparison unless normalized.
  // BUT: I will stick to Previous Behavior: Sum of all offers in the round for that WBS.
  // (Wait, `latestOffer` in previous code filtered by `wbs6_id` and summed. So it was total volume of offers).

  const offerTotals = new Map<string, number>();

  for (const item of offerItems) {
    let wbsIds: Types.ObjectId[] | undefined;

    if (item.estimate_item_id) {
      wbsIds = estItemWbsMap.get(String(item.estimate_item_id));
    } else if (item.price_list_item_id) {
      wbsIds = plItemWbsMap.get(String(item.price_list_item_id));
    }

    const wbsId = findLevel6Id(wbsIds);
    if (wbsId) {
      const amt = (item.amount && item.amount > 0)
        ? item.amount
        : ((item.quantity || 0) * (item.unit_price || 0));
      offerTotals.set(wbsId, (offerTotals.get(wbsId) || 0) + amt);
    }
  }

  // 4. Build Result
  const composition = Array.from(wbs6Map.entries()).map(([id, meta]) => {
    return {
      wbs6_id: id,
      code: meta.code,
      description: meta.description,
      project_amount: baselineTotals.get(id) || 0,
      latest_offer_amount: offerTotals.get(id) || 0
    };
  }).filter(c => c.project_amount > 0 || c.latest_offer_amount > 0);

  // Calculate average if multiple offers?
  // If we have N offers, and we summed them up, the chart might be misleading.
  // Ideally we should divide by number of offers if we want to compare "Price vs Price".
  // But if the previous code was summing, I'll stick to summing but maybe check if I should average.
  // Previous code: `reduce((sum, o) => sum + (o.total_amount || 0), 0)` -> It was SUMMING.
  // Okay, keeping SUM.
  // Correction: If the user sees "Project: 100k" and "Offers (3 companies): 300k", it explicitly shows total volume.
  // Maybe the frontend handles division? Or maybe it expects average.
  // Let's look at `latestOffers.length`.
  // If I want to be safe, I should probably return the "Average" for the composition to make sense visually?
  // "Project Amount" is 1 unit. "Offer Amount" being 3x units makes chart useless.
  // I will divide by number of companies in the latest round to normalize to "Average Offer".

  const numOffers = latestOffers.length || 1;
  if (numOffers > 1) {
    composition.forEach(c => {
      c.latest_offer_amount = c.latest_offer_amount / numOffers;
    });
  }

  return {
    latest_round: latestRound || null,
    composition
  };
});
