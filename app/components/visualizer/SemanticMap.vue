
<template>
  <canvas ref="canvasRef" class="w-full h-full"/>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue';

// Dynamic import to avoid SSR issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let createScatterplot: any = null;

const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  layout: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: any;
}>();

const emit = defineEmits(['click', 'hover', 'unhover', 'selected', 'deselect']);

const canvasRef = ref<HTMLCanvasElement | null>(null);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let scatterplot: any = null;
let resizeObserver: ResizeObserver | null = null;
let isDestroyed = false;
let isDrawing = false;
let hasQueuedDraw = false;
let queuedAutoFit = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentPointsData: any[] = [];

// Color utilities
function hexToRgba(hex: string, alpha = 1): [number, number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0.5, 0.5, 0.5, alpha];
  return [
    parseInt(result[1] ?? '80', 16) / 255,
    parseInt(result[2] ?? '80', 16) / 255,
    parseInt(result[3] ?? '80', 16) / 255,
    alpha
  ];
}

// Extract point size from data
const pointSize = computed(() => {
  if (!props.data?.[0]?.marker?.size) return 6;
  const sizes = props.data[0].marker.size;
  if (Array.isArray(sizes)) return sizes[0] || 6;
  return sizes || 6;
});

// Extract points and colors from Plotly-style data
const extractedData = computed(() => {
  if (!props.data || props.data.length === 0) return { points: [], colorIndices: [], colorMap: [] };
  
  const mainTrace = props.data[0];
  if (!mainTrace || !mainTrace.x || !mainTrace.y) return { points: [], colorIndices: [], colorMap: [] };
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const points: { x: number; y: number; customdata: any }[] = [];
  const rawColors = mainTrace.marker?.color || [];
  
  for (let i = 0; i < mainTrace.x.length; i++) {
    points.push({
      x: mainTrace.x[i],
      y: mainTrace.y[i],
      customdata: mainTrace.customdata?.[i] || null
    });
  }
  
  // Build unique color map for categorical colors
  const uniqueColors: string[] = [];
  const colorIndices: number[] = [];
  
  // Check if colors are numeric (for colorscale) or hex strings
  const hasNumericColors = rawColors.length > 0 && typeof rawColors[0] === 'number';
  
  if (hasNumericColors) {
    // For numeric values, use a viridis-like gradient
    const minVal = Math.min(...rawColors);
    const maxVal = Math.max(...rawColors);
    const range = maxVal - minVal || 1;
    
    // Create gradient colors (viridis-inspired)
    const gradientColors = [
      [0.267, 0.004, 0.329], // Dark purple
      [0.282, 0.140, 0.458], // Purple
      [0.253, 0.265, 0.530], // Blue-purple
      [0.191, 0.407, 0.556], // Blue
      [0.127, 0.566, 0.550], // Teal
      [0.208, 0.718, 0.472], // Green
      [0.565, 0.852, 0.269], // Yellow-green
      [0.993, 0.906, 0.144], // Yellow
    ];
    
    for (const val of rawColors) {
      const normalized = (val - minVal) / range;
      const idx = Math.min(Math.floor(normalized * (gradientColors.length - 1)), gradientColors.length - 1);
      const colorKey = `gradient-${idx}`;
      
      let colorIdx = uniqueColors.indexOf(colorKey);
      if (colorIdx === -1) {
        colorIdx = uniqueColors.length;
        uniqueColors.push(colorKey);
      }
      colorIndices.push(colorIdx);
    }
    
    const colorMap = gradientColors.map(c => [c[0], c[1], c[2], 0.85] as [number, number, number, number]);
    return { points, colorIndices, colorMap };
  }
  
  // For hex color strings
  for (const color of rawColors) {
    const colorStr = String(color);
    let idx = uniqueColors.indexOf(colorStr);
    if (idx === -1) {
      idx = uniqueColors.length;
      uniqueColors.push(colorStr);
    }
    colorIndices.push(idx);
  }
  
   
  const colorMap = uniqueColors.map((c) => {
    if (typeof c === 'string' && c.startsWith('#')) {
      return hexToRgba(c, 0.85);
    }
    return [0.23, 0.51, 0.96, 0.85] as [number, number, number, number];
  });
  
  return { points, colorIndices, colorMap };
});

async function initScatterplot() {
  if (!canvasRef.value || isDestroyed) return;

  if (!createScatterplot) {
    try {
      const module = await import('regl-scatterplot');
      createScatterplot = module.default;
    } catch (e) {
      console.error('Failed to load regl-scatterplot:', e);
      return;
    }
  }

  const { width, height } = canvasRef.value.getBoundingClientRect();
  if (width === 0 || height === 0) {
    setTimeout(() => initScatterplot(), 100);
    return;
  }

  try {
    scatterplot = createScatterplot({
      canvas: canvasRef.value,
      width,
      height,
      aspectRatio: width / height,
      backgroundColor: [0, 0, 0, 0],
      pointSize: pointSize.value,
      opacity: 0.85,
      showReticle: false,
      lassoMinDelay: 50,
      lassoMinDist: 3,
    });

    scatterplot.subscribe('pointOver', (index: number) => {
      if (index >= 0 && currentPointsData[index]) {
        emit('hover', { points: [{ pointIndex: index, customdata: currentPointsData[index].customdata }] });
      }
    });

    scatterplot.subscribe('pointOut', () => {
      emit('unhover', null);
    });

    scatterplot.subscribe('select', ({ points }: { points: number[] }) => {
      if (points.length === 1) {
        const idx = points[0];
        if (idx !== undefined && currentPointsData[idx]) {
          emit('click', { points: [{ pointIndex: idx, customdata: currentPointsData[idx]?.customdata }] });
        }
      } else if (points.length > 1) {
        emit('selected', { points: points.map((idx: number) => ({ pointIndex: idx, customdata: currentPointsData[idx]?.customdata })) });
      }
    });

    scatterplot.subscribe('deselect', () => {
      emit('deselect');
    });

    void drawPoints();
  } catch (e) {
    console.error('Failed to create scatterplot:', e);
  }
}

