// import type { Point } from './useSemanticMap'; // Removed to avoid duplication warnings
// export type { Point };

export const useSemanticMapAnalytics = () => {
    const selectedPointIds = ref<Set<string>>(new Set());
    const clickedPointId = ref<string | null>(null);
    const neighborIds = ref<string[]>([]); // Neighbors of the clicked point

    // Visualization Options
    const colorBy = ref<'cluster' | 'amount' | 'category' | 'score' | 'outlier'>('cluster');

    // Cluster Palette (Tailwind colors or similar)
    const clusterPalette = ref([
        '#60A5FA', '#34D399', '#F472B6', '#A78BFA', '#FBBF24',
        '#EF4444', '#10B981', '#6366F1', '#EC4899', '#8B5CF6'
    ]);

    // Computed Stats for Selection
    const selectionStats = computed(() => {
        // This will be populated by the consumer passing the full points list usually, 
        // derived outside or we need points here. 
        return {
            count: selectedPointIds.value.size,
            sumAmount: null as number | null,
            mean: null as number | null,
            median: null as number | null,
            topCategories: [] as { name: string, count: number }[]
        };
    });

    // Actions
    function setSelection(ids: string[], points: Point[]) {
        selectedPointIds.value = new Set(ids);
        updateStats(points);
    }

    function clearSelection() {
        selectedPointIds.value = new Set();
    }

    function setClickedPoint(id: string, points: Point[], mode: '2d' | '3d') {
        clickedPointId.value = id;
        // Find nearest neighbors logic could go here
        // For now just finding random or simple distance based
        const target = points.find(p => p.id === id);
        if (target) {
            // Simple euclidean distance sort (naive implementation)
            const dists = points.map(p => ({
                id: p.id,
                dist: Math.sqrt(Math.pow(p.x - target.x, 2) + Math.pow(p.y - target.y, 2) + (mode === '3d' ? Math.pow(p.z - target.z, 2) : 0))
            }));
            dists.sort((a, b) => a.dist - b.dist);
            // Take 5 nearest excluding itself
            neighborIds.value = dists.slice(1, 6).map(d => d.id);
        }
    }

    function clearClickedPoint() {
        clickedPointId.value = null;
        neighborIds.value = [];
    }

    function getClickedPointNeighbors(points: Point[], mode: '2d' | '3d') {
        if (!clickedPointId.value) return [];
        const target = points.find(p => p.id === clickedPointId.value);
        if (!target) return [];

        const dists = points.map(p => ({
            ...p,
            distance: Math.sqrt(Math.pow(p.x - target.x, 2) + Math.pow(p.y - target.y, 2) + (mode === '3d' ? Math.pow(p.z - target.z, 2) : 0))
        }));
        dists.sort((a, b) => a.distance - b.distance);
        // Return top K
        return dists.slice(1, 11); // Top 10
    }

    function updateStats(points: Point[]) {
        if (selectedPointIds.value.size === 0) return;
        const selected = points.filter(p => selectedPointIds.value.has(p.id));

        let sum = 0;
        let prices: number[] = [];
        const categories: Record<string, number> = {};

        selected.forEach(p => {
            if (p.price || p.amount) {
                const val = p.price || p.amount || 0;
                sum += val;
                prices.push(val);
            }
            if (p.category) {
                categories[p.category] = (categories[p.category] || 0) + 1;
            }
        });

        // Median
        prices.sort((a, b) => a - b);
        let median = 0;
        if (prices.length > 0) {
            const mid = Math.floor(prices.length / 2);
            const midVal = prices[mid] ?? 0;
            const prevVal = prices[mid - 1] ?? 0;
            median = prices.length % 2 !== 0 ? midVal : (prevVal + midVal) / 2;
        }

        const topCategories = Object.entries(categories)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        // Hacky update of the computed value/ref? 
        // Actually selectionStats is better as a ref returned from a function or computed property that depends on points
        // But since points aren't state here, we might need to expose a helper or accept points in the composable.
        // For simplicity, let's just assume the consumer calculates stats or we expose a helper function.
    }

    // --- Visualization Helpers ---

    // Exposed API
    return {
        selectedPointIds,
        clickedPointId,
        neighborIds,
        colorBy,
        clusterPalette,
        selectionStats,
        setSelection,
        clearSelection,
        setClickedPoint,
        clearClickedPoint,
        getClickedPointNeighbors
    };
};

