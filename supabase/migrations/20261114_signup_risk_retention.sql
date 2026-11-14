-- Retain signup-risk rows only for the 24-hour abuse-detection window.
-- Applied to production on 2026-11-14.
-- The cleanup runs every five minutes; old risk flags expire with the row.
-- This deletes only signup_risk records, not Auth users, bookmarks, or preferences.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

REVOKE ALL ON SCHEMA cron FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA cron TO postgres;

SELECT cron.schedule(
  'signup-risk-retention-24h',
  '*/5 * * * *',
  $$DELETE FROM public.signup_risk
    WHERE created_at < now() - interval '24 hours'$$
);
