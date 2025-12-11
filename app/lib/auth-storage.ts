const TOKEN_KEY = "measure-maker-token";
const canUseStorage = typeof window !== "undefined";

export function getAccessToken(): string | null {
  if (!canUseStorage) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string) {
  if (!canUseStorage) return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken() {
  if (!canUseStorage) return;
  localStorage.removeItem(TOKEN_KEY);
}
