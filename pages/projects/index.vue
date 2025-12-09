<template>
  <div class="space-y-5">
    <header class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Projects</p>
        <h1 class="text-xl font-semibold">Projects portfolio</h1>
        <p class="text-sm text-muted-foreground">
          Ported from REACTPROJECT /commesse. Search and open a project to continue the migration.
        </p>
      </div>
      <button
        type="button"
        class="rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground transition hover:bg-secondary/80"
        @click="refetch"
      >
        Refresh
      </button>
    </header>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="relative w-full sm:max-w-sm">
        <input
          v-model="search"
          type="search"
          placeholder="Search by name or code..."
          class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-1 ring-transparent transition focus:border-ring focus:ring-ring/30"
        />
        <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {{ filteredProjects.length }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs text-muted-foreground">Status filter:</label>
        <select
          v-model="statusFilter"
          class="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-ring"
        >
          <option value="">All</option>
          <option value="setup">Setup</option>
          <option value="in_progress">In progress</option>
          <option value="closed">Closed</option>
        </select>
      </div>
    </div>

    <div v-if="isLoading" class="rounded-xl border border-border bg-muted/20 p-6 text-sm text-muted-foreground">
      Loading projects...
    </div>
    <div v-else-if="error" class="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
      {{ errorMessage }}
    </div>
    <div v-else-if="filteredProjects.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="project in filteredProjects"
        :key="project.id"
        class="rounded-xl border border-border bg-card/60 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-foreground">{{ project.name }}</p>
            <p class="text-xs text-muted-foreground">{{ project.code }}</p>
          </div>
          <span class="rounded-full bg-muted px-2 py-1 text-[11px] uppercase text-muted-foreground">
            {{ statusLabel(project.status) }}
          </span>
        </div>
        <p class="mt-2 text-xs text-muted-foreground line-clamp-2">
          {{ project.description || "No description" }}
        </p>
        <div class="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>BU: {{ project.business_unit || "—" }}</span>
          <span>Updated: {{ shortDate(project.updated_at) }}</span>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <NuxtLink
            :to="`/projects/${project.id}/overview`"
            class="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Overview
          </NuxtLink>
          <NuxtLink
            :to="`/projects/${project.id}/estimate`"
            class="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            Estimate
          </NuxtLink>
          <NuxtLink
            :to="`/projects/${project.id}/price-catalog`"
            class="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            Price catalog
          </NuxtLink>
          <NuxtLink
            :to="`/projects/${project.id}/analysis`"
            class="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            Analysis
          </NuxtLink>
        </div>
      </div>
    </div>
    <div v-else class="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
      No projects found. Import one via the backend bundle endpoint.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { api } from "@/lib/api-client";
import type { ApiProject, ProjectStatus } from "@/types/api";

definePageMeta({
  alias: ["/commesse"],
});

const search = ref("");
const statusFilter = ref<ProjectStatus | "">("");

const { data, error, isLoading, refetch } = useQuery({
  queryKey: ["projects"],
  queryFn: () => api.listProjects(),
});

const projects = computed<ApiProject[]>(() => data.value ?? []);
const filteredProjects = computed(() => {
  const query = search.value.trim().toLowerCase();
  return projects.value.filter((project) => {
    const matchesQuery =
      !query ||
      [project.name, project.code, project.description]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query));
    const matchesStatus = !statusFilter.value || project.status === statusFilter.value;
    return matchesQuery && matchesStatus;
  });
});

const statusLabel = (status: ProjectStatus) => {
  if (status === "setup") return "Setup";
  if (status === "in_progress") return "In progress";
  if (status === "closed") return "Closed";
  return status;
};

const shortDate = (iso: string) => new Date(iso).toLocaleDateString();

const errorMessage = computed(() =>
  error.value instanceof Error ? error.value.message : "Unknown error",
);
</script>
