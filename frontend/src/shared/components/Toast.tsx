import { useEffect, useState } from "react";
import { useTranslation } from "../i18n/useTranslation";

export interface ToastItem {
  id: number;
  /** Full i18n key, e.g. "errors.bet.minimum" or "common.failed". */
  textKey: string;
  params?: Record<string, string | number>;
}

type Listener = (t: ToastItem) => void;

const listeners = new Set<Listener>();
let nextId = 1;

/**
 * Show a transient toast. Pass an i18n key (rendered with t()) so language
 * switching stays reactive and we never leak raw English/error.message text.
 */
export function toast(textKey: string, params?: Record<string, string | number>) {
  const item: ToastItem = { id: nextId++, textKey, params };
  listeners.forEach((l) => l(item));
}

const TOAST_TTL_MS = 3500;

/** Mount once near the app root. Renders queued toasts bottom-center. */
export function ToastHost() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: Listener = (item) => {
      setItems((prev) => [...prev, item]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      }, TOAST_TTL_MS);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="toast-host" role="region" aria-label="notifications">
      {items.map((item) => (
        <div key={item.id} className="toast toast-error" role="status" aria-live="polite">
          {t(item.textKey, item.params)}
        </div>
      ))}
    </div>
  );
}
