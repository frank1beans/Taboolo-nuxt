
<template>
  <div ref="plotContainer" class="w-full h-full min-h-[500px]"></div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, onBeforeUnmount } from 'vue';
// Dynamic import to avoid SSR issues
let Plotly: any;

const props = defineProps<{
  data: any[];
  layout: any;
  config?: any;
}>();

const emit = defineEmits(['click', 'hover', 'unhover', 'selected', 'deselect']);

const plotContainer = ref<HTMLElement | null>(null);
let isInitialized = false;
let resizeObserver: ResizeObserver | null = null;

const drawPlot = async () => {
  if (!Plotly) {
    Plotly = (await import('plotly.js-dist-min')).default;
  }
  
  if (plotContainer.value) {
    await Plotly.react(plotContainer.value, props.data, props.layout, props.config);
    
    // Only attach events once
    if (!isInitialized) {
      const el = plotContainer.value as any;
      
      el.on('plotly_click', (data: any) => {
        emit('click', data);
      });
      
      el.on('plotly_hover', (data: any) => {
        emit('hover', data);
      });

      el.on('plotly_unhover', (data: any) => {
        emit('unhover', data);
      });

      // Lasso/Box selection events
      el.on('plotly_selected', (data: any) => {
        emit('selected', data);
      });

      el.on('plotly_deselect', () => {
        emit('deselect');
      });

      // Also handle double-click as deselect
      el.on('plotly_doubleclick', () => {
        emit('deselect');
      });

      isInitialized = true;
    }
  }
};

// Resize Plotly when container size changes
const resizePlot = () => {
  if (plotContainer.value && Plotly) {
    Plotly.Plots.resize(plotContainer.value);
  }
};

watch(
  () => [props.data, props.layout, props.config], 
  () => {
    drawPlot();
  }, 
  { deep: true }
);

onMounted(() => {
  drawPlot();
  
  // Set up ResizeObserver to handle container resizing
  if (plotContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      resizePlot();
    });
    resizeObserver.observe(plotContainer.value);
  }
});

onBeforeUnmount(() => {
  if (plotContainer.value && Plotly) {
    Plotly.purge(plotContainer.value);
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
</script>
