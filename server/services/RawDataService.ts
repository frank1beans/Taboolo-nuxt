/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types, type ClientSession } from 'mongoose';
import { RawUnit, RawPriceList, RawGroupValue, RawProduct, RawPreventivo, RawRilevazione } from '#models';
import type {
    RawGroupValueInput,
    RawPreventivoInput,
    RawPriceListInput,
    RawProductInput,
    RawRilevazioneInput,
    RawUnitInput,
} from '#utils/raw-types';

type BulkResult = { matched?: number; upserted?: number; inserted?: number; deleted?: number };

const toDecimal = (value: any) => {
    if (value === null || value === undefined) return undefined;
    return Types.Decimal128.fromString(String(value));
};

export async function upsertRawUnits(
    importId: Types.ObjectId,
    units: RawUnitInput[] = [],
    session?: ClientSession,
): Promise<BulkResult> {
    if (!units.length) return {};
    const ops = units.map((u) => ({
        updateOne: {
            filter: { importId, unitId: u.unitId },
            update: { $set: { importId, unitId: u.unitId, label: u.label } },
            upsert: true,
        },
    }));
    const res = await RawUnit.bulkWrite(ops, { ordered: false, session });
    return { matched: res.matchedCount, upserted: res.upsertedCount };
}

export async function upsertRawPriceLists(
    importId: Types.ObjectId,
    priceLists: RawPriceListInput[] = [],
    session?: ClientSession,
): Promise<BulkResult> {
    if (!priceLists.length) return {};
    const ops = priceLists.map((pl) => ({
        updateOne: {
            filter: { importId, listIdRaw: pl.listIdRaw },
            update: {
                $set: {
                    importId,
                    listIdRaw: pl.listIdRaw,
                    canonicalId: pl.canonicalId,
                    label: pl.label,
                    priority: pl.priority ?? 0,
                    preferred: pl.preferred ?? false,
                },
            },
            upsert: true,
        },
    }));
    const res = await RawPriceList.bulkWrite(ops, { ordered: false, session });
    return { matched: res.matchedCount, upserted: res.upsertedCount };
}

export async function upsertRawGroupValues(
    importId: Types.ObjectId,
    groups: RawGroupValueInput[] = [],
    session?: ClientSession,
): Promise<BulkResult> {
    if (!groups.length) return {};
    const ops = groups.map((g) => ({
        updateOne: {
            filter: { importId, grpId: g.grpId },
            update: {
                $set: {
                    importId,
                    grpId: g.grpId,
                    code: g.code,
                    description: g.description,
                    kind: g.kind,
                    level: g.level,
                    parentId: g.parentId ?? undefined,
                    ancestors: g.ancestors ?? [],
                },
            },
            upsert: true,
        },
    })) as any[];
    const res = await RawGroupValue.bulkWrite(ops, { ordered: false, session });
    return { matched: res.matchedCount, upserted: res.upsertedCount };
}

export async function upsertRawProducts(
    importId: Types.ObjectId,
    products: RawProductInput[] = [],
    session?: ClientSession,
): Promise<BulkResult> {
    if (!products.length) return {};
    const ops = products.map((p) => ({
        updateOne: {
            filter: { importId, prodottoId: p.prodottoId },
            update: {
                $set: {
                    importId,
                    prodottoId: p.prodottoId,
                    code: p.code,
                    descriptionShort: p.descriptionShort,
                    descriptionLong: p.descriptionLong,
                    unitId: p.unitId,
                    wbs6: p.wbs6,
                    wbs7: p.wbs7,
                    isParentVoice: Boolean(p.isParentVoice),
                    prices: (p.prices ?? []) as any,
                },
            },
            upsert: true,
        },
    })) as any[];
    const res = await RawProduct.bulkWrite(ops, { ordered: false, session });
    return { matched: res.matchedCount, upserted: res.upsertedCount };
}

export async function upsertRawPreventivi(
    importId: Types.ObjectId,
    preventivi: RawPreventivoInput[] = [],
    session?: ClientSession,
): Promise<BulkResult> {
    if (!preventivi.length) return {};
    const ops = preventivi.map((p) => ({
        updateOne: {
            filter: { importId, preventivoId: p.preventivoId },
            update: {
                $set: {
                    importId,
                    preventivoId: p.preventivoId,
                    code: p.code,
                    description: p.description,
                    date: p.date,
                    priceListIdRaw: p.priceListIdRaw,
                    priceListId: p.priceListId,
                    stats: p.stats ?? {},
                },
            },
            upsert: true,
        },
    }));
    const res = await RawPreventivo.bulkWrite(ops, { ordered: false, session });
    return { matched: res.matchedCount, upserted: res.upsertedCount };
}

export async function upsertRawRilevazioni(
    importId: Types.ObjectId,
    preventivoId: string,
    rilevazioni: RawRilevazioneInput[] = [],
    session?: ClientSession,
): Promise<BulkResult> {
    await RawRilevazione.deleteMany({ importId, preventivoId }, { session });
    if (!rilevazioni.length) return { deleted: 0, inserted: 0 };

    const docs = rilevazioni.map((r) => ({
        importId,
        preventivoId,
        idx: r.idx,
        progressivo: r.progressivo ?? undefined,
        prodottoId: r.prodottoId,
        listaQuotazioneIdRaw: r.listaQuotazioneIdRaw ?? undefined,
        wbsSpatial: (r.wbsSpatial ?? []).map((w) => ({
            level: w.level,
            code: w.code ?? undefined,
            description: w.description ?? undefined,
        })),
        misure: (r.misure ?? []).map((m) => ({
            operation: m.operation || '+',
            cells: (m.cells ?? []).map((c) => ({
                pos: c.pos ?? 0,
                raw: c.raw ?? '',
                value: c.value === null || c.value === undefined ? undefined : toDecimal(c.value),
            })),
            product: m.product === null || m.product === undefined ? undefined : toDecimal(m.product),
            references: m.references ?? [],
        })),
        comments: r.comments ?? [],
        quantityDirect: r.quantityDirect === null || r.quantityDirect === undefined ? undefined : toDecimal(r.quantityDirect),
        referenceEntries: (r.referenceEntries ?? []).map((re) => ({
            refProgressivo: re.refProgressivo,
            factor: toDecimal(re.factor) ?? Types.Decimal128.fromString('0'),
        })),
        quantityTotalResolved:
            r.quantityTotalResolved === null || r.quantityTotalResolved === undefined
                ? undefined
                : toDecimal(r.quantityTotalResolved),
    }));

    const res = await RawRilevazione.insertMany(docs, { ordered: false, session });
    return { inserted: res.length };
}
