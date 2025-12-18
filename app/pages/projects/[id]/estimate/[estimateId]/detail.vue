<script setup lang="ts">
import EstimateItemsPage from '~/components/estimates/EstimateItemsPage.vue'

definePageMeta({
  breadcrumb: 'Preventivo',
})
</script>

<template>
  <EstimateItemsPage
    subtitle="Voci Preventivo"
    default-title="Dettaglio Preventivo"
    empty-title="Nessuna voce trovata"
    empty-message="Questo preventivo non contiene ancora voci."
    export-filename="preventivo-items"
    toolbar-placeholder="Cerca voce..."
  />
</template>
