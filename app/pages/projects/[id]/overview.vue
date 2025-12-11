<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-xs uppercase tracking-[0.16em] text-muted-foreground">Project</p>
        <h1 class="text-xl font-semibold">{{ project?.name ?? "Project" }}</h1>
        <p class="text-sm text-muted-foreground">{{ project?.code }}</p>
      </div>
    <div class="flex flex-wrap gap-2">
        <NuxtLink class="text-sm font-semibold text-primary" :to="`/projects/${id}/import`">Import Excel</NuxtLink>
        <NuxtLink class="text-sm font-semibold text-primary" :to="`/projects/${id}/import-six`">Import SIX</NuxtLink>
        <NuxtLink class="text-sm font-semibold text-primary" :to="`/projects/${id}/price-catalog`">
          Price catalog
        </NuxtLink>
        <NuxtLink class="text-sm font-semibold text-primary" :to="`/projects/${id}/estimate`">
          Estimate
        </NuxtLink>
        <NuxtLink class="text-sm font-semibold text-primary" :to="`/projects/${id}/wbs`">
          WBS
        </NuxtLink>
      </div>
    </div>

    <div v-if="isLoading" class="text-sm text-muted-foreground">Loading details...</div>
    <div v-else-if="error" class="text-sm text-destructive">{{ errorMessage }}</div>
    <div v-else-if="project" class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-xl border border-border bg-card/60 p-4 shadow-sm">
        <p class="text-xs text-muted-foreground">Description</p>
        <p class="text-sm font-medium">{{ project.description ?? "—" }}</p>
      </div>
      <div class="rounded-xl border border-border bg-card/60 p-4 shadow-sm">
        <p class="text-xs text-muted-foreground">Business Unit</p>
        <p class="text-sm font-medium">{{ project.business_unit ?? "—" }}</p>
      </div>
      <div class="rounded-xl border border-border bg-card/60 p-4 shadow-sm">
        <p class="text-xs text-muted-foreground">Status</p>
        <p class="text-sm font-semibold text-foreground">{{ project.status }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import { api } from '~/lib/api-client';

definePageMeta({
  alias: ["/commesse/:id/overview"],
});

const route = useRoute();
const id = computed(() => route.params.id as string);

const { data, error, isLoading } = useQuery({
  queryKey: ["project", id],
  queryFn: () => api.getProject(id.value),
  enabled: computed(() => !!id.value),
});

const project = computed(() => data.value);
const errorMessage = computed(() => (error.value instanceof Error ? error.value.message : "Unknown error"));
</script>
