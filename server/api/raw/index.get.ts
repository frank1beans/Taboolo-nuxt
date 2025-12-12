import { defineEventHandler, getQuery, createError } from 'h3';
import { Types } from 'mongoose';
import { RawUnit, RawPriceList, RawGroupValue, RawProduct, RawPreventivo, RawRilevazione } from '#models';
import { serializeDocs } from '#utils/serialize';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const importIdParam = query.importId as string | undefined;

  try {
    // Determine importId: use provided or latest available
    let importId = importIdParam;
    if (!importId) {
      const latest = await RawPreventivo.findOne().sort({ createdAt: -1 }).lean();
      importId = latest?.importId?.toString?.() || latest?.importId || undefined;
    }

    if (!importId) {
      throw createError({ statusCode: 404, statusMessage: 'Nessun import disponibile' });
    }

    const importObjectId = (() => {
      try {
        return new Types.ObjectId(importId as string);
      } catch (e) {
        return null;
      }
    })();

    const [units, priceLists, groups, products, preventivi] = await Promise.all([
      RawUnit.find({ importId: importObjectId ?? importId }).lean(),
      RawPriceList.find({ importId: importObjectId ?? importId }).lean(),
      RawGroupValue.find({ importId: importObjectId ?? importId }).lean(),
      RawProduct.find({ importId: importObjectId ?? importId }).lean(),
      RawPreventivo.find({ importId: importObjectId ?? importId }).lean(),
    ]);

    const rilevazioniCounts = await RawRilevazione.aggregate([
      { $match: { importId: importObjectId ?? importId } },
      { $group: { _id: '$preventivoId', count: { $sum: 1 } } },
    ]);

    const preventivoRilevazioni = Object.fromEntries(
      rilevazioniCounts.map((r) => [r._id, r.count])
    );

    return {
      importId,
      counts: {
        units: units.length,
        priceLists: priceLists.length,
        groups: groups.length,
        products: products.length,
        preventivi: preventivi.length,
        rilevazioni: rilevazioniCounts.reduce((acc, r) => acc + (r.count || 0), 0),
      },
      units: serializeDocs(units),
      priceLists: serializeDocs(priceLists),
      groups: serializeDocs(groups),
      products: serializeDocs(products),
      preventivi: serializeDocs(preventivi).map((p) => ({
        ...p,
        rilevazioni: preventivoRilevazioni[p.preventivoId] || 0,
      })),
    };
  } catch (error) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Errore nel recupero dati raw',
      cause: error,
    });
  }
});
