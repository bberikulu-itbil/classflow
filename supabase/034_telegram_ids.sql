-- Store an optional Telegram user/chat identifier on each profile.
-- The partial index is intentionally left out until existing duplicate IDs are resolved.
alter table public.profiles
  add column if not exists telegram_id bigint;
