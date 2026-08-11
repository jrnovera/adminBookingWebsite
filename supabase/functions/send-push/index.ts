// Edge Function: send-push
//
// Triggered by a Supabase Database Webhook on `insert` into `public.bookings`
// (a new appointment request from the booking site). Sends a Web Push
// notification to every device an admin has enabled notifications on — see
// src/lib/push.ts for how subscriptions get here, and
// supabase/PUSH_NOTIFICATIONS.md for how to wire the webhook up.
//
// Deploy: supabase functions deploy send-push
// Secrets needed (supabase secrets set ...): VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY, VAPID_SUBJECT, PUSH_WEBHOOK_SECRET.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";
// Shared secret so this public function URL can't be used by strangers to
// spam every admin's device — the Database Webhook sends it as a header.
const WEBHOOK_SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

type BookingRecord = {
  id: string;
  full_name: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
};

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: BookingRecord | null;
};

Deno.serve(async (req) => {
  if (WEBHOOK_SECRET && req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const booking = payload.record;
  if (payload.type !== "INSERT" || payload.table !== "bookings" || !booking) {
    return new Response("Ignored", { status: 200 });
  }

  const notification = {
    title: `New booking: ${booking.full_name}`,
    body: `${booking.service_name} · ${booking.booking_date} ${booking.booking_time}`,
    url: "/appointments",
    tag: `booking-${booking.id}`,
  };

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const results = await Promise.allSettled(
    (subscriptions ?? []).map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(notification)
      )
    )
  );

  // A 404/410 means the browser dropped the subscription (uninstalled,
  // permission revoked, etc.) — prune it so future sends don't keep failing.
  const staleIds: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const statusCode = (result.reason as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        staleIds.push(subscriptions![i].id);
      }
    }
  });
  if (staleIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return new Response(
    JSON.stringify({ sent, total: subscriptions?.length ?? 0, pruned: staleIds.length }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
