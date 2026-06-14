export type NotifPrefs = {
  enabled: boolean;
  dailyActivity: boolean;
  dailyTime: string;       // HH:MM
  weeklyFinance: boolean;
  budgetAlerts: boolean;
  scoreCongrats: boolean;
};

export const DEFAULT_NOTIFS: NotifPrefs = {
  enabled: false,
  dailyActivity: true,
  dailyTime: "21:00",
  weeklyFinance: true,
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