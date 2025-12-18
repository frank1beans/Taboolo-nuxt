<script setup lang="ts">
import EstimateItemsPage from '~/components/estimates/EstimateItemsPage.vue'

definePageMeta({
  breadcrumb: 'Dettaglio Offerta',
})
</script>

<template>
  <EstimateItemsPage
    subtitle="Voci Offerta"
    default-title="Dettaglio Offerta"
    empty-title="Nessuna voce trovata"
    empty-message="Nessuna voce presente per i filtri selezionati."
    export-filename="offerta-items"
    toolbar-placeholder="Cerca voce offerta..."
  />
</template>
