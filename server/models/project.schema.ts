import { Schema, model } from 'mongoose';

export interface IProject {
  name: string;
  code: string;
  description?: string;
  notes?: string;
  business_unit?: string;
  revision?: string;
  status: 'setup' | 'in_progress' | 'closed';
  created_at: Date;
  updated_at: Date;
}

const ProjectSchema = new Schema<IProject>({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true, index: true },
  description: { type: String },
  notes: { type: String },
  business_unit: { type: String },
  revision: { type: String },
  status: { 
    type: String, 
    enum: ['setup', 'in_progress', 'closed'], 
    default: 'setup' 
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export const Project = model<IProject>('Project', ProjectSchema);
