"use client";

import { useEffect, useMemo, useState } from "react";
import Avatar from "./Avatar";
import { formatMinutes, parseTimeToMinutes, toDateKey } from "@/lib/format";
import { isStaffOffOn } from "@/lib/staff";
import type { Booking, Staff, StaffBlock, StaffTimeOff } from "@/lib/types";

const SLOT_MINUTES = 15;
const SNAP_MINUTES = 15;
const SLOT_HEIGHT = 24;
const AXIS_WIDTH = 64;

/**
 * Fresha-style pastel fills — a solid tint per service rather than a bar with
 * a coloured edge, so a dense day still reads at a glance.
 */
const palette = [
  "bg-sky-100 text-sky-950 ring-sky-200",
  "bg-orange-100 text-orange-950 ring-orange-200",
  "bg-pink-100 text-pink-950 ring-pink-200",
  "bg-teal-100 text-teal-950 ring-teal-200",
  "bg-violet-100 text-violet-950 ring-violet-200",
  "bg-amber-100 text-amber-950 ring-amber-200",
];

function serviceColor(serviceId: string) {
  let hash = 0;
  for (let index = 0; index < serviceId.length; index += 1) {
    hash = (hash * 31 + serviceId.charCodeAt(index)) >>> 0;
  }
  return palette[hash % palette.length];
}

