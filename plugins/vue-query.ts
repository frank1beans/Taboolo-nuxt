import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";

export default defineNuxtPlugin((nuxtApp) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        staleTime: 1000 * 30,
      },
    },
  });

  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient });
  nuxtApp.provide("queryClient", queryClient);
});
