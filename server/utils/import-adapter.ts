/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import { Estimate } from '#models/estimate.schema';
import { PriceCatalogItem } from '#models/price-catalog.schema';
import { WbsNode } from '#models/wbs.schema';
import { Item } from '#models/item.schema';

type AnyRecord = Record<string, any>;

const normalizeType = (value: string | undefined): 'project' | 'offer' => {
  return value === 'project' ? 'project' : 'offer';
};

/**
 * Upsert an estimate document in MongoDB.
 * Accepts data coming from the Python importer (already mapped by python-mappers.ts).
 */
export async function upsertEstimate(projectId: string, data: AnyRecord) {
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
  estimates: AnyRecord[] = [],
) {
  const saved: AnyRecord = {};

  for (const estimate of estimates) {
    const doc = await upsertEstimate(projectId, estimate);
    const key = estimate.code || estimate.name || estimate.id || doc._id.toString();
    saved[key] = doc;
  }

  return saved;
}

/**
 * Upsert price catalog entries coming from SIX import.
 * Uses project_id + product_id as key.
 */
export async function upsertPriceCatalog(projectId: string, catalog: AnyRecord[] = []) {
  if (!catalog.length) return;

  const projectObjectId = new Types.ObjectId(projectId);
  const operations = catalog.map((entry) => {
    const productId = entry.product_id ?? entry.code;
    return {
      updateOne: {
        filter: { project_id: projectObjectId, product_id: productId },
        update: {
          $set: {
            project_id: projectObjectId,
            product_id: productId,
            item_code: entry.code ?? '',
            item_description: entry.description,
            unit_id: entry.unit_id ?? entry.unit_label,
            wbs6_code: entry.wbs6_code,
            wbs7_code: entry.wbs7_code,
            price_list_id: entry.price_list_id,
            source_preventivo_id: entry.source_preventivo_id,
            import_run_id: entry.import_run_id,
            price_lists: entry.price_lists ?? {},
          },
        },
        upsert: true,
      },
    };
  });

  await PriceCatalogItem.bulkWrite(operations, { ordered: false });
}

/**
 * Upsert WBS nodes (spatial, wbs6, wbs7) and return lookup maps by code.
 */
type WbsNodeInput = {
  type?: 'spatial' | 'wbs6' | 'wbs7';
  code?: string;
  description?: string;
  level?: number;
  parentKey?: string | null;
};

const normalizeWbsCode = (n: AnyRecord) => {
  if (n.code) return String(n.code);
  if (n.grp_id) return String(n.grp_id);
  if (n.description) return String(n.description).trim().replace(/\s+/g, '_').toUpperCase();
  return null;
};

const deriveLevelAndType = (code?: string, levelHint?: number, typeHint?: string) => {
  let level = levelHint;
  if (!level && code) {
    const match = /wbs0*([1-7])/i.exec(code);
    if (match) level = Number(match[1]);
  }
  if (!level && typeHint === 'wbs6') level = 6;
  if (!level && typeHint === 'wbs7') level = 7;
  if (!level) level = typeHint === 'spatial' ? 1 : undefined;

  let type: 'spatial' | 'commodity' | undefined =
    typeHint === 'wbs6' || typeHint === 'wbs7' ? 'commodity' : (typeHint as any);
  if (!type && level) {
    if (level >= 1 && level <= 5) type = 'spatial';
    else if (level === 6 || level === 7) type = 'commodity';
  }
  if (type === 'commodity' && level && level < 6) level = 6;
  if (type === 'spatial' && (!level || level > 5)) level = level && level > 5 ? 5 : level ?? 1;
  const category = level ? `wbs0${level}`.slice(-5).toLowerCase() : undefined;
  return { level, type, category };
};

/**
 * Upsert WBS nodes with parent relationships.
 * Returns maps of code -> ObjectId for spatial/wbs6/wbs7.
 */
