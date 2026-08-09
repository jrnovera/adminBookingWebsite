"use client";

import { useMemo, useState } from "react";
import { formatMinutes, parseTimeToMinutes, toDateKey } from "@/lib/format";
import type { Booking, StaffBlock } from "@/lib/types";

const SLOT_MINUTES = 15;
// Dragging snaps to the hour so appointments land on clean start times.
const SNAP_MINUTES = 60;
const SLOT_HEIGHT = 22;

const palette = [
  "border-sky-400 bg-sky-100 text-sky-950",
  "border-orange-400 bg-orange-100 text-orange-950",
  "border-pink-400 bg-pink-100 text-pink-950",
  "border-teal-400 bg-teal-100 text-teal-950",
  "border-violet-400 bg-violet-100 text-violet-950",
  "border-lime-400 bg-lime-100 text-lime-950",
];

function serviceColor(serviceId: string) {
  let hash = 0;
  for (let index = 0; index < serviceId.length; index += 1) {
    hash = (hash * 31 + serviceId.charCodeAt(index)) >>> 0;
  }
  return palette[hash % palette.length];
}


export default function WeekTimeGrid({
  days,
  bookings,
  blocks,
  dayStart,
  dayEnd,
  daysOff,
  onMove,
  onSelect,
  onCreate,
  onSelectBlock,
}: {
  days: Date[];
  bookings: Booking[];
  blocks: StaffBlock[];
  dayStart: number;
  dayEnd: number;
  daysOff: number[];
  onMove: (booking: Booking, dateKey: string, startMinutes: number) => void;
  onSelect: (booking: Booking) => void;
  onCreate: (dateKey: string, startMinutes: number) => void;
  onSelectBlock: (block: StaffBlock) => void;
}) {
  const [dragging, setDragging] = useState<Booking | null>(null);
  const [hint, setHint] = useState<{ dateKey: string; minutes: number } | null>(
    null
  );

  const rows = Math.max(1, Math.ceil((dayEnd - dayStart) / SLOT_MINUTES));
  const gridHeight = rows * SLOT_HEIGHT;
  const todayKey = toDateKey(new Date());

  const hourMarks = useMemo(() => {
    const marks: number[] = [];
    const firstHour = Math.ceil(dayStart / 60) * 60;
    for (let minutes = firstHour; minutes <= dayEnd; minutes += 60) {
      marks.push(minutes);
    }
    return marks;
  }, [dayStart, dayEnd]);

  const byDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const booking of bookings) {
      const list = map.get(booking.booking_date) ?? [];
      list.push(booking);
      map.set(booking.booking_date, list);
    }
    return map;
  }, [bookings]);

  const blocksByDay = useMemo(() => {
    const map = new Map<string, StaffBlock[]>();
    for (const block of blocks) {
      const list = map.get(block.block_date) ?? [];
      list.push(block);
      map.set(block.block_date, list);
    }
    return map;
  }, [blocks]);

  function minutesFromPointer(clientY: number, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const raw = dayStart + ((clientY - rect.top) / SLOT_HEIGHT) * SLOT_MINUTES;
    const snapped = Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES;
    return Math.min(Math.max(snapped, dayStart), dayEnd - SNAP_MINUTES);
  }

  return (
    <div className="card overflow-x-auto">
      <div className="min-w-max">
        {/* Day headers: Monday → Sunday */}
        <div className="flex border-b border-line">
          <div className="w-20 shrink-0" />
          {days.map((day) => {
            const key = toDateKey(day);
            const isToday = key === todayKey;
            const off = daysOff.includes(day.getDay());
            return (
              <div
                key={key}
                className="w-40 shrink-0 border-l border-line px-3 py-3 text-center"
              >
                <p className="text-xs uppercase tracking-wide text-muted">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </p>
                <p
                  className={`mx-auto mt-1 grid h-8 w-8 place-items-center rounded-full text-sm font-semibold ${
                    isToday ? "bg-foreground text-white" : ""
                  }`}
                >
                  {day.getDate()}
                </p>
                {off && (
                  <p className="mt-0.5 text-[10px] uppercase text-muted">
                    Day off
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Time axis + day columns */}
        <div className="flex">
          <div
            className="relative w-20 shrink-0 border-r border-line"
            style={{ height: gridHeight }}
          >
            {hourMarks.map((minutes) => (
              <span
                key={minutes}
                className="absolute right-3 -translate-y-1/2 text-[11px] font-medium text-muted"
                style={{
                  top: ((minutes - dayStart) / SLOT_MINUTES) * SLOT_HEIGHT,
                }}
              >
                {formatMinutes(minutes)}
              </span>
            ))}
          </div>

          {days.map((day) => {
            const key = toDateKey(day);
            const dayBookings = byDay.get(key) ?? [];
            const dayBlocks = blocksByDay.get(key) ?? [];
            const off = daysOff.includes(day.getDay());

            return (
              <div
                key={key}
                onDragOver={(event) => {
                  event.preventDefault();
                  setHint({
                    dateKey: key,
                    minutes: minutesFromPointer(
                      event.clientY,
                      event.currentTarget
                    ),
                  });
                }}
                onDragLeave={() => setHint(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  const minutes = minutesFromPointer(
                    event.clientY,
                    event.currentTarget
                  );
                  setHint(null);
                  if (dragging) onMove(dragging, key, minutes);
                  setDragging(null);
                }}
                onDoubleClick={(event) =>
                  onCreate(
                    key,
                    minutesFromPointer(event.clientY, event.currentTarget)
                  )
                }
                title="Double-click an empty slot to add a booking"
                className={`relative w-40 shrink-0 border-l border-line transition-colors ${
                  off
                    ? "bg-foreground/[0.04]"
                    : key === todayKey
                    ? "bg-primary-50/40"
                    : ""
                }`}
                style={{ height: gridHeight }}
              >
                {hourMarks.map((minutes) => (
                  <div
                    key={minutes}
                    className="pointer-events-none absolute inset-x-0 border-t border-line"
                    style={{
                      top: ((minutes - dayStart) / SLOT_MINUTES) * SLOT_HEIGHT,
                    }}
                  />
                ))}

                {hint?.dateKey === key && (
                  <div
                    className="pointer-events-none absolute inset-x-1 z-10 rounded-lg border-2 border-dashed border-foreground/40 bg-foreground/5"
                    style={{
                      top:
                        ((hint.minutes - dayStart) / SLOT_MINUTES) *
                        SLOT_HEIGHT,
                      height:
                        ((dragging?.duration_minutes ?? 30) / SLOT_MINUTES) *
                        SLOT_HEIGHT,
                    }}
                  >
                    <span className="px-2 text-[11px] font-semibold">
                      {formatMinutes(hint.minutes)}
                    </span>
                  </div>
                )}

                {dayBlocks.map((block) => {
                  const top =
                    ((block.start_minutes - dayStart) / SLOT_MINUTES) *
                    SLOT_HEIGHT;
                  const height =
                    ((block.end_minutes - block.start_minutes) /
                      SLOT_MINUTES) *
                    SLOT_HEIGHT;
                  return (
                    <button
                      key={block.id}
                      onClick={() => onSelectBlock(block)}
                      title={
                        block.reason
                          ? `Blocked: ${block.reason}`
                          : "Blocked — click to remove"
                      }
                      className="absolute inset-x-1 z-[5] overflow-hidden rounded-lg border border-dashed border-foreground/30 bg-[repeating-linear-gradient(135deg,rgba(0,0,0,0.06)_0px,rgba(0,0,0,0.06)_6px,transparent_6px,transparent_12px)] px-2 py-1 text-left leading-tight text-foreground/60"
                      style={{ top, height: Math.max(height, SLOT_HEIGHT) }}
                    >
                      <p className="truncate text-[11px] font-semibold">
                        Blocked
                      </p>
                      {block.reason && (
                        <p className="truncate text-[10px] opacity-80">
                          {block.reason}
                        </p>
                      )}
                    </button>
                  );
                })}

                {dayBookings.map((booking) => {
                  const start = parseTimeToMinutes(booking.booking_time);
                  if (start === null) return null;
                  const top = ((start - dayStart) / SLOT_MINUTES) * SLOT_HEIGHT;
                  const height =
                    (booking.duration_minutes / SLOT_MINUTES) * SLOT_HEIGHT;

                  return (
                    <button
                      key={booking.id}
                      draggable
                      onDragStart={() => setDragging(booking)}
                      onDragEnd={() => {
                        setDragging(null);
                        setHint(null);
                      }}
                      onClick={() => onSelect(booking)}
                      title={`${booking.full_name} — ${booking.service_name}`}
                      className={`absolute inset-x-1 cursor-grab overflow-hidden rounded-lg border-l-4 px-2 py-1 text-left leading-tight shadow-sm transition hover:-translate-y-px hover:shadow-md active:cursor-grabbing ${serviceColor(
                        booking.service_id
                      )} ${
                        booking.status === "cancelled"
                          ? "opacity-50 line-through"
                          : booking.status === "pending"
                          ? "ring-2 ring-amber-400 ring-inset"
                          : ""
                      } ${dragging?.id === booking.id ? "opacity-40" : ""}`}
                      style={{ top, height: Math.max(height, SLOT_HEIGHT) }}
                    >
                      <p className="flex items-center gap-1 text-[10px] opacity-80">
                        {formatMinutes(start)}
                        {booking.status === "pending" && (
                          <span
                            title="Awaiting confirmation"
                            className="rounded-full bg-amber-400 px-1 text-[9px] font-bold text-amber-950"
                          >
                            NEW
                          </span>
                        )}
                        {booking.is_paid && <span title="Paid">💰</span>}
                      </p>
                      <p className="truncate text-[12px] font-semibold">
                        {booking.full_name}
                      </p>
                      <p className="truncate text-[11px] opacity-80">
                        {booking.service_name}
                      </p>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
