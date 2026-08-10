"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatMinutes, parseTimeToMinutes, toDateKey } from "@/lib/format";
import { IconPlus } from "./Icons";
import type { Booking, StaffBlock } from "@/lib/types";

const SLOT_MINUTES = 15;
// Dragging snaps to the hour so appointments land on clean start times.
const SNAP_MINUTES = 60;
const SLOT_HEIGHT = 22;
const AXIS_WIDTH = 56;

const palette = [
  "border-sky-400 bg-sky-50 text-sky-950",
  "border-orange-400 bg-orange-50 text-orange-950",
  "border-pink-400 bg-pink-50 text-pink-950",
  "border-teal-400 bg-teal-50 text-teal-950",
  "border-violet-400 bg-violet-50 text-violet-950",
  "border-lime-400 bg-lime-50 text-lime-950",
];

function serviceColor(serviceId: string) {
  let hash = 0;
  for (let index = 0; index < serviceId.length; index += 1) {
    hash = (hash * 31 + serviceId.charCodeAt(index)) >>> 0;
  }
  return palette[hash % palette.length];
}

type Placed = { booking: Booking; start: number; end: number };
type Cluster = { start: number; end: number; items: Placed[] };

/**
 * Groups a day's bookings into runs of overlapping appointments. In week view
 * the columns are far too narrow to show clashes side by side, so a cluster is
 * drawn as a stack instead: the layers behind stay visible at the edges and a
 * badge carries the count.
 */
