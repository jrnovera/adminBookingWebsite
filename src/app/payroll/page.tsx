"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Avatar from "@/components/Avatar";
import IncentiveModal from "@/components/IncentiveModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { EmptyState, ErrorBanner } from "@/components/Feedback";
import { useToast } from "@/components/Toast";
import {
  IconChevronLeft,
  IconChevronRight,
  IconWallet,
} from "@/components/Icons";
import { addMonths, formatMoney, monthLabel, toMonthKey } from "@/lib/format";
import { exportPayrollCsv } from "@/lib/exportCsv";
import { fetchAttendanceForMonth } from "@/lib/attendance";
import { fetchStaff } from "@/lib/staff";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { useRequireRole } from "@/lib/useRequireRole";
import { logActivity } from "@/lib/activity";
import {
  computeStaffPayroll,
  fetchIncentivesForMonth,
  fetchPayrollRunsForMonth,
  markPayrollPaid,
  unmarkPayrollPaid,
  type StaffPayrollSummary,
} from "@/lib/payroll";
import type { PayrollRun, Staff, StaffAttendance, StaffIncentive } from "@/lib/types";

export default function PayrollPage() {
  useRequireRole({ blockStaff: true });
  const toast = useToast();
  const { settings } = useShop();
  const { session } = useAuth();
  const actor = session?.user.email ?? null;
  const currency = settings?.currency ?? "AED";

  const [monthKey, setMonthKey] = useState(() => toMonthKey(new Date()));
  const [staff, setStaff] = useState<Staff[]>([]);
  const [attendance, setAttendance] = useState<StaffAttendance[]>([]);
  const [incentives, setIncentives] = useState<StaffIncentive[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [incentiveTarget, setIncentiveTarget] = useState<Staff | null>(null);
  const [confirmPay, setConfirmPay] = useState<StaffPayrollSummary | null>(null);
  const [confirmUnpay, setConfirmUnpay] = useState<Staff | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchStaff(),
      fetchAttendanceForMonth(monthKey),
      fetchIncentivesForMonth(monthKey),
      fetchPayrollRunsForMonth(monthKey),
    ]).then(
      ([staffRows, attendanceRows, incentiveRows, runRows]) => {
        setStaff(staffRows.filter((s) => s.active));
        setAttendance(attendanceRows);
        setIncentives(incentiveRows);
        setRuns(runRows);
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load payroll");
        setLoading(false);
      }
    );
  }, [monthKey]);

  useEffect(load, [load]);

  const summaries = useMemo<StaffPayrollSummary[]>(() => {
    return staff.map((member) => {
      const memberAttendance = attendance.filter(
        (row) => row.staff_id === member.id
      );
      const memberIncentives = incentives.filter(
        (row) => row.staff_id === member.id
      );
      const summary = computeStaffPayroll(
        member,
        monthKey,
        memberAttendance,
        memberIncentives
      );
      const run = runs.find((r) => r.staff_id === member.id);
      if (run) {
        return {
          ...summary,
          netPay: run.net_pay,
          basePay: run.gross_pay,
          bonusTotal: run.incentives_total,
          deductionTotal: run.deductions_total,
          paid: true,
          paidAt: run.paid_at,
        };
      }
      return summary;
    });
  }, [staff, attendance, incentives, runs, monthKey]);

  const totals = useMemo(
    () => ({
      base: summaries.reduce((sum, s) => sum + s.basePay, 0),
      bonus: summaries.reduce((sum, s) => sum + s.bonusTotal + s.commissionTotal, 0),
      deductions: summaries.reduce((sum, s) => sum + s.deductionTotal, 0),
      net: summaries.reduce((sum, s) => sum + s.netPay, 0),
      paidCount: summaries.filter((s) => s.paid).length,
    }),
    [summaries]
  );

  async function handleMarkPaid(summary: StaffPayrollSummary) {
    setBusyId(summary.staff.id);
    try {
      await markPayrollPaid({
        staff_id: summary.staff.id,
        period_month: `${monthKey}-01`,
        gross_pay: summary.basePay,
        incentives_total: summary.bonusTotal + summary.commissionTotal,
        deductions_total: summary.deductionTotal,
        net_pay: summary.netPay,
        paid_by: actor,
      });
      toast.success(
        "Marked as paid",
        `${summary.staff.name} · ${formatMoney(summary.netPay, currency)}`
      );
      logActivity({
        actor,
        entity: "payroll",
        entity_id: summary.staff.id,
        action: "paid",
        summary: `Paid ${summary.staff.name} for ${monthLabel(monthKey)}`,
        detail: `Net ${formatMoney(summary.netPay, currency)}`,
      });
      setConfirmPay(null);
      load();
    } catch (err) {
      toast.error(
        "Could not mark paid",
        err instanceof Error ? err.message : "Try again"
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnmarkPaid(member: Staff) {
    setBusyId(member.id);
    try {
      await unmarkPayrollPaid(member.id, monthKey);
      toast.success("Unmarked", `${member.name} is no longer marked as paid.`);
      logActivity({
        actor,
        entity: "payroll",
        entity_id: member.id,
        action: "unpaid",
        summary: `Reopened payroll for ${member.name} · ${monthLabel(monthKey)}`,
      });
      setConfirmUnpay(null);
      load();
    } catch (err) {
      toast.error(
        "Could not unmark",
        err instanceof Error ? err.message : "Try again"
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Payroll"
        subtitle="Computed from Attendance, plus any bonuses or deductions."
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-line bg-surface p-0.5 shadow-[var(--shadow-xs)]">
              <button
                onClick={() => setMonthKey((key) => addMonths(key, -1))}
                aria-label="Previous month"
                className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-background hover:text-foreground"
              >
                <IconChevronLeft size={16} />
              </button>
              <span className="min-w-[9rem] px-2 text-center text-sm font-medium">
                {monthLabel(monthKey)}
              </span>
              <button
                onClick={() => setMonthKey((key) => addMonths(key, 1))}
                aria-label="Next month"
                className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-background hover:text-foreground"
              >
                <IconChevronRight size={16} />
              </button>
            </div>
            <button
              onClick={() => setMonthKey(toMonthKey(new Date()))}
              className="btn-ghost px-3 py-2 text-sm hover:bg-background"
            >
              This month
            </button>
            <button
              onClick={() => exportPayrollCsv(summaries, monthKey)}
              disabled={summaries.length === 0}
              className="btn-ghost px-3 py-2 text-sm hover:bg-background disabled:opacity-50"
            >
              Export
            </button>
          </div>
        }
      />

      <main className="flex-1 space-y-4 p-4 sm:space-y-6 sm:p-6">
        {error && <ErrorBanner message={error} />}

        {/* Summary strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Base pay" value={formatMoney(totals.base, currency)} />
          <SummaryCard
            label="Bonuses & commission"
            value={formatMoney(totals.bonus, currency)}
            tone="emerald"
          />
          <SummaryCard
            label="Deductions"
            value={formatMoney(totals.deductions, currency)}
            tone="rose"
          />
          <SummaryCard
            label="Net payroll"
            value={formatMoney(totals.net, currency)}
            tone="primary"
          />
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : staff.length === 0 ? (
          <EmptyState
            icon={<IconWallet size={22} />}
            title="No active staff"
            detail="Add team members and set their pay on the Team page first."
          />
        ) : (
          <div className="card overflow-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="border-b border-line text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Staff</th>
                  <th className="px-4 py-2.5 font-medium">Attendance</th>
                  <th className="px-4 py-2.5 font-medium">Base pay</th>
                  <th className="px-4 py-2.5 font-medium">Bonus / Commission</th>
                  <th className="px-4 py-2.5 font-medium">Deductions</th>
                  <th className="px-4 py-2.5 font-medium">Net pay</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {summaries.map((summary) => {
                  const member = summary.staff;
                  const memberIncentives = incentives.filter(
                    (row) => row.staff_id === member.id
                  );
                  return (
                    <tr key={member.id}>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <Avatar name={member.name} src={member.avatar_url} size={30} />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {member.name}
                            </span>
                            <span className="block truncate text-[11px] text-muted">
                              {member.salary_type === "monthly"
                                ? `${formatMoney(member.base_salary, currency)}/mo`
                                : `${formatMoney(member.hourly_rate, currency)}/hr`}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {member.salary_type === "hourly" ? (
                          <span className="tabular-nums text-muted">
                            {summary.hoursWorked.toFixed(1)} hrs
                          </span>
                        ) : (
                          <span className="flex flex-wrap gap-1.5 text-muted">
                            <span className="text-emerald-700">
                              {summary.statusCounts.present}P
                            </span>
                            <span className="text-amber-700">
                              {summary.statusCounts.late}L
                            </span>
                            <span className="text-primary-dark">
                              {summary.statusCounts.half_day}½
                            </span>
                            <span>{summary.statusCounts.on_leave}O</span>
                            <span className="text-rose-700">
                              {summary.statusCounts.absent}A
                            </span>
                            {summary.unmarkedDays > 0 && (
                              <span
                                className="text-rose-700/70"
                                title="Unmarked days count as absent"
                              >
                                {summary.unmarkedDays}?
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatMoney(summary.basePay, currency)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setIncentiveTarget(member)}
                          className="flex items-center gap-1 tabular-nums text-emerald-700 hover:underline"
                        >
                          {summary.bonusTotal + summary.commissionTotal > 0
                            ? `+${formatMoney(
                                summary.bonusTotal + summary.commissionTotal,
                                currency
                              )}`
                            : "+ Add"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setIncentiveTarget(member)}
                          className={`tabular-nums hover:underline ${
                            summary.deductionTotal > 0
                              ? "text-rose-700"
                              : "text-muted"
                          }`}
                        >
                          {summary.deductionTotal > 0
                            ? `−${formatMoney(summary.deductionTotal, currency)}`
                            : "—"}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums">
                        {formatMoney(summary.netPay, currency)}
                      </td>
                      <td className="px-4 py-3">
                        {summary.paid ? (
                          <button
                            onClick={() => setConfirmUnpay(member)}
                            disabled={busyId === member.id}
                            className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-200 disabled:opacity-60"
                            title="Click to reopen"
                          >
                            Paid
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmPay(summary)}
                            disabled={busyId === member.id}
                            className="btn-primary px-3 py-1.5 text-xs hover:opacity-90 disabled:opacity-60"
                          >
                            Mark paid
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-muted">
          Base pay comes from{" "}
          <Link href="/attendance" className="underline">
            Attendance
          </Link>
          . Monthly staff earn their basic pay split across expected working
          days (their schedule minus days off); half days pay half, absences
          and unmarked days pay nothing. Hourly staff are paid for clocked
          hours only.
        </p>
      </main>

      {incentiveTarget && (
        <IncentiveModal
          staff={incentiveTarget}
          monthKey={monthKey}
          currency={currency}
          existing={incentives.filter((row) => row.staff_id === incentiveTarget.id)}
          onClose={() => setIncentiveTarget(null)}
          onChanged={load}
        />
      )}

      {confirmPay && (
        <ConfirmDialog
          title="Mark this month as paid?"
          tone="default"
          confirmLabel="Mark paid"
          message={
            <>
              <span className="font-medium text-foreground">
                {confirmPay.staff.name}
              </span>{" "}
              will be marked paid for {monthLabel(monthKey)} at{" "}
              <span className="font-medium text-foreground">
                {formatMoney(confirmPay.netPay, currency)}
              </span>
              . This locks in today&rsquo;s computed amount — further
              attendance edits this month won&rsquo;t change it unless you
              reopen it.
            </>
          }
          onClose={() => setConfirmPay(null)}
          onConfirm={() => handleMarkPaid(confirmPay)}
        />
      )}

      {confirmUnpay && (
        <ConfirmDialog
          title="Reopen this payslip?"
          tone="danger"
          confirmLabel="Reopen"
          message={
            <>
              <span className="font-medium text-foreground">
                {confirmUnpay.name}
              </span>
              &rsquo;s {monthLabel(monthKey)} payslip will go back to
              computed-live instead of paid.
            </>
          }
          onClose={() => setConfirmUnpay(null)}
          onConfirm={() => handleUnmarkPaid(confirmUnpay)}
        />
      )}
    </>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "emerald" | "rose" | "primary";
}) {
  const toneStyles = {
    default: "",
    emerald: "text-emerald-700",
    rose: "text-rose-700",
    primary: "text-primary-dark",
  }[tone];

  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${toneStyles}`}>
        {value}
      </p>
    </div>
  );
}
