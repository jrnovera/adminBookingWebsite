export function formatMoney(amount: number, currency = "AED") {
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

export function parseTimeToMinutes(time: string) {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export function formatMinutes(totalMinutes: number) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${meridiem}`;
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfWeek(date: Date) {
  const result = new Date(date);
  const dayOfWeek = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - dayOfWeek);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function addMonths(monthKey: string, delta: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const result = new Date(year, month - 1 + delta, 1);
  return toMonthKey(result);
}

export function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function daysInMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

export function formatDateLong(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------
// Pay periods — a "cutoff" is a start/end date range Payroll pays out as
// one unit. Which shape applies is per staff member (see Staff.pay_frequency
// in lib/types.ts): one period covering the whole month, two semi-monthly
// halves, or one per calendar week. Everything here is scoped to a single
// displayed month so the Payroll page can list "the periods that fall in
// the month currently being browsed" regardless of frequency.
// ---------------------------------------------------------------

export type PayPeriod = {
  start: string;
  end: string;
  /** Stable per-period identity — used as the staff_incentives /
   * payroll_runs `period_month` value, so it must be unique across the
   * whole timeline, not just within one displayed month. */
  key: string;
  label: string;
};

export function monthlyPeriod(monthKey: string): PayPeriod {
  const end = `${monthKey}-${String(daysInMonth(monthKey)).padStart(2, "0")}`;
  return { start: `${monthKey}-01`, end, key: `${monthKey}-01`, label: monthLabel(monthKey) };
}

export function semiMonthlyPeriods(monthKey: string): PayPeriod[] {
  const lastDay = daysInMonth(monthKey);
  const label = monthLabel(monthKey);
  return [
    {
      start: `${monthKey}-01`,
      end: `${monthKey}-15`,
      key: `${monthKey}-01`,
      label: `1–15 ${label}`,
    },
    {
      start: `${monthKey}-16`,
      end: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
      key: `${monthKey}-16`,
      label: `16–${lastDay} ${label}`,
    },
  ];
}

/** Monday-start weeks whose Monday falls within this month — a week
 * spanning a month boundary is attributed to whichever month its Monday is
 * in, so every calendar day belongs to exactly one period. */
export function weeklyPeriodsInMonth(monthKey: string): PayPeriod[] {
  const [year, month] = monthKey.split("-").map(Number);
  const count = daysInMonth(monthKey);
  const periods: PayPeriod[] = [];
  for (let day = 1; day <= count; day++) {
    const date = new Date(year, month - 1, day);
    if (date.getDay() !== 1) continue; // Monday only
    const start = toDateKey(date);
    const end = toDateKey(addDays(date, 6));
    periods.push({
      start,
      end,
      key: start,
      label: `${formatDateShort(start)} – ${formatDateShort(end)}`,
    });
  }
  return periods;
}

export function periodsForFrequency(
  frequency: "weekly" | "semi_monthly" | "monthly",
  monthKey: string
): PayPeriod[] {
  if (frequency === "weekly") return weeklyPeriodsInMonth(monthKey);
  if (frequency === "semi_monthly") return semiMonthlyPeriods(monthKey);
  return [monthlyPeriod(monthKey)];
}

export const payFrequencyLabels: Record<
  "weekly" | "semi_monthly" | "monthly",
  string
> = {
  weekly: "Paid weekly",
  semi_monthly: "Paid every 15 days",
  monthly: "Paid monthly",
};

/** Which period (by index into `periods`) a date falls in, or -1 if it's
 * before the first period's start — only possible for weekly periods on the
 * handful of days before the month's first Monday, which belong to the
 * previous month's cutoff rather than one shown in this view. */
export function periodIndexForDate(periods: PayPeriod[], dateKey: string): number {
  return periods.findIndex((p) => dateKey >= p.start && dateKey <= p.end);
}
