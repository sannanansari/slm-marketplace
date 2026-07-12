-- ============================================================
-- supabase-schema-fixes.sql
-- Run this AFTER supabase-schema.sql if you already have
-- the main schema deployed. Safe to run multiple times.
-- ============================================================

-- 1. Missing columns on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_downloads integer DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS model_count     integer DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avg_rating      numeric(3,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS review_count    integer DEFAULT 0;

-- 2. Fix recalc_engineer_score to update new columns
CREATE OR REPLACE FUNCTION recalc_engineer_score(eng_id uuid)
RETURNS void AS $$
DECLARE
  dl_count  bigint;
  avg_rat   numeric;
  mod_count int;
BEGIN
  SELECT
    COALESCE(SUM(download_count), 0),
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO dl_count, avg_rat, mod_count
  FROM models
  WHERE engineer_id = eng_id AND status = 'published';

  UPDATE users SET
    score           = ROUND(
                        (LOG(GREATEST(dl_count, 1)) * 100) +
                        ((avg_rat / 5.0) * 300) +
                        LEAST(mod_count * 20, 400)
                      ),
    total_downloads = dl_count,
    model_count     = mod_count,
    avg_rating      = ROUND(avg_rat::numeric, 2)
  WHERE id = eng_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix recalc_model_rating to also sync review_count
CREATE OR REPLACE FUNCTION recalc_model_rating() RETURNS trigger AS $$
DECLARE
  target_model_id bigint;
  eng_id          uuid;
BEGIN
  target_model_id := COALESCE(NEW.model_id, OLD.model_id);

  UPDATE models
  SET rating = COALESCE((
    SELECT ROUND(AVG(rating)::numeric, 1)
    FROM reviews WHERE model_id = target_model_id
  ), 0)
  WHERE id = target_model_id;

  SELECT engineer_id INTO eng_id FROM models WHERE id = target_model_id;
  IF eng_id IS NOT NULL THEN
    UPDATE users SET
      review_count = (
        SELECT COUNT(*) FROM reviews r
        JOIN models m ON r.model_id = m.id
        WHERE m.engineer_id = eng_id
      )
    WHERE id = eng_id;
    PERFORM recalc_engineer_score(eng_id);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Grant anon SELECT so Explore page works without login
GRANT SELECT ON models  TO anon;
GRANT SELECT ON users   TO anon;
GRANT SELECT ON reviews TO anon;

-- 5. Add siteUrl to _worker.js config — reminder (no SQL needed, see _worker.js)

-- 6. Verify everything looks correct
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
