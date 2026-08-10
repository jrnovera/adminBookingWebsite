"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { IconAlert, IconCheck, IconClose, IconInfo } from "./Icons";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: number;
  tone: ToastTone;
  title: string;
  detail?: string;
  leaving?: boolean;
};

type ToastApi = {
  success: (title: string, detail?: string) => void;
  error: (title: string, detail?: string) => void;
  info: (title: string, detail?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/** Errors linger; confirmations get out of the way on their own. */
const LIFETIME: Record<ToastTone, number> = {
  success: 3200,
  info: 3600,
  error: 5200,
};

const EXIT_MS = 200;

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const dismiss = useCallback((id: number) => {
    // Mark first so the exit animation can play, then unmount.
    setToasts((current) =>
      current.map((toast) =>
        toast.id === id ? { ...toast, leaving: true } : toast
      )
    );
    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, EXIT_MS);
    timers.current.push(timer);
  }, []);

  const push = useCallback(
    (tone: ToastTone, title: string, detail?: string) => {
      const id = nextId.current++;
      // Cap the stack so a burst of updates can't cover the screen.
      setToasts((current) => [...current.slice(-2), { id, tone, title, detail }]);
      const timer = window.setTimeout(() => dismiss(id), LIFETIME[tone]);
      timers.current.push(timer);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, detail) => push("success", title, detail),
      error: (title, detail) => push("error", title, detail),
      info: (title, detail) => push("info", title, detail),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const toneStyles: Record<
  ToastTone,
  { icon: React.ReactNode; ring: string; chip: string }
> = {
  success: {
    icon: <IconCheck size={15} />,
    ring: "ring-emerald-500/20",
    chip: "bg-emerald-500 text-white",
  },
  error: {
    icon: <IconAlert size={15} />,
    ring: "ring-rose-500/20",
    chip: "bg-rose-500 text-white",
  },
  info: {
    icon: <IconInfo size={15} />,
    ring: "ring-sky-500/20",
    chip: "bg-sky-500 text-white",
  },
};

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
    >
      {toasts.map((toast) => {
        const tone = toneStyles[toast.tone];
        return (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex w-full items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 pr-2.5 shadow-[var(--shadow-xl)] ring-4 sm:w-auto sm:min-w-[19rem] sm:max-w-sm ${
              tone.ring
            } ${toast.leaving ? "animate-toast-out" : "animate-toast-in"}`}
          >
            <span
              className={`mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full ${tone.chip}`}
            >
              {tone.icon}
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-semibold leading-snug">{toast.title}</p>
              {toast.detail && (
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  {toast.detail}
                </p>
              )}
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-background hover:text-foreground"
            >
              <IconClose size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
