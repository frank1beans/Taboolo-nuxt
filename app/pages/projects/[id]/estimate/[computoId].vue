<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
         <Button variant="ghost" class="mb-2 pl-0 hover:bg-transparent" @click="router.back()">
          <UIcon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
          Torna alla lista
        </Button>
        <div v-if="estimate">
          <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Dettaglio Preventivo</p>
          <h1 class="text-3xl font-bold tracking-tight mt-1">{{ estimate.name }}</h1>
          <div class="flex items-center gap-4 text-sm text-muted-foreground mt-2">
            <Badge variant="outline">{{ estimate.type === 'project' ? 'Baseline' : 'Offerta' }}</Badge>
            <span v-if="estimate.revision">Rev: {{ estimate.revision }}</span>
            <span v-if="estimate.discipline">{{ estimate.discipline }}</span>
            <span>{{ new Date(estimate.created_at).toLocaleDateString() }}</span>
          </div>
        </div>
        <div v-else-if="isLoading" class="h-16 w-48 bg-muted animate-pulse rounded" />
      </div>
      <div class="flex items-center gap-2">
        <Button variant="destructive" size="sm" :disabled="isDeleting" @click="handleDelete">
          <UIcon name="i-lucide-trash-2" class="mr-2 h-4 w-4" />
          Elimina
        </Button>
      </div>
    </div>

    <!-- Content -->
    <div class="rounded-xl border bg-card text-card-foreground shadow p-6">
      <div v-if="isLoading" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
      </div>
      <div v-else-if="estimate" class="space-y-6">
        <h3 class="font-semibold text-lg">Riepilogo</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
             <Card>
                <CardHeader class="pb-2">
                    <CardTitle class="text-sm font-medium">Totale</CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="text-2xl font-bold">€ {{ estimate.total_amount?.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || '-' }}</div>
                </CardContent>
             </Card>
             <Card v-if="estimate.type === 'offer'">
                <CardHeader class="pb-2">
                    <CardTitle class="text-sm font-medium">Impresa</CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="text-2xl font-bold">{{ estimate.company || '-' }}</div>
                </CardContent>
             </Card>
             <Card v-if="estimate.type === 'offer'">
                <CardHeader class="pb-2">
                    <CardTitle class="text-sm font-medium">Delta vs Project</CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="text-2xl font-bold" :class="estimate.delta_percentage && estimate.delta_percentage > 0 ? 'text-red-500' : 'text-green-500'">
                      {{ estimate.delta_percentage ? `${estimate.delta_percentage > 0 ? '+' : ''}${estimate.delta_percentage.toFixed(2)}%` : '-' }}
                    </div>
                </CardContent>
             </Card>
        </div>

        <div class="mt-8 p-12 border border-dashed rounded-lg text-center text-muted-foreground bg-muted/20">
            <p>Dettaglio voci (BoQ) non ancora disponibile.</p>
            <p class="text-sm mt-2">Funzionalità in arrivo.</p>
        </div>
      </div>
      <div v-else class="text-center py-8 text-muted-foreground">
        Preventivo non trovato.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEstimate, useDeleteEstimate } from '~/composables/queries/useEstimateQueries'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'
import CardContent from '@/components/ui/CardContent.vue'
import CardHeader from '@/components/ui/CardHeader.vue'
import CardTitle from '@/components/ui/CardTitle.vue'
import { UIcon } from '#components'

const route = useRoute()
const router = useRouter()
const projectId = computed(() => Number(route.params.id))
const estimateId = computed(() => Number(route.params.computoId))

const { data: estimate, isLoading } = useEstimate(projectId, estimateId)
const { mutate: deleteEstimate, isPending: isDeleting } = useDeleteEstimate()

const handleDelete = () => {
  if (!confirm('Sei sicuro di voler eliminare questo preventivo?')) return

  deleteEstimate(
    {
      projectId: projectId.value,
      estimateId: estimateId.value,
    },
    {
      onSuccess: () => {
        router.push(`/projects/${projectId.value}/estimate`)
      },
    }
  )
}
</script>
