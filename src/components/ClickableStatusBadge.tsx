"use client";

import { useState, useRef, useEffect } from "react";
import type { BookingStatus } from "@/lib/types";
import { IconChevronDown } from "./Icons";

const styles: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  completed: "bg-primary-100 text-primary-dark",
  cancelled: "bg-rose-100 text-rose-700",
  no_show: "bg-foreground/10 text-muted",
};

// Ring color shown while the menu is open — matches the badge's own hue
// instead of a generic focus ring, so "this control is active" reads at a
// glance.
const ringStyles: Record<BookingStatus, string> = {
  pending: "ring-amber-400/50",
  confirmed: "ring-emerald-400/50",
  completed: "ring-primary/40",
  cancelled: "ring-rose-400/50",
  no_show: "ring-foreground/20",
};

const labels: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Accepted",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

interface ClickableStatusBadgeProps {
  status: BookingStatus;
  onStatusChange?: (status: BookingStatus) => Promise<void>;
  disabled?: boolean;
  isChanging?: boolean;
}

export default function ClickableStatusBadge({
  status,
  onStatusChange,
  disabled = false,
  isChanging = false,
}: ClickableStatusBadgeProps) {
  const [open, setOpen] = useState(false);
  // Flips true for a moment right after a successful change, driving a
  // one-shot flash so the badge visibly confirms the update landed.
  const [justChanged, setJustChanged] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Re-triggers the flash whenever the confirmed status actually changes
  // (not on every re-render).
  useEffect(() => {
    setJustChanged(true);
    const timer = setTimeout(() => setJustChanged(false), 700);
    return () => clearTimeout(timer);
  }, [status]);

  async function handleStatusChange(newStatus: BookingStatus) {
    if (newStatus === status || !onStatusChange || disabled || isChanging) return;

    try {
      await onStatusChange(newStatus);
      setOpen(false);
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        disabled={disabled || isChanging}
        className={`group inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold sm:text-sm transition-all duration-200 ${
          styles[status]
        } ${open ? `ring-2 ring-offset-2 ring-offset-surface ${ringStyles[status]} shadow-md` : ""} ${
          justChanged ? "scale-110" : "scale-100"
        } hover:shadow-lg hover:shadow-black/15 hover:-translate-y-0.5 hover:brightness-95 active:scale-95 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none ${
          !disabled && "cursor-pointer"
        }`}
        title="Click to change status"
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full bg-current transition-transform duration-500 ${
            justChanged ? "scale-150" : "scale-100"
          } ${isChanging ? "animate-pulse" : ""}`}
        />
        {labels[status]}
        {onStatusChange && (
          <IconChevronDown
            size={13}
            className={`shrink-0 transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {open && onStatusChange && (
        <div className="animate-fade-in absolute right-0 top-full z-50 mt-1.5 min-w-[9.5rem] overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          {(["pending", "confirmed", "completed", "cancelled"] as const).map(
            (s) => (
              <button
                key={s}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleStatusChange(s);
                }}
                disabled={s === status || isChanging}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  s === status
                    ? "bg-foreground/10 text-foreground"
                    : "text-foreground hover:bg-background active:bg-background/70"
                } disabled:cursor-not-allowed`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full transition-colors ${
                    s === status ? "bg-emerald-400" : "bg-foreground/20"
                  }`}
                />
                {labels[s]}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
