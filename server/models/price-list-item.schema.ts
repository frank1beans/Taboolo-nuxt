import { Schema, model, type Types } from 'mongoose';

export interface IPriceListItem {
  project_id?: Types.ObjectId;
  estimate_id: Types.ObjectId;
  code: string;
  description?: string;
  long_description?: string;
  extended_description?: string;  // Concatenated parent descriptions for embeddings
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
  extracted_properties?: Record<string, unknown>;

  // UMAP Visualization
  map2d?: { x: number; y: number };
  map3d?: { x: number; y: number; z: number };
  cluster?: number;
  map_version?: string;
  map_updated_at?: Date;

  created_at: Date;
  updated_at: Date;
}

const PriceListItemSchema = new Schema<IPriceListItem>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  estimate_id: { type: Schema.Types.ObjectId, ref: 'Estimate', required: true, index: true },
  code: { type: String, required: true },
  description: { type: String },
  long_description: { type: String },
  extended_description: { type: String },
  unit: { type: String },
  price: { type: Number },

  wbs_ids: [{ type: Schema.Types.ObjectId, ref: 'WbsNode' }],
  price_list_id: { type: String },
  import_run_id: { type: String, index: true },
  source_preventivo_id: { type: String },
  price_lists: { type: Map, of: Number },

  embedding: { type: [Number], select: false },
  extracted_properties: { type: Schema.Types.Mixed },

  map2d: {
    x: { type: Number },
    y: { type: Number }
  },
  map3d: {
    x: { type: Number },
    y: { type: Number },
    z: { type: Number }
  },
  cluster: { type: Number },
  map_version: { type: String },
  map_updated_at: { type: Date }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Text index - include extended_description for richer search
PriceListItemSchema.index({ code: 'text', description: 'text', long_description: 'text', extended_description: 'text' });
PriceListItemSchema.index({ project_id: 1, estimate_id: 1 });

export const PriceListItem = model<IPriceListItem>('PriceListItem', PriceListItemSchema);
