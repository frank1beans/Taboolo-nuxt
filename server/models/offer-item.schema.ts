import { Schema, model, Types } from 'mongoose';

export interface IOfferItem {
    offer_id: Types.ObjectId;
    project_id: Types.ObjectId;

    // Provenienza e modalità
    origin?: 'baseline' | 'addendum';      // baseline = voce del computo/listino, addendum = voce aggiunta dall'impresa
    source?: 'detailed' | 'aggregated';    // modalità dell'offerta (mx vs lx)
    resolution_status?: 'resolved' | 'pending'; // pending = in attesa di scelta utente per match PLI
    candidate_price_list_item_ids?: Types.ObjectId[]; // candidati PLI quando match non univoco

    // Linkage Keys - One of these strategies must be used

    // 1. Detailed Mode (Computo)
    estimate_item_id?: Types.ObjectId; // Strict link to the specific row in the baseline estimate
    progressive?: number;              // Fallback / Human readable key

    // 2. Aggregated Mode (Lista)
    price_list_item_id?: Types.ObjectId; // Strict link to the Price List Item (Product)
    code?: string;                       // Fallback / Human readable key (Code of the product)

    // Optional location info (only for detailed)
    wbs_id?: Types.ObjectId;

    // Content values (snapshot from import)
    description?: string;
    unit_measure?: string;

    // Values (Impulse values from the Offer)
    quantity: number;
    unit_price: number;
    amount?: number;

    // Differences/Notes
    notes?: string;

    created_at: Date;
    updated_at: Date;
}

const OfferItemSchema = new Schema<IOfferItem>({
    offer_id: { type: Schema.Types.ObjectId, ref: 'Offer', required: true, index: true },
    project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },

    origin: { type: String, enum: ['baseline', 'addendum'], default: 'baseline', index: true },
    source: { type: String, enum: ['detailed', 'aggregated'], default: 'detailed', index: true },
    resolution_status: { type: String, enum: ['resolved', 'pending'], default: 'resolved', index: true },
    candidate_price_list_item_ids: [{ type: Schema.Types.ObjectId, ref: 'PriceListItem' }],

    // Linkages
    estimate_item_id: { type: Schema.Types.ObjectId, ref: 'EstimateItem', index: true },
    progressive: { type: Number, index: true },

    price_list_item_id: { type: Schema.Types.ObjectId, ref: 'PriceListItem', index: true },
    code: { type: String, index: true },

    wbs_id: { type: Schema.Types.ObjectId, ref: 'WbsNode' },

    description: String,
    unit_measure: String,

    quantity: { type: Number, required: true },
    unit_price: { type: Number, required: true },
    amount: { type: Number },

    notes: String,

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Hardening: enforce basic coherence based on source/origin
OfferItemSchema.pre('validate', function () {
    const doc: any = this;

    if (doc.source === 'aggregated' || doc.origin === 'addendum') {
        // In lista (LX) o addendum non devono restare riferimenti al computo
        doc.estimate_item_id = undefined;
        doc.progressive = undefined;
    }

    if (!doc.resolution_status) {
        doc.resolution_status = doc.price_list_item_id ? 'resolved' : 'pending';
    }

    if (doc.source === 'detailed' && doc.origin !== 'addendum') {
        if (!doc.estimate_item_id) {
            throw new Error('OfferItem detailed mode requires estimate_item_id (unless addendum).');
        }
    }
});

// Compound indexes for query performance
OfferItemSchema.index({ offer_id: 1, estimate_item_id: 1 }); // Main lookup for detailed
OfferItemSchema.index({ offer_id: 1, price_list_item_id: 1 }); // Main lookup for aggregated

export const OfferItem = model<IOfferItem>('OfferItem', OfferItemSchema);
