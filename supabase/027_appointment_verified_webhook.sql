-- Fires the n8n appointment-verified webhook when a booking status changes to "confirmed",
-- via pg_net (database-level trigger). This ensures every acceptance triggers an email to
-- the client, regardless of which client (admin app, API, or Supabase Studio) made the change.
--
-- This file is a template: the deployed version has the real n8n webhook URL substituted
-- in place of the placeholder below. If you need to change the webhook URL, update it here
-- and re-apply this migration.

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_appointment_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only fire if status changed to 'confirmed' and wasn't 'confirmed' before
  if NEW.status = 'confirmed' and OLD.status != 'confirmed' then
    perform net.http_post(
      url := 'https://jrnovera.app.n8n.cloud/webhook/send-appointment-verified',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'clientEmail', NEW.email,
        'clientName', NEW.full_name,
        'appointmentDate', NEW.booking_date || ' ' || NEW.booking_time
      )
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_appointment_verified on public.bookings;
create trigger trg_notify_appointment_verified
  after update on public.bookings
  for each row
  execute function public.notify_appointment_verified();
