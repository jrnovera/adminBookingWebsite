"use client";

import { useEffect } from "react";
import { IconClose } from "./Icons";

export default function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Escape closes; the page behind stays put while the dialog is up.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        onClick={onClose}
        aria-label="Close dialog"
        className="animate-fade-in absolute inset-0 h-full w-full cursor-default bg-black/40 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-pop-in relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-surface shadow-[var(--shadow-xl)] sm:max-h-[90vh] sm:max-w-md sm:rounded-2xl"
      >
        {/* Grab handle reads as a sheet on touch devices. */}
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" />

        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-4 sm:px-6 sm:pt-5">
          <h2 className="min-w-0 truncate text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-background hover:text-foreground"
          >
            <IconClose size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-6 sm:px-6 sm:pb-6">{children}</div>
      </div>
    </div>
  );
}
