import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getPushPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const { getPushKeys } = await import("./push.server");
  return { publicKey: getPushKeys().publicKey };
});

export const savePushSubscription = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({
    installationId: z.string().uuid(),
    installationSecret: z.string().min(32).max(200),
    subscription: z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }) }),
    prefs: z.object({
      enabled: z.boolean(), activitiesEnabled: z.boolean(), activitiesFrequency: z.enum(["daily", "weekly"]),
      activitiesTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), financesEnabled: z.boolean(),
      financesFrequency: z.enum(["daily", "weekly"]), financesTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      timezone: z.string().min(1).max(100),
    }),
  }).parse(input))
  .handler(async ({ data }) => {
    const { hashInstallationSecret } = await import("./push.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const secretHash = await hashInstallationSecret(data.installationSecret);
    const { data: existing } = await supabaseAdmin.from("push_subscriptions")
      .select("secret_hash")
      .eq("installation_id", data.installationId)
      .maybeSingle();
    if (existing && existing.secret_hash !== secretHash) throw new Error("Installation non reconnue.");
    const { error } = await supabaseAdmin.from("push_subscriptions").upsert({
      installation_id: data.installationId,
      secret_hash: secretHash,
      endpoint: data.subscription.endpoint,
      p256dh: data.subscription.keys.p256dh,
      auth: data.subscription.keys.auth,
      enabled: data.prefs.enabled,
      activities_enabled: data.prefs.activitiesEnabled,
      activities_frequency: data.prefs.activitiesFrequency,
      activities_time: data.prefs.activitiesTime,
      finances_enabled: data.prefs.financesEnabled,
      finances_frequency: data.prefs.financesFrequency,
      finances_time: data.prefs.financesTime,
      timezone: data.prefs.timezone,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "installation_id" });
    if (error) throw new Error("Impossible d'enregistrer les rappels en arrière-plan.");
    return { ok: true };
  });

export const disablePushSubscription = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ installationId: z.string().uuid(), installationSecret: z.string().min(32).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const { hashInstallationSecret } = await import("./push.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("push_subscriptions")
      .update({ enabled: false })
      .eq("installation_id", data.installationId)
      .eq("secret_hash", await hashInstallationSecret(data.installationSecret));
    if (error) throw new Error("Impossible de désactiver les rappels en arrière-plan.");
    return { ok: true };
  });

export const sendTestPush = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ installationId: z.string().uuid(), installationSecret: z.string().min(32).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const { hashInstallationSecret, sendWebPush } = await import("./push.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subscription, error } = await supabaseAdmin.from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("installation_id", data.installationId)
      .eq("secret_hash", await hashInstallationSecret(data.installationSecret))
      .maybeSingle();
    if (error || !subscription) throw new Error("Activez d'abord les rappels en arrière-plan.");
    const response = await sendWebPush(subscription, {
      title: "Notification de test ✅",
      body: "Les rappels Mind Tracker fonctionnent même lorsque l'application est fermée.",
      tag: "mind-tracker-test",
    });
    if (!response.ok) throw new Error("Le téléphone a refusé la notification de test.");
    return { ok: true };
  });