<script setup lang="ts">
/**
 * HelpModal.vue
 * 
 * Modal for displaying contextual help documentation.
 * Renders markdown content with navigation.
 */

const props = defineProps<{
  open: boolean
  content: string
  title: string
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  'close': []
}>()

// Parse markdown to extract sections for navigation
const sections = computed(() => {
  if (!props.content) return []
  
  const lines = props.content.split('\n')
  const result: Array<{ level: number; title: string; id: string }> = []
  
  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)$/)
    if (match && match[1] && match[2]) {
      const level = match[1].length
      const title = match[2]
      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      result.push({ level, title, id })
    }
  }
  
  return result
})

const scrollToSection = (id: string) => {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const handleBackdropClick = () => {
  emit('close')
}

const openFullDocs = () => {
  window.open('/docs/user-guide/', '_blank')
}

// Simple markdown to HTML renderer
const renderedHtml = computed(() => {
  const md = props.content
  if (!md) return ''
  
  let html = md
    // Headers with IDs
    .replace(/^### (.+)$/gm, (_, text) => {
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      return `<h3 id="${id}">${text}</h3>`
    })
    .replace(/^## (.+)$/gm, (_, text) => {
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      return `<h2 id="${id}">${text}</h2>`
    })
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Tables - headers
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim())
      const isHeader = cells.some(c => /^[-:]+$/.test(c.trim()))
      if (isHeader) return '' // Skip separator row
      const tag = 'td'
      return '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>'
    })
    // Lists
    .replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>')
    // Blockquotes
    .replace(/^>\s*(.+)$/gm, '<blockquote>$1</blockquote>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    
  // Wrap consecutive li in ul
  html = html.replace(/(<li>[\s\S]*?<\/li>)+/g, '<ul>$&</ul>')
  
  // Wrap consecutive tr in table
  html = html.replace(/(<tr>[\s\S]*?<\/tr>)+/g, '<table>$&</table>')
  
  // Merge consecutive blockquotes
  html = html.replace(/(<blockquote>[\s\S]*?<\/blockquote>\s*)+/g, (match) => {
    const content = match.replace(/<\/?blockquote>/g, ' ').trim()
    return `<blockquote>${content}</blockquote>`
  })
  
  return html
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div 
        v-if="open" 
        class="fixed inset-0 z-[100] flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div 
          class="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm"
          @click="handleBackdropClick"
        />

        <!-- Modal -->
        <div class="relative z-[105] w-full max-w-3xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden bg-[hsl(var(--card))] border border-[hsl(var(--border))] flex flex-col">
          
          <!-- Header -->
          <div class="px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--primary)/0.05)] flex items-center justify-between flex-shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-[hsl(var(--primary)/0.15)] flex items-center justify-center">
                <Icon name="heroicons:question-mark-circle" class="w-5 h-5 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <h2 class="text-lg font-semibold text-[hsl(var(--foreground))]">{{ title }}</h2>
                <p class="text-xs text-[hsl(var(--muted-foreground))]">Premi F1 per aprire/chiudere</p>
              </div>
            </div>
            <UButton
              icon="i-heroicons-x-mark"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="emit('close')"
            />
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-hidden flex">
            <!-- Sidebar TOC (if many sections) -->
            <aside 
              v-if="sections.length > 3" 
              class="w-48 border-r border-[hsl(var(--border))] p-4 overflow-y-auto flex-shrink-0 hidden md:block"
            >
              <h3 class="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">
                Indice
              </h3>
              <nav class="space-y-1">
                <button
                  v-for="section in sections"
                  :key="section.id"
                  :class="[
                    'block w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors',
                    'hover:bg-[hsl(var(--muted)/0.5)] text-[hsl(var(--foreground))]',
                    section.level === 3 ? 'pl-4 text-[hsl(var(--muted-foreground))]' : 'font-medium'
                  ]"
                  @click="scrollToSection(section.id)"
                >
                  {{ section.title }}
                </button>
              </nav>
            </aside>

            <!-- Main Content -->
            <div class="flex-1 overflow-y-auto p-6">
              <!-- Loading State -->
              <div v-if="loading" class="flex items-center justify-center py-12">
                <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
              </div>

              <!-- Error State -->
              <div v-else-if="error" class="text-center py-12">
                <Icon name="heroicons:exclamation-triangle" class="w-12 h-12 text-[hsl(var(--warning))] mx-auto mb-4" />
                <p class="text-[hsl(var(--muted-foreground))]">{{ error }}</p>
              </div>

              <!-- Markdown Content -->
              <div v-else class="help-content" v-html="renderedHtml" />
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] flex items-center justify-between flex-shrink-0">
            <span class="text-xs text-[hsl(var(--muted-foreground))]">
              Documentazione Taboolo
            </span>
            <div class="flex items-center gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-heroicons-arrow-top-right-on-square"
                @click="openFullDocs"
              >
                Apri documentazione completa
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active > div:last-child,
.modal-leave-active > div:last-child {
  transition: transform 0.2s ease;
}

.modal-enter-from > div:last-child,
.modal-leave-to > div:last-child {
  transform: scale(0.95);
}
</style>

<style>
/* Help content styling */
.help-content {
  font-size: 0.925rem;
  line-height: 1.7;
  color: hsl(var(--foreground));
}

.help-content h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: hsl(var(--foreground));
}

.help-content h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  color: hsl(var(--foreground));
  border-bottom: 1px solid hsl(var(--border));
  padding-bottom: 0.5rem;
}

.help-content h3 {
  font-size: 1.1rem;
  font-weight: 500;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  color: hsl(var(--foreground));
}

.help-content p {
  margin-bottom: 0.75rem;
  color: hsl(var(--foreground));
}

.help-content ul, .help-content ol {
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

.help-content li {
  margin-bottom: 0.25rem;
}

.help-content code {
  background: hsl(var(--muted));
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

.help-content pre {
  background: hsl(var(--muted));
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin-bottom: 1rem;
}

.help-content pre code {
  background: transparent;
  padding: 0;
}

.help-content table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}

.help-content th, .help-content td {
  border: 1px solid hsl(var(--border));
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.help-content th {
  background: hsl(var(--muted) / 0.5);
  font-weight: 600;
}

.help-content blockquote {
  border-left: 4px solid hsl(var(--primary));
  padding-left: 1rem;
  font-style: italic;
  margin: 1rem 0;
  color: hsl(var(--muted-foreground));
}

.help-content a {
  color: hsl(var(--primary));
}

.help-content a:hover {
  text-decoration: underline;
}

.help-content hr {
  margin: 1.5rem 0;
  border-color: hsl(var(--border));
}

.help-content strong {
  font-weight: 600;
}

.help-content em {
  font-style: italic;
}
</style>