function clusterByOverlap(list: Booking[]): Cluster[] {
  const placed: Placed[] = [];
  for (const booking of list) {
    const start = parseTimeToMinutes(booking.booking_time);
    if (start === null) continue;
    placed.push({
      booking,
      start,
      end: start + Math.max(booking.duration_minutes, SLOT_MINUTES),
    });
  }
  placed.sort((a, b) => a.start - b.start || a.end - b.end);

  const clusters: Cluster[] = [];
  for (const item of placed) {
    const current = clusters[clusters.length - 1];
    if (current && item.start < current.end) {
      current.items.push(item);
      current.end = Math.max(current.end, item.end);
    } else {
      clusters.push({ start: item.start, end: item.end, items: [item] });
    }
  }
  return clusters;
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
  onSelectGroup,
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
  onSelectGroup: (bookings: Booking[], startMinutes: number) => void;
}) {
  const [dragging, setDragging] = useState<Booking | null>(null);
  const [hint, setHint] = useState<{ dateKey: string; minutes: number } | null>(
    null
  );
  const [now, setNow] = useState(() => new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  const rows = Math.max(1, Math.ceil((dayEnd - dayStart) / SLOT_MINUTES));
  const gridHeight = rows * SLOT_HEIGHT;
  const todayKey = toDateKey(now);

  // Keep the "now" line honest without re-rendering constantly.
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

  // Current-time indicator, only when the clock falls inside the shown range.
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNowLine =
    days.some((day) => toDateKey(day) === todayKey) &&
    nowMinutes >= dayStart &&
    nowMinutes <= dayEnd;
  const nowTop = ((nowMinutes - dayStart) / SLOT_MINUTES) * SLOT_HEIGHT;

  function minutesFromPointer(clientY: number, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const raw = dayStart + ((clientY - rect.top) / SLOT_HEIGHT) * SLOT_MINUTES;
    const snapped = Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES;
    return Math.min(Math.max(snapped, dayStart), dayEnd - SNAP_MINUTES);
  }

  // With few columns the grid fills the width; with a full week it scrolls.
  // Every day column shares the available width equally, so a full week
  // fits the card without ever needing a horizontal scroll to reach Sunday.
  const columnClass = "min-w-0 flex-1";

  return (
    <div className="card overflow-hidden">
      {/* Bounded so this box actually has vertical overflow — otherwise the
          day header below can never stick and slides under the page chrome. */}
      <div
        ref={scrollRef}
        className="max-h-[calc(100vh-15rem)] overflow-y-auto overflow-x-hidden"
      >
        <div>
          {/* Day headers — sticky so the date stays visible while scrolling. */}
          <div className="sticky top-0 z-20 flex border-b border-line bg-surface/95 backdrop-blur-sm">
            <div
              className="shrink-0"
              style={{ width: AXIS_WIDTH }}
              aria-hidden="true"
            />
            {days.map((day) => {
              const key = toDateKey(day);
              const isToday = key === todayKey;
              const off = daysOff.includes(day.getDay());
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onCreate(key, dayStart)}
                  title={`Add an appointment on ${day.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}`}
                  className={`group/day ${columnClass} border-l border-line px-2 py-2.5 text-center transition-colors hover:bg-background`}
                >
                  <p
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      isToday ? "text-primary-dark" : "text-muted"
                    }`}
                  >
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </p>
                  <p
                    className={`mx-auto mt-1 grid h-8 w-8 place-items-center rounded-full text-sm font-semibold transition ${
                      isToday
                        ? "bg-foreground text-white shadow-sm"
                        : "text-foreground group-hover/day:bg-foreground/[0.08]"
                    }`}
                  >
                    {day.getDate()}
                  </p>
                  {off && (
                    <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-muted">
                      Day off
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Time axis + day columns */}
          <div className="relative flex">
            <div
              className="relative shrink-0 border-r border-line bg-surface-2"
              style={{ width: AXIS_WIDTH, height: gridHeight }}
            >
              {hourMarks.map((minutes, index) => (
                <span
                  key={minutes}
                  className={`absolute right-2 text-[10px] font-medium tabular-nums text-muted ${
                    // Same fix as the day view: the first mark sits at the
                    // grid's top edge, so centering it would clip half the
                    // label under the sticky header above.
                    index === 0 ? "" : "-translate-y-1/2"
                  }`}
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
                  className={`group/col relative border-l border-line transition-colors ${columnClass} ${
                    off
                      ? "bg-foreground/[0.035]"
                      : key === todayKey
                      ? "bg-primary-50/50"
                      : "hover:bg-background/60"
                  }`}
                  style={{ height: gridHeight }}
                >
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

                  {/* Hover-to-add: a quiet "+" per hour, same action as the
                      double-click shortcut, just visible so it's discoverable.
                      Only the small button itself is clickable — the taller
                      wrapper just reveals it on hover and passes clicks and
                      double-clicks on its empty padding straight through. */}
                  {hourMarks.map((minutes) => {
                    const segmentEnd = Math.min(minutes + 60, dayEnd);
                    if (segmentEnd <= minutes) return null;
                    const top =
                      ((minutes - dayStart) / SLOT_MINUTES) * SLOT_HEIGHT;
                    const height =
                      ((segmentEnd - minutes) / SLOT_MINUTES) * SLOT_HEIGHT;
                    return (
                      <div
                        key={`add-${minutes}`}
                        className="group/add absolute inset-x-0 z-[3] flex items-start justify-center pt-0.5"
                        style={{ top, height }}
                      >
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onCreate(key, minutes);
                          }}
                          title={`Add appointment at ${formatMinutes(minutes)}`}
                          className="grid h-5 w-5 place-items-center rounded-full bg-foreground text-white opacity-0 shadow-sm outline-none transition-all duration-150 group-hover/add:opacity-100 hover:scale-110 focus-visible:opacity-100"
                        >
                          <IconPlus size={11} />
                        </button>
                      </div>
                    );
                  })}

                  {/* Now line */}
                  {showNowLine && key === todayKey && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-[8] flex items-center"
                      style={{ top: nowTop }}
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.18)]" />
                      <span className="h-px flex-1 bg-rose-500" />
                    </div>
                  )}

                  {hint?.dateKey === key && (
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
                        className="absolute inset-x-1 z-[5] overflow-hidden rounded-lg border border-dashed border-foreground/25 bg-[repeating-linear-gradient(135deg,rgba(0,0,0,0.05)_0px,rgba(0,0,0,0.05)_6px,transparent_6px,transparent_12px)] px-2 py-1 text-left leading-tight text-foreground/60 transition hover:border-foreground/40 hover:bg-foreground/[0.06]"
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

                  {clusterByOverlap(dayBookings).map((cluster) => {
                    const top =
                      ((cluster.start - dayStart) / SLOT_MINUTES) * SLOT_HEIGHT;
                    const height =
                      ((cluster.end - cluster.start) / SLOT_MINUTES) *
                      SLOT_HEIGHT;
                    const count = cluster.items.length;
                    const front = cluster.items[0];
                    const compact = height < SLOT_HEIGHT * 2.2;

                    // A single appointment keeps the plain card.
                    if (count === 1) {
                      const { booking, start } = front;
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
                          className={`absolute inset-x-1 cursor-grab overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-left leading-tight shadow-sm transition-all duration-200 hover:z-[15] hover:-translate-y-px hover:shadow-lg hover:brightness-[0.98] active:cursor-grabbing ${serviceColor(
                            booking.service_id
                          )} ${
                            booking.status === "cancelled"
                              ? "opacity-50 line-through"
                              : booking.status === "pending"
                              ? "ring-1 ring-inset ring-amber-400"
                              : ""
                          } ${
                            dragging?.id === booking.id
                              ? "opacity-40 ring-2 ring-foreground/30"
                              : ""
                          }`}
                          style={{ top, height: Math.max(height, SLOT_HEIGHT) }}
                        >
                          <p className="flex items-center gap-1 text-[10px] font-medium tabular-nums opacity-80">
                            {formatMinutes(start)}
                            {booking.status === "pending" && (
                              <span
                                title="Awaiting confirmation"
                                className="rounded-full bg-amber-400 px-1 text-[9px] font-bold text-amber-950"
                              >
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
                          {!compact && (
                            <p className="truncate text-[11px] opacity-75">
                              {booking.service_name}
                            </p>
                          )}
                        </button>
                      );
                    }

                    // Overlapping: draw the others as offset layers peeking out
                    // behind the front card, then a count badge on top.
                    const peeks = cluster.items.slice(1, 4);

                    return (
                      <div
                        key={`cluster-${key}-${cluster.start}`}
                        className="absolute inset-x-1"
                        style={{ top, height: Math.max(height, SLOT_HEIGHT) }}
                      >
                        {peeks.map((peek, index) => (
                          <div
                            key={peek.booking.id}
                            aria-hidden="true"
                            className={`pointer-events-none absolute rounded-lg border-l-[3px] shadow-sm ${serviceColor(
                              peek.booking.service_id
                            )}`}
                            style={{
                              inset: 0,
                              transform: `translate(${(index + 1) * 4}px, ${
                                (index + 1) * -3
                              }px)`,
                              zIndex: peeks.length - index,
                            }}
                          />
                        ))}

                        <button
                          onClick={() =>
                            onSelectGroup(
                              cluster.items.map((item) => item.booking),
                              cluster.start
                            )
                          }
                          title={`${count} appointments overlap here — click to see all`}
                          className={`absolute inset-0 z-10 overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-left leading-tight shadow-md transition-all duration-200 hover:z-[15] hover:-translate-y-px hover:shadow-lg ${serviceColor(
                            front.booking.service_id
                          )}`}
                        >
                          <p className="flex items-center gap-1 text-[10px] font-medium tabular-nums opacity-80">
                            {formatMinutes(cluster.start)}
                            {cluster.items.some(
                              (item) => item.booking.status === "pending"
                            ) && (
                              <span
                                title="Includes unconfirmed bookings"
                                className="rounded-full bg-amber-400 px-1 text-[9px] font-bold text-amber-950"
                              >
                                NEW
                              </span>
                            )}
                          </p>
                          <p className="truncate text-[12px] font-semibold">
                            {front.booking.full_name}
                          </p>
                          {!compact && (
                            <p className="truncate text-[11px] opacity-75">
                              +{count - 1} more booking
                              {count - 1 === 1 ? "" : "s"}
                            </p>
                          )}

                          <span className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-foreground px-1 text-[10px] font-bold text-white shadow-sm">
                            {count}
                          </span>
                        </button>
                      </div>
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
