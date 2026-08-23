CREATE TABLE public.user_data (
  user_id uuid NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_data TO authenticated;
GRANT ALL ON public.user_data TO service_role;
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own data" ON public.user_data FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.push_deliveries
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 1;

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS activities_done_date date,
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS push_deliveries_pending_idx ON public.push_deliveries (acknowledged_at, delivered_at);