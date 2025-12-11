# Piano di Refactoring Completo - Taboolo Nuxt
## Da buon progetto a livello professionale enterprise

Obiettivo: trasformare il progetto Nuxt in un'applicazione enterprise-grade con UX professionale, performance ottimali e architettura scalabile.

---

## Stato attuale vs obiettivi

### Punti di forza attuali
- Design system custom ben strutturato (26 componenti UI)
- TanStack Vue Query ben implementato per state management
- Composables ben organizzati e riutilizzabili
- Excel parsing robusto con auto-detection intelligente
- Sistema di autenticazione funzionante
- Tailwind CSS con theme system completo

### Aree di miglioramento critico
- Modal e dialogs: z-index e overlay (bug risolto oggi, manca gestione globale)
- Inconsistenza UI: mix tra componenti custom e @nuxt/ui
- Responsiveness: layout non ottimizzato per mobile/tablet
- Performance: nessun lazy loading, bundle size elevato
- Type safety: tipi TypeScript incompleti in alcuni file
- Accessibilita: mancano ARIA labels e focus management
- Testing: nessun test automatizzato
- Documentation: design system non documentato

---

## Aggiornamenti del 11 dicembre 2025
- Stato generale: giallo (readiness 6.5/10). Punteggi: funzionalita 8/10; UX/UI 5/10; performance 6/10; code quality 7/10; type safety 6/10; testing 0/10; accessibilita 4/10; documentazione 3/10.
- Progressi completati oggi:
  1) Migrazione icone: lucide-vue-next sostituito con UIcon di @nuxt/ui (formato i-lucide-*) in `components/upload/BatchUploadRow.vue`, `components/upload/ComputoProgettoUploadDialog.vue`, `components/upload/RoundUploadDialog.vue`. Pacchetto `lucide-vue-next` rimosso. Impatto: dipendenza in meno, bundle piu leggero, icone coerenti e tree-shaking Iconify.
  2) Fix modal z-index e overlay (NewProjectDialog): Teleport fuori da PageShell, singola istanza controllata via v-model esterno, wrapper con z-index 9999 e overlay 50%. Risultato: modal sempre sopra ai contenuti, niente conflitti tra istanze.
  3) Standardizzazione componente Select: uso coerente della prop `options` in BatchUploadRow e RoundUploadDialog. Impatto: API uniforme e pronta per futura migrazione a USelect.
- Azioni rapide suggerite: aggiungere skeleton loaders mancanti, introdurre error boundaries base, aggiungere favicon e meta tags, rendere coerenti gli stati di loading.

---

## Debito tecnico prioritizzato (audit 11 dicembre 2025)
- Critico: testing assente (0%), responsive solo desktop, doppio sistema UI (preferire migrazione completa a @nuxt/ui).
- Alta priorita: TypeScript non strict, sicurezza auth (token in localStorage, assenza refresh/CSRF), nessun code splitting.
- Media: accessibilita (aria/focus), documentazione componenti/API, error handling e logging strutturato.

---

## Piano in 6 fasi (timeline: 4-6 settimane)

### Fase 1: Fondamenta UI/UX (settimana 1-2) - priorita critica
#### 1.1 Sistema modal e overlay unificato
- [x] Aggiungere Teleport a tutti i modal custom
- [x] Standardizzare z-index layers (override wrapper/overlay)
- [ ] Creare composable `useModal()` centralizzato
- [ ] Implementare modal stacking manager
- [ ] Aggiungere trap focus per accessibilita

File da modificare:
```
components/ui/Dialog.vue                    # Aggiungere Teleport wrapper
components/project/NewProjectDialog.vue     # Gia fatto
components/upload/*.vue                     # Verificare tutti i dialog
composables/useModal.ts                     # Nuovo - modal state manager
tailwind.config.ts                          # Aggiungere z-index scale custom
```

Implementazione proposta (`composables/useModal.ts`):
```typescript
import { ref, computed } from 'vue'

interface ModalState {
  id: string
  component: any
  props: Record<string, any>
  zIndex: number
}

const modals = ref<ModalState[]>([])
const baseZIndex = 9000

export function useModal() {
  const openModal = (component: any, props = {}) => {
    const id = `modal-${Date.now()}`
    const zIndex = baseZIndex + modals.value.length * 10
    modals.value.push({ id, component, props, zIndex })
    return id
  }

  const closeModal = (id: string) => {
    const index = modals.value.findIndex(m => m.id === id)
    if (index !== -1) {
      modals.value.splice(index, 1)
    }
  }

  const closeAllModals = () => {
    modals.value = []
  }

  return {
    modals: computed(() => modals.value),
    openModal,
    closeModal,
    closeAllModals,
  }
}
```

#### 1.2 Unificare sistema di componenti
- Obiettivo: migrare completamente a @nuxt/ui e usare wrapper personalizzati dove serve.
- Piano di migrazione:
  - Giorno 1: Button, Badge, Card -> UButton, UBadge, UCard (deprecare components/ui/Button.vue)
  - Giorno 2: Input, Label -> UInput, UFormGroup (deprecare components/ui/Input.vue)
  - Giorno 3: Select, Checkbox, Radio -> USelect, UCheckbox, URadio (deprecare components/ui/Select.vue)
  - Giorno 4: Dialog, Modal -> UModal (wrapper per compatibilita API)
  - Giorno 5: Tabs, Separator -> UTabs, UDivider (deprecare components/ui/Tabs.vue)
