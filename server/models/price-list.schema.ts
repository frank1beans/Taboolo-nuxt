import { Schema, model, type Types } from 'mongoose';

export interface IPriceList {
    project_id?: Types.ObjectId; // Optional for global catalogs
    estimate_id?: Types.ObjectId; // Optional for global catalogs
    name: string;
    currency: string;
    description?: string;
    is_default: boolean;

    import_run_id?: string;

    created_at: Date;
    updated_at: Date;
}

const PriceListSchema = new Schema<IPriceList>({
    project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: false, index: true },
    estimate_id: { type: Schema.Types.ObjectId, ref: 'Estimate', required: false, index: true },
    name: { type: String, required: true },
    currency: { type: String, default: 'EUR' },
    description: { type: String },
    is_default: { type: Boolean, default: false },

    import_run_id: { type: String, index: true }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

PriceListSchema.index({ project_id: 1, estimate_id: 1 });

export const PriceList = model<IPriceList>('PriceList', PriceListSchema);
