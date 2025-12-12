<template>
  <nav class="flex items-center gap-2 text-xs">
    <ToolbarButton icon="➕" label="Aggiungi" />
    <ToolbarButton icon="💾" label="Salva" />
    <ToolbarButton icon="📎" label="Exporta" />
    <ToolbarButton icon="🔍" label="Trova" />
    <ToolbarButton icon="↩" label="Ripristina" />
    <ToolbarButton icon="⚙" label="Imposta" />
  </nav>
</template>

<script setup lang="ts">
import ToolbarButton from './ToolbarButton.vue';
</script>
