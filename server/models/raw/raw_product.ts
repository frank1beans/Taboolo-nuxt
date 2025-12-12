import { Schema, model } from 'mongoose';

const PriceEntrySchema = new Schema({
  canonicalId: { type: String, required: true },
  value: { type: Number, required: true },
  priority: { type: Number, default: 0 }
}, { _id: false });

const ProductSchema = new Schema({
  importId: { type: Schema.Types.ObjectId, required: true, index: true },
  prodottoId: { type: String, required: true },
  code: { type: String },
  descriptionShort: { type: String, required: true },
  descriptionLong: { type: String },
  unitId: { type: String },
  wbs6: { code: String, description: String },
  wbs7: { code: String, description: String },
  isParentVoice: { type: Boolean, default: false },
  prices: { type: [PriceEntrySchema], default: [] }
}, { timestamps: true });

ProductSchema.index({ importId: 1, prodottoId: 1 }, { unique: true });

export { ProductSchema, PriceEntrySchema };
export default model('RawProduct', ProductSchema);
