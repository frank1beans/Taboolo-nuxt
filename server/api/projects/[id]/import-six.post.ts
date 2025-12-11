/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from 'crypto';
import { runSixImport } from '#importers/python-six/client';
import { upsertEstimate, upsertPriceCatalog, upsertEstimateItems, buildAndUpsertWbsFromItems } from '#utils/import-adapter';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
  }

  const importRunId = randomUUID();

  // Run import via Python service
  const report = await runSixImport(event, projectId);
  const preventivoMeta = (report as any)?.preventivo_meta || {};
  const priceListId = preventivoMeta.price_list_id || null;
  const sourcePreventivoId = preventivoMeta.id || (report as any)?.estimate_id || null;
  const deliveryDate = preventivoMeta.date || null;

  // Persist a placeholder estimate so it appears in the frontend list
  const savedEstimate = await upsertEstimate(projectId, {
    name: report.estimate_id ? `Preventivo ${report.estimate_id}` : 'Import SIX',
    type: 'project',
    total_amount: report.total_amount ?? 0,
    notes: report.catalog_only ? 'Import SIX (solo listino)' : 'Import SIX',
    file_name: (report as any)?.file_name,
    delivery_date: deliveryDate,
    price_list_id: priceListId,
    source_preventivo_id: sourcePreventivoId,
    import_run_id: importRunId,
  });

  // Persist WBS hierarchy (spatial/wbs6/wbs7) derived from item paths or fallback nodes
  const wbsMaps = await buildAndUpsertWbsFromItems(
    projectId,
    (report as any).items_raw ?? [],
    {
      spatial: (report as any).wbs_spaziali_nodes,
      wbs6: (report as any).wbs6_nodes,
      wbs7: (report as any).wbs7_nodes,
    },
  );

  // Persist price catalog if provided
  if (Array.isArray((report as any)?.price_catalog) && report.price_catalog.length > 0) {
    const enrichedCatalog = (report as any).price_catalog.map((entry: any) => ({
      ...entry,
      source_preventivo_id: sourcePreventivoId,
      price_list_id: priceListId,
      import_run_id: importRunId,
    }));
    await upsertPriceCatalog(projectId, enrichedCatalog);
  }

  // Persist items mapped to the baseline estimate
  if (Array.isArray((report as any)?.items_raw) && report.items_raw.length > 0 && savedEstimate?._id) {
    await upsertEstimateItems(
      projectId,
      savedEstimate._id.toString(),
      (report as any).items_raw,
      wbsMaps.wbs6,
      wbsMaps.wbs7,
      importRunId,
      sourcePreventivoId ?? undefined,
    );
  }

  return {
    ...report,
    estimate: savedEstimate,
    import_run_id: importRunId,
  };
});
