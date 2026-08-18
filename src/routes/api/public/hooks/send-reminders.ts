import { createFileRoute } from "@tanstack/react-router";

type Frequency = "daily" | "weekly";
type ReminderRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  timezone: string;
  activities_enabled: boolean;
  activities_frequency: Frequency;
  activities_time: string;
  finances_enabled: boolean;
  finances_frequency: Frequency;
  finances_time: string;
};

function localParts(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  const hour = value("hour") === "24" ? "00" : value("hour");
  return { date: `${value("year")}-${value("month")}-${value("day")}`, time: `${hour}:${value("minute")}`, sunday: value("weekday") === "Sun" };
}

function due(row: ReminderRow, type: "activities" | "finances") {
  const local = localParts(row.timezone);
  const enabled = type === "activities" ? row.activities_enabled : row.finances_enabled;
  const frequency = type === "activities" ? row.activities_frequency : row.finances_frequency;
  const time = (type === "activities" ? row.activities_time : row.finances_time).slice(0, 5);
  // Fenêtre de rattrapage : dès que l'heure locale a dépassé l'heure cible,
  // le rappel du jour part s'il n'a pas déjà été délivré (clé de période unique).
  return enabled && local.time >= time && (frequency === "daily" || local.sunday)
    ? { periodKey: frequency === "daily" ? local.date : `${local.date}-weekly`, local }
    : null;
}

export const Route = createFileRoute("/api/public/hooks/send-reminders")({
  server: { handlers: { POST: async ({ request }) => {
    const apiKey = request.headers.get("apikey");
    const expectedKey = process.env["SUPABASE_ANON_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!apiKey || !expectedKey || apiKey !== expectedKey) return new Response("Unauthorized", { status: 401 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendWebPush } = await import("@/lib/push.server");
    const { data, error } = await supabaseAdmin.from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, timezone, activities_enabled, activities_frequency, activities_time, finances_enabled, finances_frequency, finances_time")
      .eq("enabled", true);
    if (error) return Response.json({ ok: false }, { status: 500 });
    let delivered = 0;
    for (const row of (data ?? []) as ReminderRow[]) {
      for (const type of ["activities", "finances"] as const) {
        const timing = due(row, type);
        if (!timing) continue;
        const { error: reservationError } = await supabaseAdmin.from("push_deliveries").insert({
          subscription_id: row.id, reminder_type: type, period_key: timing.periodKey,
        });
        if (reservationError) continue;
        const response = await sendWebPush(row, type === "activities"
          ? { title: "Rappel Activités", body: "Pensez à renseigner vos activités du jour.", tag: `activities-${timing.periodKey}` }
          : { title: "Point finances", body: "C'est le moment de faire le point sur vos finances.", tag: `finances-${timing.periodKey}` });
        if (response.status === 404 || response.status === 410) {
          await supabaseAdmin.from("push_subscriptions").update({ enabled: false }).eq("id", row.id);
        }
        if (response.ok) delivered += 1;
      }
    }
    const cutoff = new Date(Date.now() - 45 * 24 * 60 * 60_000).toISOString();
    await supabaseAdmin.from("push_deliveries").delete().lt("delivered_at", cutoff);
    return Response.json({ ok: true, delivered });
  } } },
});