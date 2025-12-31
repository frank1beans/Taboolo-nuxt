import { Types } from 'mongoose';
import { Estimate, EstimateItem, PriceList, PriceListItem, WbsNode } from '#models';

type MergeRequest = {
  estimate_ids: string[];
  name?: string;
  price_list_name?: string;
  set_as_baseline?: boolean;
};

type MergeMismatchEntry = {
  code: string;
  description?: string | null;
  unit?: string | null;
  quantity: {
    min: number | null;
    max: number | null;
    by_estimate: Array<{
      estimate_id: string;
      estimate_name?: string | null;
      quantity: number | null;
    }>;
  };
  unit_price: {
    min: number | null;
    max: number | null;
    by_estimate: Array<{
      estimate_id: string;
      estimate_name?: string | null;
      unit_price: number | null;
    }>;
  };
  quantity_mismatch: boolean;
  price_mismatch: boolean;
};

type MergeReport = {
  type: 'merge';
  created_at: string;
  source_estimate_ids: string[];
  mismatches: MergeMismatchEntry[];
  summary: {
    total_codes: number;
    mismatches: number;
    quantity_mismatches: number;
    price_mismatches: number;
  };
};

const normalizeCode = (value?: string | null) => (value ?? '').trim().toLowerCase();
const isObjectIdString = (value: string) => /^[0-9a-fA-F]{24}$/.test(value);

const buildMergeReport = (
  codeAggregates: Map<string, {
    code: string;
    description?: string | null;
    unit?: string | null;
    values: Array<{
      estimate_id: string;
      estimate_name?: string | null;
      quantity: number | null;
      unit_price: number | null;
    }>;
  }>,
  sourceEstimateIds: string[],
): MergeReport => {
  const mismatches: MergeMismatchEntry[] = [];
  const tolerance = 1e-6;

  for (const [, entry] of codeAggregates) {
    if (entry.values.length < 2) continue;

    const quantities = entry.values
      .map((v) => v.quantity)
      .filter((v): v is number => typeof v === 'number');
    const prices = entry.values
      .map((v) => v.unit_price)
      .filter((v): v is number => typeof v === 'number');

    const qtyMin = quantities.length ? Math.min(...quantities) : null;
    const qtyMax = quantities.length ? Math.max(...quantities) : null;
    const priceMin = prices.length ? Math.min(...prices) : null;
    const priceMax = prices.length ? Math.max(...prices) : null;

    const quantityMismatch =
      qtyMin !== null && qtyMax !== null && Math.abs(qtyMax - qtyMin) > tolerance;
    const priceMismatch =
      priceMin !== null && priceMax !== null && Math.abs(priceMax - priceMin) > tolerance;

    if (!quantityMismatch && !priceMismatch) continue;

    mismatches.push({
      code: entry.code,
      description: entry.description ?? null,
      unit: entry.unit ?? null,
      quantity: {
        min: qtyMin,
        max: qtyMax,
        by_estimate: entry.values.map((v) => ({
          estimate_id: v.estimate_id,
          estimate_name: v.estimate_name ?? null,
          quantity: v.quantity ?? null,
        })),
      },
      unit_price: {
        min: priceMin,
        max: priceMax,
        by_estimate: entry.values.map((v) => ({
          estimate_id: v.estimate_id,
          estimate_name: v.estimate_name ?? null,
          unit_price: v.unit_price ?? null,
        })),
      },
      quantity_mismatch: quantityMismatch,
      price_mismatch: priceMismatch,
    });
  }

  const quantityMismatches = mismatches.filter((m) => m.quantity_mismatch).length;
  const priceMismatches = mismatches.filter((m) => m.price_mismatch).length;

  return {
    type: 'merge',
    created_at: new Date().toISOString(),
    source_estimate_ids: sourceEstimateIds,
    mismatches,
    summary: {
      total_codes: codeAggregates.size,
      mismatches: mismatches.length,
      quantity_mismatches: quantityMismatches,
      price_mismatches: priceMismatches,
    },
  };
};

