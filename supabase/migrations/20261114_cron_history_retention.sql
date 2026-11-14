-- Keep Supabase Cron run history bounded.
-- Applied to production on 2026-11-14.
-- pg_cron does not automatically prune job_run_details.

SELECT cron.schedule(
  'cron-job-history-retention-7d',
  '15 4 * * *',
  $$DELETE FROM cron.job_run_details
    WHERE end_time < now() - interval '7 days'$$
);
