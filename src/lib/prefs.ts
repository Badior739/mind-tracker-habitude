export type NotifPrefs = {
  enabled: boolean;
  // Activités
  activitiesEnabled: boolean;
  activitiesFrequency: "daily" | "weekly";
  activitiesTime: string;     // HH:MM
  // Finances
  financesEnabled: boolean;
  financesFrequency: "daily" | "weekly";
  financesTime: string;       // HH:MM
  // Fuseau horaire IANA (ex. "Africa/Abidjan", "Europe/Paris")
  timezone: string;
  // Anciennes clés conservées pour rétro-compat (lecture seule)
  dailyActivity?: boolean;
  dailyTime?: string;
  weeklyFinance?: boolean;
  budgetAlerts: boolean;
  scoreCongrats: boolean;
};

export const DEFAULT_NOTIFS: NotifPrefs = {
  enabled: false,
  activitiesEnabled: true,
  activitiesFrequency: "daily",
  activitiesTime: "21:00",
  financesEnabled: true,
  financesFrequency: "weekly",
  financesTime: "19:00",
  timezone:
    (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) ||
    "Africa/Abidjan",
  budgetAlerts: true,
  scoreCongrats: true,
};

export type AppPrefs = {
  discreet: boolean;       // masque les montants
  lockTimeoutMs: number;   // verrouillage auto (1 min par défaut)
};

export const DEFAULT_APP_PREFS: AppPrefs = {
  discreet: false,
  lockTimeoutMs: 60_000,
};