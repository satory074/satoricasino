import { useCallback, useEffect, useReducer, useRef } from "react";
import { wsUrl } from "./api";
import type { GameState, WSMessage } from "../types/game";

const MAX_RECONNECT = 10;

export interface LogEntry {
  id: number;
  text: string;
  emoji: string;
}

interface SocketState {
  connected: boolean;
  state: GameState | null;
  log: LogEntry[];
  error: string | null;
  errorVersion: number;
}

type Action =
  | { type: "ws_open" }
  | { type: "ws_close" }
  | { type: "msg"; msg: WSMessage }
  | { type: "log"; emoji: string; text: string }
  | { type: "reset" };

let logCounter = 0;
const newLog = (emoji: string, text: string): LogEntry => ({
  id: ++logCounter,
  emoji,
  text,
});

function reducer(s: SocketState, a: Action): SocketState {
  switch (a.type) {
    case "ws_open":
      return { ...s, connected: true };
    case "ws_close":
      return { ...s, connected: false };
    case "log":
      return { ...s, log: [newLog(a.emoji, a.text), ...s.log].slice(0, 50) };
    case "reset":
      return { connected: false, state: null, log: [], error: null, errorVersion: 0 };
    case "msg": {
      const msg = a.msg;
      switch (msg.type) {
        case "game_state": {
          const { type: _t, ...rest } = msg;
          void _t;
          return { ...s, state: rest as GameState };
        }
        case "player_joined":
          return {
            ...s,
            log: [newLog("🟢", `${msg.display_name} joined`), ...s.log].slice(0, 50),
          };
        case "player_left":
          return {
            ...s,
            log: [newLog("⚪", `${msg.display_name} left`), ...s.log].slice(0, 50),
          };
        case "bet_placed":
          return {
            ...s,
            log: [newLog("💰", `bet ${msg.amount}`), ...s.log].slice(0, 50),
          };
        case "auto_stand":
          return {
            ...s,
            log: [newLog("⏱", `auto-stand (timeout)`), ...s.log].slice(0, 50),
          };
        case "error":
          return {
            ...s,
            error: msg.message,
            errorVersion: s.errorVersion + 1,
            log: [newLog("⚠️", msg.message), ...s.log].slice(0, 50),
          };
      }
      return s;
    }
  }
}

export function useGameSocket(tableId: string | null) {
  const [state, dispatch] = useReducer(reducer, {
    connected: false,
    state: null,
    log: [],
    error: null,
    errorVersion: 0,
  });
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef(0);
  const closedByUser = useRef(false);

  useEffect(() => {
    if (!tableId) return;
    closedByUser.current = false;
    reconnectRef.current = 0;
    dispatch({ type: "reset" });

    let cancelled = false;
    let timeoutId: number | null = null;

    const connect = () => {
      if (cancelled) return;
      const ws = new WebSocket(wsUrl(tableId));
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
  }, [tableId]);

  const send = useCallback((action: string, data: Record<string, unknown> = {}) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action, ...data }));
    }
  }, []);

  return {
    connected: state.connected,
    gameState: state.state,
    log: state.log,
    error: state.error,
    errorVersion: state.errorVersion,
    send,
  };
}
