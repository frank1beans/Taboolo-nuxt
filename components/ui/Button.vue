<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

export interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'accent'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  as?: string
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: 'default',
  size: 'default',
  as: 'button',
  type: 'button',
})

const buttonClasses = computed(() => {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold font-sans uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0'

  const variantClasses = {
    default:
      'bg-primary text-primary-foreground hover:bg-primary/88 border border-transparent shadow-none',
    destructive:
      'bg-destructive text-destructive-foreground hover:bg-destructive/90 border border-transparent shadow-none',
    outline: 'border border-border/40 bg-background hover:bg-muted/60 shadow-none',
    secondary:
      'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/40 shadow-none',
    ghost: 'hover:bg-muted/60 border border-transparent shadow-none',
    link: 'text-primary hover:text-primary/80 font-normal normal-case tracking-normal',
    accent:
      'bg-accent text-accent-foreground hover:bg-accent/90 border border-transparent shadow-none',
  }

  const sizeClasses = {
    default: 'h-10 px-6 py-2',
    sm: 'h-8 px-4 text-xs',
    lg: 'h-12 px-8 text-base',
    icon: 'h-10 w-10',
  }

  return cn(baseClasses, variantClasses[props.variant], sizeClasses[props.size])
})
</script>

<template>
  <component :is="as" :type="type" :class="buttonClasses">
    <slot />
  </component>
</template>
