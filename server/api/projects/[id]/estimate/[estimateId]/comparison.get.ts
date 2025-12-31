import { defineEventHandler, getQuery } from 'h3';
import { Types } from 'mongoose';
import { EstimateItem, Offer, OfferItem, PriceListItem, WbsNode } from '#models';
import { requireObjectIdParam, toObjectId } from '#utils/validate';

type OfferDoc = {
  _id: Types.ObjectId | string;
  company_name?: string | null;
  round_number?: number | null;
};

type OfferItemDoc = {
  offer_id?: Types.ObjectId | string | null;
  estimate_item_id?: Types.ObjectId | string | null;
  price_list_item_id?: Types.ObjectId | string | null;
  quantity?: number | null;
  unit_price?: number | null;
};

type PriceListItemDoc = {
  _id: Types.ObjectId | string;
  code?: string | null;
  description?: string | null;
  unit?: string | null;
  price?: number | null;
  wbs_ids?: Array<Types.ObjectId | string> | null;
};

type BaselineItem = {
  _id?: Types.ObjectId | string;
  code?: string | null;
  description?: string | null;
  description_extended?: string | null;
  unit_measure?: string | null;
  project?: {
    estimate_id?: Types.ObjectId | string;
    quantity?: number | null;
    unit_price?: number | null;
    amount?: number | null;
  };
  wbs_ids?: Array<Types.ObjectId | string> | null;
  price_list_item_id?: Types.ObjectId | string | null;
};

type OfferAggregation = {
  quantita: number;
  importo_totale: number;
  prezzo_unitario: number;
  delta_quantita: number;
  delta_perc: number;
  delta_media: number;
};

type ComparisonRow = {
  progressivo: number | null;
  codice: string;
  descrizione: string;
  descrizione_estesa: string;
  um: string;
  quantita: number;
  prezzo_unitario_progetto: number;
  importo_totale_progetto: number;
  wbs6_code?: string;
  wbs6_description?: string;
  wbs7_code?: string;
  wbs7_description?: string;
  offerte: Record<string, OfferAggregation>;
  media_prezzi?: number | null;
  minimo_prezzi?: number | null;
  massimo_prezzi?: number | null;
};

