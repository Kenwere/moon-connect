create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'moonconnect-expire-sessions',
  '*/5 * * * *',
  $$
  select
    net.http_post(
      url := 'https://kcsjdagvvbbxnerkxnqv.supabase.co/functions/v1/expire-sessions',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', 'kenmagio988'
      ),
      body := '{}'::jsonb
    );
  $$
);

select cron.schedule(
  'moonconnect-router-health',
  '*/5 * * * *',
  $$
  select
    net.http_post(
      url := 'https://kcsjdagvvbbxnerkxnqv.supabase.co/functions/v1/router-health-snapshot',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', 'kenmagio988'
      ),
      body := '{}'::jsonb
    );
  $$
);