async function drawPoints(autoFit = false) {
  if (!scatterplot || isDestroyed) return;

  if (isDrawing) {
    hasQueuedDraw = true;
    if (autoFit) queuedAutoFit = true;
    return;
  }

  isDrawing = true;

  try {
    const { points, colorIndices, colorMap } = extractedData.value;
    if (points.length === 0) return;

    const isFirstDraw = currentPointsData.length === 0;
    const pointCountChanged = Math.abs(points.length - currentPointsData.length) > 10;
    currentPointsData = points;

    scatterplot.set({
      pointSize: pointSize.value,
      colorBy: 'category',
      pointColor: colorMap,
    });

    await scatterplot.draw({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      x: points.map((p: any) => p.x),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y: points.map((p: any) => p.y),
      category: colorIndices,
    });

    // Auto-fit view on first draw or when explicitly requested or when data changes significantly
    if (isFirstDraw || autoFit || pointCountChanged) {
      // Small delay to ensure the draw is complete
      setTimeout(() => {
        if (scatterplot && !isDestroyed) {
          try {
            // Zoom to all points to show all data
            const allIndices = Array.from({ length: points.length }, (_, i) => i);
            scatterplot.zoomToPoints(allIndices, { transition: true, padding: 0.1 });
          } catch {
            // Fallback: try reset
            try {
              scatterplot.reset({ transition: true });
            } catch {
              // Ignore errors
            }
          }
        }
      }, 50);
    }
  } catch (e) {
    console.error('Failed to draw points:', e);
  } finally {
    isDrawing = false;
    if (hasQueuedDraw) {
      const nextAutoFit = queuedAutoFit;
      hasQueuedDraw = false;
      queuedAutoFit = false;
      void drawPoints(nextAutoFit);
    }
  }
}

function resize() {
  if (!scatterplot || !canvasRef.value || isDestroyed) return;
  const { width, height } = canvasRef.value.getBoundingClientRect();
  if (width > 0 && height > 0) {
    try {
      scatterplot.set({ width, height, aspectRatio: width / height });
    } catch {
      // Ignore resize errors
    }
  }
}

// ========== EXPOSED METHODS ==========

/**
 * Zoom to specific point indices with optional animation
 */
function zoomToPoints(indices: number[], options?: { transition?: boolean; padding?: number }) {
  if (!scatterplot || isDestroyed || indices.length === 0) return;
  
  try {
    scatterplot.zoomToPoints(indices, {
      transition: options?.transition ?? true,
      padding: options?.padding ?? 0.2,
    });
  } catch (e) {
    console.error('Failed to zoom to points:', e);
  }
}

/**
 * Zoom to a specific rectangular area
 */
function zoomToArea(rect: { x: number; y: number; width: number; height: number }, options?: { transition?: boolean }) {
  if (!scatterplot || isDestroyed) return;
  
  try {
    scatterplot.zoomToArea(rect, {
      transition: options?.transition ?? true,
    });
  } catch (e) {
    console.error('Failed to zoom to area:', e);
  }
}

/**
 * Reset to the initial view showing all points
 */
function resetView(options?: { transition?: boolean }) {
  if (!scatterplot || isDestroyed) return;
  
  try {
    scatterplot.reset({ transition: options?.transition ?? true });
  } catch (e) {
    console.error('Failed to reset view:', e);
  }
}

/**
 * Get current camera state for debugging
 */
function getCamera() {
  if (!scatterplot || isDestroyed) return null;
  try {
    return scatterplot.get('cameraView');
  } catch {
    return null;
  }
}

// Expose methods to parent component
defineExpose({
  zoomToPoints,
  zoomToArea,
  resetView,
  getCamera,
});

// Watch for data changes (includes color changes)
watch(() => props.data, () => {
  if (scatterplot) {
    void drawPoints();
  }
}, { deep: true });

// Watch for point size changes specifically
watch(pointSize, () => {
  if (scatterplot) {
    scatterplot.set({ pointSize: pointSize.value });
  }
});

onMounted(async () => {
  await nextTick();
  setTimeout(() => {
    initScatterplot();
  }, 100);
  
  if (canvasRef.value) {
    resizeObserver = new ResizeObserver(() => {
      resize();
    });
    resizeObserver.observe(canvasRef.value);
  }
});

onBeforeUnmount(() => {
  isDestroyed = true;
  if (scatterplot) {
    try {
      scatterplot.destroy();
    } catch {
      // Ignore destroy errors
    }
    scatterplot = null;
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});
</script>