export default function StaffDayGrid({
  date,
  staff,
  bookings,
  blocks,
  timeOff,
  dayStart,
  dayEnd,
  onMove,
  onSelect,
  onCreate,
  onSelectBlock,
}: {
  date: Date;
  staff: Staff[];
  bookings: Booking[];
  blocks: StaffBlock[];
  timeOff: StaffTimeOff[];
  dayStart: number;
  dayEnd: number;
  onMove: (
    booking: Booking,
    dateKey: string,
    startMinutes: number,
    staffId: string,
    staffName: string
  ) => void;
  onSelect: (booking: Booking) => void;
  onCreate: (dateKey: string, startMinutes: number, staffId: string) => void;
  onSelectBlock: (block: StaffBlock) => void;
}) {
  const [dragging, setDragging] = useState<Booking | null>(null);
  const [hint, setHint] = useState<{
    staffId: string;
    minutes: number;
  } | null>(null);
  const [now, setNow] = useState(() => new Date());

  const dateKey = toDateKey(date);
  const rows = Math.max(1, Math.ceil((dayEnd - dayStart) / SLOT_MINUTES));
  const gridHeight = rows * SLOT_HEIGHT;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const hourMarks = useMemo(() => {
    const marks: number[] = [];
    const firstHour = Math.ceil(dayStart / 60) * 60;
    for (let minutes = firstHour; minutes <= dayEnd; minutes += 60) {
      marks.push(minutes);
    }
    return marks;
  }, [dayStart, dayEnd]);

  const byStaff = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const booking of bookings) {
      if (booking.booking_date !== dateKey) continue;
      const list = map.get(booking.staff_id) ?? [];
      list.push(booking);
      map.set(booking.staff_id, list);
    }
    return map;
  }, [bookings, dateKey]);

  const blocksByStaff = useMemo(() => {
    const map = new Map<string, StaffBlock[]>();
    for (const block of blocks) {
      if (block.block_date !== dateKey) continue;
      // Shop-wide breaks carry no staff id — show them in every column.
      const key = block.staff_id || "__all";
      const list = map.get(key) ?? [];
      list.push(block);
      map.set(key, list);
    }
    return map;
  }, [blocks, dateKey]);

  const isToday = dateKey === toDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNowLine =
    isToday && nowMinutes >= dayStart && nowMinutes <= dayEnd;
  const nowTop = ((nowMinutes - dayStart) / SLOT_MINUTES) * SLOT_HEIGHT;

  function minutesFromPointer(clientY: number, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const raw = dayStart + ((clientY - rect.top) / SLOT_HEIGHT) * SLOT_MINUTES;
    const snapped = Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES;
    return Math.min(Math.max(snapped, dayStart), dayEnd - SNAP_MINUTES);
  }

  if (staff.length === 0) {
    return (
      <div className="card px-6 py-14 text-center text-sm text-muted">
        No active staff to show. Add team members on the Staff page.
      </div>
    );
  }

  // Few people: fill the available width. Many: fixed width and scroll.
  // Either way a column never shrinks below a legible size — on a phone
  // that means even 3-4 staff correctly falls back to horizontal scroll
  // instead of squeezing avatars and names into unreadable slivers.
  const wide = staff.length <= 5;
  const columnClass = wide
    ? "min-w-[7rem] flex-1"
    : "w-[11rem] shrink-0";

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <div className={wide ? "" : "min-w-max"}>
          {/* Staff header: avatar over name, like Fresha */}
          <div className="sticky top-0 z-20 flex border-b border-line bg-surface">
            <div
              className="shrink-0 border-r border-line"
              style={{ width: AXIS_WIDTH }}
              aria-hidden="true"
            />
            {staff.map((member) => {
              const off = isStaffOffOn(member, dateKey, timeOff);
              return (
                <div
                  key={member.id}
                  className={`${columnClass} flex flex-col items-center gap-1.5 border-l border-line px-2 py-3`}
                >
                  <Avatar name={member.name} src={member.avatar_url} size={38} />
                  <div className="min-w-0 text-center leading-tight">
                    <p className="truncate text-[13px] font-medium">
                      {member.name}
                    </p>
                    <p className="truncate text-[11px] text-muted">
                      {off ? "Day off" : member.role}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time axis + one column per staff member */}
          <div className="flex">
            <div
              className="relative shrink-0 border-r border-line bg-surface-2"
              style={{ width: AXIS_WIDTH, height: gridHeight }}
            >
              {hourMarks.map((minutes) => (
                <span
                  key={minutes}
                  className="absolute right-2 -translate-y-1/2 text-[11px] font-medium tabular-nums text-muted"
                  style={{
                    top: ((minutes - dayStart) / SLOT_MINUTES) * SLOT_HEIGHT,
                  }}
                >
                  {formatMinutes(minutes)}
                </span>
              ))}
            </div>

            {staff.map((member) => {
              const memberBookings = byStaff.get(member.id) ?? [];
              const memberBlocks = [
                ...(blocksByStaff.get(member.id) ?? []),
                ...(blocksByStaff.get("__all") ?? []),
              ];
              const off = isStaffOffOn(member, dateKey, timeOff);
              const workStart = parseTimeToMinutes(member.work_start);
              const workEnd = parseTimeToMinutes(member.work_end);

              return (
                <div
                  key={member.id}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setHint({
                      staffId: member.id,
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
                    if (dragging) {
                      onMove(dragging, dateKey, minutes, member.id, member.name);
                    }
                    setDragging(null);
                  }}
                  onDoubleClick={(event) =>
                    onCreate(
                      dateKey,
                      minutesFromPointer(event.clientY, event.currentTarget),
                      member.id
                    )
                  }
                  title="Double-click an empty slot to add a booking"
                  className={`relative border-l border-line ${columnClass} ${
                    off ? "bg-foreground/[0.035]" : ""
                  }`}
                  style={{ height: gridHeight }}
                >
                  {/* Hour lines */}
                  {hourMarks.map((minutes) => (
                    <div
                      key={minutes}
                      className="pointer-events-none absolute inset-x-0 border-t border-line"
                      style={{
                        top:
                          ((minutes - dayStart) / SLOT_MINUTES) * SLOT_HEIGHT,
                      }}
                    />
                  ))}

                  {/* Outside this person's shift */}
                  {!off && workStart !== null && workStart > dayStart && (
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 bg-foreground/[0.045]"
                      style={{
                        height:
                          ((workStart - dayStart) / SLOT_MINUTES) * SLOT_HEIGHT,
                      }}
                    />
                  )}
                  {!off && workEnd !== null && workEnd < dayEnd && (
                    <div
                      className="pointer-events-none absolute inset-x-0 bg-foreground/[0.045]"
                      style={{
                        top: ((workEnd - dayStart) / SLOT_MINUTES) * SLOT_HEIGHT,
                        height:
                          ((dayEnd - workEnd) / SLOT_MINUTES) * SLOT_HEIGHT,
                      }}
                    />
                  )}

                  {showNowLine && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-[8] flex items-center"
                      style={{ top: nowTop }}
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.18)]" />
                      <span className="h-px flex-1 bg-rose-500" />
                    </div>
                  )}

                  {hint?.staffId === member.id && (
                    <div
                      className="pointer-events-none absolute inset-x-1 z-10 rounded-lg border-2 border-dashed border-foreground/40 bg-foreground/[0.07]"
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

                  {memberBlocks.map((block) => {
                    const top =
                      ((block.start_minutes - dayStart) / SLOT_MINUTES) *
                      SLOT_HEIGHT;
                    const height =
                      ((block.end_minutes - block.start_minutes) /
                        SLOT_MINUTES) *
                      SLOT_HEIGHT;
                    return (
                      <button
                        key={`${member.id}-${block.id}`}
                        onClick={() => onSelectBlock(block)}
                        title={
                          block.reason
                            ? `Blocked: ${block.reason}`
                            : "Blocked — click to remove"
                        }
                        className="absolute inset-x-1 z-[5] overflow-hidden rounded-lg border border-dashed border-foreground/25 bg-[repeating-linear-gradient(135deg,rgba(0,0,0,0.05)_0px,rgba(0,0,0,0.05)_6px,transparent_6px,transparent_12px)] px-2 py-1 text-left leading-tight text-foreground/60 transition hover:border-foreground/40"
                        style={{ top, height: Math.max(height, SLOT_HEIGHT) }}
                      >
                        <p className="truncate text-[11px] font-semibold">
                          {block.reason || "Blocked"}
                        </p>
                      </button>
                    );
                  })}

                  {memberBookings.map((booking) => {
                    const start = parseTimeToMinutes(booking.booking_time);
                    if (start === null) return null;
                    const end = start + booking.duration_minutes;
                    const top =
                      ((start - dayStart) / SLOT_MINUTES) * SLOT_HEIGHT;
                    const height =
                      (booking.duration_minutes / SLOT_MINUTES) * SLOT_HEIGHT;
                    const roomy = height >= SLOT_HEIGHT * 2.5;

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
                        className={`absolute inset-x-1 cursor-grab overflow-hidden rounded-lg px-2 py-1.5 text-left leading-tight ring-1 ring-inset transition-all duration-200 hover:z-[15] hover:shadow-md active:cursor-grabbing ${serviceColor(
                          booking.service_id
                        )} ${
                          booking.status === "cancelled"
                            ? "opacity-50 line-through"
                            : ""
                        } ${
                          booking.status === "pending"
                            ? "ring-2 ring-amber-400"
                            : ""
                        } ${dragging?.id === booking.id ? "opacity-40" : ""}`}
                        style={{ top, height: Math.max(height, SLOT_HEIGHT) }}
                      >
                        <p className="flex items-center gap-1 text-[10px] font-medium tabular-nums opacity-70">
                          {formatMinutes(start)} – {formatMinutes(end)}
                          {booking.status === "pending" && (
                            <span className="rounded-full bg-amber-400 px-1 text-[9px] font-bold text-amber-950">
                              NEW
                            </span>
                          )}
                          {booking.is_paid && (
                            <span
                              title="Paid"
                              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                            />
                          )}
                        </p>
                        <p className="truncate text-[12px] font-semibold">
                          {booking.full_name}
                        </p>
                        {roomy && (
                          <p className="truncate text-[11px] opacity-75">
                            {booking.service_name}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
