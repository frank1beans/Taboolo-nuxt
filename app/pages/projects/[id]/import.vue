<template>
  <div class="h-full">
    <UnifiedImportWizard :project-id="projectId" @success="handleSuccess" @cancel="handleCancel" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import UnifiedImportWizard from '@/components/import/UnifiedImportWizard.vue'

definePageMeta({
  alias: ["/commesse/:id/import-unificato", "/commesse/:id/ritorni-batch", "/commesse/:id/import"],
});

const route = useRoute();
const router = useRouter();
const projectId = computed(() => route.params.id as string);

const handleSuccess = () => {
  toast.success('Importazione completata con successo');
  router.push(`/projects/${projectId.value}/estimate`);
};

const handleCancel = () => {
  router.back();
};
</script>
