/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import { WbsNode } from '#models';

type AnyRecord = Record<string, any>;

/**
 * Upsert WBS nodes (spatial, wbs6, wbs7) and return lookup maps by code.
 */
export type WbsNodeInput = {
    type?: 'spatial' | 'wbs6' | 'wbs7';
    code?: string;
    description?: string;
    level?: number;
    parentKey?: string | null;
};

const normalizeWbsCode = (n: AnyRecord) => {
    if (n.code) return String(n.code);
    if (n.grp_id) return String(n.grp_id);
    if (n.description) return String(n.description).trim().replace(/\s+/g, '_').toUpperCase();
    return null;
};

const deriveLevelAndType = (code?: string, levelHint?: number, typeHint?: string) => {
    let level = levelHint;
    if (!level && code) {
        const match = /wbs0*([1-7])/i.exec(code);
        if (match) level = Number(match[1]);
    }
    if (!level && typeHint === 'wbs6') level = 6;
    if (!level && typeHint === 'wbs7') level = 7;
    if (!level) level = typeHint === 'spatial' ? 1 : undefined;

    let type: 'spatial' | 'commodity' | undefined =
        typeHint === 'wbs6' || typeHint === 'wbs7' ? 'commodity' : (typeHint as any);
    if (!type && level) {
        if (level >= 1 && level <= 5) type = 'spatial';
        else if (level === 6 || level === 7) type = 'commodity';
    }
    if (type === 'commodity' && level && level < 6) level = 6;
    if (type === 'spatial' && (!level || level > 5)) level = level && level > 5 ? 5 : level ?? 1;
    const category = level ? `wbs0${level}`.slice(-5).toLowerCase() : undefined;
    return { level, type, category };
};

/**
 * Upsert WBS nodes with parent relationships.
 * Returns maps of code -> ObjectId for spatial/wbs6/wbs7.
 */
export async function upsertWbsHierarchy(projectId: string, estimateId: string, nodes: WbsNodeInput[] = []) {
    if (!nodes.length) return { spatial: {}, wbs6: {}, wbs7: {} as Record<string, string> };

    const projectObjectId = new Types.ObjectId(projectId);
    const estimateObjectId = new Types.ObjectId(estimateId);

    const filtered = nodes
        .map((n) => {
            const code = normalizeWbsCode(n);
            if (!code) return null;
            const { level, type, category } = deriveLevelAndType(code, n.level, n.type);
            if (!type) return null;
            return {
                code,
                description: n.description,
                level,
                type: type as any,
                category,
                estimate_id: estimateObjectId,
                parentKey: n.parentKey ?? null,
            };
        })
        .filter(Boolean) as Array<{ code: string; description?: string; level?: number; type: 'spatial' | 'commodity'; category?: string; parentKey?: string | null; estimate_id: Types.ObjectId }>;

    if (filtered.length) {
        const ops = filtered.map((n) => ({
            updateOne: {
                filter: { project_id: projectObjectId, estimate_id: estimateObjectId, type: n.type, code: n.code },
                update: {
                    $set: {
                        project_id: projectObjectId,
                        estimate_id: estimateObjectId,
                        type: n.type,
                        code: n.code,
                        description: n.description,
                        level: n.level ?? (n.type === 'commodity' ? 6 : n.level ?? 0),
                        category: n.category,
                    },
                },
                upsert: true,
            },
        }));
        await WbsNode.bulkWrite(ops, { ordered: false });
    }

    const docs = await WbsNode.find({ project_id: projectObjectId, estimate_id: estimateObjectId });
    const idMap: Record<string, string> = {};
    const ancestorsById: Record<string, Types.ObjectId[]> = {};
    for (const doc of docs) {
        const key = `${doc.level}:${doc.code}`;
        idMap[key] = doc._id.toString();
        ancestorsById[doc._id.toString()] = doc.ancestors as Types.ObjectId[];
    }

    // Set parents and ancestors where parentKey is provided
    const updates: AnyRecord[] = [];
    for (const n of filtered) {
        if (!n.parentKey) continue;
        const parentId = idMap[n.parentKey];
        const selfId = idMap[`${n.level}:${n.code}`];
        if (!parentId || !selfId) continue;
        const parentAncestors = ancestorsById[parentId] ?? [];
        const ancestors = [...parentAncestors, new Types.ObjectId(parentId)];
        updates.push({
            updateOne: {
                filter: { _id: selfId },
                update: { $set: { parent_id: parentId, ancestors } },
            },
        });
        ancestorsById[selfId] = ancestors;
    }
    if (updates.length) {
        await WbsNode.bulkWrite(updates as any[], { ordered: false });
    }

    const map: { spatial: Record<string, string>; wbs6: Record<string, string>; wbs7: Record<string, string> } = {
        spatial: {},
        wbs6: {},
        wbs7: {},
    };
    for (const doc of docs) {
        if (doc.type === 'spatial' || (doc.level && doc.level <= 5)) map.spatial[doc.code] = doc._id.toString();
        if (doc.level === 6) map.wbs6[doc.code] = doc._id.toString();
        if (doc.level === 7) map.wbs7[doc.code] = doc._id.toString();
    }
    return map;
}

/**
 * Build WBS hierarchy from items or fallback nodes and upsert them.
 */
export async function buildAndUpsertWbsFromItems(
    projectId: string,
    estimateId: string,
    items: AnyRecord[] = [],
    fallbackNodes: { spatial?: AnyRecord[]; wbs6?: AnyRecord[]; wbs7?: AnyRecord[] } = {},
) {
    const nodes: WbsNodeInput[] = [];

    const addNode = (type: 'spatial' | 'wbs6' | 'wbs7', code: string | undefined, description?: string, level?: number, parentKey?: string | null) => {
        if (!code) return;
        nodes.push({ type, code, description, level, parentKey });
    };

    // Build from items if provided
    if (items.length) {
        for (const entry of items) {
            const levels = Array.isArray(entry.wbs_levels) ? [...entry.wbs_levels] : [];
            levels.sort((a, b) => (a?.level ?? 0) - (b?.level ?? 0));
            const stack: { level: number; key: string }[] = [];
            for (const lvl of levels) {
                if (!lvl) continue;
                const levelNum = lvl.level ?? 0;
                if (levelNum < 1 || levelNum > 7) continue;
                const type = levelNum <= 5 ? 'spatial' : 'commodity';
                const code = normalizeWbsCode(lvl);
                const desc = lvl.description;

                let parentKey: string | null = null;
                for (let i = stack.length - 1; i >= 0; i--) {
                    if (stack[i].level < levelNum) {
                        parentKey = stack[i].key;
                        break;
                    }
                }

                const key = `${levelNum}:${code}`;
                addNode(type, code ?? undefined, desc, levelNum, parentKey);
                stack.push({ level: levelNum, key });
            }
        }
    } else {
        // Fallback to provided node lists if items are missing
        (fallbackNodes.spatial ?? []).forEach((n) => addNode('spatial', normalizeWbsCode(n) ?? undefined, n.description, n.level));
        (fallbackNodes.wbs6 ?? []).forEach((n) => addNode('wbs6', normalizeWbsCode(n) ?? undefined, n.description, n.level));
        (fallbackNodes.wbs7 ?? []).forEach((n) => addNode('wbs7', normalizeWbsCode(n) ?? undefined, n.description, n.level));
    }

    return upsertWbsHierarchy(projectId, estimateId, nodes);
}