- Wrapper layer da creare in `components/taboolo/`: TButton.vue, TCard.vue, TModal.vue, TInput.vue, index.ts.
- Docs da creare in `docs/components/` (es. TButton.md, TCard.md).

#### 1.3 Responsive layout system
- Breakpoints: mobile < 768, tablet 768-1024, desktop > 1024.
- Comportamenti:
  - Mobile: sidebar come bottom sheet overlay, hamburger in topbar, card full width, tabelle con scroll orizzontale.
  - Tablet: sidebar collassabile, topbar compatta, card in 2 colonne, tabelle adattive.
  - Desktop: sidebar fissa, topbar completa, card 3+ colonne, tabelle full feature.
- File da modificare:
```
components/layout/AppShell.vue   # toggle sidebar responsive, overlay mobile, bottom sheet
components/layout/AppSidebar.vue # drawer mobile, collapsible tablet, close button mobile
components/layout/TopBar.vue     # hamburger icon mobile, menu utente compatto
components/layout/PageShell.vue  # padding responsive, header stack verticale su mobile
composables/useResponsive.ts     # nuovo - utilities breakpoints
```

Implementazione proposta (`composables/useResponsive.ts`):
```typescript
import { ref, onMounted, onUnmounted, computed } from 'vue'

export function useResponsive() {
  const isMobile = ref(false)
  const isTablet = ref(false)
  const isDesktop = ref(false)
  const width = ref(0)

  const updateBreakpoints = () => {
    width.value = window.innerWidth
    isMobile.value = width.value < 768
    isTablet.value = width.value >= 768 && width.value < 1024
    isDesktop.value = width.value >= 1024
  }

  onMounted(() => {
    updateBreakpoints()
    window.addEventListener('resize', updateBreakpoints)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateBreakpoints)
  })

  return {
    isMobile,
    isTablet,
    isDesktop,
    width,
    breakpoint: computed(() => {
      if (isMobile.value) return 'mobile'
      if (isTablet.value) return 'tablet'
      return 'desktop'
    }),
  }
}
```

#### 1.4 Design system documentation
- Setup @nuxt/content + playground personalizzato.
- Struttura consigliata:
```
docs/
  components/
    button.md
    card.md
    ...
  design-tokens/
    colors.md
    typography.md
    spacing.md
  patterns/
    forms.md
    navigation.md
pages/docs/
  index.vue
  components/[slug].vue
  playground.vue
```
- Timeline: giorno 1 setup content+layout; giorno 2 primi 10 componenti; giorno 3 design tokens + patterns.

---

### Fase 2: Performance e ottimizzazione (settimana 2-3) - priorita alta
#### 2.1 Code splitting e lazy loading
- Target: initial bundle < 200KB gzipped; FCP < 1.5s; TTI < 3s.
- Azioni:
  - Lazy load route components (payloadExtraction on, compressPublicAssets on in nuxt.config).
  - Lazy load heavy components (WbsTree, DataTable con skeleton e delay).
  - Preload route critiche in beforeEach.
- File chiave: `pages/projects/[id]/*.vue`, `components/data-table/DataTable.vue`, `components/wbs/WbsTree.vue`, `components/import/*.vue`, `nuxt.config.ts`.

#### 2.2 Image optimization
- Aggiungere `@nuxt/image`, usare `<NuxtImg>`, placeholder blur, lazy loading.
- Config suggerita:
```
modules: ['@nuxt/image'],
image: {
  formats: ['webp', 'avif'],
  quality: 80,
  screens: { xs: 320, sm: 640, md: 768, lg: 1024, xl: 1280, xxl: 1536 }
}
```

