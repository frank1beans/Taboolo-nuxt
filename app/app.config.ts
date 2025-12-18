
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'emerald',
      neutral: 'neutral'
    },
    card: {
      slots: {
        root: 'bg-[hsl(var(--card))] ring-1 ring-[hsl(var(--border))] divide-y divide-[hsl(var(--border))]',
        header: 'border-b border-[hsl(var(--border))]',
        footer: 'border-t border-[hsl(var(--border))]',
      },
    },
    input: {
      defaultVariants: {
        color: 'neutral',
        variant: 'outline',
      },
    },
    textarea: {
      defaultVariants: {
        color: 'neutral',
        variant: 'outline',
      },
    },
    select: {
      defaultVariants: {
        color: 'neutral',
        variant: 'outline',
      },
    },
    selectMenu: {
      defaultVariants: {
        color: 'neutral',
      },
    },
  },
});
