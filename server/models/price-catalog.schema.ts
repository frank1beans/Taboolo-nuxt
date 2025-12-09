import { Schema, model, Types } from 'mongoose';

export interface IPriceCatalogItem {
  project_id?: Types.ObjectId;
  product_id: string; // Unique identifier for the product across the system
  item_code: string;
  item_description?: string;
  unit_id?: string;
  
  // Metadata
  wbs6_code?: string;
  price_lists?: Map<string, number>; // e.g., { "2024": 100, "2025": 110 }
  
  // Semantic Search
  embedding?: number[];
  
  created_at: Date;
  updated_at: Date;
}

const PriceCatalogItemSchema = new Schema<IPriceCatalogItem>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  product_id: { type: String, required: true, index: true },
  item_code: { type: String, required: true },
  item_description: { type: String },
  unit_id: { type: String },
  
  wbs6_code: { type: String },
  price_lists: { type: Map, of: Number },
  
  embedding: { type: [Number], select: false } // Hide embedding by default
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Text index for simple search
PriceCatalogItemSchema.index({ item_code: 'text', item_description: 'text' });

export const PriceCatalogItem = model<IPriceCatalogItem>('PriceCatalogItem', PriceCatalogItemSchema);
