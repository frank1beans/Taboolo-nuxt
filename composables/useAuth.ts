import { computed, onMounted } from "vue";
import type { ApiAuthResponse, ApiUser, ApiUserProfile } from "@/types/api";
import { api } from "@/lib/api-client";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/auth-storage";
import { toast } from "vue-sonner";

type LoginPayload = { email: string; password: string };
type RegisterPayload = { email: string; password: string; full_name?: string | null };

export const useAuth = () => {
  const user = useState<ApiUser | null>("auth-user", () => null);
  const profile = useState<ApiUserProfile | null>("auth-profile", () => null);
  const loading = useState<boolean>("auth-loading", () => true);
  const initPromise = useState<Promise<void> | null>("auth-init", () => null);

  const bootstrap = async () => {
    if (!process.client) {
      loading.value = false;
      return;
    }

    const token = getAccessToken();
    if (!token) {
      loading.value = false;
      return;
    }

    try {
      user.value = await api.getCurrentUser();
      profile.value = await api.getProfile();
    } catch (error) {
      clearAccessToken();
      user.value = null;
      profile.value = null;
      console.warn("Auth bootstrap failed", error);
    } finally {
      loading.value = false;
    }
  };

  const ensureAuthLoaded = async () => {
    if (!loading.value) return;
    if (!initPromise.value) {
      initPromise.value = bootstrap();
    }
    await initPromise.value;
  };

  onMounted(() => {
    if (!initPromise.value) {
      initPromise.value = bootstrap();
    }
  });

  const login = async (payload: LoginPayload): Promise<ApiAuthResponse> => {
    loading.value = true;
    try {
      const response = await api.login(payload);
      setAccessToken(response.access_token);
      user.value = response.user;
      try {
        profile.value = await api.getProfile();
      } catch {
        profile.value = null;
      }
      toast.success("Signed in");
      return response;
    } finally {
      loading.value = false;
    }
  };

  const registerUser = async (payload: RegisterPayload) => {
    const created = await api.register(payload);
    toast.success("User created");
    return created;
  };

  const logout = () => {
    try {
      void api.logout();
    } catch (error) {
      console.warn("Logout best effort", error);
    }
    clearAccessToken();
    user.value = null;
    profile.value = null;
  };

  const refreshProfile = async () => {
    if (!user.value) return;
    profile.value = await api.getProfile();
  };

  return {
    user,
    profile,
    loading: computed(() => loading.value),
    isAuthenticated: computed(() => !!user.value),
    login,
    registerUser,
    logout,
    refreshProfile,
    ensureAuthLoaded,
  };
};