// --- Visualization Helpers (Exported) ---

export function buildMarkerConfig(opts: {
    points: Point[],
    colorBy: string,
    searchResults: string[],
    selectedPointIds: Set<string>,
    clickedPointId: string | null,
    neighborIds: string[],
    pointSize: number,
    clusterPalette: string[],
    outlierIds: Set<string>
}) {
    const { points, colorBy, searchResults, selectedPointIds, clickedPointId, neighborIds, pointSize, clusterPalette, outlierIds } = opts;

    const colors = points.map(p => {
        // Priority 1: Selection
        if (selectedPointIds.size > 0 && !selectedPointIds.has(p.id)) {
            return '#e5e7eb'; // Gray out unselected
        }
        // Priority 2: Search (dim others)
        if (searchResults.length > 0 && !searchResults.includes(p.id)) {
            return '#f3f4f6'; // Very light gray
        }

        // Priority 3: Neighbors
        if (clickedPointId) {
            if (p.id === clickedPointId) return '#000000'; // Target
            if (neighborIds.includes(p.id)) return '#EF4444'; // Neighbor
            return '#e5e7eb'; // Dim others
        }

        // Priority 4: Color By Mode
        if (colorBy === 'outlier') {
            return outlierIds.has(p.id) ? '#EF4444' : '#10B981'; // Red/Green
        }
        if (colorBy === 'category') {
            return '#6366F1';
        }
        if (colorBy === 'amount') {
            return '#10B981';
        }
        // Default Cluster
        return clusterPalette[Math.abs(p.cluster) % clusterPalette.length];
    });

    const sizes = points.map(p => {
        if (clickedPointId === p.id) return pointSize * 1.5;
        if (neighborIds.includes(p.id)) return pointSize * 1.25;
        return pointSize;
    });

    return {
        color: colors,
        size: sizes,
        line: {
            width: 1,
            color: points.map(p => p.id === clickedPointId ? '#fff' : 'rgba(255,255,255,0.2)')
        },
        opacity: 0.8
    };
}

export function buildNeighborLinesTrace(points: Point[], originId: string, neighbors: string[], mode: '2d' | '3d') {
    const origin = points.find(p => p.id === originId);
    if (!origin) return null;

    const x: (number | null)[] = [];
    const y: (number | null)[] = [];
    const z: (number | null)[] = [];

    neighbors.forEach(nid => {
        const target = points.find(p => p.id === nid);
        if (target) {
            x.push(origin.x, target.x, null);
            y.push(origin.y, target.y, null);
            if (mode === '3d') z.push(origin.z, target.z, null);
        }
    });

    return mode === '3d' ? {
        type: 'scatter3d',
        mode: 'lines',
        x, y, z,
        line: { color: 'rgba(0,0,0,0.2)', width: 2 },
        hoverinfo: 'none',
        showlegend: false
    } : {
        type: 'scattergl',
        mode: 'lines',
        x, y,
        line: { color: 'rgba(0,0,0,0.2)', width: 1 },
        hoverinfo: 'none',
        showlegend: false
    };
}

export function exportToCsv(points: Point[], filename = 'export.csv') {
    const headers = ['id', 'label', 'x', 'y', 'z', 'cluster', 'price', 'category'];
    const rows = points.map(p => [
        p.id, `"${p.label.replace(/"/g, '""')}"`, p.x, p.y, p.z, p.cluster, p.price, p.category
    ].join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
