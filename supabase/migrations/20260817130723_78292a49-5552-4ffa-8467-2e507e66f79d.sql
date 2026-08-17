CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.schedule(
  'mind-tracker-send-reminders',
  '* * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://mind-tracker-habitude.lovable.app/api/public/hooks/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_fc-MzyLQTGeroGVAxawDGw_2MB9rPyr'
    ),
    body := '{}'::jsonb
  );
  $job$
);