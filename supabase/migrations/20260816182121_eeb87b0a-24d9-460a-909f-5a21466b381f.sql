CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL UNIQUE,
  secret_hash TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  activities_enabled BOOLEAN NOT NULL DEFAULT true,
  activities_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (activities_frequency IN ('daily', 'weekly')),
  activities_time TIME NOT NULL DEFAULT '21:00',
  finances_enabled BOOLEAN NOT NULL DEFAULT true,
  finances_frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (finances_frequency IN ('daily', 'weekly')),
  finances_time TIME NOT NULL DEFAULT '19:00',
  timezone TEXT NOT NULL DEFAULT 'Africa/Abidjan',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.push_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('activities', 'finances', 'test')),
  period_key TEXT NOT NULL,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, reminder_type, period_key)
);
GRANT ALL ON public.push_deliveries TO service_role;
ALTER TABLE public.push_deliveries ENABLE ROW LEVEL SECURITY;

CREATE INDEX push_subscriptions_enabled_idx ON public.push_subscriptions (enabled) WHERE enabled = true;
CREATE INDEX push_deliveries_delivered_at_idx ON public.push_deliveries (delivered_at);

CREATE OR REPLACE FUNCTION public.set_push_subscription_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_push_subscription_updated_at();