export default defineEventHandler(async (event) => {
  const projectId = requireObjectIdParam(event, 'id', 'Project ID');
  const estimateId = requireObjectIdParam(event, 'estimateId', 'Estimate ID');

  const query = getQuery(event);
  const rawRound = query.round as string | undefined;
  const rawCompany = query.company as string | undefined;

  const round =
    rawRound && rawRound !== 'null' && rawRound !== 'undefined' && rawRound !== 'all' && !Number.isNaN(Number(rawRound))
      ? Number(rawRound)
      : undefined;

  const company =
    rawCompany && rawCompany !== 'null' && rawCompany !== 'undefined' && rawCompany !== 'all'
      ? rawCompany
      : undefined;

  const projectObjectId = toObjectId(projectId);
  const estimateObjectId = toObjectId(estimateId);

  // 1. Fetch offers matching filters
  const offerMatch: Record<string, unknown> = { project_id: projectObjectId, estimate_id: estimateObjectId };
  if (round !== undefined) offerMatch.round_number = round;
  if (company) offerMatch.company_name = company;

  const offers = await Offer.find(offerMatch).lean<OfferDoc[]>();
  if (!offers.length) {
    return { voci: [], imprese: [], rounds: [] };
  }

  const offerIds = offers.map(o => o._id);

  // Build imprese metadata
  const imprese = offers.map((o) => ({
    nome: o.company_name || 'Impresa',
    round_number: o.round_number,
    round_label: o.round_number ? `Round ${o.round_number}` : undefined,
    impresa: o.company_name,
    etichetta: o.company_name,
  }));

  // Fetch ALL offers (unfiltered) for complete dropdown options
  const allOffers = await Offer.find({ project_id: projectObjectId, estimate_id: estimateObjectId }).lean<OfferDoc[]>();
  const allImprese = Array.from(new Set(allOffers.map(o => o.company_name))).filter(Boolean).map(nome => ({ nome }));
  const allRoundsMap = new Map<number, { numero: number; label: string }>();
  allOffers.forEach((o) => {
    const r = o.round_number || 0;
    if (!allRoundsMap.has(r)) {
      allRoundsMap.set(r, { numero: r, label: r ? `Round ${r}` : 'Round' });
    }
  });

  // Build rounds metadata
  const roundsMap = new Map<number, { numero: number; label: string; imprese: string[]; imprese_count: number }>();
  offers.forEach((o) => {
    const r = o.round_number || 0;
    const entry = roundsMap.get(r) || { numero: r, label: r ? `Round ${r}` : 'Round', imprese: [], imprese_count: 0 };
    if (o.company_name) entry.imprese.push(o.company_name);
    entry.imprese_count = entry.imprese.length;
    roundsMap.set(r, entry);
  });

  // 2. Fetch baseline items and price list info
  const baselineItems = await EstimateItem.find({ project_id: projectObjectId, 'project.estimate_id': estimateObjectId })
    .select('progressive code description description_extended unit_measure project wbs_ids price_list_item_id')
    .lean<BaselineItem[]>();

  // Collect price list ids from baseline and offer items
  const offerItemsPriceIds = await OfferItem.find({ offer_id: { $in: offerIds } })
    .select('price_list_item_id')
    .lean<OfferItemDoc[]>();
  const pliIdsFromOffers = offerItemsPriceIds
    .map(oi => oi.price_list_item_id)
    .filter(Boolean)
    .map(id => new Types.ObjectId(String(id)));

  const pliIds = Array.from(new Set([
    ...baselineItems.map(i => i.price_list_item_id).filter(Boolean).map(id => new Types.ObjectId(String(id))),
    ...pliIdsFromOffers
  ]));

  const priceItems = pliIds.length
    ? await PriceListItem.find({ _id: { $in: pliIds } })
      .select('code description unit price wbs_ids')
      .lean<PriceListItemDoc[]>()
    : [];
  const pliMap = new Map<string, PriceListItemDoc>();
  priceItems.forEach(p => pliMap.set(String(p._id), p));

  // WBS metadata: Fetch all WBS nodes for the estimate and build lookup by PLI
  const allWbsIds = new Set<string>();
  priceItems.forEach(p => {
    (p.wbs_ids || []).forEach((id) => allWbsIds.add(String(id)));
  });

  const wbsNodes = allWbsIds.size > 0
    ? await WbsNode.find({ _id: { $in: Array.from(allWbsIds).map(id => new Types.ObjectId(id)) } })
      .select('_id code description level')
      .lean()
    : [];

  const wbsNodeMap = new Map<string, { code: string; description?: string; level: number }>();
  wbsNodes.forEach(n => wbsNodeMap.set(String(n._id), { code: n.code, description: n.description, level: n.level }));

  // Build WBS lookup per PLI
  const wbsLookup = new Map<string, { wbs6_code?: string; wbs6_description?: string; wbs7_code?: string; wbs7_description?: string }>();
  priceItems.forEach(p => {
    const wbsData: { wbs6_code?: string; wbs6_description?: string; wbs7_code?: string; wbs7_description?: string } = {};
    (p.wbs_ids || []).forEach((id) => {
      const node = wbsNodeMap.get(String(id));
      if (node) {
        if (node.level === 6) {
          wbsData.wbs6_code = node.code;
          wbsData.wbs6_description = node.description;
        } else if (node.level === 7) {
          wbsData.wbs7_code = node.code;
          wbsData.wbs7_description = node.description;
        }
      }
    });
    wbsLookup.set(String(p._id), wbsData);
  });

  // 3. Fetch offer items
  const offerItems = await OfferItem.find({ offer_id: { $in: offerIds } })
    .select('offer_id estimate_item_id price_list_item_id quantity unit_price')
    .lean<OfferItemDoc[]>();

  // Map offers by id -> company name
  const offerCompanyMap = new Map<string, string>();
  offers.forEach(o => offerCompanyMap.set(String(o._id), o.company_name || 'Impresa'));

  // Precompute baseline aggregates per PLI
  const baselineAgg = new Map<string, { qty: number; amount: number; unit: number }>();
  baselineItems.forEach((item) => {
    const pliId = item.price_list_item_id;
    if (!pliId) return;
    const pli = pliMap.get(pliId) || {};
    const qty = item.project?.quantity ?? 0;
    const unitPriceProj = item.project?.unit_price ?? pli.price ?? 0;
    const amountProj = item.project?.amount ?? qty * unitPriceProj;
    const agg = baselineAgg.get(pliId) || { qty: 0, amount: 0, unit: unitPriceProj };
    agg.qty += qty;
    agg.amount += amountProj;
    agg.unit = unitPriceProj || agg.unit;
    baselineAgg.set(pliId, agg);
  });

  // Build rows aggregated by PriceListItem (and alias by estimate_item_id to match detailed offers)
  const rowsMap = new Map<string, ComparisonRow>();
  baselineItems.forEach((item) => {
    const pliId = item.price_list_item_id;
    if (!pliId) return;
    const pli = pliMap.get(pliId) || {};
    const key = String(pliId);
    const agg = baselineAgg.get(pliId) || { qty: 0, amount: 0, unit: pli.price ?? 0 };

    let row = rowsMap.get(key);
    if (!row) {
      const wbsData = wbsLookup.get(pliId) || {};
      row = {
        progressivo: null,
        codice: item.code || pli.code || '',
        descrizione: item.description || pli.description || '',
        descrizione_estesa: item.description_extended || item.description || pli.description || '',
        um: item.unit_measure || pli.unit || '',
        quantita: agg.qty,
        prezzo_unitario_progetto: agg.unit,
        importo_totale_progetto: agg.amount,
        wbs6_code: wbsData.wbs6_code,
        wbs6_description: wbsData.wbs6_description,
        wbs7_code: wbsData.wbs7_code,
        wbs7_description: wbsData.wbs7_description,
        offerte: {} as Record<string, OfferAggregation>,
      };
      rowsMap.set(key, row);
    } else {
      row.quantita = agg.qty;
      row.importo_totale_progetto = agg.amount;
      row.prezzo_unitario_progetto = agg.unit;
    }

    // Alias by estimate item id so detailed offers can attach
    if (item._id) {
      rowsMap.set(String(item._id), row);
    }
  });

  // OfferItems mapping
  offerItems.forEach((oi) => {
    const offerIdStr = String(oi.offer_id);
    const companyName = offerCompanyMap.get(offerIdStr) || 'Impresa';
    let key: string | undefined;

    // We prefer looking up by PriceListItem to aggregate
    // If we look up by EstimateItem, we get the shared row for that PLI anyway
    if (oi.estimate_item_id) {
      key = String(oi.estimate_item_id);
    } else if (oi.price_list_item_id) {
      key = String(oi.price_list_item_id);
    }

    if (!key) return;
    let row = rowsMap.get(key);

    // If not found (aggregated without baseline), create a row from PLI
    if (!row && oi.price_list_item_id) {
      const pliKey = String(oi.price_list_item_id);
      // Try finding by PLI key directly if we came in with only estimate_item_id but it failed map lookup 
      // (unlikely if map is correctly built, but safety check)
      row = rowsMap.get(pliKey);

      if (!row) {
        const pli = pliMap.get(pliKey) || {};
        const agg = baselineAgg.get(pliKey) || { qty: 0, amount: 0, unit: pli.price ?? 0 };
        const wbsData = wbsLookup.get(pliKey) || {};
        row = {
          progressivo: null,
          codice: pli.code || '',
          descrizione: pli.description || '',
          descrizione_estesa: pli.description || '',
          um: pli.unit || '',
          quantita: agg.qty,
          prezzo_unitario_progetto: agg.unit || 0,
          importo_totale_progetto: agg.amount,
          wbs6_code: wbsData.wbs6_code,
          wbs6_description: wbsData.wbs6_description,
          wbs7_code: wbsData.wbs7_code,
          wbs7_description: wbsData.wbs7_description,
          offerte: {} as Record<string, OfferAggregation>,
        };
        rowsMap.set(pliKey, row);
      }
    }

    if (!row) return;

    const prezzoUnitario = oi.unit_price ?? 0;
    const quantita = oi.quantity ?? 0;
    const importoTotale = quantita * prezzoUnitario;

    // Initialize or Aggregate
    if (!row.offerte[companyName]) {
      row.offerte[companyName] = {
        quantita: 0,
        importo_totale: 0,
        prezzo_unitario: 0,
        delta_quantita: 0,
        delta_perc: 0,
        delta_media: 0
      };
    }

    const offerEntry = row.offerte[companyName];
    offerEntry.quantita += quantita;
    offerEntry.importo_totale += importoTotale;

    // Recalculate unitary avg price
    if (offerEntry.quantita > 0) {
      offerEntry.prezzo_unitario = offerEntry.importo_totale / offerEntry.quantita;
    }

    // Deltas are computed after full aggregation or on the fly? 
    // Since we are summing up, we should compute deltas at the end or update them iteratively.
    // Iterative update is tricky for percentages. Easier to recompute at the end.
  });

  // Post-process offers to compute deltas
  // Deduplicate rows (Set logic)
  const uniqueRows: ComparisonRow[] = Array.from(new Set(rowsMap.values()));

  uniqueRows.forEach((row) => {
    Object.values(row.offerte).forEach((offerteEntry) => {
      offerteEntry.delta_quantita = offerteEntry.quantita - (row.quantita || 0);
      if (row.prezzo_unitario_progetto) {
        offerteEntry.delta_perc = ((offerteEntry.prezzo_unitario - row.prezzo_unitario_progetto) / row.prezzo_unitario_progetto) * 100;
      }
    });
  });

  // Compute min/max/media and delta media per impresa
  uniqueRows.forEach((row) => {
    const prezzi: number[] = [];
    Object.values(row.offerte || {}).forEach((off) => {
      if (typeof off.prezzo_unitario === 'number') prezzi.push(off.prezzo_unitario);
    });

    if (prezzi.length) {
      const somma = prezzi.reduce((a, b) => a + b, 0);
      const media = somma / prezzi.length;
      row.media_prezzi = media;
      row.minimo_prezzi = Math.min(...prezzi);
      row.massimo_prezzi = Math.max(...prezzi);
      Object.entries(row.offerte || {}).forEach(([, off]) => {
        if (off.prezzo_unitario != null && Math.abs(media) > 1e-9) {
          off.delta_media = ((off.prezzo_unitario - media) / media) * 100;
        }
      });
    } else {
      row.media_prezzi = null;
      row.minimo_prezzi = null;
      row.massimo_prezzi = null;
    }
  });

  // Filter out rows without offers if needed, or keep them to show gaps.
  // Original logic: items.filter(r => Object.keys(r.offerte || {}).length > 0)
  // Usually we strictly want rows with offers in this view?
  const filteredRows = uniqueRows.filter(r => Object.keys(r.offerte || {}).length > 0);

  return {
    voci: filteredRows,
    imprese,
    rounds: Array.from(roundsMap.values()),
    // Complete lists for filter dropdowns (unaffected by current filter)
    all_rounds: Array.from(allRoundsMap.values()),
    all_imprese: allImprese,
  };
});
