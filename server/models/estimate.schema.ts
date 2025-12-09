import { Schema, model, Types } from 'mongoose';

export interface IEstimate {
  project_id: Types.ObjectId;
  name: string;
  type: 'project' | 'offer'; // 'project' (baseline) or 'offer' (bid return)
  discipline?: string;
  revision?: string;
  is_baseline: boolean;
  company?: string;
  round_number?: number;
  total_amount?: number;
  delta_vs_project?: number;
  delta_percentage?: number;
  notes?: string;
  file_name?: string;
  matching_report?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

const EstimateSchema = new Schema<IEstimate>({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['project', 'offer'], required: true },
  discipline: { type: String },
  revision: { type: String },
  is_baseline: { type: Boolean, default: false },
  company: { type: String },
  round_number: { type: Number },
  total_amount: { type: Number },
  delta_vs_project: { type: Number },
  delta_percentage: { type: Number },
  notes: { type: String },
  file_name: { type: String },
  matching_report: { type: Schema.Types.Mixed }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export const Estimate = model<IEstimate>('Estimate', EstimateSchema);

