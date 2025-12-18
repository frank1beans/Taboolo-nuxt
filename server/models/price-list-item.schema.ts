import { Schema, model, type Types } from 'mongoose';

export interface IPriceListItem {
  project_id?: Types.ObjectId;
  estimate_id: Types.ObjectId;
  code: string;
  description?: string;
  long_description?: string;
  unit?: string;
  price?: number;

  // Metadata
  wbs_ids?: Types.ObjectId[];
  price_list_id?: string;
  import_run_id?: string;
  source_preventivo_id?: string;
  price_lists?: Map<string, number>;

  // Semantic Search
  embedding?: number[];

  created_at: Date;
  updated_at: Date;
}

const PriceListItemSchema = new Schema<IPriceListItem>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  estimate_id: { type: Schema.Types.ObjectId, ref: 'Estimate', required: true, index: true },
  code: { type: String, required: true },
  description: { type: String },
  long_description: { type: String },
  unit: { type: String },
  price: { type: Number },

  wbs_ids: [{ type: Schema.Types.ObjectId, ref: 'WbsNode' }],
  price_list_id: { type: String },
  import_run_id: { type: String, index: true },
  source_preventivo_id: { type: String },
  price_lists: { type: Map, of: Number },

  embedding: { type: [Number], select: false }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Text index
PriceListItemSchema.index({ code: 'text', description: 'text', long_description: 'text' });
PriceListItemSchema.index({ project_id: 1, estimate_id: 1 });

export const PriceListItem = model<IPriceListItem>('PriceListItem', PriceListItemSchema);
