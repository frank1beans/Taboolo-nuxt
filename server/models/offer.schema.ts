import type { Types } from 'mongoose';
import { Schema, model } from 'mongoose';

export interface IOffer {
    project_id: Types.ObjectId;
    estimate_id: Types.ObjectId; // Link to Baseline Estimate

    // Header Info
    name: string;             // Nome del preventivo offerta (es. "Offerta Impresa X")

    // Company Info
    company_name: string;     // Nome impresa (required for UI)
    company_id?: Types.ObjectId; // Optional link to a future Company/Contact registry

    round_number: number;     // Giro di offerte (1, 2, 3...)

    // Configuration
    mode: 'detailed' | 'aggregated'; // 'detailed' = Computo (match by progressive), 'aggregated' = Lista (match by code)

    // Metadata
    description?: string;
    date?: Date;
    status: 'draft' | 'submitted' | 'accepted' | 'rejected';

    // Totals
    total_amount?: number;
    discount_percentage?: number;

    created_at: Date;
    updated_at: Date;
}

const OfferSchema = new Schema<IOffer>({
    project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    estimate_id: { type: Schema.Types.ObjectId, ref: 'Estimate', required: true, index: true },

    name: { type: String, required: true },

    company_name: { type: String, required: true, index: true },
    company_id: { type: Schema.Types.ObjectId, ref: 'Company' }, // Reserved for future use

    round_number: { type: Number, default: 1, required: true },

    mode: {
        type: String,
        enum: ['detailed', 'aggregated'],
        required: true,
        default: 'detailed'
    },

    description: String,
    date: Date,
    status: {
        type: String,
        enum: ['draft', 'submitted', 'accepted', 'rejected'],
        default: 'draft'
    },

    total_amount: Number,
    discount_percentage: Number,

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Composite index to prevent duplicates for same company/round/project?
// Or just allow multiples? Usually one offer per company per round.
OfferSchema.index({ project_id: 1, company_name: 1, round_number: 1 });

export const Offer = model<IOffer>('Offer', OfferSchema);
