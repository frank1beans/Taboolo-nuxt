import { Schema, model, type Types } from 'mongoose';

export type WbsNodeType = 'spatial' | 'commodity';

export interface IWbsNode {
  project_id: Types.ObjectId;
  parent_id?: Types.ObjectId;
  type: WbsNodeType;
  level: number;
  category?: string; // e.g., wbs01...wbs07
  code: string;
  description?: string;
  
  // Specific fields for navigation/hierarchy
  wbs_spatial_id?: Types.ObjectId; // Reference to leaf spatial node (for wbs6)
  wbs6_id?: Types.ObjectId; // Reference to parent wbs6 (for wbs7)
  
  ancestors: Types.ObjectId[]; // Materialized path for efficient subtree queries
  
  // Computed/Cached values
  project_amount?: number;
  
  created_at: Date;
  updated_at: Date;
}

const WbsNodeSchema = new Schema<IWbsNode>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  parent_id: { type: Schema.Types.ObjectId, ref: 'WbsNode', index: true },
  type: { type: String, enum: ['spatial', 'commodity'], required: true },
  level: { type: Number, required: true },
  category: { type: String },
  code: { type: String, required: true },
  description: { type: String },
  
  wbs_spatial_id: { type: Schema.Types.ObjectId, ref: 'WbsNode' },
  wbs6_id: { type: Schema.Types.ObjectId, ref: 'WbsNode' },
  
  ancestors: [{ type: Schema.Types.ObjectId, ref: 'WbsNode' }]
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

WbsNodeSchema.index({ project_id: 1, code: 1, type: 1 });
WbsNodeSchema.index({ project_id: 1, parent_id: 1 });

export const WbsNode = model<IWbsNode>('WbsNode', WbsNodeSchema);
