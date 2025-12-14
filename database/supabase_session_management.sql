-- ============================================
-- Session Management Functions for Supabase
-- Run these in your Supabase SQL Editor
-- ============================================

-- 1. INVALIDATE SESSION FUNCTION
-- Called during logout to mark session as inactive
CREATE OR REPLACE FUNCTION invalidate_session(p_session_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE user_sessions 
  SET 
    active = FALSE,
    terminated_reason = 'user_logout',
    last_activity = NOW()
  WHERE session_token = p_session_token
    AND active = TRUE;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  IF rows_affected > 0 THEN
    RETURN json_build_object(
      'success', TRUE,
      'message', 'Session invalidated successfully'
    );
  ELSE
    RETURN json_build_object(
      'success', FALSE,
      'message', 'Session not found or already inactive'
    );
  END IF;
END;
$$;


-- 2. CLEANUP OLD SESSIONS FUNCTION  
-- Can be called manually or via a scheduled job
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete sessions that are:
  -- 1. Expired (past expires_at)
  -- 2. Inactive and older than 7 days
  DELETE FROM user_sessions 
  WHERE expires_at < NOW() 
     OR (active = FALSE AND last_activity < NOW() - INTERVAL '7 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN json_build_object(
    'success', TRUE,
    'deleted_count', deleted_count,
    'cleaned_at', NOW()
  );
END;
$$;


-- 3. GRANT EXECUTE PERMISSIONS (for anon/authenticated users)
GRANT EXECUTE ON FUNCTION invalidate_session(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_sessions() TO authenticated;


-- ============================================
-- OPTIONAL: Set up automated cleanup using pg_cron
-- (Requires pg_cron extension to be enabled in Supabase)
-- ============================================

-- Enable pg_cron if not already enabled:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup to run daily at 3 AM UTC:
-- SELECT cron.schedule(
--   'cleanup-old-sessions',
--   '0 3 * * *',
--   'SELECT cleanup_old_sessions()'
-- );

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To remove the scheduled job:
-- SELECT cron.unschedule('cleanup-old-sessions');


-- ============================================
-- MANUAL CLEANUP (run as needed)
-- ============================================

-- View current sessions
SELECT 
  id,
  wallet_address,
  active,
  expires_at,
  last_activity,
  terminated_reason,
  created_at
FROM user_sessions 
ORDER BY created_at DESC 
LIMIT 20;

-- Run cleanup manually
SELECT cleanup_old_sessions();

-- Check how many stale sessions exist
SELECT 
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired,
  COUNT(*) FILTER (WHERE active = FALSE) as inactive,
  COUNT(*) FILTER (WHERE active = TRUE AND expires_at > NOW()) as active
FROM user_sessions;
