<template>
  <div class="chart-loading-state">
    <div class="chart-loading-state__skeleton">
      <!-- Animated skeleton bars -->
      <div class="skeleton-bar skeleton-bar--1" />
      <div class="skeleton-bar skeleton-bar--2" />
      <div class="skeleton-bar skeleton-bar--3" />
      <div class="skeleton-bar skeleton-bar--4" />
      <div class="skeleton-bar skeleton-bar--5" />
    </div>
    
    <div class="chart-loading-state__content">
      <div class="chart-loading-state__spinner">
        <Icon name="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
      </div>
      <p class="chart-loading-state__message">{{ message }}</p>
      <p v-if="submessage" class="chart-loading-state__submessage">{{ submessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  message?: string
  submessage?: string
}>(), {
  message: 'Caricamento dati in corso...'
})
</script>

<style scoped>
.chart-loading-state {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 200px;
  background: linear-gradient(
    135deg,
    hsl(var(--muted) / 0.2) 0%,
    hsl(var(--muted) / 0.1) 50%,
    hsl(var(--muted) / 0.2) 100%
  );
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.chart-loading-state__skeleton {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  opacity: 0.3;
}

.skeleton-bar {
  width: 2.5rem;
  background: linear-gradient(
    180deg,
    hsl(var(--primary) / 0.3) 0%,
    hsl(var(--primary) / 0.1) 100%
  );
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  animation: skeleton-pulse 2s ease-in-out infinite;
}

.skeleton-bar--1 { height: 40%; animation-delay: 0s; }
.skeleton-bar--2 { height: 65%; animation-delay: 0.2s; }
.skeleton-bar--3 { height: 85%; animation-delay: 0.4s; }
.skeleton-bar--4 { height: 55%; animation-delay: 0.6s; }
.skeleton-bar--5 { height: 70%; animation-delay: 0.8s; }

@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

.chart-loading-state__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  background: hsl(var(--card) / 0.9);
  backdrop-filter: blur(8px);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.chart-loading-state__spinner {
  color: hsl(var(--primary));
}

.chart-loading-state__message {
  font-size: 0.875rem;
  font-weight: 500;
  color: hsl(var(--foreground));
  text-align: center;
}

.chart-loading-state__submessage {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  text-align: center;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
