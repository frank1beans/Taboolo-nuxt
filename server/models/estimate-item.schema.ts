import { Schema, model, type Types } from 'mongoose';

export interface IProjectItemData {
  estimate_id: Types.ObjectId;
  quantity: number;
  unit_price?: number; // Normalized: lookup from PL
  amount?: number; // Normalized: calc on fly (or cache)
  notes?: string;
}

export interface IOfferItemData {
  estimate_id: Types.ObjectId;
  company: string;
  round_number: number;
  quantity: number;
  unit_price: number; // Offers might override/have specific prices
  amount: number;
  notes?: string;
}

export interface IEstimateItem {
  project_id: Types.ObjectId;

  // WBS References - Normalized
  wbs_ids: Types.ObjectId[];

  price_list_item_id: string; // Foreign Key

  // Identification (Overrides only)
  code?: string;
  description?: string;
  description_extended?: string;
  unit_measure?: string;

  // Ordering/Grouping
  progressive?: number;
  order: number;

  import_run_id?: string;
  source_preventivo_id?: string;
  related_item_id?: string; // For 'Vedi Voce' references

  // Data
  project?: IProjectItemData;
  offers: IOfferItemData[];

  created_at: Date;
  updated_at: Date;
}

const EstimateItemSchema = new Schema<IEstimateItem>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  // Store all WBS nodes
  wbs_ids: [{ type: Schema.Types.ObjectId, ref: 'WbsNode', required: true, index: true }],

  price_list_item_id: { type: String, required: true, index: true },

  code: { type: String }, // Optional
  description: { type: String }, // Optional
  description_extended: { type: String },
  unit_measure: { type: String }, // Optional

  progressive: { type: Number },
  order: { type: Number, default: 0 },
  import_run_id: { type: String, index: true },
  source_preventivo_id: { type: String },
  related_item_id: { type: String, index: true },

  project: {
    estimate_id: { type: Schema.Types.ObjectId, ref: 'Estimate' },
    quantity: Number,
    unit_price: Number,
    amount: Number,
    notes: String,
    measurements: [{
      formula: String,
      value: Number
    }]
  },

  offers: [{
    estimate_id: { type: Schema.Types.ObjectId, ref: 'Estimate' },
    company: String,
    round_number: Number,
    quantity: Number,
    unit_price: Number,
    amount: Number,
    notes: String
  }]
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Index for efficient retrieval of all items for a WBS node
EstimateItemSchema.index({ project_id: 1, wbs_ids: 1 });

export const EstimateItem = model<IEstimateItem>('EstimateItem', EstimateItemSchema);





