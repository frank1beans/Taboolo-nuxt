import { Schema, model } from 'mongoose';

const GroupValueSchema = new Schema({
  importId: { type: Schema.Types.ObjectId, required: true, index: true },
  grpId: { type: String, required: true },
  code: { type: String },
  description: { type: String },
  kind: { type: String, enum: ['spatial', 'wbs6', 'wbs7', 'other'], required: true },
  level: { type: Number },
  parentId: { type: Schema.Types.ObjectId, ref: 'RawGroupValue' },
  ancestors: [{ type: Schema.Types.ObjectId, ref: 'RawGroupValue' }]
}, { timestamps: true });

GroupValueSchema.index({ importId: 1, grpId: 1 }, { unique: true });

export { GroupValueSchema };
export default model('RawGroupValue', GroupValueSchema);
