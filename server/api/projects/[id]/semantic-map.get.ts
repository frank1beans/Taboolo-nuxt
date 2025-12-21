
import { defineEventHandler, getRouterParam, getQuery, createError } from 'h3';
import { PriceListItem } from '#models';

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id');
    const query = getQuery(event);
    const mode = query.mode === '3d' ? '3d' : '2d';
    const limit = Math.min(Number(query.limit ?? 8000), 20000);

    if (!id) {
        throw createError({ statusCode: 400, statusMessage: 'Project ID required' });
    }

    try {
        const mapField = mode === '3d' ? 'map3d' : 'map2d';

        // Projection to minimize data transfer
        const projection = {
            _id: 1,
            code: 1,
            description: 1,
            price: 1,
            unit: 1,
            cluster: 1,
            [mapField]: 1
        };

        const filter = {
            project_id: id,
            [mapField]: { $exists: true }
        };

        const docs = await PriceListItem.find(filter)
            .select(projection)
            .limit(limit)
            .lean();

        console.log("Nitro Map Debug:", {
            projectId: id,
            filter,
            found: docs.length,
            sample: docs[0] ? { id: docs[0]._id, map2d: (docs as any)[0].map2d } : 'None'
        });

        return docs.map((d: any) => ({
            id: d._id.toString(),
            cluster: d.cluster ?? -1,
            label: d.code ? `${d.code} — ${d.description}` : (d.description ?? ""),
            price: d.price ?? null,
            unit: d.unit ?? null,
            ...(mode === '3d'
                ? { x: d.map3d?.x, y: d.map3d?.y, z: d.map3d?.z }
                : { x: d.map2d?.x, y: d.map2d?.y }
            )
        }));

    } catch (error) {
        console.error("Error fetching semantic map:", error);
        throw createError({
            statusCode: 500,
            statusMessage: 'Error fetching semantic map',
            cause: error
        });
    }
});
