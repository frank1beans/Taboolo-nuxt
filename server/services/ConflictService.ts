import { Types } from 'mongoose';
import { OfferAlert, OfferItem } from '#models';



export type AlertListParams = {
    projectId: string;
    offerId?: string;
    estimateId?: string;
    type?: string[];
    severity?: string[];
    status?: string[];
};

export type AlertUpdateParams = {
    status?: 'open' | 'resolved' | 'ignored';
    resolution_note?: string;
    resolved_by?: string;
    selected_price_list_item_id?: string;
    apply_approved_price?: boolean;
};

/**
 * Service for managing Conflicts (OfferAlerts).
 */
export async function listAlerts(params: AlertListParams) {
    const { projectId, offerId, estimateId, type, severity, status } = params;

    const filter: Record<string, unknown> = { project_id: new Types.ObjectId(projectId) };

    if (offerId && Types.ObjectId.isValid(offerId)) {
        filter.offer_id = new Types.ObjectId(offerId);
    }

    if (estimateId && Types.ObjectId.isValid(estimateId)) {
        filter.estimate_id = new Types.ObjectId(estimateId);
    }

    if (type && type.length) {
        filter.type = { $in: type };
    }

    if (severity && severity.length) {
        filter.severity = { $in: severity };
    }

    if (status && status.length) {
        filter.status = { $in: status };
    }

    return OfferAlert.find(filter).sort({ created_at: -1 }).lean();
}

export async function getAlertById(id: string) {
    return OfferAlert.findById(id);
}

export async function resolveAlert(
    projectId: string,
    alertId: string,
    updates: AlertUpdateParams
) {
    const existingAlert = await OfferAlert.findOne({
        _id: new Types.ObjectId(alertId),
        project_id: new Types.ObjectId(projectId),
    }).lean();

    if (!existingAlert) {
        throw new Error('Alert not found');
    }

    const payload: Record<string, unknown> = {};
    if (updates.status) payload.status = updates.status;
    if (updates.resolution_note) payload.resolution_note = updates.resolution_note;
    if (updates.resolved_by) payload.resolved_by = updates.resolved_by;

    if (updates.status === 'open') {
        payload.resolved_at = null;
    } else if (updates.status === 'resolved' || updates.status === 'ignored') {
        payload.resolved_at = new Date();
    }

    // Handle ambiguous_match resolution
    if (
        existingAlert.type === 'ambiguous_match' &&
        updates.status === 'resolved' &&
        updates.selected_price_list_item_id
    ) {
        const selectedPliId = new Types.ObjectId(updates.selected_price_list_item_id);
        if (existingAlert.offer_item_id) {
            await OfferItem.findByIdAndUpdate(existingAlert.offer_item_id, {
                $set: {
                    price_list_item_id: selectedPliId,
                    resolution_status: 'resolved',
                    candidate_price_list_item_ids: [],
                },
            });
        }
        payload.price_list_item_id = selectedPliId;
    }

    // Note: price_mismatch resolution does NOT overwrite offer prices.
    // Offers are expected to have different prices than baseline - that's the point!
    // We just mark the alert as resolved without modifying the offer item price.

    return OfferAlert.findOneAndUpdate(
        { _id: new Types.ObjectId(alertId), project_id: new Types.ObjectId(projectId) },
        { $set: payload },
        { new: true }
    ).lean();
}

export type SummaryItem = {
    offer_id?: string | Types.ObjectId;
    estimate_id?: string | Types.ObjectId;
    company_name?: string | null;
    round_number?: number | null;
    total: number;
    by_type: Record<string, number>;
};

export async function getAlertsSummary(
    projectId: string,
    params: {
        groupBy?: string;
        offerId?: string;
        estimateId?: string;
        type?: string[];
        status?: string[];
    }
) {
    const { groupBy = 'offer', offerId, estimateId, type, status } = params;
    const filter: Record<string, unknown> = { project_id: new Types.ObjectId(projectId) };

    if (offerId && Types.ObjectId.isValid(offerId)) {
        filter.offer_id = new Types.ObjectId(offerId);
    }

    if (estimateId && Types.ObjectId.isValid(estimateId)) {
        filter.estimate_id = new Types.ObjectId(estimateId);
    }

    if (type && type.length) {
        filter.type = { $in: type };
    }

    if (status && status.length) {
        filter.status = { $in: status };
    } else {
        filter.$or = [{ status: 'open' }, { status: { $exists: false } }];
    }

    let items: SummaryItem[] = [];

    if (groupBy === 'estimate') {
        items = await OfferAlert.aggregate<SummaryItem>([
            { $match: filter },
            { $match: { estimate_id: { $ne: null } } },
            {
                $group: {
                    _id: { estimate_id: '$estimate_id', type: '$type' },
                    count: { $sum: 1 },
                },
            },
            {
                $group: {
                    _id: '$_id.estimate_id',
                    total: { $sum: '$count' },
                    by_type: { $push: { k: '$_id.type', v: '$count' } },
                },
            },
            {
                $project: {
                    _id: 0,
                    estimate_id: '$_id',
                    total: 1,
                    by_type: { $arrayToObject: '$by_type' },
                },
            },
            { $sort: { total: -1 } },
        ]);
    } else if (groupBy === 'offer') {
        items = await OfferAlert.aggregate<SummaryItem>([
            { $match: filter },
            {
                $group: {
                    _id: { offer_id: '$offer_id', type: '$type' },
                    count: { $sum: 1 },
                },
            },
            {
                $group: {
                    _id: '$_id.offer_id',
                    total: { $sum: '$count' },
                    by_type: { $push: { k: '$_id.type', v: '$count' } },
                },
            },
            {
                $lookup: {
                    from: 'offers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'offer',
                },
            },
            { $unwind: { path: '$offer', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    offer_id: '$_id',
                    estimate_id: '$offer.estimate_id',
                    company_name: '$offer.company_name',
                    round_number: '$offer.round_number',
                    total: 1,
                    by_type: { $arrayToObject: '$by_type' },
                },
            },
            { $sort: { total: -1 } },
        ]);
    } else {
        throw new Error('Invalid group_by');
    }

    const normalizedItems = items.map((item) => ({
        ...item,
        offer_id: item.offer_id instanceof Types.ObjectId ? item.offer_id.toString() : item.offer_id,
        estimate_id: item.estimate_id instanceof Types.ObjectId ? item.estimate_id.toString() : item.estimate_id,
    }));

    const total = normalizedItems.reduce((acc, item) => acc + (item.total || 0), 0);

    return { total, items: normalizedItems };
}
