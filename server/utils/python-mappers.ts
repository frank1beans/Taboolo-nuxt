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
