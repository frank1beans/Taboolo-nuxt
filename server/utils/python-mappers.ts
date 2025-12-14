/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = Record<string, any>;

const COMPUTO_TYPE_MAP: Record<string, string> = {
  progetto: 'project',
  ritorno: 'offer'
};

export function mapComputoToEstimate(data: Json) {
  if (!data || typeof data !== 'object') return data;
  return {
    id: data.id,
    project_id: data.commessa_id ?? data.project_id,
    name: data.nome ?? data.name,
    type: COMPUTO_TYPE_MAP[data.tipo] || data.type || 'project',
    discipline: data.disciplina,
    revision: data.revisione,
    is_baseline: data.is_baseline ?? false,
    company: data.impresa,
    round_number: data.round_number,
    total_amount: data.importo_totale,
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
    updated_at: data.updated_at
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
  const estimates: Record<string, any> = {};
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

export function mapRawPreview(result: any) {
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

export function mapRawImportPayload(result: any) {
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

  const normalizeDecimal = (value: any): string | number | null | undefined => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return value;
    return String(value);
  };

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
