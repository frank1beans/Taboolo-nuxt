export default defineNuxtRouteMiddleware(async (to) => {
  const { user, ensureAuthLoaded, loading } = useAuth();

  // Allow unauthenticated access to login/registration pages
  if (["/login", "/register"].includes(to.path)) {
    return;
  }

  if (process.server) {
    return;
  }

  await ensureAuthLoaded();

  if (!user.value && !loading.value) {
    const redirect = to.fullPath !== "/" ? to.fullPath : undefined;
    return navigateTo({ path: "/login", query: redirect ? { redirect } : undefined });
  }
});