#### 2.3 Caching strategy
- Api client con header cache-control pubblico 5m + stale-while-revalidate 10m.
- Queries TanStack: staleTime 5m, gcTime 10m, refetchOnWindowFocus false.
- Nitro: compressPublicAssets (gzip+brotli); routeRules con cache per /_nuxt/** e /api/**.

---

### Fase 3: Type safety e qualita codice (settimana 3) - priorita media
#### 3.1 TypeScript strict mode
- Abilitare `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch` in tsconfig.
- Stima fix: 20-30 errori da risolvere.

#### 3.2 API types generation
- Installare `openapi-typescript`.
- Generare tipi da `http://localhost:8000/openapi.json` in `types/api-generated.ts`.
- Usare `paths` tipizzati in api-client.

#### 3.3 Zod schema validation
- Esempio `lib/schemas/project.schema.ts` con schema Project e `z.infer`.
- Validare risposte API con `.parse` per sicurezza runtime.

---

### Fase 4: Testing (settimana 4) - priorita media
#### 4.1 Setup testing infrastructure
- Dipendenze: @nuxt/test-utils, vitest, @vue/test-utils, happy-dom, @testing-library/vue, @testing-library/user-event.
- `vitest.config.ts`: ambiente happy-dom, coverage v8, reporter text/html/lcov, exclude node_modules e test/.

#### 4.2 Unit tests
- Target: 60% coverage su composables e utilities.
- Struttura proposta:
```
test/
  composables/
    useAuth.spec.ts
    useColumnMapping.spec.ts
    useExcelParser.spec.ts
  lib/
    utils.spec.ts
    formatters.spec.ts
  components/
    ui/Button.spec.ts
    project/NewProjectDialog.spec.ts
```

#### 4.3 E2E tests
- Strumento: Playwright.
- Scenari: login->dashboard, creazione nuovo progetto, upload computo, navigazione WBS, import wizard.

---

### Fase 5: Accessibilita (settimana 4-5) - priorita media
#### 5.1 ARIA labels e semantic HTML
- Aggiungere aria-label a bottoni icon-only, aria-describedby per errori form, link skip-to-content, focus visible, announcer live region.

#### 5.2 Keyboard navigation
- Tab order logico, ESC per chiudere modal, frecce per navigation, Enter/Space per azioni, focus trap nei modal (es. composable `useFocusTrap`).

#### 5.3 Color contrast
- Verificare WCAG AA (min 4.5:1) e AAA dove possibile; aggiustare tokens (es. muted-foreground).

---

### Fase 6: Developer experience (settimana 5-6) - priorita bassa
#### 6.1 ESLint + Prettier setup
- Dipendenze: @antfu/eslint-config, prettier, eslint-plugin-tailwindcss.
- Regole: casing PascalCase per componenti, ordine blocchi script/template/style.

#### 6.2 Git hooks con Husky
- Installare husky + lint-staged, `npx husky-init`.
- Pre-commit: `pnpm lint-staged`.
- `lint-staged.config.js`: eslint --fix + prettier per js/ts/vue; prettier per css/scss/md.

#### 6.3 CI/CD pipeline
- GitHub Actions: job test (pnpm install, lint, test, build) e job lighthouse (treosh/lighthouse-ci-action).

---

## Deliverables per fase
- Fase 1: modal system funzionante con z-index corretto; componenti unificati (custom -> @nuxt/ui); layout responsive mobile/tablet/desktop; design system documentato.
- Fase 2: bundle size ridotto del 40%; lazy loading implementato; Lighthouse > 90; immagini ottimizzate.
- Fase 3: TypeScript strict mode attivo; API types generati; Zod validation integrata.
- Fase 4: 60% unit test coverage; E2E test per flussi critici; CI pipeline attiva.
- Fase 5: WCAG AA compliance; keyboard navigation completa; screen reader support.
- Fase 6: linting + formatting automatico; git hooks attivi; CI/CD pipeline stabile.

---

## Success metrics
- Performance: Initial Load < 1.5s; Time to Interactive < 3s; Lighthouse Performance > 90.
- Quality: TypeScript 0 errori strict; Test coverage > 60%; ESLint 0 warnings.
- UX: apertura modal < 100ms; form submission < 500ms; navigation < 200ms.
- Accessibilita: WCAG AA 100% compliance; keyboard nav completa; screen reader annuncia tutte le azioni.

---

## Quick wins (settimana 0.5)
1. Fix modal z-index [x] fatto.
2. Aggiungere loading states (skeleton liste, spinner bottoni, progress bar upload) [ ].
3. Error boundaries di base (catch per page, fallback UI) [ ].
4. Ottimizzare font loading (font-display swap, preload font critici) [ ].
5. Aggiungere favicon e meta tags (Open Graph, Twitter cards, title/description) [ ].

---

## Risorse e tools
- Nuxt 3 docs: https://nuxt.com/docs
- @nuxt/ui docs: https://ui.nuxt.com/
- TanStack Query docs: https://tanstack.com/query/latest/docs/vue/overview
- Lighthouse CI: https://github.com/GoogleChrome/lighthouse-ci
- Bundle analyzer: https://github.com/nuxt/devtools
- Testing: https://vitest.dev/, https://testing-library.com/docs/vue-testing-library/intro/, https://playwright.dev/
- Accessibilita: https://www.deque.com/axe/devtools/, https://wave.webaim.org/

---

## Team allocation (opzionale)
- Developer 1 (Senior): Fase 1-2 (UI/UX + performance)
- Developer 2 (Mid): Fase 3-4 (type safety + testing)
- Developer 3 (Junior): Fase 5-6 (accessibilita + developer experience)

---

## Acceptance criteria
- [ ] Tutti i modal funzionano correttamente su tutti i breakpoints
- [ ] Bundle size < 200KB gzipped
- [ ] Lighthouse score > 90 su tutte le pagine principali
- [ ] 0 errori TypeScript in strict mode
- [ ] Test coverage > 60%
- [ ] WCAG AA compliance verificata con audit
- [ ] Documentazione completa per tutti i componenti
- [ ] CI/CD pipeline verde per 1 settimana consecutiva

---

Questo piano e iterativo: ogni fase puo essere adattata in base ai feedback e alle priorita business. Importante mantenere un processo continuo di miglioramento.
