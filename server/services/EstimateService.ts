/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import { Estimate, EstimateItem } from '#models';

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
  await EstimateItem.deleteMany({ 'project.estimate_id': estimateObjectId, project_id: projectObjectId });

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
      // if (!wbs6Id) return null; // skip items without a mapped WBS6
      // Adapting to wbs_ids array
      const ids: Types.ObjectId[] = [];
      if (wbs6Id) ids.push(new Types.ObjectId(wbs6Id));
      if (w7) { const id7 = wbs7Map[w7]; if (id7) ids.push(new Types.ObjectId(id7)); }

      return {
        project_id: projectObjectId,
        wbs_ids: ids,
        code: entry.code ?? '',
        description: entry.description ?? '',
        unit: entry.unit ?? entry.unit_label,
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
    await EstimateItem.insertMany(docs, { ordered: false });
  }
}
