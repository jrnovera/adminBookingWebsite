# Push notifications — status: deployed ✅

True Web Push: a new booking notifies every admin device that's turned
notifications on, even if no admin tab is open or the browser is closed.

## What's live right now (project sdticckqzxmgjbmbqlaj)

- ✅ `public.push_subscriptions` table + RLS (013_push_subscriptions.sql)
- ✅ `send-push` Edge Function deployed
- ✅ Edge Function secrets set: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
  `VAPID_SUBJECT`, `PUSH_WEBHOOK_SECRET`
- ✅ `trg_notify_send_push` trigger on `public.bookings` (insert) → calls
  `send-push` via `pg_net` (014_push_trigger.sql is the reproducible
  template — the deployed function has real secrets substituted in, not
  committed to git)
- ✅ End-to-end tested: inserted a test booking, confirmed the trigger fired
  and the function responded `200 {"sent":0,"total":0}` (0 because no device
  had subscribed yet at test time) — verified via `net._http_response`, then
  cleaned up the test row.
- ✅ `NEXT_PUBLIC_VAPID_PUBLIC_KEY` set in `artisan-admin/.env.local`

## What's left — one thing, and only you can do it

**Turn it on per device:** Settings → Push notifications → **Turn on**, and
accept the browser's permission prompt. Do this on each browser/device that
should get alerts (a phone's browser needs its own separate opt-in from a
laptop's) — nobody's subscribed yet, so right now `sent` will be `0` for any
real booking too.

## How to test after subscribing

Create a booking from the booking site (or "New Appointment" in the admin).
Within a few seconds every subscribed device should get an OS-level
notification. Clicking it opens/focuses the admin app on Appointments.

## If something needs changing later

- **Rotate the VAPID keys or webhook secret:** `supabase secrets set ...`
  with new values, then re-run `014_push_trigger.sql` with the new
  `PUSH_WEBHOOK_SECRET` substituted in (the trigger has the old one baked
  into its function body — see the file's header comment).
- **Add another trigger event** (e.g. low stock): duplicate the pattern in
  `014_push_trigger.sql` for `products` `update`, and branch on
  `payload.table` inside `supabase/functions/send-push/index.ts`.
- **A subscription is per browser profile**, not per Supabase user account —
  clearing site data or switching browsers means opting in again there.
- **Stale subscriptions self-heal:** a 404/410 from the push service (user
  uninstalled, revoked permission, etc.) makes the function delete that row
  automatically.
- **Redeploy the function** after editing its code:
  `supabase functions deploy send-push` (needs `SUPABASE_ACCESS_TOKEN` env
  var or `supabase login` first).
