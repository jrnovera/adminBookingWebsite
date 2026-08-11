-- Web Push subscriptions: one row per browser/device an admin has enabled
-- notifications on. The send-push Edge Function (triggered by a Database
-- Webhook on new bookings) reads this table with the service role key and
-- pushes to every row, so notifications land even if no admin tab is open.
-- Run in Supabase Dashboard > SQL Editor.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Each admin can see/manage only their own subscriptions from the client.
-- The send-push function bypasses this with the service role key so it can
-- read every admin's subscription, not just the caller's.
drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions" on public.push_subscriptions
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
