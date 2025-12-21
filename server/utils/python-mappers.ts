
type Json = Record<string, unknown>;

const COMPUTO_TYPE_MAP: Record<string, string> = {
  progetto: 'project',
  ritorno: 'offer'
};

export function mapComputoToEstimate(data: Json) {
  if (!data || typeof data !== 'object') return data;

  const mapItem = (item: Json) => {
    const shortDescription = item.short_description ?? item.descrizione ?? item.description ?? item.code ?? item.codice;
    const longDescription = item.long_description ?? item.description_extended ?? item.descrizione_estesa ?? item.note_estese ?? null;
    const wbsIds = item.wbs_ids ?? item.wbsIds ?? item.groupIds ?? null;
    return {
      order: item.ordine ?? item.order ?? 0,
      progressive: item.progressivo ?? item.progressive,
      code: item.codice ?? item.code,
      short_description: shortDescription,
      long_description: longDescription,
      unit: item.unita_misura ?? item.unit,
      quantity: item.quantita ?? item.quantity,
      unit_price: item.prezzo_unitario ?? item.unit_price,
      amount: item.importo ?? item.amount,
      notes: item.note ?? item.notes,
      metadata: item.metadata,
      wbs_ids: wbsIds,
      wbs_levels: item.wbs_levels,
    };
  };

  return {
    id: data.id,
    project_id: data.commessa_id ?? data.project_id,
    name: data.nome ?? data.name,
    type: COMPUTO_TYPE_MAP[data.tipo] || data.type || 'project',
    mode: data.mode,
    discipline: data.disciplina,
    revision: data.revisione,
    is_baseline: data.is_baseline ?? false,
    company: data.impresa,
    round_number: data.round_number,
    total_amount: data.importo_totale ?? data.total_amount,
    delta_vs_project: data.delta_vs_progetto,
    delta_percentage: data.percentuale_delta,
    notes: data.note,
    file_name: data.file_nome ?? data.file_name,
    delivery_date: data.data ?? data.date,
    price_list_id: data.price_list_id,
    source_preventivo_id: data.preventivo_id ?? data.estimate_id,
    import_run_id: data.import_run_id,
    matching_report: data.matching_report,
    created_at: data.created_at,
    updated_at: data.updated_at,
    // Include items for LX/MX import
    items: Array.isArray(data.items) ? data.items.map(mapItem) : [],
  };
}

export function mapWbsImportStats(data: Json) {
  if (!data || typeof data !== 'object') return data;
  return {
    rows_total: data.rows_total ?? 0,
    spatial_inserted: data.spaziali_inserted ?? data.spatial_inserted ?? 0,
    spatial_updated: data.spaziali_updated ?? data.spatial_updated ?? 0,
    wbs6_inserted: data.wbs6_inserted ?? 0,
    wbs6_updated: data.wbs6_updated ?? 0,
    wbs7_inserted: data.wbs7_inserted ?? 0,
    wbs7_updated: data.wbs7_updated ?? 0
  };
}

export function mapSixImportReport(data: Json) {
  if (!data || typeof data !== 'object') return data;
  const itemsArray = Array.isArray(data.items) ? data.items : [];
  const itemsCount = itemsArray.length || (data.voci ?? data.items ?? 0);
  const preventivoMeta = data.preventivo_meta ?? {};
  return {
    project_id: data.commessa_id ?? data.project_id,
    file_name: data.file_name,
    spatial_wbs: data.wbs_spaziali ?? data.spatial_wbs,
    wbs6: data.wbs6,
    wbs7: data.wbs7,
    items: itemsCount,
    total_amount: data.importo_totale ?? data.total_amount,
    price_items: data.price_items ?? null,
    estimate_id: data.preventivo_id ?? data.estimate_id ?? null,
    catalog_only: data.listino_only ?? data.catalog_only ?? false,
    price_catalog: data.price_catalog ?? data.catalog ?? data.price_lists ?? [],
    items_raw: itemsArray,
    wbs_spaziali_nodes: data.wbs_spaziali_nodes ?? data.wbs_spaziali ?? [],
    wbs6_nodes: data.wbs6_nodes ?? data.wbs6 ?? [],
    wbs7_nodes: data.wbs7_nodes ?? data.wbs7 ?? [],
    preventivo_meta: {
      id: preventivoMeta.id ?? data.preventivo_id ?? data.estimate_id ?? null,
      code: preventivoMeta.code ?? null,
      description: preventivoMeta.description ?? null,
      author: preventivoMeta.author ?? null,
      version: preventivoMeta.version ?? null,
      date: preventivoMeta.date ?? null,
      price_list_id: preventivoMeta.price_list_id ?? null,
      price_list_label: preventivoMeta.price_list_label ?? null,
    },
  };
}

export function mapSixPreview(data: Json) {
  if (!data || typeof data !== 'object') return data;
  const preventivi = data.preventivi ?? data.estimates ?? [];
  const estimates = preventivi.map((p: Json) => ({
    internal_id: p.internal_id,
    code: p.code,
    description: p.description,
    author: p.author,
    version: p.version,
    date: p.date,
    price_list_id: p.price_list_id,
    price_list_label: p.price_list_label,
    detections: p.rilevazioni ?? p.detections,
    items: p.items,
    total_amount: p.total_importo ?? p.total_amount
  }));
  return { estimates };
}

export function mapBatchSingleFileResult(data: Json) {
  if (!data || typeof data !== 'object') return data;
  const computi = data.computi ?? {};
  const estimates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(computi)) {
    estimates[key] = mapComputoToEstimate(value as Json);
  }
  return {
    success: data.success ?? [],
    failed: (data.failed ?? []).map((f: Json) => ({
      company: f.impresa ?? f.company,
      error: f.error,
      error_type: f.error_type,
      details: f.details,
      config: f.config ?? null
    })),
    total: data.total ?? 0,
    success_count: data.success_count ?? 0,
    failed_count: data.failed_count ?? 0,
    estimates
  };
}

