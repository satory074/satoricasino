import type { AuthData } from "../types/game";

const PROD_BACKEND = "https://satoricasino-874739310695.asia-northeast1.run.app";
const isLocal =
  typeof window !== "undefined" && window.location.hostname === "localhost";
const API_BASE = isLocal ? "" : PROD_BACKEND;

const TOKEN_KEY = "token";
const USER_ID_KEY = "user_id";
const DISPLAY_NAME_KEY = "display_name";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY);
}

export function getDisplayName(): string | null {
  return localStorage.getItem(DISPLAY_NAME_KEY);
}

export function setAuth(data: AuthData): void {
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_ID_KEY, data.user_id);
  localStorage.setItem(DISPLAY_NAME_KEY, data.display_name);
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(DISPLAY_NAME_KEY);
}

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = getToken();
  const url = token
    ? `${API_BASE}${path}?token=${encodeURIComponent(token)}`
    : `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return unwrap<T>(res);
}

export async function apiGet<T>(path: string): Promise<T> {
  const token = getToken();
  const url = `${API_BASE}${path}?token=${encodeURIComponent(token ?? "")}`;
  const res = await fetch(url);
  return unwrap<T>(res);
}

export function wsUrl(tableId: string): string {
  const token = getToken();
  if (isLocal) {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/ws/table/${tableId}?token=${encodeURIComponent(
      token ?? "",
    )}`;
  }
  return `wss://satoricasino-874739310695.asia-northeast1.run.app/ws/table/${tableId}?token=${encodeURIComponent(
    token ?? "",
  )}`;
}
