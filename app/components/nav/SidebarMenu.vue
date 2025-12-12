<template>
  <div class="space-y-2 text-sm">
    <div v-for="section in sections" :key="section.title" class="px-2">
      <button
        class="w-full text-left px-3 py-2 rounded-md hover:bg-slate-800 transition flex items-center gap-2"
        :class="section.active ? 'bg-slate-800 text-white' : 'text-slate-200'"
        type="button"
      >
        <span class="text-lg">{{ section.icon }}</span>
        <span class="font-semibold">{{ section.title }}</span>
      </button>
      <ul v-if="section.children?.length" class="mt-1 space-y-1">
        <li
          v-for="child in section.children"
          :key="child.title"
          class="ml-6 pl-2 border-l border-slate-800"
        >
          <NuxtLink
            :to="child.to"
            class="block px-3 py-2 rounded-md hover:bg-slate-800 transition"
            :class="child.active ? 'bg-slate-800 text-white' : 'text-slate-200'"
          >
            {{ child.title }}
          </NuxtLink>
          <ul v-if="child.children?.length" class="mt-1 space-y-1">
            <li v-for="leaf in child.children" :key="leaf.title" class="ml-4">
              <NuxtLink
                :to="leaf.to"
                class="block px-3 py-1.5 rounded-md hover:bg-slate-800 transition text-slate-200"
                :class="leaf.active ? 'bg-slate-800 text-white' : ''"
              >
                {{ leaf.title }}
              </NuxtLink>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();

const sections = computed(() => [
  {
    title: 'Progetti e commesse',
    icon: '📁',
    active: route.path.startsWith('/projects'),
    children: [
      { title: 'Analisi multicommesa', to: '/projects', active: route.path === '/projects' },
      { title: 'Progetti e commesse', to: '/projects', active: route.path === '/projects' },
    ],
  },
  {
    title: 'Preventivazione',
    icon: '📝',
    active: route.path.includes('/estimates'),
    children: [{ title: 'Preventivi', to: '/projects/1/estimates', active: route.path.includes('/estimates') }],
  },
  {
    title: 'Ritorni LX/MX',
    icon: '📊',
    active: route.path.includes('/returns'),
    children: [
      {
        title: 'Round 1',
        to: '/projects/1/returns',
        active: route.path.includes('/returns'),
        children: [
          { title: 'Impresa A', to: '/projects/1/returns/a', active: false },
          { title: 'Impresa B', to: '/projects/1/returns/b', active: false },
        ],
      },
    ],
  },
  {
    title: 'Confronti',
    icon: '⚖',
    active: route.path.includes('/comparisons'),
    children: [{ title: 'Tabelle confronto', to: '/projects/1/comparisons', active: route.path.includes('/comparisons') }],
  },
  {
    title: 'Catalogo prezzi',
    icon: '💶',
    active: route.path.startsWith('/catalog'),
    children: [{ title: 'Catalogo', to: '/catalog', active: route.path.startsWith('/catalog') }],
  },
]);
</script>