const toJsonArray = (value: unknown): Json[] => (Array.isArray(value) ? (value as Json[]) : []);
const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

export function mapRawPreview(result: unknown) {
  const data = toRecord(result);
  return {
    preventivi: toJsonArray(data.preventivi),
    priceLists: toJsonArray(data.price_lists),
    wbsSpatial: toJsonArray(data.wbs_spaziali),
    wbs6: toJsonArray(data.wbs6),
    wbs7: toJsonArray(data.wbs7),
    unitsCount: typeof data.units_count === 'number' ? data.units_count : 0,
    productsCount: typeof data.products_count === 'number' ? data.products_count : 0,
    priceListsCount: typeof data.price_lists_count === 'number' ? data.price_lists_count : 0,
    groupsCount: typeof data.groups_count === 'number' ? data.groups_count : 0,
    wbs_structure: Array.isArray(data.wbs_structure) ? data.wbs_structure : [],
    canonical_levels: toRecord(data.canonical_levels),
  };
}

export function mapRawImportPayload(result: unknown) {
  const data = toRecord(result);

  // NEW: Pass-through for LoaderService structure
  if ('estimate' in data && 'project' in data) {
    return result;
  }

  const priceLists = toJsonArray(data.priceLists).map((pl) => ({
    listIdRaw: pl.listIdRaw as string | undefined,
    canonicalId: pl.canonicalId as string | undefined,
    label: pl.label ?? null,
    priority: (pl.priority as number | undefined) ?? 0,
    preferred: Boolean(pl.preferred),
  }));

  const priceListMap = new Map<string, string>();
  for (const pl of priceLists) {
    if (pl.listIdRaw) priceListMap.set(pl.listIdRaw, pl.canonicalId);
  }

  const groups = toJsonArray(data.groups).map((g) => ({
    grpId: g.grpId as string | undefined,
    code: g.code ?? null,
    description: g.description ?? null,
    kind: g.kind,
    level: g.level ?? null,
  }));

  const products = toJsonArray(data.products).map((p) => ({
    prodottoId: p.prodottoId,
    code: p.code ?? null,
    short_description: p.descriptionShort ?? p.description_short ?? p.code ?? '',
    long_description: p.descriptionLong ?? p.description_long ?? null,
    unitId: p.unitId ?? null,
    wbs6: p.wbs6 ?? null,
    wbs7: p.wbs7 ?? null,
    isParentVoice: Boolean(p.isParentVoice),
    prices: Array.isArray(p.prices)
      ? (p.prices as Json[]).map((entry) => {
        const asArray = entry as unknown[];
        const asJson = entry as Json;
        return {
          canonicalId: (asJson.canonicalId as string | undefined) ?? asArray[0],
          value: (asJson.value as number | undefined) ?? asArray[1],
          priority: (asJson.priority as number | undefined ?? (asArray[2] as number | undefined)) ?? 0,
        };
      })
      : [],
  }));

  const preventivi = toJsonArray(data.preventivi).map((prv) => {
    return {
      preventivoId: prv.preventivoId,
      code: prv.code ?? null,
      description: prv.description ?? null,
      date: prv.date ?? null,
      priceListIdRaw: prv.priceListIdRaw ?? null,
      priceListId: prv.priceListId ?? null,
      stats: {
        rilevazioni: prv.stats?.rilevazioni ?? 0,
        items: prv.stats?.items ?? 0,
        totalImportoPreview: prv.stats?.totalImportoPreview ?? null,
      },
    };
  });

  const normalizeDecimal = (value: unknown): string | number | null | undefined => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return value;
    return String(value);
  };

  const rilevazioni: Record<string, Json[]> = {};
  const rilevazioniRaw = toRecord(data.rilevazioni);
  for (const key of Object.keys(rilevazioniRaw)) {
    const rawArray = Array.isArray(rilevazioniRaw[key]) ? (rilevazioniRaw[key] as Json[]) : [];
    rilevazioni[key] = rawArray.map((r) => ({
      preventivoId: r.preventivoId,
      idx: r.idx,
      progressivo: r.progressivo ?? null,
      prodottoId: r.prodottoId,
      listaQuotazioneIdRaw: r.listaQuotazioneIdRaw ?? null,
      wbsSpatial: Array.isArray(r.wbsSpatial)
        ? r.wbsSpatial
          .filter((w: Json) => w && (w.level === undefined || w.level <= 5)) // Legacy quirk or pass-through
          .map((w: Json) => ({ level: w.level, code: w.code ?? null, description: w.description ?? null }))
        : [],
      misure: Array.isArray(r.misure)
        ? (r.misure as Json[]).map((m: Json) => ({
          operation: m.operation ?? '+',
          cells: Array.isArray(m.cells)
            ? m.cells
            : [],

          formula: m.formula ?? null,
          length: normalizeDecimal(m.length),
          width: normalizeDecimal(m.width),
          height: normalizeDecimal(m.height),
          parts: normalizeDecimal(m.parts),

          product: normalizeDecimal(m.product),
          references: m.references ?? [],
        }))
        : [],
      comments: r.comments ?? [],
      quantityDirect: normalizeDecimal(r.quantityDirect),
      referenceEntries: r.referenceEntries ?? [],
      quantityTotalResolved: normalizeDecimal(r.quantityTotalResolved),
    }));
  }

  return {
    units: toJsonArray(data.units).map((u) => ({ unitId: u.unitId, label: u.label })),
    priceLists,
    groups,
    products,
    preventivi,
    rilevazioni,
  };
}
