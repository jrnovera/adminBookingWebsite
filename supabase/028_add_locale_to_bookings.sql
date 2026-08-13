-- Add missing locale column to bookings table
-- Tracks the client's preferred language/locale for the booking

alter table public.bookings
add column if not exists locale text not null default 'en';
