import { getSupabaseClient } from "./supabase";
import type { BillAddon, Booking, BookingStatus, Client } from "./types";

export async function fetchBookings(): Promise<Booking[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("booking_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Booking[];
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export type NewBooking = {
  service_id: string;
  service_name: string;
  duration_minutes: number;
  price: number;
  staff_id: string;
  staff_name: string;
  booking_date: string;
  booking_time: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  full_name: string;
  email: string;
  mobile: string;
  notes: string | null;
  status: BookingStatus;
  is_paid: boolean;
};

export async function createBooking(input: NewBooking) {
  const { error } = await getSupabaseClient().from("bookings").insert(input);
  if (error) throw new Error(error.message);
}

export async function setBookingPaid(
  id: string,
  isPaid: boolean,
  method: string | null
) {
  const { error } = await getSupabaseClient()
    .from("bookings")
    .update({
      is_paid: isPaid,
      payment_method: isPaid ? method : null,
      paid_at: isPaid ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function rescheduleBooking(
  id: string,
  changes: {
    booking_date?: string;
    booking_time?: string;
    staff_id?: string;
    staff_name?: string;
    service_id?: string;
    service_name?: string;
    duration_minutes?: number;
    price?: number;
    subtotal?: number;
    tax?: number;
    total?: number;
    discount?: number;
  }
) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("bookings").update(changes).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function checkoutBooking(
  id: string,
  input: {
    addons: BillAddon[];
    tip: number;
    subtotal: number;
    tax: number;
    total: number;
    payment_method: string;
  }
) {
  const { error } = await getSupabaseClient()
    .from("bookings")
    .update({
      addons: input.addons,
      tip: input.tip,
      subtotal: input.subtotal,
      tax: input.tax,
      total: input.total,
      payment_method: input.payment_method,
      is_paid: true,
      paid_at: new Date().toISOString(),
      status: "completed",
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export function deriveClients(bookings: Booking[]): Client[] {
  const byEmail = new Map<string, Client>();

  for (const booking of bookings) {
    if (booking.status === "cancelled") continue;
    const key = booking.email.toLowerCase();
    const existing = byEmail.get(key);

    if (!existing) {
      byEmail.set(key, {
        email: booking.email,
        full_name: booking.full_name,
        mobile: booking.mobile,
        visits: 1,
        totalSpent: Number(booking.total),
        firstVisit: booking.booking_date,
        lastVisit: booking.booking_date,
        currency: booking.currency,
      });
      continue;
    }

    existing.visits += 1;
    existing.totalSpent += Number(booking.total);
    if (booking.booking_date < existing.firstVisit) {
      existing.firstVisit = booking.booking_date;
    }
    if (booking.booking_date > existing.lastVisit) {
      existing.lastVisit = booking.booking_date;
      existing.full_name = booking.full_name;
      existing.mobile = booking.mobile;
    }
  }

  return [...byEmail.values()].sort((a, b) => b.totalSpent - a.totalSpent);
}
