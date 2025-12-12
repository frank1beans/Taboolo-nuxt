import { Schema, model } from 'mongoose';

const UnitSchema = new Schema({
  importId: { type: Schema.Types.ObjectId, required: true, index: true },
  unitId: { type: String, required: true },
  label: { type: String, required: true }
}, { timestamps: true });

UnitSchema.index({ importId: 1, unitId: 1 }, { unique: true });

export { UnitSchema };
export default model('RawUnit', UnitSchema);
