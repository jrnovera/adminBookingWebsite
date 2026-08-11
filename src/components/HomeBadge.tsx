import type { ServiceLocation } from "@/lib/types";

/**
 * Marks a booking the team has to travel to. Renders nothing for salon
 * bookings — those are the default, so a badge on every row would be noise.
 */
export default function HomeBadge({
  location,
  className = "",
}: {
  location: ServiceLocation | null | undefined;
  className?: string;
}) {
  if (location !== "home") return null;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-semibold text-primary-dark ${className}`}
      title="Home service — our team travels to the client"
    >
      🚗 Home
    </span>
  );
}
