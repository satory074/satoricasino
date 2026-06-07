import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { wsUrl } from "./api";
import type { GameState, WSMessage } from "../types/game";

const MAX_RECONNECT = 10;

export interface LogEntry {
  id: number;
  emoji: string;
  /** i18n key under `log.*` or `errors.*`. Renderers resolve via t(textKey, textParams). */
  textKey: string;
  textParams?: Record<string, string | number>;
}

export interface SocketError {
  code: string;
  params: Record<string, string | number>;
}

export interface Notification {
  id: number;
  kind: "achievement_unlocked" | "level_up" | "reaction";
  data: Record<string, unknown>;
}

let notifCounter = 0;

interface SocketState {
  connected: boolean;
  state: GameState | null;
  log: LogEntry[];
  error: SocketError | null;
  errorVersion: number;
  notifications: Notification[];
  /** True once all reconnect attempts are spent — the connection is dead. */
  reconnectExhausted: boolean;
}

type Action =
  | { type: "ws_open" }
  | { type: "ws_close" }
  | { type: "ws_exhausted" }
  | { type: "msg"; msg: WSMessage }
  | { type: "reset" }
  | { type: "dismiss_notification"; id: number };

let logCounter = 0;
const pushLog = (
  s: SocketState,
  emoji: string,
  textKey: string,
  textParams?: Record<string, string | number>,
): SocketState => ({
  ...s,
  log: [{ id: ++logCounter, emoji, textKey, textParams }, ...s.log].slice(0, 50),
});

function extractErrorParams(msg: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(msg)) {
    if (k === "type" || k === "code") continue;
    if (typeof v === "string" || typeof v === "number") out[k] = v;
  }
  return out;
}

function reducer(s: SocketState, a: Action): SocketState {
  switch (a.type) {
    case "ws_open":
      return { ...s, connected: true, reconnectExhausted: false };
    case "ws_close":
      return { ...s, connected: false };
    case "ws_exhausted":
      return { ...s, connected: false, reconnectExhausted: true };
    case "reset":
      return { connected: false, state: null, log: [], error: null, errorVersion: 0, notifications: [], reconnectExhausted: false };
    case "dismiss_notification":
      return { ...s, notifications: s.notifications.filter((n) => n.id !== a.id) };
    case "msg": {
      const msg = a.msg;
      switch (msg.type) {
        case "game_state": {
          const { type: _t, ...rest } = msg;
          void _t;
          return { ...s, state: rest as GameState };
        }
        case "player_joined":
          return pushLog(s, "🟢", "log.player_joined", { name: msg.display_name });
        case "player_left":
          return pushLog(s, "⚪", "log.player_left", { name: msg.display_name });
        case "bet_placed":
          return pushLog(s, "💰", "log.bet_placed", { n: msg.amount });
        case "auto_stand":
          return pushLog(s, "⏱", "log.auto_stand");
        case "error": {
          const code = (msg as { code?: string }).code ?? "common.failed";
          const params = extractErrorParams(msg as unknown as Record<string, unknown>);
          const next = pushLog(s, "⚠️", `errors.${code}`, params);
          return {
            ...next,
            error: { code, params },
            errorVersion: s.errorVersion + 1,
          };
        }
        case "achievement_unlocked": {
          const next = pushLog(s, "🏆", "log.achievement_unlocked");
          return {
            ...next,
            notifications: [
              ...s.notifications,
              {
                id: ++notifCounter,
                kind: "achievement_unlocked",
                data: { achievement_id: msg.achievement_id },
              },
            ],
          };
        }
        case "level_up": {
          const next = pushLog(s, "⬆️", "log.level_up", { n: msg.level });
          return {
            ...next,
            notifications: [
              ...s.notifications,
              {
                id: ++notifCounter,
                kind: "level_up",
                data: { level: msg.level, xp: msg.xp },
              },
            ],
          };
        }
        case "reaction":
          return {
            ...s,
            notifications: [
              ...s.notifications,
              {
                id: ++notifCounter,
                kind: "reaction",
                data: { player_id: msg.player_id, display_name: msg.display_name, emoji: msg.emoji },
              },
            ],
          };
      }
      return s;
    }
  }
}

export function useGameSocket(tableId: string | null, spectate = false) {
  const [state, dispatch] = useReducer(reducer, {
    connected: false,
    state: null,
    log: [],
    error: null,
    errorVersion: 0,
    notifications: [],
    reconnectExhausted: false,
  });
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef(0);
  const closedByUser = useRef(false);
  // Bumping this re-runs the connect effect for a manual reconnect.
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    if (!tableId) return;
    closedByUser.current = false;
    reconnectRef.current = 0;
    dispatch({ type: "reset" });

    let cancelled = false;
    let timeoutId: number | null = null;

    const connect = () => {
      if (cancelled) return;
      const ws = new WebSocket(wsUrl(tableId, spectate));
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectRef.current = 0;
        dispatch({ type: "ws_open" });
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data) as WSMessage;
          dispatch({ type: "msg", msg });
        } catch {
          /* ignore */
        }
      };

      ws.onclose = () => {
        dispatch({ type: "ws_close" });
        if (closedByUser.current || cancelled) return;
        if (reconnectRef.current < MAX_RECONNECT) {
          const delay = Math.min(1000 * Math.pow(2, reconnectRef.current), 30000);
          reconnectRef.current += 1;
          timeoutId = window.setTimeout(connect, delay);
        } else {
          // Out of retries — surface a blocking "connection lost" state so the
          // player isn't left staring at a frozen, silently-dead table.
          dispatch({ type: "ws_exhausted" });
        }
      };

      ws.onerror = () => {
        // Let onclose handle reconnection
      };
    };

    connect();

    return () => {
      cancelled = true;
      closedByUser.current = true;
      if (timeoutId != null) clearTimeout(timeoutId);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [tableId, spectate, retryNonce]);

  const reconnect = useCallback(() => {
    setRetryNonce((n) => n + 1);
  }, []);

  const send = useCallback((action: string, data: Record<string, unknown> = {}) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action, ...data }));
    }
  }, []);

  const dismissNotification = useCallback((id: number) => {
    dispatch({ type: "dismiss_notification", id });
  }, []);

  return {
    connected: state.connected,
    gameState: state.state,
    log: state.log,
    error: state.error,
    errorVersion: state.errorVersion,
    reconnectExhausted: state.reconnectExhausted,
    notifications: state.notifications,
    dismissNotification,
    reconnect,
    send,
  };
}
