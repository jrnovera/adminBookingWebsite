// Edge Function: send-booking-confirmation
//
// Triggered by a Supabase Database Webhook on `insert` into `public.bookings`
// (same pattern as send-push — see supabase/functions/send-push/index.ts).
// Sends the customer a booking-confirmation email via Resend.
//
// Deploy: supabase functions deploy send-booking-confirmation
// Secrets needed (supabase secrets set ...):
//   RESEND_API_KEY        - from Resend dashboard → API Keys
//   RESEND_FROM_EMAIL     - e.g. "Booking Connection <bookings@yourdomain.com>"
//                            (must be on a domain verified in Resend; use
//                            "onboarding@resend.dev" only for testing)
//   BOOKING_WEBHOOK_SECRET - shared secret, same header pattern as send-push
//   BUSINESS_NAME, BUSINESS_ADDRESS, BUSINESS_EMAIL, BUSINESS_PHONE - optional,
//     used to fill the email template
//
// Wire-up: Supabase Dashboard → Database → Webhooks → create one on
// `bookings` INSERT → HTTP Request → this function's URL → add header
// `x-webhook-secret: <BOOKING_WEBHOOK_SECRET>`.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "onboarding@resend.dev";
const WEBHOOK_SECRET = Deno.env.get("BOOKING_WEBHOOK_SECRET") ?? "";

const BUSINESS_NAME = Deno.env.get("BUSINESS_NAME") ?? "Our Business";
const BUSINESS_ADDRESS = Deno.env.get("BUSINESS_ADDRESS") ?? "";
const BUSINESS_EMAIL = Deno.env.get("BUSINESS_EMAIL") ?? "";
const BUSINESS_PHONE = Deno.env.get("BUSINESS_PHONE") ?? "";

type BookingRecord = {
  id: string;
  full_name: string;
  email: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  staff_name?: string | null;
};

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: BookingRecord | null;
};

function renderEmailHtml(booking: BookingRecord): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Booking Confirmed</title></head>
<body style="margin:0; padding:0; background-color:#f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; max-width:600px; width:100%; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background-color:#111827; padding:28px 32px; text-align:center;">
          <span style="font-size:20px; font-weight:700; color:#ffffff; letter-spacing:0.5px;">${BUSINESS_NAME}</span>
        </td></tr>
        <tr><td style="background-color:#ecfdf5; padding:16px 32px; text-align:center; border-bottom:1px solid #d1fae5;">
          <span style="color:#047857; font-weight:600; font-size:14px;">✅ Your booking is confirmed</span>
        </td></tr>
        <tr><td style="padding:32px 32px 8px 32px;">
          <p style="margin:0 0 16px 0; font-size:16px; color:#111827;">Hi ${booking.full_name},</p>
          <p style="margin:0 0 24px 0; font-size:15px; line-height:1.6; color:#4b5563;">Thanks for booking with us! Here are your appointment details:</p>
        </td></tr>
        <tr><td style="padding:0 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb; border:1px solid #e5e7eb; border-radius:10px;">
            <tr><td style="padding:20px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:8px 0; font-size:14px; color:#6b7280; width:140px;">Service</td>
                    <td style="padding:8px 0; font-size:14px; color:#111827; font-weight:600;">${booking.service_name}</td></tr>
                <tr><td style="padding:8px 0; font-size:14px; color:#6b7280;">Date</td>
                    <td style="padding:8px 0; font-size:14px; color:#111827; font-weight:600;">${booking.booking_date}</td></tr>
                <tr><td style="padding:8px 0; font-size:14px; color:#6b7280;">Time</td>
                    <td style="padding:8px 0; font-size:14px; color:#111827; font-weight:600;">${booking.booking_time}</td></tr>
                <tr><td style="padding:8px 0; font-size:14px; color:#6b7280;">Staff</td>
                    <td style="padding:8px 0; font-size:14px; color:#111827; font-weight:600;">${booking.staff_name ?? "—"}</td></tr>
                <tr><td style="padding:8px 0; font-size:14px; color:#6b7280; border-top:1px solid #e5e7eb;">Booking ID</td>
                    <td style="padding:8px 0; font-size:14px; color:#111827; font-weight:600; border-top:1px solid #e5e7eb;">${booking.id}</td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 32px 32px 32px;">
          <p style="margin:0; font-size:13px; line-height:1.6; color:#6b7280; text-align:center;">
            Need to reschedule or cancel? Contact us${BUSINESS_EMAIL ? ` at <a href="mailto:${BUSINESS_EMAIL}" style="color:#111827;">${BUSINESS_EMAIL}</a>` : ""}${BUSINESS_PHONE ? ` or call ${BUSINESS_PHONE}` : ""}.
          </p>
        </td></tr>
        <tr><td style="background-color:#f9fafb; padding:20px 32px; text-align:center; border-top:1px solid #e5e7eb;">
          <p style="margin:0; font-size:12px; color:#9ca3af;">${BUSINESS_NAME}${BUSINESS_ADDRESS ? ` · ${BUSINESS_ADDRESS}` : ""}<br />You're receiving this email because you made a booking with us.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

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

  if (!booking.email) {
    return new Response(JSON.stringify({ error: "Booking has no email" }), { status: 200 });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: booking.email,
      subject: `Your booking is confirmed — ${booking.service_name}`,
      html: renderEmailHtml(booking),
    }),
  });

  const result = await res.json().catch(() => ({}));

  if (!res.ok) {
    return new Response(JSON.stringify({ error: result }), { status: 502 });
  }

  return new Response(JSON.stringify({ sent: true, id: result?.id }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
