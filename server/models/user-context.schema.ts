import { Schema, model } from 'mongoose';

export interface IUserContext {
  user_id: string;
  organization_id?: string | null;
  current_project_id?: string | null;
  current_estimate_id?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

const UserContextSchema = new Schema<IUserContext>({
  user_id: { type: String, required: true, index: true },
  organization_id: { type: String, default: null },
  current_project_id: { type: String, default: null },
  current_estimate_id: { type: String, default: null }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

UserContextSchema.index({ user_id: 1, organization_id: 1 }, { unique: true });

export const UserContext = model<IUserContext>('UserContext', UserContextSchema, 'user_contexts');
