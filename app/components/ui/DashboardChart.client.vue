<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

const props = defineProps<{
  data: any[]
  layout?: any
  config?: any
}>()

const chartContainer = ref<HTMLElement | null>(null)
let Plotly: any = null

const drawChart = () => {
  if (chartContainer.value && Plotly) {
    const defaultLayout = {
      font: { family: 'inherit', color: 'hsl(var(--muted-foreground))' },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      margin: { t: 20, r: 20, b: 40, l: 40 },
      xaxis: { 
          gridcolor: 'hsl(var(--border)/0.2)',
          linecolor: 'hsl(var(--border))',
          zerolinecolor: 'hsl(var(--border)/0.2)'
      },
      yaxis: { 
          gridcolor: 'hsl(var(--border)/0.2)',
          linecolor: 'hsl(var(--border))',
          zerolinecolor: 'hsl(var(--border)/0.2)'
      },
      ...props.layout
    }
    
    const defaultConfig = {
      responsive: true,
      displayModeBar: false,
      ...props.config
    }

    Plotly.newPlot(chartContainer.value, props.data, defaultLayout, defaultConfig)
  }
}

onMounted(async () => {
  const plotlyModule = await import('plotly.js-dist-min')
  Plotly = plotlyModule.default || plotlyModule
  drawChart()
})

watch(() => [props.data, props.layout], () => {
  drawChart()
}, { deep: true })
</script>

<template>
  <div ref="chartContainer" class="w-full h-full min-h-[300px]"></div>
</template>