export async function upsertWbsHierarchy(projectId: string, nodes: WbsNodeInput[] = []) {
  if (!nodes.length) return { spatial: {}, wbs6: {}, wbs7: {} as Record<string, string> };

  const projectObjectId = new Types.ObjectId(projectId);

  const filtered = nodes
    .map((n) => {
      const code = normalizeWbsCode(n);
      if (!code) return null;
      const { level, type, category } = deriveLevelAndType(code, n.level, n.type);
      if (!type) return null;
      return {
        code,
        description: n.description,
        level,
        type,
        category,
        parentKey: n.parentKey ?? null,
      };
    })
    .filter(Boolean) as Array<{ code: string; description?: string; level?: number; type: 'spatial' | 'commodity'; category?: string; parentKey?: string | null }>;

  if (filtered.length) {
    const ops = filtered.map((n) => ({
      updateOne: {
        filter: { project_id: projectObjectId, type: n.type, code: n.code },
        update: {
          $set: {
            project_id: projectObjectId,
            type: n.type,
            code: n.code,
            description: n.description,
            level: n.level ?? (n.type === 'commodity' ? 6 : n.level ?? 0),
            category: n.category,
          },
        },
        upsert: true,
      },
    }));
    await WbsNode.bulkWrite(ops, { ordered: false });
  }

  const docs = await WbsNode.find({ project_id: projectObjectId });
  const idMap: Record<string, string> = {};
  const ancestorsById: Record<string, Types.ObjectId[]> = {};
  for (const doc of docs) {
    const key = `${doc.level}:${doc.code}`;
    idMap[key] = doc._id.toString();
    ancestorsById[doc._id.toString()] = doc.ancestors as Types.ObjectId[];
  }

  // Set parents and ancestors where parentKey is provided
  const updates: AnyRecord[] = [];
  for (const n of filtered) {
    if (!n.parentKey) continue;
    const parentId = idMap[n.parentKey];
    const selfId = idMap[`${n.level}:${n.code}`];
    if (!parentId || !selfId) continue;
    const parentAncestors = ancestorsById[parentId] ?? [];
    const ancestors = [...parentAncestors, new Types.ObjectId(parentId)];
    updates.push({
      updateOne: {
        filter: { _id: selfId },
        update: { $set: { parent_id: parentId, ancestors } },
      },
    });
    ancestorsById[selfId] = ancestors;
  }
  if (updates.length) {
    await WbsNode.bulkWrite(updates, { ordered: false });
  }

  const map: { spatial: Record<string, string>; wbs6: Record<string, string>; wbs7: Record<string, string> } = {
    spatial: {},
    wbs6: {},
    wbs7: {},
  };
  for (const doc of docs) {
    if (doc.type === 'spatial' || (doc.level && doc.level <= 5)) map.spatial[doc.code] = doc._id.toString();
    if (doc.level === 6) map.wbs6[doc.code] = doc._id.toString();
    if (doc.level === 7) map.wbs7[doc.code] = doc._id.toString();
  }
  return map;
}

/**
 * Persist estimate items coming from SIX import.
 */
export async function upsertEstimateItems(
  projectId: string,
  estimateId: string,
  items: AnyRecord[] = [],
  wbs6Map: Record<string, string> = {},
  wbs7Map: Record<string, string> = {},
  importRunId?: string,
  sourcePreventivoId?: string,
) {
  if (!items.length) return;
  const projectObjectId = new Types.ObjectId(projectId);
  const estimateObjectId = new Types.ObjectId(estimateId);

  // Remove previous items for this estimate to avoid duplicates
  await Item.deleteMany({ 'project.estimate_id': estimateObjectId, project_id: projectObjectId });

  const buildWbsCodes = (entry: AnyRecord) => {
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
    .map((entry) => {
      const { w6, w7 } = buildWbsCodes(entry);
      const wbs6Id = w6 ? wbs6Map[w6] : undefined;
      if (!wbs6Id) return null; // skip items without a mapped WBS6
      const wbs7Id = w7 ? wbs7Map[w7] : undefined;

      return {
        project_id: projectObjectId,
        wbs6_id: new Types.ObjectId(wbs6Id),
        wbs7_id: wbs7Id ? new Types.ObjectId(wbs7Id) : undefined,
        code: entry.code ?? '',
        description: entry.description ?? '',
        unit_measure: entry.unit ?? entry.unit_label,
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
    .filter(Boolean) as AnyRecord[];

  if (docs.length) {
    await Item.insertMany(docs, { ordered: false });
  }
}

/**
 * Build WBS hierarchy from items or fallback nodes and upsert them.
 */
export async function buildAndUpsertWbsFromItems(
  projectId: string,
  items: AnyRecord[] = [],
  fallbackNodes: { spatial?: AnyRecord[]; wbs6?: AnyRecord[]; wbs7?: AnyRecord[] } = {},
) {
  const nodes: WbsNodeInput[] = [];

const addNode = (type: 'spatial' | 'wbs6' | 'wbs7', code: string | undefined, description?: string, level?: number, parentKey?: string | null) => {
  if (!code) return;
  nodes.push({ type, code, description, level, parentKey });
};

  // Build from items if provided
  if (items.length) {
    for (const entry of items) {
      const levels = Array.isArray(entry.wbs_levels) ? [...entry.wbs_levels] : [];
      levels.sort((a, b) => (a?.level ?? 0) - (b?.level ?? 0));
      const stack: { level: number; key: string }[] = [];
      for (const lvl of levels) {
        if (!lvl) continue;
        const levelNum = lvl.level ?? 0;
        if (levelNum < 1 || levelNum > 7) continue;
        const type = levelNum <= 5 ? 'spatial' : 'commodity';
        const code = normalizeWbsCode(lvl);
        const desc = lvl.description;

        let parentKey: string | null = null;
        for (let i = stack.length - 1; i >= 0; i--) {
          if (stack[i].level < levelNum) {
            parentKey = stack[i].key;
            break;
          }
        }

        const key = `${levelNum}:${code}`;
        addNode(type, code ?? undefined, desc, levelNum, parentKey);
        stack.push({ level: levelNum, key });
      }
    }
  } else {
    // Fallback to provided node lists if items are missing
    (fallbackNodes.spatial ?? []).forEach((n) => addNode('spatial', normalizeWbsCode(n) ?? undefined, n.description, n.level));
    (fallbackNodes.wbs6 ?? []).forEach((n) => addNode('wbs6', normalizeWbsCode(n) ?? undefined, n.description, n.level));
    (fallbackNodes.wbs7 ?? []).forEach((n) => addNode('wbs7', normalizeWbsCode(n) ?? undefined, n.description, n.level));
  }

  return upsertWbsHierarchy(projectId, nodes);
}
