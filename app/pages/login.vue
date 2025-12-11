<template>
  <div class="w-full max-w-md space-y-6">
    <div class="space-y-2 text-center">
      <p class="text-xs uppercase tracking-[0.24em] text-muted-foreground">Taboolo</p>
      <h1 class="text-2xl font-semibold">Sign in</h1>
      <p class="text-sm text-muted-foreground">Use your company credentials to access the Nuxt version.</p>
    </div>
    <div class="rounded-2xl bg-card p-6 shadow-md shadow-primary/10">
      <form class="space-y-4" @submit.prevent="onSubmit">
        <div class="space-y-2">
          <label class="text-sm font-medium" for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-1 ring-transparent transition focus:border-ring focus:ring-ring/30"
            required
          >
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium" for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-1 ring-transparent transition focus:border-ring focus:ring-ring/30"
            required
          >
        </div>
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        <button
          type="submit"
          class="flex w-full items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          :disabled="submitting"
        >
          {{ submitting ? "Signing in..." : "Sign in" }}
        </button>
        <p class="text-center text-sm text-muted-foreground">
          Don't have an account?
          <NuxtLink class="font-semibold text-primary" to="/register">Create one</NuxtLink>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "auth",
});

const route = useRoute();
const router = useRouter();
const { login } = useAuth();

const email = ref("");
const password = ref("");
const error = ref("");
const submitting = ref(false);

const onSubmit = async () => {
  error.value = "";
  submitting.value = true;
  try {
    await login({ email: email.value, password: password.value });
    const redirect = (route.query.redirect as string | undefined) ?? "/";
    await router.push(redirect);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Authentication error";
  } finally {
    submitting.value = false;
  }
};
</script>
