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
        className={`group inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all duration-200 ${
          styles[status]
        } hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed ${
          !disabled && "cursor-pointer hover:brightness-95"
        }`}
        title="Click to change status"
      >
        {labels[status]}
        {onStatusChange && (
          <IconChevronDown
            size={12}
            className={`transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {open && onStatusChange && (
        <div className="absolute right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
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
                className={`flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                  s === status
                    ? "bg-foreground/10 text-foreground"
                    : "text-foreground hover:bg-background"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
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
