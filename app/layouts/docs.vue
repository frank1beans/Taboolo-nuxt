<template>
  <UApp>
    <div class="min-h-screen bg-background text-foreground">
      <header class="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-md bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-100">
              <span class="text-sm font-semibold">T</span>
            </div>
            <div>
              <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">Taboolo Docs</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">Nuxt 4 Reference</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <UBadge color="primary" variant="subtle">v1.0</UBadge>
            <ColorModeToggle />
          </div>
        </div>
      </header>

      <main class="mx-auto max-w-6xl px-4 py-8">
        <div class="grid grid-cols-[260px_minmax(0,1fr)_220px] gap-8">
          <aside>
            <DocsSidebarNav />
          </aside>

          <article class="prose prose-slate max-w-none dark:prose-invert">
            <slot />
          </article>

          <aside>
            <DocsToc />
          </aside>
        </div>
      </main>
    </div>
  </UApp>
</template>
