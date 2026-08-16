CREATE POLICY "Server manages push subscriptions"
ON public.push_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Server manages push deliveries"
ON public.push_deliveries
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);