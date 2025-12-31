import { defineEventHandler, createError } from 'h3';
import { PriceListItem, OfferAlert } from '#models';
import { serializeDocs, serializeDoc } from '#utils/serialize';
import { requireObjectIdParam, toObjectId } from '#utils/validate';

/**
 * GET /api/projects/[id]/offers/alerts/[alertId]/candidates
 * 
 * Fetches the candidate PriceListItems for an ambiguous_match alert.
 * Returns the full details of each candidate to display in the UI.
 */
export default defineEventHandler(async (event) => {
    const projectId = requireObjectIdParam(event, 'id', 'Project ID');
    const alertId = requireObjectIdParam(event, 'alertId', 'Alert ID');

    // Find the alert
    const alert = await OfferAlert.findOne({
        _id: toObjectId(alertId),
        project_id: toObjectId(projectId),
    }).lean();

    if (!alert) {
        throw createError({ statusCode: 404, statusMessage: 'Alert not found' });
    }

    if (alert.type !== 'ambiguous_match') {
        return { candidates: [] };
    }

    const candidateIds = alert.candidate_price_list_item_ids || [];
    if (!candidateIds.length) {
        return { candidates: [] };
    }

    // Fetch candidate PLI details
    const candidates = await PriceListItem.find({
        _id: { $in: candidateIds },
        project_id: toObjectId(projectId),
    }).select('_id code description long_description unit price').lean();

    return {
        alert: serializeDoc(alert as unknown as Record<string, unknown>),
        candidates: serializeDocs(candidates as unknown as Record<string, unknown>[]),
    };
});
