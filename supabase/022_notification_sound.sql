-- Add notification sound toggle to shop settings
-- Safe to re-run.

alter table public.shop_settings add column if not exists notification_sound_enabled boolean not null default true;
