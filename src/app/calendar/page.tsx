"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Avatar from "@/components/Avatar";
import WeekTimeGrid from "@/components/WeekTimeGrid";
import BookingDrawer from "@/components/BookingDrawer";
import NewBookingModal from "@/components/NewBookingModal";
import BlockTimeModal from "@/components/BlockTimeModal";
import Modal from "@/components/Modal";
import { rescheduleBooking } from "@/lib/bookings";
import { fetchBlocks, deleteBlock } from "@/lib/blocks";
import {
  addDays,
  formatDateLong,
  formatMinutes,
  parseTimeToMinutes,
  startOfWeek,
  toDateKey,
} from "@/lib/format";
import { fetchStaff, fetchTimeOff, isStaffOffOn } from "@/lib/staff";
import { useShop } from "@/lib/shop";
import { useBookings } from "@/lib/useBookings";
import type { Booking, Staff, StaffBlock, StaffTimeOff } from "@/lib/types";

const ALL = "__all";
const UNASSIGNED = "__unassigned";

export default function CalendarPage() {
  const { bookings, loading, error, reload } = useBookings();
  const { settings } = useShop();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [timeOff, setTimeOff] = useState<StaffTimeOff[]>([]);
  const [blocks, setBlocks] = useState<StaffBlock[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>(ALL);
  const [cursor, setCursor] = useState(() => new Date());
  const [moveError, setMoveError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<StaffBlock | null>(null);
  const [moveConfirm, setMoveConfirm] = useState<{
    booking: Booking;
    dateKey: string;
    startMinutes: number;
  } | null>(null);
  const [creating, setCreating] = useState<{
    dateKey: string;
    minutes: number;
  } | null>(null);
  const [blocking, setBlocking] = useState<{
    dateKey: string;
    minutes: number;
  } | null>(null);
  const [pending, setPending] = useState<Record<string, Partial<Booking>>>({});

  const reloadBlocks = useCallback(() => {
    fetchBlocks().then(setBlocks, () => {});
  }, []);

  useEffect(() => {
    Promise.all([fetchStaff(), fetchTimeOff()]).then(
      ([staffRows, timeOffRows]) => {
        setStaff(staffRows);
        setTimeOff(timeOffRows);
      },
      () => {}
    );
    reloadBlocks();
  }, [reloadBlocks]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [cursor]);

  // Bookings carry free-text staff ids from the public site; resolve them onto
  // real staff rows by id, then by name, so filtering lines up.
  const resolved = useMemo(() => {
    const byId = new Map(staff.map((member) => [member.id, member]));
    const byName = new Map(
      staff.map((member) => [member.name.toLowerCase(), member])
    );

    return bookings.map((booking) => {
      const patch = pending[booking.id];
      const merged = patch ? { ...booking, ...patch } : booking;
      const match =
        byId.get(merged.staff_id) ?? byName.get(merged.staff_name.toLowerCase());
      return { ...merged, staff_id: match ? match.id : UNASSIGNED };
    });
  }, [bookings, staff, pending]);

  const activeStaff = useMemo(
    () => staff.filter((member) => member.active),
    [staff]
  );

  const currentStaff = useMemo(
    () => activeStaff.find((member) => member.id === selectedStaff) ?? null,
    [activeStaff, selectedStaff]
  );

  const weekKeys = useMemo(() => weekDays.map(toDateKey), [weekDays]);

  const visible = useMemo(
    () =>
      resolved.filter((booking) => {
        if (!weekKeys.includes(booking.booking_date)) return false;
        if (selectedStaff === ALL) return true;
        return booking.staff_id === selectedStaff;
      }),
    [resolved, weekKeys, selectedStaff]
  );

  const visibleBlocks = useMemo(
    () =>
      blocks.filter((block) => {
        if (!weekKeys.includes(block.block_date)) return false;
        if (selectedStaff === ALL) return true;
        return block.staff_id === selectedStaff;
      }),
    [blocks, weekKeys, selectedStaff]
  );

  // The grid spans the shop's opening hours, widened if any staff member
  // works outside them.
  const { dayStart, dayEnd } = useMemo(() => {
    const pool = currentStaff ? [currentStaff] : activeStaff;
    const starts = pool
      .map((member) => parseTimeToMinutes(member.work_start))
      .filter((value): value is number => value !== null);
    const ends = pool
      .map((member) => parseTimeToMinutes(member.work_end))
      .filter((value): value is number => value !== null);

    if (typeof settings?.open_minutes === "number") {
      starts.push(settings.open_minutes);
    }
    if (typeof settings?.close_minutes === "number") {
      ends.push(settings.close_minutes);
    }

    return {
      dayStart: starts.length ? Math.min(...starts) : 9 * 60,
      dayEnd: ends.length ? Math.max(...ends) : 18 * 60,
    };
  }, [currentStaff, activeStaff, settings]);

  // The shop-wide break shows on every day of the week as a blocked band.
  const breakBlocks = useMemo(() => {
    if (
      typeof settings?.break_start_minutes !== "number" ||
      typeof settings?.break_end_minutes !== "number"
    ) {
      return [];
    }
    return weekKeys.map((dateKey) => ({
      id: `break-${dateKey}`,
      created_at: "",
      staff_id: selectedStaff === ALL ? "" : selectedStaff,
      block_date: dateKey,
      start_minutes: settings.break_start_minutes as number,
      end_minutes: settings.break_end_minutes as number,
      reason: "Shop break",
    }));
  }, [settings, weekKeys, selectedStaff]);

  // Grey out the selected member's weekly days off and any booked time off.
  const daysOff = useMemo(() => {
    if (!currentStaff) return [];
    const weekly = [...currentStaff.days_off];
    for (const day of weekDays) {
      if (isStaffOffOn(currentStaff, toDateKey(day), timeOff)) {
        weekly.push(day.getDay());
      }
    }
    return weekly;
  }, [currentStaff, weekDays, timeOff]);

  const applyMove = useCallback(
    async (booking: Booking, changes: Partial<Booking>) => {
      setMoveError(null);
      setPending((current) => ({ ...current, [booking.id]: changes }));
      try {
        await rescheduleBooking(booking.id, changes);
        reload();
      } catch (err) {
        setPending((current) => {
          const next = { ...current };
          delete next[booking.id];
          return next;
        });
        setMoveError(
          err instanceof Error ? err.message : "Could not move appointment"
        );
      }
    },
    [reload]
  );

  // Dragging only proposes a move; nothing is written until the admin
  // confirms it in a dialog that spells out the change and any clashes.
  const handleMove = useCallback(
    (booking: Booking, dateKey: string, startMinutes: number) => {
      const nextTime = formatMinutes(startMinutes);
      if (dateKey === booking.booking_date && nextTime === booking.booking_time) {
        return;
      }
      setMoveError(null);
      setMoveConfirm({ booking, dateKey, startMinutes });
    },
    []
  );

  const rangeLabel = `${weekDays[0].toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} – ${weekDays[6].toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle={rangeLabel}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCursor(new Date())}
              className="btn-ghost px-3 py-1.5 text-sm hover:bg-background"
            >
              Today
            </button>
            <button
              onClick={() => setCursor((date) => addDays(date, -7))}
              className="btn-ghost px-3 py-1.5 text-sm hover:bg-background"
            >
              ‹
            </button>
            <button
              onClick={() => setCursor((date) => addDays(date, 7))}
              className="btn-ghost px-3 py-1.5 text-sm hover:bg-background"
            >
              ›
            </button>
            <input
              type="date"
              aria-label="Jump to date"
              value={toDateKey(cursor)}
              onChange={(event) => {
                if (!event.target.value) return;
                const [year, month, day] = event.target.value
                  .split("-")
                  .map(Number);
                setCursor(new Date(year, month - 1, day));
              }}
              className="btn-ghost px-3 py-1.5 text-sm hover:bg-background"
            />
            <button
              onClick={() =>
                setBlocking({ dateKey: toDateKey(new Date()), minutes: dayStart })
              }
              className="btn-ghost px-3 py-1.5 text-sm hover:bg-background"
            >
              + Block time
            </button>
            <button
              onClick={() =>
                setCreating({ dateKey: toDateKey(new Date()), minutes: dayStart })
              }
              className="btn-primary px-4 py-2 text-sm hover:opacity-90"
            >
              + New Appointment
            </button>
          </div>
        }
      />

      <main className="flex-1 space-y-4 p-6">
        {error && (
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        )}
        {moveError && (
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {moveError}
          </p>
        )}

        {/* Staff picker: all bookings, or one member's week */}
        <StaffDropdown
          staff={activeStaff}
          value={selectedStaff}
          onChange={setSelectedStaff}
        />

        {loading && <p className="text-sm text-muted">Loading…</p>}

        {activeStaff.length === 0 && !loading && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            No staff yet — add team members on the Staff page to filter the
            calendar per person.
          </p>
        )}

        <p className="text-xs text-muted">
          Drag an appointment to another day or time to reschedule.
          Double-click an empty slot to book.
        </p>

        <WeekTimeGrid
          days={weekDays}
          bookings={visible}
          blocks={[...visibleBlocks, ...breakBlocks]}
          dayStart={dayStart}
          dayEnd={dayEnd}
          daysOff={daysOff}
          onMove={handleMove}
          onSelect={setSelected}
          onCreate={(dateKey, minutes) => setCreating({ dateKey, minutes })}
          onSelectBlock={(block) => {
            // Shop-break bands are derived from Settings, not real rows.
            if (block.id.startsWith("break-")) return;
            setSelectedBlock(block);
          }}
        />
      </main>

      {selected && (
        <BookingDrawer
          booking={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null);
            reload();
          }}
        />
      )}

      {creating && (
        <NewBookingModal
          staff={activeStaff}
          defaultStaffId={currentStaff?.id ?? null}
          defaultDate={creating.dateKey}
          defaultMinutes={creating.minutes}
          onClose={() => setCreating(null)}
          onCreated={() => {
            setCreating(null);
            reload();
          }}
        />
      )}

      {blocking && (
        <BlockTimeModal
          staff={activeStaff}
          defaultStaffId={currentStaff?.id ?? null}
          defaultDate={blocking.dateKey}
          defaultMinutes={blocking.minutes}
          onClose={() => setBlocking(null)}
          onCreated={() => {
            setBlocking(null);
            reloadBlocks();
          }}
        />
      )}

      {moveConfirm && (
        <Modal title="Move appointment?" onClose={() => setMoveConfirm(null)}>
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-semibold">
                {moveConfirm.booking.full_name}
              </span>{" "}
              — {moveConfirm.booking.service_name} ·{" "}
              {moveConfirm.booking.staff_name}
            </p>

            <div className="rounded-xl bg-background px-4 py-3">
              <div className="flex justify-between gap-3">
                <span className="text-muted">From</span>
                <span>
                  {formatDateLong(moveConfirm.booking.booking_date)} ·{" "}
                  {moveConfirm.booking.booking_time}
                </span>
              </div>
              <div className="mt-1 flex justify-between gap-3 font-semibold">
                <span className="font-normal text-muted">To</span>
                <span>
                  {formatDateLong(moveConfirm.dateKey)} ·{" "}
                  {formatMinutes(moveConfirm.startMinutes)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => {
                  applyMove(moveConfirm.booking, {
                    booking_date: moveConfirm.dateKey,
                    booking_time: formatMinutes(moveConfirm.startMinutes),
                  });
                  setMoveConfirm(null);
                }}
                className="btn-primary py-2.5 text-sm hover:opacity-90"
              >
                {moveConfirm.dateKey === moveConfirm.booking.booking_date
                  ? "Yes, change the time"
                  : "Yes, change date & time"}
              </button>

              {moveConfirm.dateKey !== moveConfirm.booking.booking_date && (
                <button
                  onClick={() => {
                    applyMove(moveConfirm.booking, {
                      booking_time: formatMinutes(moveConfirm.startMinutes),
                    });
                    setMoveConfirm(null);
                  }}
                  className="btn-ghost py-2.5 text-sm hover:bg-background"
                >
                  Change time only (keep{" "}
                  {formatDateLong(moveConfirm.booking.booking_date)})
                </button>
              )}

              <button
                onClick={() => setMoveConfirm(null)}
                className="btn-ghost py-2.5 text-sm text-muted hover:bg-background"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {selectedBlock && (
        <RemoveBlockModal
          block={selectedBlock}
          staffName={
            staff.find((member) => member.id === selectedBlock.staff_id)?.name ??
            "Staff"
          }
          onClose={() => setSelectedBlock(null)}
          onRemoved={() => {
            setSelectedBlock(null);
            reloadBlocks();
          }}
        />
      )}
    </>
  );
}

function RemoveBlockModal({
  block,
  staffName,
  onClose,
  onRemoved,
}: {
  block: StaffBlock;
  staffName: string;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    setBusy(true);
    setError(null);
    try {
      await deleteBlock(block.id);
      onRemoved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove block");
      setBusy(false);
    }
  }

  return (
    <Modal title="Blocked time" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p>
          <span className="font-semibold">{staffName}</span> is blocked{" "}
          {formatMinutes(block.start_minutes)} – {formatMinutes(block.end_minutes)}{" "}
          on {block.block_date}.
        </p>
        {block.reason && <p className="text-muted">Reason: {block.reason}</p>}
        {error && <p className="text-rose-700">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleRemove}
            disabled={busy}
            className="btn-primary flex-1 py-2.5 text-sm hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Removing…" : "Remove block"}
          </button>
          <button
            onClick={onClose}
            className="btn-ghost px-4 py-2.5 text-sm hover:bg-background"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

function StaffDropdown({
  staff,
  value,
  onChange,
}: {
  staff: Staff[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const current = staff.find((member) => member.id === value) ?? null;

  return (
    <div ref={rootRef} className="relative w-full max-w-xs">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="btn-ghost flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm hover:bg-background"
      >
        {current ? (
          <Avatar name={current.name} src={current.avatar_url} size={32} />
        ) : (
          <span className="grid h-8 w-8 place-items-center rounded-full bg-foreground/10 text-xs">
            All
          </span>
        )}
        <span className="min-w-0 flex-1 text-left leading-tight">
          <span className="block truncate">
            {current ? current.name : "All staff"}
          </span>
          {current && (
            <span className="block truncate text-[11px] text-muted">
              {current.role}
            </span>
          )}
        </span>
        <span className={`text-muted transition ${open ? "rotate-180" : ""}`}>
          ⌄
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-lg"
        >
          <li>
            <button
              type="button"
              role="option"
              aria-selected={value === ALL}
              onClick={() => {
                onChange(ALL);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${
                value === ALL
                  ? "bg-foreground text-white"
                  : "hover:bg-background"
              }`}
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-full text-xs ${
                  value === ALL ? "bg-white/15" : "bg-foreground/10"
                }`}
              >
                All
              </span>
              All staff
            </button>
          </li>
          {staff.map((member) => {
            const active = value === member.id;
            return (
              <li key={member.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(member.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${
                    active ? "bg-foreground text-white" : "hover:bg-background"
                  }`}
                >
                  <Avatar name={member.name} src={member.avatar_url} size={32} />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate">{member.name}</span>
                    <span
                      className={`block truncate text-[11px] ${
                        active ? "text-white/70" : "text-muted"
                      }`}
                    >
                      {member.role}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
