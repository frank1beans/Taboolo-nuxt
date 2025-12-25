<template>
  <div class="p-3">
    <!-- PROJECTS LEGEND (colorBy = 'project') -->
    <template v-if="colorBy === 'project'">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-bold text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Progetti</h3>
        <div class="flex gap-1 text-[9px]">
          <button @click="$emit('showAll', 'project')" class="text-[hsl(var(--primary))] hover:underline">Tutti</button>
          <span class="text-[hsl(var(--muted-foreground))]">/</span>
          <button @click="$emit('hideAll', 'project')" class="text-[hsl(var(--primary))] hover:underline">Nessuno</button>
        </div>
      </div>
      <div class="space-y-1">
        <button 
          v-for="project in projects" 
          :key="project.id"
          @click="$emit('toggleVisibility', 'project', project.id)"
          class="w-full px-2 py-1.5 rounded flex justify-between items-center text-xs transition-colors hover:bg-[hsl(var(--accent))]"
          :class="visibleProjects.has(project.id) ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] opacity-50'"
        >
          <span class="flex items-center gap-2 truncate">
            <UIcon 
              :name="visibleProjects.has(project.id) ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'" 
              class="w-3.5 h-3.5 flex-shrink-0"
            />
            <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: getProjectColor(project.id) }"></span>
            <span class="truncate">{{ project.name || project.code }}</span>
          </span>
          <span class="text-[10px] opacity-60">{{ getProjectPointCount(project.id) }}</span>
        </button>
      </div>
    </template>

    <!-- WBS06 LEGEND (colorBy = 'wbs06') -->
    <template v-else-if="colorBy === 'wbs06'">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-bold text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Categorie WBS6</h3>
        <div class="flex gap-1 text-[9px]">
          <button @click="$emit('showAll', 'wbs06')" class="text-[hsl(var(--primary))] hover:underline">Tutti</button>
          <span class="text-[hsl(var(--muted-foreground))]">/</span>
          <button @click="$emit('hideAll', 'wbs06')" class="text-[hsl(var(--primary))] hover:underline">Nessuno</button>
        </div>
      </div>
      <div class="space-y-1">
        <button 
          v-for="wbs in wbs6Categories" 
          :key="wbs.code"
          @click="$emit('toggleVisibility', 'wbs06', wbs.code)"
          class="w-full px-2 py-1.5 rounded flex justify-between items-center text-xs transition-colors hover:bg-[hsl(var(--accent))]"
          :class="visibleWbs6.has(wbs.code) ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] opacity-50'"
        >
          <span class="flex items-center gap-2 truncate">
            <UIcon 
              :name="visibleWbs6.has(wbs.code) ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'" 
              class="w-3.5 h-3.5 flex-shrink-0"
            />
            <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: getWbs06Color(wbs.code) }"></span>
            <span class="truncate" :title="wbs.code">{{ wbs.desc }}</span>
          </span>
          <span class="text-[10px] opacity-60">{{ wbs.count }}</span>
        </button>
      </div>
    </template>

    <!-- CLUSTER LEGEND (colorBy = 'cluster') -->
    <template v-else-if="colorBy === 'cluster'">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-bold text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Clusters</h3>
        <div class="flex gap-1 text-[9px]">
          <button @click="$emit('showAll', 'cluster')" class="text-[hsl(var(--primary))] hover:underline">Tutti</button>
          <span class="text-[hsl(var(--muted-foreground))]">/</span>
          <button @click="$emit('hideAll', 'cluster')" class="text-[hsl(var(--primary))] hover:underline">Nessuno</button>
        </div>
      </div>
      <div class="space-y-1">
        <button 
          v-for="cluster in clusters" 
          :key="cluster.id"
          @click="$emit('toggleVisibility', 'cluster', cluster.id)"
          class="w-full px-2 py-1.5 rounded flex justify-between items-center text-xs transition-colors hover:bg-[hsl(var(--accent))]"
          :class="visibleClusters.has(cluster.id) ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))] opacity-50'"
        >
          <span class="flex items-center gap-2 truncate">
            <UIcon 
              :name="visibleClusters.has(cluster.id) ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'" 
              class="w-3.5 h-3.5 flex-shrink-0"
            />
            <span class="w-5 h-2.5 rounded flex-shrink-0" :style="{ backgroundColor: getClusterColor(cluster.id) }"></span>
            <span class="truncate">Cluster {{ cluster.id === -1 ? 'N/A' : cluster.id }}</span>
          </span>
          <span class="text-[10px] opacity-60">{{ cluster.count }}</span>
        </button>
      </div>
    </template>

    <!-- AMOUNT LEGEND (colorBy = 'amount') -->
    <template v-else>
      <div class="text-xs text-[hsl(var(--muted-foreground))] p-2">
        <p class="mb-2">Colorazione per prezzo (scala continua)</p>
        <div class="h-3 rounded bg-gradient-to-r from-purple-900 via-green-500 to-yellow-400"></div>
        <div class="flex justify-between text-[10px] mt-1">
          <span>Min</span>
          <span>Max</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
interface Project {
  id: string;
  name?: string;
  code?: string;
}

interface Wbs6Category {
  code: string;
  desc: string;
  count: number;
}

interface Cluster {
  id: number;
  count: number;
}

defineProps<{
  colorBy: 'project' | 'cluster' | 'amount' | 'wbs06';
  projects: Project[];
  wbs6Categories: Wbs6Category[];
  clusters: Cluster[];
  visibleProjects: Set<string>;
  visibleWbs6: Set<string>;
  visibleClusters: Set<number>;
  getProjectColor: (id: string) => string;
  getWbs06Color: (code: string) => string;
  getClusterColor: (id: number) => string;
  getProjectPointCount: (id: string) => number;
}>();

defineEmits<{
  'toggleVisibility': [type: 'project' | 'wbs06' | 'cluster', id: string | number];
  'showAll': [type: 'project' | 'wbs06' | 'cluster'];
  'hideAll': [type: 'project' | 'wbs06' | 'cluster'];
}>();
</script>
