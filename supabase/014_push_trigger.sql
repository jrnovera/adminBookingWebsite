-- Fires the send-push Edge Function on every new booking, via pg_net rather
-- than the Dashboard's "Database Webhooks" UI (same effect, but scriptable).
--
-- This file is a template: the deployed version has the real service-role
-- key and PUSH_WEBHOOK_SECRET substituted in place of the placeholders
-- below, applied directly via the Management API — those values are
-- deliberately NOT committed here. If you ever need to recreate this
-- trigger, swap in the real values from `supabase secrets list` /
-- Project Settings > API before running it.

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_send_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://sdticckqzxmgjbmbqlaj.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'x-webhook-secret', '<PUSH_WEBHOOK_SECRET>'
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'bookings',
      'record', to_jsonb(NEW)
    )
  );
  return NEW;
end;
$$;

drop trigger if exists trg_notify_send_push on public.bookings;
create trigger trg_notify_send_push
  after insert on public.bookings
  for each row
  execute function public.notify_send_push();
