-- Privacy migration: remove legacy signup network/device identifiers.
-- Applied to production on 2026-11-14.
-- Safe to re-run: only clears legacy values and removes the obsolete IP index.
-- New signup risk records now use a random first-party browser token;
-- they do not collect IP addresses or derive IDs from browser hardware/canvas traits.

UPDATE public.signup_risk
SET ip = NULL,
    fingerprint = 'unknown'
WHERE ip IS NOT NULL
   OR fingerprint <> 'unknown';

DROP INDEX IF EXISTS public.signup_risk_ip_idx;
