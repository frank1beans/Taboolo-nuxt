import type { Types } from 'mongoose';

export interface RawUnitInput {
  unitId: string;
  label: string;
}

export interface RawPriceListInput {
  listIdRaw: string;
  canonicalId: string;
  label?: string | null;
  priority?: number;
  preferred?: boolean;
}

export type RawGroupKind = 'spatial' | 'wbs6' | 'wbs7' | 'other';

export interface RawGroupValueInput {
  grpId: string;
  code?: string | null;
  description?: string | null;
  kind: RawGroupKind;
  level?: number | null;
  parentId?: Types.ObjectId | string | null;
  ancestors?: Array<Types.ObjectId | string>;
}

export interface RawPriceEntryInput {
  canonicalId: string;
  value: number;
  priority?: number;
}

export interface RawProductInput {
  prodottoId: string;
  code?: string | null;
  descriptionShort: string;
  descriptionLong?: string | null;
  unitId?: string | null;
  wbs6?: { code?: string | null; description?: string | null };
  wbs7?: { code?: string | null; description?: string | null };
  isParentVoice?: boolean;
  prices?: RawPriceEntryInput[];
}

export interface RawPreventivoInput {
  preventivoId: string;
  code?: string | null;
  description?: string | null;
  date?: string | null;
  priceListIdRaw?: string | null;
  priceListId?: string | null;
  stats?: {
    rilevazioni?: number;
    items?: number;
    totalImportoPreview?: number | null;
  };
}

export interface RawMeasurementCellInput {
  pos: number;
  raw: string;
  value?: string | number | null;
}

export interface RawMeasurementInput {
  operation?: string;
  cells?: RawMeasurementCellInput[];
  product?: string | number | null;
  references?: number[];
}

export interface RawReferenceEntryInput {
  refProgressivo: number;
  factor: string | number;
}

export interface RawRilevazioneInput {
  preventivoId: string;
  idx: number;
  progressivo?: number | null;
  prodottoId: string;
  listaQuotazioneIdRaw?: string | null;
  wbsSpatial?: Array<{ level: number; code?: string | null; description?: string | null }>;
  misure?: RawMeasurementInput[];
  comments?: string[];
  quantityDirect?: string | number | null;
  referenceEntries?: RawReferenceEntryInput[];
  quantityTotalResolved?: string | number | null;
}

export interface RawImportPayload {
  units: RawUnitInput[];
  priceLists: RawPriceListInput[];
  groups: RawGroupValueInput[];
  products: RawProductInput[];
  preventivi: RawPreventivoInput[];
  rilevazioni: Record<string, RawRilevazioneInput[]>;
}
