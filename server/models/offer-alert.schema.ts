import type { Types } from 'mongoose';
import { Schema, model } from 'mongoose';

export type OfferAlertType =
  | 'price_mismatch'
  | 'quantity_mismatch'
  | 'code_mismatch'
  | 'missing_baseline'
  | 'ambiguous_match'
  | 'addendum';

export type OfferAlertSeverity = 'info' | 'warning' | 'error';

export interface IOfferAlert {
  project_id: Types.ObjectId;
  offer_id: Types.ObjectId;
  offer_item_id?: Types.ObjectId;
  estimate_item_id?: Types.ObjectId;
  price_list_item_id?: Types.ObjectId;
  source?: 'detailed' | 'aggregated';
  origin?: 'baseline' | 'addendum';
  type: OfferAlertType;
  severity: OfferAlertSeverity;
  message?: string;
  actual?: number | string | null;
  expected?: number | string | null;
  delta?: number | null;
  code?: string | null;
  baseline_code?: string | null;
  created_at: Date;
  updated_at: Date;
}

const OfferAlertSchema = new Schema<IOfferAlert>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  offer_id: { type: Schema.Types.ObjectId, ref: 'Offer', required: true, index: true },
  offer_item_id: { type: Schema.Types.ObjectId, ref: 'OfferItem', index: true },
  estimate_item_id: { type: Schema.Types.ObjectId, ref: 'EstimateItem', index: true },
  price_list_item_id: { type: Schema.Types.ObjectId, ref: 'PriceListItem', index: true },
  source: { type: String, enum: ['detailed', 'aggregated'] },
  origin: { type: String, enum: ['baseline', 'addendum'] },
  type: {
    type: String,
    enum: ['price_mismatch', 'quantity_mismatch', 'code_mismatch', 'missing_baseline', 'ambiguous_match', 'addendum'],
    required: true,
    index: true,
  },
  severity: { type: String, enum: ['info', 'warning', 'error'], default: 'warning' },
  message: String,
  actual: { type: Schema.Types.Mixed },
  expected: { type: Schema.Types.Mixed },
  delta: Number,
  code: String,
  baseline_code: String,
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

OfferAlertSchema.index({ project_id: 1, offer_id: 1, type: 1 });
OfferAlertSchema.index({ offer_id: 1, offer_item_id: 1 });

export const OfferAlert = model<IOfferAlert>('OfferAlert', OfferAlertSchema);
