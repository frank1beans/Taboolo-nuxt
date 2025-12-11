<template>
  <div class="h-full">
    <SixImportWizard v-if="projectId" :project-id="projectId" @success="handleSuccess" @cancel="handleCancel" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import SixImportWizard from '@/components/import/SixImportWizard.vue'

definePageMeta({
  alias: ["/commesse/:id/import-six"],
});

const route = useRoute();
const router = useRouter();
const projectId = computed(() => {
  const id = route.params.id
  return id ? String(id) : null
});

const handleSuccess = () => {
  toast.success('Import SIX completato con successo');
  router.push(`/projects/${projectId.value}/estimate`);
};

const handleCancel = () => {
  router.back();
};
</script>
