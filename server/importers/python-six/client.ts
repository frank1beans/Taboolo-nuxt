import type { H3Event } from 'h3';
import { createError } from 'h3';
import { proxyMultipartToPython } from '#utils/python-proxy';
import { mapSixImportReport, mapSixPreview } from '#utils/python-mappers';
import type { RawImportPayload } from '#utils/raw-types';

const assertProjectId = (projectId?: string): string => {
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
  }
  return projectId;
};

// Map frontend field names to the python importer expectations
const sixFieldMap = (name: string) => {
  if (name === 'estimate_id') return 'preventivo_id';
  if (name === 'compute_embeddings') return 'compute_embeddings';
  if (name === 'extract_properties') return 'extract_properties';
  return name;
};

export async function previewSixImport(event: H3Event, projectId?: string) {
  const id = assertProjectId(projectId);
  const result = await proxyMultipartToPython(
    event,
    `/commesse/${id}/import-six/preview`,
    { method: 'POST' }
  );
  return mapSixPreview(result);
}

export async function runSixImport(event: H3Event, projectId?: string) {
  const id = assertProjectId(projectId);
  const result = await proxyMultipartToPython(
    event,
    `/commesse/${id}/import-six`,
    { method: 'POST', mapFieldName: sixFieldMap }
  );
  return mapSixImportReport(result);
}

export async function previewSixImportRaw(event: H3Event, projectId?: string) {
  const id = assertProjectId(projectId);
  const result = await proxyMultipartToPython(
    event,
    `/commesse/${id}/import-six/raw/preview`,
    { method: 'POST' }
  );
  return mapRawPreview(result);
}

export async function runSixImportRaw(event: H3Event, projectId?: string): Promise<RawImportPayload> {
  const id = assertProjectId(projectId);
  const result = await proxyMultipartToPython(
    event,
    `/commesse/${id}/import-six/raw`,
    { method: 'POST', mapFieldName: sixFieldMap }
  );
  return mapRawImportPayload(result);
}

function normalizeDecimal(value: any): string | number | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  return String(value);
}

function mapRawPreview(result: any) {
  return {
    preventivi: result?.preventivi ?? [],
    priceLists: result?.price_lists ?? [],
    wbsSpatial: result?.wbs_spaziali ?? [],
    wbs6: result?.wbs6 ?? [],
    wbs7: result?.wbs7 ?? [],
    unitsCount: result?.units_count ?? 0,
    productsCount: result?.products_count ?? 0,
    priceListsCount: result?.price_lists_count ?? 0,
    groupsCount: result?.groups_count ?? 0,
  };
}

function mapRawImportPayload(result: any): RawImportPayload {
  const priceLists = (result?.price_lists ?? []).map((pl: any) => ({
    listIdRaw: pl.list_id_raw,
    canonicalId: pl.canonical_id ?? pl.list_id_raw,
    label: pl.label ?? null,
    priority: pl.priority ?? 0,
    preferred: Boolean(pl.preferred),
  }));

  const priceListMap = new Map<string, string>();
  for (const pl of priceLists) {
    if (pl.listIdRaw) priceListMap.set(pl.listIdRaw, pl.canonicalId);
  }

  const groups = (result?.groups ?? []).map((g: any) => ({
    grpId: g.grp_id,
    code: g.code ?? null,
    description: g.description ?? null,
    kind: g.kind,
    level: g.level ?? null,
  }));

  const products = (result?.products ?? []).map((p: any) => ({
    prodottoId: p.prodotto_id,
    code: p.code ?? null,
    descriptionShort: p.desc_short ?? p.code ?? '',
    descriptionLong: p.desc_long ?? null,
    unitId: p.unit_id ?? null,
    wbs6: p.wbs6_code || p.wbs6_description ? { code: p.wbs6_code, description: p.wbs6_description } : undefined,
    wbs7: p.wbs7_code || p.wbs7_description ? { code: p.wbs7_code, description: p.wbs7_description } : undefined,
    isParentVoice: Boolean(p.is_parent_voice),
    prices: Array.isArray(p.prices)
      ? p.prices.map((entry: any) => ({
          canonicalId: entry[0],
          value: entry[1],
          priority: entry[2] ?? 0,
        }))
      : [],
  }));

  const preventivi = (result?.preventivi ?? []).map((prv: any) => {
    const canonicalPriceList = prv.price_list_id_raw ? priceListMap.get(prv.price_list_id_raw) : null;
    return {
      preventivoId: prv.preventivo_id,
      code: prv.code ?? null,
      description: prv.description ?? null,
      date: prv.date ?? null,
      priceListIdRaw: prv.price_list_id_raw ?? null,
      priceListId: canonicalPriceList ?? null,
      stats: {
        rilevazioni: prv.rilevazioni ?? 0,
        items: prv.items ?? 0,
        totalImportoPreview: prv.total_importo_preview ?? null,
      },
    };
  });

  const rilevazioni: Record<string, any[]> = {};
  const rilevazioniRaw = result?.rilevazioni ?? {};
  for (const key of Object.keys(rilevazioniRaw)) {
    rilevazioni[key] = (rilevazioniRaw[key] ?? []).map((r: any) => ({
      preventivoId: key,
      idx: r.idx,
      progressivo: r.progressivo ?? null,
      prodottoId: r.prodotto_id,
      listaQuotazioneIdRaw: r.lista_quotazione_id_raw ?? null,
      wbsSpatial: Array.isArray(r.wbs_spatial)
        ? r.wbs_spatial
            .filter((w: any) => w && w.level && w.level <= 5)
            .map((w: any) => ({ level: w.level, code: w.code ?? null, description: w.description ?? null }))
        : [],
      misure: Array.isArray(r.misure)
        ? r.misure.map((m: any) => ({
            operation: m.operation ?? '+',
            cells: Array.isArray(m.cells)
              ? m.cells.map((c: any) => ({
                  pos: c[0] ?? 0,
                  raw: c[1] ?? '',
                  value: normalizeDecimal(c[2]),
                }))
              : [],
            product: normalizeDecimal(m.product),
            references: m.references ?? [],
          }))
        : [],
      comments: r.comments ?? [],
      quantityDirect: normalizeDecimal(r.quantity_direct),
      referenceEntries: Array.isArray(r.reference_entries)
        ? r.reference_entries.map((entry: any) => ({
            refProgressivo: entry[0],
            factor: normalizeDecimal(entry[1]) ?? '0',
          }))
        : [],
      quantityTotalResolved: normalizeDecimal(r.quantity_total_resolved),
    }));
  }

  return {
    units: (result?.units ?? []).map((u: any) => ({ unitId: u.unit_id, label: u.label })),
    priceLists,
    groups,
    products,
    preventivi,
    rilevazioni,
  };
}
