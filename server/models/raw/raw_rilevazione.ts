import { Schema, model } from 'mongoose';

const MeasurementCellSchema = new Schema({
  pos: { type: Number, required: true },
  raw: { type: String, required: true },
  value: { type: Schema.Types.Decimal128 }
}, { _id: false });

const MeasurementSchema = new Schema({
  operation: { type: String, enum: ['+', '-'], default: '+' },
  cells: { type: [MeasurementCellSchema], default: [] },
  product: { type: Schema.Types.Decimal128 },
  references: { type: [Number], default: [] }
}, { _id: false });

const ReferenceEntrySchema = new Schema({
  refProgressivo: { type: Number, required: true },
  factor: { type: Schema.Types.Decimal128, required: true }
}, { _id: false });

const RilevazioneRawSchema = new Schema({
  importId: { type: Schema.Types.ObjectId, required: true, index: true },
  preventivoId: { type: String, required: true, index: true },
  idx: { type: Number, required: true },
  progressivo: { type: Number },
  prodottoId: { type: String, required: true },
  listaQuotazioneIdRaw: { type: String },
  wbsSpatial: [{
    level: { type: Number, required: true },
    code: { type: String },
    description: { type: String }
  }],
  misure: { type: [MeasurementSchema], default: [] },
  comments: { type: [String], default: [] },
  quantityDirect: { type: Schema.Types.Decimal128 },
  referenceEntries: { type: [ReferenceEntrySchema], default: [] },
  quantityTotalResolved: { type: Schema.Types.Decimal128 }
}, { timestamps: true });

RilevazioneRawSchema.index({ importId: 1, preventivoId: 1, idx: 1 }, { unique: true });
RilevazioneRawSchema.index({ importId: 1, preventivoId: 1, progressivo: 1 });

export {
  MeasurementCellSchema,
  MeasurementSchema,
  ReferenceEntrySchema,
  RilevazioneRawSchema
};
export default model('RawRilevazione', RilevazioneRawSchema);
