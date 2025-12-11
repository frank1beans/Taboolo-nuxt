<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { UButton } from '#components'

const { user, logout } = useAuth()
const router = useRouter()
const route = useRoute()
const profileOpen = ref(false)

const pageHint = computed(() => {
  if (route.path.startsWith('/projects')) return 'Commesse e offerte'
  if (route.path.startsWith('/price-catalog')) return 'Listini e ricerca'
  if (route.path.startsWith('/budget')) return 'Budget e scenari'
  return 'Dashboard Taboolo'
})

const profileItems = [
  [
    { label: 'Profilo', icon: 'i-lucide-user-round', to: '/profile' },
    { label: 'Impostazioni', icon: 'i-lucide-settings', to: '/settings' },
  ],
  [
    {
      label: 'Logout',
      icon: 'i-lucide-log-out',
      click: () => {
        logout()
        router.push('/login')
      },
    },
  ],
]
</script>

<template>
  <header class="flex items-center justify-between border-b border-border/60 bg-card/80 px-5 py-3 backdrop-blur">
    <div class="flex items-center gap-3">
      <div class="h-10 w-10 rounded-xl bg-primary/10 p-2 shadow-sm">
        <img src="~/assets/logo.png" alt="Taboolo" class="h-full w-full object-contain">
      </div>
      <div class="leading-tight">
        <p class="text-sm font-semibold text-foreground">Taboolo</p>
        <p class="text-xs text-muted-foreground">{{ pageHint }}</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <UButton
        variant="ghost"
        color="gray"
        size="sm"
        icon="i-lucide-bell"
        aria-label="Notifiche"
      />
      <div class="relative">
        <UButton
          color="gray"
          variant="soft"
          size="sm"
          icon="i-lucide-user-round"
          :aria-expanded="profileOpen"
          @click="profileOpen = !profileOpen"
        >
          <span class="max-w-[160px] truncate">
            {{ user?.full_name || user?.email || 'Account' }}
          </span>
        </UButton>
        <div
          v-if="profileOpen"
          class="absolute right-0 mt-2 w-48 rounded-lg border border-border/70 bg-card p-2 shadow-lg"
        >
          <button
            v-for="item in profileItems[0]"
            :key="item.label"
            type="button"
            class="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground hover:bg-muted/70"
            @click="item.to ? router.push(item.to) : item.click?.()"
          >
            <UIcon :name="item.icon" class="h-4 w-4 text-muted-foreground" />
            <span>{{ item.label }}</span>
          </button>
          <div class="my-2 border-t border-border/60" />
          <button
            v-for="item in profileItems[1]"
            :key="item.label"
            type="button"
            class="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-destructive hover:bg-destructive/10"
            @click="item.click?.(); profileOpen = false"
          >
            <UIcon :name="item.icon" class="h-4 w-4" />
            <span>{{ item.label }}</span>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
