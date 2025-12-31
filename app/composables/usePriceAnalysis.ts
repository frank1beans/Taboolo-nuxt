export const usePriceAnalysis = (projectId: string) => {
    // Parameters
    const params = reactive({
        topK: 20,
        minSimilarity: 0.6,
        madThreshold: 2.0
    });

    // State
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const analysisResult = ref<any>(null);

    // Derived
    const outlierItems = computed(() => {
        if (!analysisResult.value?.outliers) return [];
        return analysisResult.value.outliers;
    });

    const outlierIds = computed(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new Set(outlierItems.value.map((i: any) => i.item_id));
    });

    const outlierPercent = computed(() => {
        if (!analysisResult.value || !analysisResult.value.total_items) return 0;
        return ((analysisResult.value.outliers_found / analysisResult.value.total_items) * 100).toFixed(1);
    });

    async function runAnalysis() {
        isLoading.value = true;
        error.value = null;
        try {
            const data = await $fetch(`/api/projects/${projectId}/analytics/price-analysis`, {
                method: 'POST',
                body: { ...params }
            });
            analysisResult.value = data;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            console.error('Price analysis failed', e);
            error.value = e.message;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        params,
        isLoading,
        error,
        analysisResult,
        outlierItems,
        outlierIds,
        outlierPercent,
        runAnalysis
    };
};
