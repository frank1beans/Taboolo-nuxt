import { Schema, model, type Types } from 'mongoose';

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
  delivery_date?: Date;
  price_list_id?: string;
  source_preventivo_id?: string;
  import_run_id?: string;
  matching_report?: Record<string, unknown>;
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
  delivery_date: { type: Date },
  price_list_id: { type: String },
  source_preventivo_id: { type: String },
  import_run_id: { type: String, index: true },
  matching_report: { type: Schema.Types.Mixed }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: {
    virtuals: true,
    transform: function(_doc, ret) {
      ret.id = ret._id.toString();
      ret.project_id = ret.project_id?.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function(_doc, ret) {
      ret.id = ret._id.toString();
      ret.project_id = ret.project_id?.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

export const Estimate = model<IEstimate>('Estimate', EstimateSchema);




