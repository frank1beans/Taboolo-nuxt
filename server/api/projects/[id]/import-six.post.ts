/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineEventHandler, createError, getQuery, getRouterParam } from 'h3';
import { randomUUID } from 'crypto';
import mongoose, { Types } from 'mongoose';
import { runSixImport, runSixImportRaw } from '#importers/python-six/client';
import {
  upsertEstimate,
  upsertEstimateItems,
} from '#services/EstimateService';
import { upsertPriceCatalog } from '#services/CatalogService';
import { buildAndUpsertWbsFromItems } from '#services/WbsService';
import {
  upsertRawUnits,
  upsertRawPriceLists,
  upsertRawGroupValues,
  upsertRawProducts,
  upsertRawPreventivi,
  upsertRawRilevazioni,
} from '#services/RawDataService';
import type { RawImportPayload } from '#utils/raw-types';

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
  }
  const query = getQuery(event);
  const isRaw = query?.mode === 'raw' || query?.raw === 'true' || query?.raw === '1';

  if (isRaw) {
    const importId = new Types.ObjectId();
    const payload: RawImportPayload = await runSixImportRaw(event, projectId);
    const session = await mongoose.startSession();
    let summary: Record<string, any> = {};
    try {
      await session.withTransaction(async () => {
        await upsertRawUnits(importId, payload.units, session);
        await upsertRawPriceLists(importId, payload.priceLists, session);
        await upsertRawGroupValues(importId, payload.groups, session);
        await upsertRawProducts(importId, payload.products, session);
        await upsertRawPreventivi(importId, payload.preventivi, session);
        for (const [preventivoId, rilevazioni] of Object.entries(payload.rilevazioni)) {
          await upsertRawRilevazioni(importId, preventivoId, rilevazioni, session);
        }
      });

      const rilevazioniCount = Object.values(payload.rilevazioni).reduce((acc, arr) => acc + (arr?.length ?? 0), 0);
      summary = {
        import_id: importId.toString(),
        units: payload.units.length,
        price_lists: payload.priceLists.length,
        groups: payload.groups.length,
        products: payload.products.length,
        preventivi: payload.preventivi.length,
        rilevazioni: rilevazioniCount,
      };
    } finally {
      await session.endSession();
    }

    return {
      ...summary,
      preventivi: payload.preventivi,
    };
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
