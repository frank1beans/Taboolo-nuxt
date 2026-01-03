import { Types } from 'mongoose';
import { WbsNode } from '../models/wbs.schema';
import { PriceListItem } from '../models/price-list-item.schema';
import { Estimate } from '../models/estimate.schema';
import { EstimateItem } from '../models/estimate-item.schema';
import { normalizeTextFields } from '../utils/normalize';

type PythonGroup = {
    _id?: string;
    id?: string;
    parentId?: string;
    type?: string;
    level?: number;
    code?: string;
    description?: string;
};

type PythonPriceListItem = {
    _id?: string;
    id?: string;
    wbsIds?: string[];
    wbs_ids?: string[];
    groupIds?: string[];
    code?: string;
    description?: string;
    long_description?: string;
    longDescription?: string;  // Pydantic alias
    extended_description?: string;
    extendedDescription?: string;  // Pydantic alias
    unit?: string;
    price?: number;
    priceListId?: string;
    embedding?: number[];
    extracted_properties?: Record<string, unknown>;
    extractedProperties?: Record<string, unknown>;
};

type PythonEstimateItem = {
    priceListItemId?: string;
    price_list_item_id?: string;
    wbsIds?: string[];
    wbs_ids?: string[];
    groupIds?: string[];
    quantity?: number;
    total_quantity?: number;
    unitPrice?: number;     // Correct price from measurement's price list (camelCase)
    unit_price?: number;    // Correct price from measurement's price list (snake_case)
    measurements?: unknown[];
    progressive?: number;
    order?: number;
    code?: string;
    description?: string;
    description_extended?: string;
    long_description?: string;
    unit?: string;
    relatedItemId?: string;
    related_item_id?: string;
};

type PythonPriceList = {
    name?: string;
    currency?: string;
    items?: PythonPriceListItem[];
};

type PythonOfferItem = {
    progressive?: number;
    order?: number;
    code?: string;
    codice?: string;
    description?: string;
    short_description?: string;
    descrizione?: string;
    long_description?: string;
    descrizione_estesa?: string;
    unit_price?: number;
    prezzo_unitario?: number;
    unit?: string;
    unita_misura?: string;
    quantity?: number;
    note?: string;
    notes?: string;
};

type PythonEstimate = {
    _id?: string;
    id?: string;
    name?: string;
    type?: string;
    mode?: string;
    company?: string;
    round_number?: number;
    notes?: string;
    date?: string;
    total_amount?: number;
    estimate_id?: string;
    items?: PythonEstimateItem[] | PythonOfferItem[];
};

interface PythonImportResult {
    project?: unknown;
    groups: PythonGroup[];
    price_list?: PythonPriceList | null;
    estimate: PythonEstimate;
}

type BaselineItemLean = {
    _id: Types.ObjectId;
    progressive?: number | null;
    code?: string | null;
    price_list_item_id?: string | null;
    project?: { unit_price?: number | null; quantity?: number | null };
    unit_measure?: string | null;
};

type PriceListItemLean = {
    _id: Types.ObjectId;
    code?: string | null;
    description?: string | null;
    long_description?: string | null;
    price?: number | null;
};

type OfferItemInsert = {
    offer_id: Types.ObjectId;
    project_id: Types.ObjectId;
    source: 'detailed' | 'aggregated';
    origin: 'baseline' | 'addendum';
    resolution_status: 'resolved' | 'pending';
    quantity: number;
    unit_price: number;
    notes?: string;
    candidate_price_list_item_ids?: Types.ObjectId[];
    code?: string;
    description?: string;
    unit_measure?: string;
    price_list_item_id?: Types.ObjectId;
    estimate_item_id?: Types.ObjectId;
    progressive?: number;
};

type BaselineAggregate = {
    totalQuantity: number;
    totalAmount: number;
};

type OfferAlertInsert = {
    project_id: Types.ObjectId;
    estimate_id?: Types.ObjectId;
    offer_id: Types.ObjectId;
    offer_item_id?: Types.ObjectId;
    estimate_item_id?: Types.ObjectId;
    price_list_item_id?: Types.ObjectId;
    candidate_price_list_item_ids?: Types.ObjectId[];
    source?: 'detailed' | 'aggregated';
    origin?: 'baseline' | 'addendum';
    type: 'price_mismatch' | 'quantity_mismatch' | 'code_mismatch' | 'missing_baseline' | 'ambiguous_match' | 'addendum';
    severity: 'info' | 'warning' | 'error';
    message?: string;
    actual?: number | string | null;
    expected?: number | string | null;
    delta?: number | null;
    code?: string | null;
    baseline_code?: string | null;
    imported_description?: string | null;
};

