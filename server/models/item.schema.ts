import { Schema, model, Types } from 'mongoose';

export interface IProjectItemData {
  estimate_id: Types.ObjectId;
  quantity: number;
  unit_price: number;
  amount: number;
  notes?: string;
}

export interface IOfferItemData {
  estimate_id: Types.ObjectId;
  company: string; // denormalized name for convenience
  round_number: number;
  quantity: number;
  unit_price: number;
  amount: number;
  notes?: string;
}

export interface IItem {
  project_id: Types.ObjectId;
  
  // WBS References
  wbs6_id: Types.ObjectId;
  wbs7_id?: Types.ObjectId;
  
  // Identification
  code: string; // The full item code if available, or generated
  description: string;
  description_extended?: string;
  unit_measure?: string;
  
  // Ordering/Grouping
  progressive?: number;
  order: number;

  import_run_id?: string;
  source_preventivo_id?: string;
  
  // Data
  project?: IProjectItemData;
  offers: IOfferItemData[];
  
  created_at: Date;
  updated_at: Date;
}

const ItemSchema = new Schema<IItem>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  wbs6_id: { type: Schema.Types.ObjectId, ref: 'WbsNode', required: true, index: true },
  wbs7_id: { type: Schema.Types.ObjectId, ref: 'WbsNode' },
  
  code: { type: String },
  description: { type: String, required: true },
  description_extended: { type: String },
  unit_measure: { type: String },
  
  progressive: { type: Number },
  order: { type: Number, default: 0 },
  import_run_id: { type: String, index: true },
  source_preventivo_id: { type: String },
  
  project: {
    estimate_id: { type: Schema.Types.ObjectId, ref: 'Estimate' },
    quantity: Number,
    unit_price: Number,
    amount: Number,
    notes: String
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
ItemSchema.index({ project_id: 1, wbs6_id: 1 });

export const Item = model<IItem>('Item', ItemSchema, 'estimateitems');



