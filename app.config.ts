export default defineAppConfig({
  ui: {
    strategy: "override",

    // Palette — restrained green primary with neutral slate grays.
    primary: "emerald",
    gray: "slate",
    colors: {
      primary: "emerald",
      secondary: "emerald",
      success: "emerald",
      info: "slate",
      warning: "amber",
      error: "rose",
      neutral: "slate",
    },

    // Surface and typography tuning for documentation-grade readability.
    card: {
      slots: {
        root: "rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/80 shadow-[0_12px_38px_rgba(15,23,42,0.06)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur",
        header: "px-6 pt-6 pb-2 sm:px-8 sm:pt-8",
        body: "px-6 pb-6 sm:px-8 sm:pb-8",
        footer: "px-6 pt-0 pb-6 sm:px-8 sm:pb-8",
      },
      defaultVariants: {
        variant: "subtle",
      },
    },

    pageHeader: {
      slots: {
        root: "relative pb-8 pt-6 sm:pt-10 sm:pb-10",
        container: "flex flex-col gap-4 sm:gap-5 border-b border-default/70",
        wrapper: "flex flex-col gap-3",
        headline: "text-sm font-medium text-primary tracking-[0.02em] flex items-center gap-1.5",
        title: "text-3xl sm:text-4xl font-semibold leading-tight tracking-[-0.02em] text-highlighted",
        description: "text-lg sm:text-xl leading-relaxed tracking-[0.005em] text-muted",
        links: "flex flex-wrap items-center gap-2",
      },
    },

    pageSection: {
      slots: {
        root: "relative isolate",
        container: "flex flex-col gap-8 sm:gap-10 py-10 sm:py-12",
        wrapper: "",
        header: "flex flex-col gap-3",
        leading: "flex items-center gap-2 text-primary font-medium tracking-[0.01em]",
        leadingIcon: "size-9 text-primary",
        headline: "text-sm uppercase font-semibold tracking-[0.12em] text-primary/80",
        title: "text-2xl sm:text-3xl font-semibold leading-tight tracking-[-0.015em] text-highlighted",
        description: "text-base sm:text-lg leading-relaxed tracking-[0.005em] text-muted",
        body: "mt-4 space-y-6 text-base leading-[1.7] tracking-[0.005em] text-default",
        features: "grid gap-5 sm:gap-6 sm:grid-cols-2",
        footer: "mt-4",
        links: "flex flex-wrap gap-3",
      },
    },

    pageBody: {
      base: "mt-6 pb-16 space-y-10 text-base leading-[1.7] tracking-[0.005em] text-default",
    },

    table: {
      slots: {
        root: "overflow-hidden rounded-xl border border-default/70 bg-white/95 dark:bg-slate-900/80 shadow-[0_6px_28px_rgba(15,23,42,0.06)] dark:shadow-[0_18px_48px_rgba(0,0,0,0.45)] backdrop-blur",
        header: "bg-default/70 dark:bg-slate-900/60",
        thead: "text-xs font-semibold uppercase tracking-[0.08em] text-muted",
        tbody: "divide-y divide-default/70",
      },
    },
  },
});
