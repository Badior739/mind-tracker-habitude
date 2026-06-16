export const ACTIVITIES = [
  { key: "meditation", label: "Méditation", emoji: "🙏" },
  { key: "lecture", label: "Lecture", emoji: "📖" },
  { key: "sport", label: "Sport", emoji: "💪" },
  { key: "coding", label: "Coding Vibe", emoji: "💻" },
  { key: "formation", label: "Formation", emoji: "🎓" },
  { key: "reseaux", label: "Réseaux Pro", emoji: "📱" },
  { key: "repas", label: "Repas Sain", emoji: "🍽️" },
  { key: "eau", label: "Eau 2L", emoji: "💧" },
  { key: "journal", label: "Journal", emoji: "📝" },
  { key: "sommeil", label: "Sommeil <23h", emoji: "🌙" },
  { key: "priorite", label: "Tâche Prio", emoji: "🎯" },
] as const;

export type ActivityKey = (typeof ACTIVITIES)[number]["key"];

export type CustomActivity = { key: string; label: string; emoji: string };

export type DayEntry = {
  reveil?: string;
  notes?: string;
  [key: string]: any;
};

export const MONTHS = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

export const MONTHS_SHORT = [
  "Janv","Févr","Mars","Avr","Mai","Juin","Juil","Août","Sept","Oct","Nov","Déc",
];

export function daysInMonth(year: number, monthIdx: number) {
  return new Date(year, monthIdx + 1, 0).getDate();
}

export function dayLabel(year: number, monthIdx: number, day: number) {
  const d = new Date(year, monthIdx, day);
  const wd = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"][d.getDay()];
  const dd = String(day).padStart(2, "0");
  const mm = String(monthIdx + 1).padStart(2, "0");
  const yy = String(year).slice(2);
  return `${wd} ${dd}/${mm}/${yy}`;
}

export type FinanceCategory = "revenus" | "essentiel" | "investissement" | "epargne";

export type FinanceLine = {
  id: string;
  category: FinanceCategory;
  emoji: string;
  label: string;
  budget: number;
  reel: number;
  notes?: string;
};

export const DEFAULT_FINANCE_LINES: FinanceLine[] = [
  { id: "rev-1", category: "revenus", emoji: "💵", label: "Salaire contrat", budget: 85000, reel: 0, notes: "Entrer 0 si contrat terminé" },
  { id: "rev-2", category: "revenus", emoji: "🚀", label: "MGS — Freelance / Projets", budget: 0, reel: 0, notes: "Revenus clients directs" },
  { id: "rev-3", category: "revenus", emoji: "🎓", label: "MGS — Formations vendues", budget: 0, reel: 0, notes: "Cours en ligne, coaching" },
  { id: "rev-4", category: "revenus", emoji: "📱", label: "MGS — Réseaux / Affiliation", budget: 0, reel: 0, notes: "Monétisation contenu" },
  { id: "rev-5", category: "revenus", emoji: "💼", label: "Autres revenus", budget: 0, reel: 0, notes: "Consulting, aides…" },

  { id: "ess-1", category: "essentiel", emoji: "🏠", label: "Loyer / logement", budget: 20000, reel: 0, notes: "Priorité absolue" },
  { id: "ess-2", category: "essentiel", emoji: "🍽️", label: "Alimentation / épicerie", budget: 15000, reel: 0 },
  { id: "ess-3", category: "essentiel", emoji: "🚌", label: "Transport", budget: 5000, reel: 0 },
  { id: "ess-4", category: "essentiel", emoji: "📱", label: "Téléphone + Internet", budget: 5000, reel: 0, notes: "Outil professionnel MGS" },
  { id: "ess-5", category: "essentiel", emoji: "🏥", label: "Santé / pharmacie", budget: 3000, reel: 0, notes: "Ne jamais négliger" },
  { id: "ess-6", category: "essentiel", emoji: "💡", label: "Électricité / eau", budget: 2000, reel: 0 },

  { id: "inv-1", category: "investissement", emoji: "🎓", label: "Formations / certifications", budget: 5000, reel: 0, notes: "No-code, Vibe Code…" },
  { id: "inv-2", category: "investissement", emoji: "📚", label: "Livres / ressources", budget: 2000, reel: 0 },
  { id: "inv-3", category: "investissement", emoji: "🛠️", label: "Outils dev (Cursor, Vercel…)", budget: 3000, reel: 0 },
  { id: "inv-4", category: "investissement", emoji: "🌐", label: "Domaine + hébergement MGS", budget: 2000, reel: 0 },
  { id: "inv-5", category: "investissement", emoji: "📣", label: "Marketing / publicité MGS", budget: 3000, reel: 0 },
  { id: "inv-6", category: "investissement", emoji: "🤝", label: "Réseau / événements", budget: 2000, reel: 0 },

  { id: "epa-1", category: "epargne", emoji: "🏦", label: "Épargne urgence mensuelle", budget: 10000, reel: 0, notes: "Objectif: 3 mois de dépenses" },
  { id: "epa-2", category: "epargne", emoji: "💡", label: "Fonds de lancement MGS", budget: 5000, reel: 0, notes: "Capital entreprise" },
  { id: "epa-3", category: "epargne", emoji: "🎉", label: "Loisirs / sorties", budget: 3000, reel: 0 },
  { id: "epa-4", category: "epargne", emoji: "📦", label: "Tampon imprévus (5%)", budget: 3350, reel: 0 },
];

export const CATEGORY_META: Record<FinanceCategory, { label: string; tone: string; emoji: string }> = {
  revenus:        { label: "Revenus mensuels", tone: "text-success", emoji: "📥" },
  essentiel:      { label: "Dépenses essentielles", tone: "text-destructive", emoji: "📤" },
  investissement: { label: "Investissements — Croissance MGS", tone: "text-accent", emoji: "🎓" },
  epargne:        { label: "Épargne & filet de sécurité", tone: "text-primary", emoji: "🏦" },
};

export type RoadmapItem = { phase: string; period: string; objective: string; done: boolean };

export const DEFAULT_ROADMAP: RoadmapItem[] = [
  { phase: "Phase 1 — Fondations", period: "Avril – Juin 2026", objective: "Setup branding MGS, site vitrine, premiers contenus", done: false },
  { phase: "Phase 2 — Acquisition", period: "Juillet – Sept 2026", objective: "3 clients freelance + 1 formation lancée", done: false },
  { phase: "Phase 3 — Scaling", period: "Oct – Déc 2026", objective: "Revenus MGS > salaire, embauche freelance", done: false },
  { phase: "Phase 4 — Indépendance", period: "2027", objective: "Quitter contrat, 100% MGS, équipe 3 personnes", done: false },
  { phase: "Phase 5 — Croissance", period: "2028+", objective: "Studio reconnu, produits récurrents, expansion", done: false },
];