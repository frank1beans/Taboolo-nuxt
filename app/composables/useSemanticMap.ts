export interface Point {
    id: string;
    x: number;
    y: number;
    z: number;
    cluster: number;
    label: string;
    description: string;
    price?: number;
    amount?: number;
    unit?: string;
    category?: string; // WBS06 or similar
    score?: number;
}

export interface Cluster {
    id: number;
    count: number;
    label?: string;
    color?: string;
}

export const useSemanticMap = (projectId: string) => {
    const points = ref<Point[]>([]);
    const clusters = ref<Cluster[]>([]);
    const status = ref<'idle' | 'loading' | 'error' | 'success'>('idle');
    const error = ref<string | null>(null);
    const isLoading = computed(() => status.value === 'loading');

    // UI State
    const mode = ref<'2d' | '3d'>('2d');
    const searchQuery = ref('');
    const searchResults = ref<string[]>([]); // list of IDs
    const selectedCluster = ref<number | null>(null);

    async function fetchData() {
        status.value = 'loading';
        error.value = null;
        try {
            // Attempt to fetch map data. 
            // Endpoint structure inferred from context.
            const data = await $fetch<{ points: Point[], clusters: Cluster[] }>(`/api/projects/${projectId}/analytics/map`);
            points.value = data.points || [];
            if (data.clusters) {
                clusters.value = data.clusters;
            } else {
                // Derive clusters if not provided
                const uniqueClusters = [...new Set(points.value.map(p => p.cluster))];
                clusters.value = uniqueClusters.map(c => ({
                    id: c,
                    count: points.value.filter(p => p.cluster === c).length
                })).sort((a, b) => a.id - b.id);
            }
            status.value = 'success';
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            console.error('Failed to fetch map data', e);
            error.value = e.message;
            status.value = 'error';
        }
    }

    async function performSearch(query: string) {
        if (!query.trim()) {
            searchResults.value = [];
            return;
        }
        try {
            // Client-side fallback if no endpoint, but let's assume valid search endpoint or client filtering
            // For now, implementing client-side filtering as "performSearch"
            const q = query.toLowerCase();
            const matches = points.value.filter(p =>
                p.label.toLowerCase().includes(q) ||
                p.description?.toLowerCase().includes(q) ||
                p.id.toLowerCase().includes(q)
            );
            searchResults.value = matches.map(p => p.id);
        } catch (e) {
            console.error(e);
        }
    }

    async function triggerCompute() {
        if (!confirm('Ricalcolare la mappa potrebbe richiedere del tempo. Continuare?')) return;
        status.value = 'loading';
        try {
            await $fetch(`/api/projects/${projectId}/analytics/compute-umap`, { method: 'POST' });
            await fetchData();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            error.value = e.message;
            status.value = 'error';
        }
    }

    // Initial fetch
    onMounted(() => {
        fetchData();
    });

    return {
        points,
        clusters,
        status,
        error,
        isLoading,
        mode,
        searchQuery,
        searchResults,
        selectedCluster,
        fetchData,
        performSearch,
        triggerCompute
    };
};