export async function mergeEstimates(projectId: string, payload: MergeRequest) {
  const projectObjectId = new Types.ObjectId(projectId);
  const estimateIds = Array.from(
    new Set((payload.estimate_ids || []).filter((id) => typeof id === 'string' && id.trim())),
  );

  if (estimateIds.length < 2) {
    throw new Error('At least two estimate IDs are required to merge.');
  }

  const invalidIds = estimateIds.filter((id) => !Types.ObjectId.isValid(id));
  if (invalidIds.length) {
    throw new Error(`Invalid estimate IDs: ${invalidIds.join(', ')}`);
  }

  const estimates = await Estimate.find({
    project_id: projectObjectId,
    _id: { $in: estimateIds.map((id) => new Types.ObjectId(id)) },
  }).lean();

  if (estimates.length !== estimateIds.length) {
    throw new Error('One or more estimates were not found in the project.');
  }

  const estimateName = payload.name || `Merge ${new Date().toISOString().slice(0, 10)}`;
  const priceListName = payload.price_list_name || `${estimateName} - Listino`;

  const mergedEstimate = await Estimate.create({
    project_id: projectObjectId,
    name: estimateName,
    type: 'project',
    is_baseline: Boolean(payload.set_as_baseline),
  });

  const priceList = await PriceList.create({
    project_id: projectObjectId,
    estimate_id: mergedEstimate._id,
    name: priceListName,
    currency: 'EUR',
    is_default: true,
  });

  const wbsDocs: Array<Record<string, unknown>> = [];
  const priceItemDocs: Array<Record<string, unknown>> = [];
  const estimateItemDocs: Array<Record<string, unknown>> = [];

  const codeAggregates = new Map<string, {
    code: string;
    description?: string | null;
    unit?: string | null;
    values: Array<{
      estimate_id: string;
      estimate_name?: string | null;
      quantity: number | null;
      unit_price: number | null;
    }>;
  }>();

  let totalAmount = 0;

  for (const estimate of estimates) {
    const sourceEstimateId = estimate._id.toString();
    const sourceEstimateName = estimate.name || null;
    const sourceEstimateObjectId = new Types.ObjectId(sourceEstimateId);

    const wbsNodes = await WbsNode.find({
      project_id: projectObjectId,
      estimate_id: sourceEstimateObjectId,
    }).lean();

    const wbsIdMap = new Map<string, Types.ObjectId>();
    for (const node of wbsNodes) {
      wbsIdMap.set(String(node._id), new Types.ObjectId());
    }

    wbsNodes.forEach((node) => {
      const mappedId = wbsIdMap.get(String(node._id));
      if (!mappedId) return;
      wbsDocs.push({
        _id: mappedId,
        project_id: projectObjectId,
        estimate_id: mergedEstimate._id,
        parent_id: node.parent_id ? wbsIdMap.get(String(node.parent_id)) : undefined,
        type: node.type,
        level: node.level,
        category: node.category,
        code: node.code,
        description: node.description,
        wbs_spatial_id: node.wbs_spatial_id ? wbsIdMap.get(String(node.wbs_spatial_id)) : undefined,
        wbs6_id: node.wbs6_id ? wbsIdMap.get(String(node.wbs6_id)) : undefined,
        ancestors: (node.ancestors || [])
          .map((ancestor) => wbsIdMap.get(String(ancestor)))
          .filter(Boolean),
      });
    });

    const priceItems = await PriceListItem.find({
      project_id: projectObjectId,
      estimate_id: sourceEstimateObjectId,
    }).lean();

    const pliIdMap = new Map<string, Types.ObjectId>();
    const pliById = new Map<string, (typeof priceItems)[number]>();
    const pliByCode = new Map<string, string>();

    priceItems.forEach((pli) => {
      const oldId = String(pli._id);
      pliIdMap.set(oldId, new Types.ObjectId());
      pliById.set(oldId, pli);
      if (pli.code && !pliByCode.has(pli.code)) {
        pliByCode.set(pli.code, oldId);
      }
    });

    priceItems.forEach((pli) => {
      const mappedId = pliIdMap.get(String(pli._id));
      if (!mappedId) return;

      priceItemDocs.push({
        _id: mappedId,
        project_id: projectObjectId,
        estimate_id: mergedEstimate._id,
        code: pli.code,
        description: pli.description,
        long_description: pli.long_description,
        extended_description: pli.extended_description,
        unit: pli.unit,
        price: pli.price,
        wbs_ids: (pli.wbs_ids || [])
          .map((id) => wbsIdMap.get(String(id)))
          .filter(Boolean),
        price_list_id: priceList._id.toString(),
        import_run_id: pli.import_run_id,
        source_preventivo_id: sourceEstimateId,
        price_lists: pli.price_lists,
        extracted_properties: pli.extracted_properties,
        map2d: pli.map2d,
        map3d: pli.map3d,
        cluster: pli.cluster,
        map_version: pli.map_version,
        map_updated_at: pli.map_updated_at,
      });
    });

    const estimateItems = await EstimateItem.find({
      project_id: projectObjectId,
      'project.estimate_id': sourceEstimateObjectId,
    }).lean();

    const perEstimateCodeAgg = new Map<string, {
      code: string;
      description?: string | null;
      unit?: string | null;
      quantity: number;
      amount: number;
    }>();

    estimateItems.forEach((item) => {
      const mappedWbsIds = (item.wbs_ids || [])
        .map((id) => wbsIdMap.get(String(id)))
        .filter(Boolean);

      const rawPliId = item.price_list_item_id;
      let mappedPliId = rawPliId && pliIdMap.get(rawPliId);

      if (!mappedPliId && rawPliId) {
        if (!isObjectIdString(rawPliId)) {
          const byCode = pliByCode.get(rawPliId);
          if (byCode) mappedPliId = pliIdMap.get(byCode);
        }
      }

      if (!mappedPliId) {
        const fallbackKey = rawPliId || item.code || `fallback-${new Types.ObjectId().toString()}`;
        const existingFallback = pliIdMap.get(fallbackKey);
        if (existingFallback) {
          mappedPliId = existingFallback;
        } else {
          const newFallbackId = new Types.ObjectId();
          pliIdMap.set(fallbackKey, newFallbackId);
          mappedPliId = newFallbackId;
          priceItemDocs.push({
            _id: newFallbackId,
            project_id: projectObjectId,
            estimate_id: mergedEstimate._id,
            code: item.code || rawPliId || undefined,
            description: undefined,
            unit: item.unit_measure,
            price: item.project?.unit_price,
            wbs_ids: mappedWbsIds,
            price_list_id: priceList._id.toString(),
            source_preventivo_id: sourceEstimateId,
          });
        }
      }

      const quantity = item.project?.quantity ?? 0;
      const unitPrice = item.project?.unit_price ?? 0;
      const amount = item.project?.amount ?? quantity * unitPrice;

      estimateItemDocs.push({
        project_id: projectObjectId,
        wbs_ids: mappedWbsIds,
        price_list_item_id: mappedPliId.toString(),
        code: item.code,
        unit_measure: item.unit_measure,
        progressive: item.progressive,
        order: item.order ?? 0,
        import_run_id: item.import_run_id,
        source_preventivo_id: sourceEstimateId,
        related_item_id: item.related_item_id,
        project: {
          estimate_id: mergedEstimate._id,
          quantity,
          unit_price: unitPrice,
          amount,
          notes: item.project?.notes,
          measurements: item.project?.measurements,
        },
        offers: [],
      });

      totalAmount += amount;

      let pli = rawPliId ? pliById.get(rawPliId) : undefined;
      if (!pli && rawPliId && !isObjectIdString(rawPliId)) {
        const byCode = pliByCode.get(rawPliId);
        if (byCode) pli = pliById.get(byCode);
      }
      const itemCode = item.code || pli?.code || (rawPliId && !isObjectIdString(rawPliId) ? rawPliId : '');
      const normalized = normalizeCode(itemCode);
      if (!normalized) return;

      const description = pli?.description || pli?.long_description || undefined;
      const unit = item.unit_measure || pli?.unit || undefined;

      const agg = perEstimateCodeAgg.get(normalized) || {
        code: itemCode,
        description,
        unit,
        quantity: 0,
        amount: 0,
      };
      agg.quantity += quantity;
      agg.amount += amount;
      if (!agg.unit && unit) agg.unit = unit;
      if (!agg.description && description) agg.description = description;
      perEstimateCodeAgg.set(normalized, agg);
    });

    for (const [, agg] of perEstimateCodeAgg) {
      const unitPrice = agg.quantity > 0 ? agg.amount / agg.quantity : null;
      const normalized = normalizeCode(agg.code);
      if (!normalized) continue;

      const existing = codeAggregates.get(normalized) || {
        code: agg.code,
        description: agg.description ?? null,
        unit: agg.unit ?? null,
        values: [],
      };
      existing.values.push({
        estimate_id: sourceEstimateId,
        estimate_name: sourceEstimateName,
        quantity: agg.quantity,
        unit_price: unitPrice,
      });
      if (!existing.description && agg.description) existing.description = agg.description;
      if (!existing.unit && agg.unit) existing.unit = agg.unit;
      codeAggregates.set(normalized, existing);
    }
  }

  if (wbsDocs.length) {
    await WbsNode.insertMany(wbsDocs, { ordered: false });
  }
  if (priceItemDocs.length) {
    await PriceListItem.insertMany(priceItemDocs, { ordered: false });
  }
  if (estimateItemDocs.length) {
    await EstimateItem.insertMany(estimateItemDocs, { ordered: false });
  }

  const report = buildMergeReport(codeAggregates, estimateIds);

  await Estimate.findByIdAndUpdate(mergedEstimate._id, {
    $set: {
      price_list_id: priceList._id.toString(),
      total_amount: totalAmount,
      matching_report: report,
    },
  });

  return {
    success: true,
    estimate_id: mergedEstimate._id.toString(),
    price_list_id: priceList._id.toString(),
    report,
  };
}
