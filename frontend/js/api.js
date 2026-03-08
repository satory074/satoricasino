const BACKEND_URL = "https://satoricasino-874739310695.asia-northeast1.run.app";
const API_BASE = window.location.hostname === "localhost" ? window.location.origin : BACKEND_URL;

function getToken() {
  return localStorage.getItem("token");
}

function setAuth(data) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("user_id", data.user_id);
  localStorage.setItem("display_name", data.display_name);
}

function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user_id");
  localStorage.removeItem("display_name");
}

function getUserId() {
  return localStorage.getItem("user_id");
}

function getDisplayName() {
  return localStorage.getItem("display_name");
}

async function apiPost(path, body) {
  const token = getToken();
  const url = token ? `${API_BASE}${path}?token=${token}` : `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

async function apiGet(path) {
  const token = getToken();
  const url = `${API_BASE}${path}?token=${token}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

function wsUrl(tableId) {
  const token = getToken();
  if (window.location.hostname === "localhost") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/ws/table/${tableId}?token=${token}`;
  }
  return `wss://satoricasino-874739310695.asia-northeast1.run.app/ws/table/${tableId}?token=${token}`;
}
