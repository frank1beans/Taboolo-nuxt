import { Schema, model } from 'mongoose';

const PriceListSchema = new Schema({
  importId: { type: Schema.Types.ObjectId, required: true, index: true },
  listIdRaw: { type: String, required: true },
  canonicalId: { type: String, required: true },
  label: { type: String },
  priority: { type: Number, default: 0 },
  preferred: { type: Boolean, default: false }
}, { timestamps: true });

PriceListSchema.index({ importId: 1, listIdRaw: 1 }, { unique: true });

export { PriceListSchema };
export default model('RawPriceList', PriceListSchema);
