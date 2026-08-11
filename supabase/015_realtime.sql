-- Realtime for the admin dashboard.
-- Run in Supabase Dashboard > SQL Editor.
--
-- Without this the websocket in src/lib/useBookings.ts connects fine but never
-- receives anything: Postgres only streams changes for tables that are in the
-- `supabase_realtime` publication. Adding `bookings` here is what makes a new
-- booking from the public site appear in the dashboard, the notification bell
-- and the appointments list without a manual refresh.
--
-- Row level security still applies to realtime — an admin only receives rows
-- their SELECT policy already lets them read ("Admins read bookings"), so this
-- does not widen access.

alter publication supabase_realtime add table public.bookings;

-- REPLICA IDENTITY FULL makes UPDATE and DELETE events carry the whole row
-- rather than just the primary key. The dashboard refetches on any event so it
-- would work either way, but this keeps the payloads useful if a screen later
-- wants to patch state in place instead.
alter table public.bookings replica identity full;
