-- Enable pg_cron extension for scheduling tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to trigger annual reminders daily at 9 AM
SELECT cron.schedule(
  'annual-payment-reminders',
  '0 9 * * *', -- Every day at 9 AM
  $$
  SELECT net.http_post(
    url := 'https://lyeebbafixacwhmlztzp.supabase.co/functions/v1/annual-reminder-trigger',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5ZWViYmFmaXhhY3dobWx6dHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NjA3OTIsImV4cCI6MjA3MTQzNjc5Mn0.GHXtcECZtN_NYq29wGzdLLaiqgvZVyu5DIo8Au8DEos"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  );
  $$
);