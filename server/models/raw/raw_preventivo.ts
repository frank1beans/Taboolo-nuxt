import { Schema, model } from 'mongoose';

const PreventivoSchema = new Schema({
  importId: { type: Schema.Types.ObjectId, required: true, index: true },
  preventivoId: { type: String, required: true },
  code: { type: String },
  description: { type: String },
  date: { type: String },
  priceListIdRaw: { type: String },
  priceListId: { type: String },
  stats: {
    rilevazioni: Number,
    items: Number,
    totalImportoPreview: Number
  }
}, { timestamps: true });

PreventivoSchema.index({ importId: 1, preventivoId: 1 }, { unique: true });

export { PreventivoSchema };
export default model('RawPreventivo', PreventivoSchema);