type PendingAlert = OfferAlertInsert & { itemIndex: number };

const isImportDebug = process.env.IMPORT_DEBUG === '1';

export async function persistImportResult(payload: PythonImportResult, projectId: string) {
    // Branch based on estimate type
    const estType = payload.estimate?.type; // 'project' | 'offer'

    if (estType === 'offer' || estType === 'ritorno') {
        return persistOffer(payload, projectId);
    }

    // Default flow for Project/Baseline (existing logic)
    return persistProjectEstimate(payload, projectId);
}

// Extracted from original persistImportResult
async function persistProjectEstimate(payload: PythonImportResult, projectId: string) {
    console.log(`[Persistence] Processing Project/Baseline import for project ${projectId}...`);
    const projectObjectId = new Types.ObjectId(projectId);

    // Ensure estimate id is known up-front (per-estimate namespace)
    const estData = payload.estimate;
    const existingEst = await Estimate.findOne({ project_id: projectObjectId, name: estData.name });
    const estimateId: Types.ObjectId = existingEst?._id ?? new Types.ObjectId();

    // 1. Groups (WBS) per estimate
    const groupMap = new Map<string, Types.ObjectId>();
    for (const g of payload.groups) {
        const newId = new Types.ObjectId();
        const sourceId = g._id || g.id || '';
        if (sourceId) groupMap.set(sourceId, newId);
    }

    const wbsDocs = payload.groups.map(g => {
        const sourceId = g._id || g.id || '';
        const mappedId = groupMap.get(sourceId);
        const mappedParent = g.parentId ? groupMap.get(g.parentId) : undefined;

        return {
            _id: mappedId,
            project_id: projectObjectId,
            estimate_id: estimateId,
            parent_id: mappedParent,
            type: g.type || ((g.level || 0) > 0 ? 'spatial' : 'commodity'),
            level: g.level || 0,
            code: g.code,
            description: g.description,
            ancestors: mappedParent ? [mappedParent] : []
        };
    });

    if (wbsDocs.length) {
        await WbsNode.deleteMany({ project_id: projectObjectId, estimate_id: estimateId });
    }

    if (wbsDocs.length) {
        await WbsNode.bulkWrite(
            wbsDocs.map((doc) => ({
                updateOne: {
                    filter: { _id: doc._id },
                    update: { $set: doc },
                    upsert: true,
                },
            })) as any,
            { ordered: false },
        );
    }

    // 2. Price List per estimate
    const plData = payload.price_list;
    let priceListIdStr = 'default';
    if (plData) {
        const { PriceList } = await import('../models/price-list.schema');
        const priceList = await PriceList.findOneAndUpdate(
            { project_id: projectObjectId, estimate_id: estimateId },
            {
                $set: {
                    project_id: projectObjectId,
                    estimate_id: estimateId,
                    name: plData.name || 'Listino Importato',
                    currency: plData.currency || 'EUR',
                    is_default: true,
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        priceListIdStr = priceList._id.toString();
    }

    // 2b. Price List Items per estimate
    // Filter only items actually used in the estimate
    // Filter only items actually used in the estimate
    const sourceEstItems = (payload.estimate?.items as PythonEstimateItem[] | undefined) || [];
    const usedPliIds = new Set<string>();

    for (const item of sourceEstItems) {
        const rawPliId = item.priceListItemId || item.price_list_item_id;
        if (rawPliId) usedPliIds.add(rawPliId);
    }

    const allPriceListItems: PythonPriceListItem[] = payload.price_list?.items || [];
    const priceListItems = allPriceListItems.filter((item) => {
        const itemId = item._id || item.id;
        return !!itemId && usedPliIds.has(itemId);
    });

    console.log(`[Persistence] Processing ${priceListItems.length} price list items (filtered from ${allPriceListItems.length})`);

    const priceItemMap = new Map<string, Types.ObjectId>();

    for (const item of priceListItems) {
        const sourceId = item._id || item.id;
        if (sourceId) {
            priceItemMap.set(sourceId, new Types.ObjectId());
        }
    }

    if (priceListItems.length) {
        // Clear previous price list items for this estimate to avoid duplicates across imports
        await PriceListItem.deleteMany({ project_id: projectObjectId, estimate_id: estimateId });

        await PriceListItem.bulkWrite(
            priceListItems.map((item, idx) => {
                const mappedId = priceItemMap.get(item._id || item.id);
                const rawGroups = item.wbsIds || item.wbs_ids || item.groupIds || [];
                const mappedGroups = rawGroups
                    .map((gid) => groupMap.get(gid))
                    .filter((g): g is Types.ObjectId => g !== undefined);

                // DEBUG: Log first 3 items to see what's coming from Python
                if (isImportDebug && idx < 3) {
                    console.log(`[DEBUG] Raw PLI #${idx}:`, {
                        code: item.code,
                        description: item.description?.substring(0, 50),
                        long_description: item.long_description?.substring(0, 50),
                        longDescription: (item as any).longDescription?.substring(0, 50),
                        extended_description: item.extended_description?.substring(0, 80),
                        extendedDescription: item.extendedDescription?.substring(0, 80),
                    });
                }

                const { short_description, long_description, unit } = normalizeTextFields(item);

                if (isImportDebug && idx < 3) {
                    console.log(`[DEBUG] After normalize #${idx}:`, {
                        short_description: (short_description as string)?.substring(0, 50),
                        long_description: (long_description as string)?.substring(0, 50),
                    });
                }

                return {
                    updateOne: {
                        filter: { _id: mappedId },
                        update: {
                            $set: {
                                _id: mappedId,
                                project_id: projectObjectId,
                                estimate_id: estimateId,
                                code: item.code,
                                description: short_description,
                                long_description: long_description,
                                extended_description: item.extended_description || item.extendedDescription,
                                unit: unit,
                                price: item.price,
                                price_list_id: priceListIdStr,
                                wbs_ids: mappedGroups,
                                embedding: item.embedding,
                                extracted_properties: item.extracted_properties || (item as any).extractedProperties,
                            },
                        },
                        upsert: true,
                    },
                };
            }) as any,
            { ordered: false },
        );
    }

    // 3. Estimate document (create/update with price list link)
    if (existingEst) {
        await Estimate.findByIdAndUpdate(existingEst._id, { $set: { price_list_id: priceListIdStr } });
    } else {
        await Estimate.create([{
            _id: estimateId,
            project_id: projectObjectId,
            name: estData.name,
            type: 'project',
            is_baseline: true,
            price_list_id: priceListIdStr,
            total_amount: 0
        }]);
    }

    // 4. Estimate Items per estimate
    const estItems: PythonEstimateItem[] = (estData.items as PythonEstimateItem[] | undefined) || [];
    console.log(`[Persistence] Processing ${estItems.length} estimate items`);

    await EstimateItem.deleteMany({ project_id: projectObjectId, 'project.estimate_id': estimateId });

    const priceValueMap = new Map<string, number>();
    for (const pli of priceListItems) {
        const id = pli._id || pli.id;
        if (id) {
            priceValueMap.set(id, pli.price ?? 0);
        }
    }

    const itemDocs = estItems.map((item, idx) => {
        const rawGroups = item.wbsIds || item.wbs_ids || item.groupIds || [];
        const mappedGroups = rawGroups
            .map((gid) => groupMap.get(gid))
            .filter((g): g is Types.ObjectId => g !== undefined);

        const rawPliId = item.priceListItemId || item.price_list_item_id;
        const mappedPliId = rawPliId ? priceItemMap.get(rawPliId) : undefined;
        const finalPliId = mappedPliId ? mappedPliId.toString() : rawPliId;

        const quantity = item.quantity ?? item.total_quantity ?? 0;
        // PREFER Python's unit_price (correct price from measurement's price list)
        // Fallback to PriceListItem.price if not provided
        const itemPrice = item.unitPrice ?? item.unit_price ?? ((rawPliId && priceValueMap.get(rawPliId)) || 0);

        // Debug: log first 10 items to verify prices
        if (isImportDebug && idx < 10) {
            console.log(`[Server Debug] EstItem #${idx}: unitPrice=${item.unitPrice}, unit_price=${item.unit_price}, fallback=${priceValueMap.get(rawPliId!)}, FINAL=${itemPrice}`);
        }
        const { short_description, long_description, unit } = normalizeTextFields(item);

        return {
            project_id: projectObjectId,
            price_list_item_id: finalPliId,
            related_item_id: item.relatedItemId || item.related_item_id,
            wbs_ids: mappedGroups,
            code: item.code,
            description: short_description,
            description_extended: long_description,
            unit: unit,
            progressive: item.progressive,
            project: {
                estimate_id: estimateId,
                quantity,
                unit_price: itemPrice,
                amount: quantity * itemPrice,
                // amount/unit_price can be recomputed; left as-is if provided
                measurements: item.measurements || []
            },
            offers: [],
        };
    }).filter(Boolean);

    if (itemDocs.length) {
        await EstimateItem.insertMany(itemDocs, { ordered: false });
    }

    return {
        success: true,
        estimateId: estimateId.toString(),
        summary: {
            groups: wbsDocs.length,
            products: priceListItems.length,
            items: itemDocs.length
        }
    };
}

export async function persistOffer(payload: PythonImportResult, projectId: string) {
    const { Offer, OfferItem, OfferAlert } = await import('../models');

    console.log(`[Persistence] Processing Offer import for project ${projectId}...`);
    const projectObjectId = new Types.ObjectId(projectId);
    const estData = payload.estimate;

    // Detect mode: Aggregated (Lista) or Detailed (Computo)
    // Heuristic: If we have 'progressive' it's likely detailed. If we only have product codes and total qtys, it's aggregated.
    // For now, let's assume 'detailed' if it came from SIX/Excel Ritorno which usually matches row-by-row.
    // Determine Import Mode
    // 'lx' (Lista) -> 'aggregated'
    // 'mx' (Computo) -> 'detailed'
    // Fallback to 'detailed' if unknown
    const rawMode = estData.mode || 'detailed';
    const isAggregated = rawMode === 'aggregated' || rawMode === 'lx';
    const importMode = isAggregated ? 'aggregated' : 'detailed';

    // Helper to normalize descriptions for matching (remove _x000D_, newlines, extra spaces)
    const normalizeDescription = (desc: string | undefined): string => {
        if (!desc) return '';
        return desc
            .replace(/_x00[0-9]D_/gi, ' ') // Remove Excel escaped unicode chars like _x000D_
            .replace(/\r\n|\r|\n/g, ' ')   // Replace newlines with space
            .replace(/\s+/g, ' ')          // Collapse multiple spaces
            .trim()
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // strip accents
    };
    const normalizeCode = (value: unknown): string =>
        (value ?? '').toString().trim().toLowerCase();
    const asNumber = (value: unknown): number | null =>
        typeof value === 'number' && !Number.isNaN(value) ? value : null;
    const hasDelta = (actual: number | null, expected: number | null, tolerance = 1e-6) =>
        actual !== null && expected !== null && Math.abs(actual - expected) > tolerance;

    // Resolve Baseline Estimate ID (Must be provided or inferred)
    // 3. Resolve Baseline Estimate (Project Estimate)
    // The payload might carry an explicit 'estimate_id' if the user selected one in the UI.
    // Otherwise we try to infer it.
    let baselineEstId = payload.estimate?.estimate_id;

    if (!baselineEstId) {
        // Fallback logic
        const projectEstimates = await Estimate.find({ project_id: projectObjectId, type: 'project' }).sort({ is_baseline: -1, created_at: -1 }).limit(1);
        if (projectEstimates.length > 0) {
            baselineEstId = projectEstimates[0]._id;
            console.log(`[Persistence] Auto-resolved baseline estimate: ${baselineEstId} (is_baseline=${projectEstimates[0].is_baseline})`);
        } else {
            console.warn(`[Persistence] No project estimate found to link offer to! Items will be unlinked.`);
        }
    } else {
        console.log(`[Persistence] Using provided source estimate ID: ${baselineEstId}`);
    }

    if (!baselineEstId) {
        throw new Error("Cannot find a baseline estimate to attach this offer to.");
    }

    const estimateObjectId = baselineEstId instanceof Types.ObjectId
        ? baselineEstId
        : new Types.ObjectId(baselineEstId);

    // 1. Create/Update Offer Header
    const offerQuery = {
        project_id: projectObjectId,
        company_name: estData.company || 'Unknown Company',
        round_number: estData.round_number || 1
    };

    const offerDoc = await Offer.findOneAndUpdate(
        offerQuery,
        {
            $set: {
                ...offerQuery,
                estimate_id: estimateObjectId,
                name: estData.name || `Offerta ${offerQuery.company_name}`,
                mode: importMode,
                description: estData.notes,
                date: estData.date ? new Date(estData.date) : new Date(),
                total_amount: estData.total_amount,
                // Status? Default draft
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const offerId = offerDoc._id;

    // 2. Process Items
    const rawItems: PythonOfferItem[] = (estData.items as PythonOfferItem[] | undefined) || [];
    console.log(`[Persistence] Saving ${rawItems.length} offer items for Offer ${offerId} (Mode: ${importMode})`);

    // Clean old items for this offer
    await OfferItem.deleteMany({ offer_id: offerId });
    await OfferAlert.deleteMany({ offer_id: offerId });

    // Prepare Lookups
    // We need to map:
    // - Detailed: Import Item -> EstimateItem._id (via progressive? via unique ID?)
    // - Aggregated: Import Item -> PriceListItem._id (via code?)

    // For Detailed (Computo Ritorno), items usually carry 'progressive' or 'id' that matches the source.
    // Let's assume we match by 'progressive' if available, or we need a map.
    // If using SIX/Excel export -> import loop, we often loose the Mongo ID.
    // But we should have 'progressive' and 'order'. 

    // Fetch Baseline Items to map against
    type DetailedBaseline = {
        id: Types.ObjectId;
        progressive?: number | null;
        unit_price?: number | null;
        unit_measure?: string | null;
        quantity?: number | null;
        code?: string | null;
        price_list_item_id?: string | null;
    };
    const warnings: string[] = [];
    const pendingAlerts: PendingAlert[] = [];
    let detailedBaselineMap: Map<number, DetailedBaseline> | null = null;
    let plCodeMap: Map<string, Types.ObjectId[]> | null = null;
    let plDescMap: Map<string, Types.ObjectId[]> | null = null;
    let priceListMetaMap: Map<string, { code?: string | null; price?: number | null }> | null = null;
    let baselineByPriceListId: Map<string, BaselineAggregate> | null = null;

    if (importMode === 'detailed') {
        detailedBaselineMap = new Map();
        const blItems = await EstimateItem.find({
            project_id: projectObjectId,
            'project.estimate_id': estimateObjectId
        }).select('progressive _id project.unit_price project.quantity unit_measure code price_list_item_id').lean<BaselineItemLean[]>();
        for (const bli of blItems) {
            // Fix: explicit check for undefined/null because progressive can be 0
            if (bli.progressive !== undefined && bli.progressive !== null) {
                detailedBaselineMap.set(bli.progressive, {
                    id: bli._id as Types.ObjectId,
                    progressive: bli.progressive,
                    unit_price: bli.project?.unit_price ?? null,
                    unit_measure: bli.unit_measure ?? null,
                    quantity: bli.project?.quantity ?? null,
                    code: bli.code ?? null,
                    price_list_item_id: bli.price_list_item_id ?? null
                });
            }
        }
    } else {
        // Aggregated: Need PriceListItems map to resolve links
        // We match imported items to PriceList items by Code (priority) or Description (fallback)
        const plItems = await PriceListItem.find({
            project_id: projectObjectId,
            estimate_id: estimateObjectId
        }).select('code description long_description price _id').lean<PriceListItemLean[]>();

        // Build Lookups
        plCodeMap = new Map<string, Types.ObjectId[]>();
        plDescMap = new Map<string, Types.ObjectId[]>();
        priceListMetaMap = new Map<string, { code?: string | null; price?: number | null }>();

        for (const pli of plItems) {
            priceListMetaMap.set(String(pli._id), { code: pli.code ?? null, price: pli.price ?? null });
            if (pli.code) {
                const normCode = normalizeCode(pli.code);
                const arr = plCodeMap.get(normCode) || [];
                arr.push(pli._id as Types.ObjectId);
                plCodeMap.set(normCode, arr);
            }

            // Map regular description
            const normDesc = normalizeDescription(pli.description || undefined);
            if (normDesc) {
                const arr = plDescMap.get(normDesc) || [];
                arr.push(pli._id as Types.ObjectId);
                plDescMap.set(normDesc, arr);
            }

            // Map long description
            const normLongDesc = normalizeDescription(pli.long_description || undefined);
            if (normLongDesc) {
                const arr = plDescMap.get(normLongDesc) || [];
                arr.push(pli._id as Types.ObjectId);
                plDescMap.set(normLongDesc, arr);
            }
        }

        baselineByPriceListId = new Map<string, BaselineAggregate>();
        const baselineItems = await EstimateItem.find({
            project_id: projectObjectId,
            'project.estimate_id': estimateObjectId
        }).select('price_list_item_id project.quantity project.unit_price').lean<BaselineItemLean[]>();

        for (const item of baselineItems) {
            const key = item.price_list_item_id ? String(item.price_list_item_id) : '';
            if (!key) continue;
            const quantity = asNumber(item.project?.quantity) ?? 0;
            const unitPrice = asNumber(item.project?.unit_price);
            const entry = baselineByPriceListId.get(key) || { totalQuantity: 0, totalAmount: 0 };
            entry.totalQuantity += quantity;
            if (unitPrice !== null) {
                entry.totalAmount += unitPrice * quantity;
            }
            baselineByPriceListId.set(key, entry);
        }
    }

    const offerItemsDocs = rawItems.map((item, itemIndex) => {
        const progressive = item.progressive ?? item.order;
        const rawCode = (item.code ?? item.codice ?? '').toString().trim();
        const code = rawCode.length ? rawCode : undefined;

        // Extract Description(s)
        const description = (item.description || item.short_description || item.descrizione || '').trim();
        const longDescription = (item.long_description || item.descrizione_estesa || '').trim();

        // Effective description for matching (prefer long if desc is empty, or try both matches)
        const normDesc = normalizeDescription(description);
        const normLongDesc = normalizeDescription(longDescription);

        // Resolve Link
        let estimateItemId: Types.ObjectId | undefined;
        let priceListItemId: Types.ObjectId | undefined;
        let origin: 'baseline' | 'addendum' = 'baseline';
        const source: 'detailed' | 'aggregated' = importMode;
        let resolutionStatus: 'resolved' | 'pending' = 'resolved';
        let candidatePriceListItemIds: Types.ObjectId[] | undefined;

        let baselineMatch: DetailedBaseline | undefined;
        if (importMode === 'detailed') {
            baselineMatch = progressive !== undefined && detailedBaselineMap
                ? detailedBaselineMap.get(progressive)
                : undefined;
            if (baselineMatch) {
                estimateItemId = baselineMatch.id;
                // Fallback to baseline unit price/measure if missing from import
                if (item.unit_price === undefined || item.unit_price === null || Number.isNaN(item.unit_price)) {
                    item.unit_price = baselineMatch.unit_price;
                }
                if (!item.unit_measure && baselineMatch.unit_measure) {
                    item.unit_measure = baselineMatch.unit_measure;
                }
            } else {
                origin = 'addendum';
                resolutionStatus = 'pending';
                console.warn(`[Persistence] Addendum: missing baseline item for progressive=${progressive}, code=${code}`);
                warnings.push(`Addendum: nessun baseline per progressive=${progressive ?? 'n/a'} code=${code || 'n/a'}`);
            }
        } else {
            // Aggregated Mode
            let lookupCode = code;
            let lookupNormDesc = normDesc;

            // Heuristic: If code is missing, try to extract from description "CODE - Description"
            if (!lookupCode && description && description.includes(' - ')) {
                const sepIdx = description.indexOf(' - ');
                if (sepIdx > 0) {
                    const potCode = description.substring(0, sepIdx).trim();
                    const potDesc = description.substring(sepIdx + 3).trim();

                    // 1. Try to recover code (if valid in map)
                    const normPotCode = normalizeCode(potCode);
                    if (plCodeMap && plCodeMap.has(normPotCode)) {
                        lookupCode = potCode;
                    }

                    // 2. Try to recover clean description (if valid in map)
                    const normPotDesc = normalizeDescription(potDesc);
                    if (plDescMap && plDescMap.has(normPotDesc)) {
                        lookupNormDesc = normPotDesc;
                    }
                }
            }

            const normCodeForLookup = normalizeCode(lookupCode);
            const codeMatches: Types.ObjectId[] = normCodeForLookup && plCodeMap ? (plCodeMap.get(normCodeForLookup) || []) : [];
            const longDescMatches: Types.ObjectId[] = normLongDesc && plDescMap ? (plDescMap.get(normLongDesc) || []) : [];
            const shortDescMatches: Types.ObjectId[] = lookupNormDesc && plDescMap ? (plDescMap.get(lookupNormDesc) || []) : [];

            // Debug logging for first 5 items
            if (isImportDebug && itemIndex < 5) {
                console.log(`[Persistence DEBUG] Item #${itemIndex}:`, {
                    code,
                    normCodeForLookup,
                    description: description?.substring(0, 60),
                    normDesc: normDesc?.substring(0, 60),
                    longDescription: longDescription?.substring(0, 60),
                    normLongDesc: normLongDesc?.substring(0, 60),
                    codeMatchCount: codeMatches.length,
                    longDescMatchCount: longDescMatches.length,
                    shortDescMatchCount: shortDescMatches.length,
                    plDescMapSize: plDescMap?.size ?? 0,
                    plCodeMapSize: plCodeMap?.size ?? 0,
                });
                // Log a few sample keys from plDescMap
                if (isImportDebug && plDescMap && itemIndex === 0) {
                    const sampleKeys = Array.from(plDescMap.keys()).slice(0, 5);
                    console.log(`[Persistence DEBUG] Sample plDescMap keys:`, sampleKeys.map(k => k?.substring(0, 60)));
                }
            }

            const pickUnique = (arr: Types.ObjectId[]) => (arr.length === 1 ? arr[0] : undefined);

            // Priority: code -> long desc -> short desc
            priceListItemId = pickUnique(codeMatches) || pickUnique(longDescMatches) || pickUnique(shortDescMatches);

            if (!priceListItemId) {
                // Collect all candidates (dedup) for user resolution
                const candidateSet = new Set<string>();
                codeMatches.forEach(id => candidateSet.add(String(id)));
                longDescMatches.forEach(id => candidateSet.add(String(id)));
                shortDescMatches.forEach(id => candidateSet.add(String(id)));

                if (candidateSet.size > 0) {
                    candidatePriceListItemIds = Array.from(candidateSet).map(id => new Types.ObjectId(id));
                    origin = 'addendum';
                    resolutionStatus = 'pending';
                    const reason = codeMatches.length > 1
                        ? `Ambiguità codice '${code || 'n/a'}'`
                        : `Ambiguità descrizione '${normLongDesc || normDesc || 'n/a'}'`;
                    warnings.push(`${reason}: ${candidateSet.size} PLI candidati`);
                    console.warn(`[Persistence] ${reason}: ${candidateSet.size} candidates`);
                } else {
                    origin = 'addendum';
                    resolutionStatus = 'pending';
                    warnings.push(`Addendum: nessun match per code='${code || 'n/a'}', desc='${normLongDesc || normDesc || 'n/a'}'`);
                    console.warn(`[Persistence] Addendum: missing PriceListItem for code='${code}', desc='${normLongDesc || normDesc}'`);
                }
            }

            if (priceListItemId && baselineByPriceListId && !baselineByPriceListId.has(String(priceListItemId))) {
                origin = 'addendum';
            }
        }

        const addAlert = (data: Omit<OfferAlertInsert, 'project_id' | 'offer_id' | 'source' | 'origin'> & {
            origin?: 'baseline' | 'addendum';
            estimate_item_id?: Types.ObjectId;
            price_list_item_id?: Types.ObjectId;
        }) => {
            pendingAlerts.push({
                project_id: projectObjectId,
                estimate_id: estimateObjectId,
                offer_id: offerId,
                source,
                origin: data.origin ?? origin,
                estimate_item_id: data.estimate_item_id ?? estimateItemId,
                price_list_item_id: data.price_list_item_id ?? priceListItemId,
                ...data,
                itemIndex
            });
        };

        if (importMode === 'detailed') {
            if (!baselineMatch) {
                addAlert({
                    type: 'addendum',
                    severity: 'info',
                    message: 'Missing baseline item for progressive mapping',
                    code: code ?? null
                });
            } else {
                const actualQuantity = asNumber(item.quantity);
                const expectedQuantity = asNumber(baselineMatch.quantity);
                if (hasDelta(actualQuantity, expectedQuantity)) {
                    addAlert({
                        type: 'quantity_mismatch',
                        severity: 'warning',
                        actual: actualQuantity,
                        expected: expectedQuantity,
                        delta: actualQuantity !== null && expectedQuantity !== null ? actualQuantity - expectedQuantity : null,
                        code: code ?? null,
                        baseline_code: baselineMatch.code ?? null
                    });
                }

                // Only alert on missing or zero prices, not on price differences
                // Offers are expected to have different prices than baseline - that's the point!
                const actualUnitPrice = asNumber(item.unit_price ?? item.prezzo_unitario);
                if (actualUnitPrice === null || actualUnitPrice === 0) {
                    addAlert({
                        type: 'price_mismatch',
                        severity: 'error',
                        message: 'Prezzo mancante o nullo',
                        actual: actualUnitPrice,
                        expected: asNumber(baselineMatch.unit_price),
                        code: code ?? null,
                        baseline_code: baselineMatch.code ?? null
                    });
                }

                const normCode = normalizeCode(code);
                const normBaselineCode = normalizeCode(baselineMatch.code ?? undefined);
                if (normCode && normBaselineCode && normCode !== normBaselineCode) {
                    addAlert({
                        type: 'code_mismatch',
                        severity: 'warning',
                        actual: code ?? null,
                        expected: baselineMatch.code ?? null,
                        code: code ?? null,
                        baseline_code: baselineMatch.code ?? null
                    });
                }
            }
        } else {
            if (!priceListItemId) {
                if (candidatePriceListItemIds?.length) {
                    addAlert({
                        type: 'ambiguous_match',
                        severity: 'warning',
                        message: `Multiple candidates (${candidatePriceListItemIds.length}) for matching`,
                        code: code ?? null,
                        imported_description: description || longDescription || null,
                        candidate_price_list_item_ids: candidatePriceListItemIds,
                    });
                } else {
                    addAlert({
                        type: 'addendum',
                        severity: 'info',
                        message: 'No match found for aggregated item',
                        code: code ?? null
                    });
                }
            } else {
                const meta = priceListMetaMap?.get(String(priceListItemId));
                const baselineAgg = baselineByPriceListId?.get(String(priceListItemId));
                if (!baselineAgg) {
                    addAlert({
                        type: 'addendum',
                        severity: 'info',
                        message: 'Item not present in baseline',
                        code: code ?? null,
                        baseline_code: meta?.code ?? null
                    });
                }
                const actualQuantity = asNumber(item.quantity);
                const expectedQuantity = baselineAgg ? asNumber(baselineAgg.totalQuantity) : null;
                if (hasDelta(actualQuantity, expectedQuantity)) {
                    addAlert({
                        type: 'quantity_mismatch',
                        severity: 'warning',
                        actual: actualQuantity,
                        expected: expectedQuantity,
                        delta: actualQuantity !== null && expectedQuantity !== null ? actualQuantity - expectedQuantity : null,
                        code: code ?? null,
                        baseline_code: meta?.code ?? null
                    });
                }

                // Only alert on missing or zero prices, not on price differences
                // Offers are expected to have different prices than baseline - that's the point!
                const actualUnitPrice = asNumber(item.unit_price ?? item.prezzo_unitario);
                if (actualUnitPrice === null || actualUnitPrice === 0) {
                    addAlert({
                        type: 'price_mismatch',
                        severity: 'error',
                        message: 'Prezzo mancante o nullo',
                        actual: actualUnitPrice,
                        expected: asNumber(meta?.price ?? null),
                        code: code ?? null,
                        baseline_code: meta?.code ?? null
                    });
                }

                const normCode = normalizeCode(code);
                const normBaselineCode = normalizeCode(meta?.code ?? undefined);
                if (normCode && normBaselineCode && normCode !== normBaselineCode) {
                    addAlert({
                        type: 'code_mismatch',
                        severity: 'warning',
                        actual: code ?? null,
                        expected: meta?.code ?? null,
                        code: code ?? null,
                        baseline_code: meta?.code ?? null
                    });
                }
            }
        }

        const quantity = item.quantity ?? 0;
        const unitPrice = item.unit_price ?? item.prezzo_unitario ?? 0;

        const baseDoc: OfferItemInsert = {
            offer_id: offerId,
            project_id: projectObjectId,
            source,
            origin,
            resolution_status: resolutionStatus,
            quantity,
            unit_price: unitPrice,
            notes: item.notes || item.note,
        };

        if (candidatePriceListItemIds?.length) {
            baseDoc.candidate_price_list_item_ids = candidatePriceListItemIds;
        }

        if (origin === 'addendum') {
            // Keep user-provided fields to preserve meaning
            baseDoc.code = code || undefined;
            baseDoc.description = description || undefined;
            baseDoc.unit_measure = item.unit || item.unita_misura;
            baseDoc.price_list_item_id = priceListItemId;
        } else if (importMode === 'aggregated') {
            baseDoc.price_list_item_id = priceListItemId;
            if (candidatePriceListItemIds?.length) {
                baseDoc.candidate_price_list_item_ids = candidatePriceListItemIds;
            }
            // Do not persist code/description/progressive in aggregated baseline
        } else {
            // Detailed baseline: derive linkage only
            baseDoc.estimate_item_id = estimateItemId;
            // Progressive derived from baseline (if available)
            baseDoc.progressive = baselineMatch?.progressive ?? undefined;
            // No code/description/unit_measure to force inheritance from Estimate/PLI
        }

        return baseDoc;
    });

    let insertedItems: Array<{ _id: Types.ObjectId }> = [];
    if (offerItemsDocs.length) {
        insertedItems = await OfferItem.insertMany(offerItemsDocs);
    }

    const alertsToInsert = pendingAlerts
        .map((alert) => {
            const { itemIndex, ...rest } = alert;
            const inserted = insertedItems[itemIndex];
            if (!inserted?._id) return null;
            return { ...rest, offer_item_id: inserted._id };
        })
        .filter((alert): alert is OfferAlertInsert => alert !== null);

    if (alertsToInsert.length) {
        await OfferAlert.insertMany(alertsToInsert);
    }

    const alertsByType: Record<string, number> = {};
    for (const alert of alertsToInsert) {
        alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
    }

    return {
        success: true,
        summary: {
            offerId: offerId,
            items: offerItemsDocs.length
        },
        warnings,
        alerts: {
            total: alertsToInsert.length,
            by_type: alertsByType
        }
    };
}
