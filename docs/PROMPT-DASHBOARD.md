# PROMPT UNIQUE — Onglet « Dashboard » de Mind Tracker

Utilise ce prompt seul pour reproduire à l'identique l'onglet Dashboard de l'application Mind Tracker.

---

## Prompt à copier-coller

Crée l'onglet **Dashboard** (vue d'ensemble) d'une application de suivi personnel & financier nommée **Mind Tracker** (interface 100 % en français, monnaie **F CFA**).

### Stack et contraintes
- React + TypeScript, Tailwind CSS, icônes `lucide-react`.
- Aucune base de données : lecture seule de `localStorage` (le Dashboard n'écrit jamais de données métier).
- Aucune couleur codée en dur dans les classes : tokens sémantiques (`primary`, `accent`, `success`, `warning`, `destructive`, `border`, `muted-foreground`, `foreground`) et variables `--gradient-card`, `--gradient-primary`. Seules exceptions autorisées : les trois couleurs `oklch` du donut SVG.
- Thème sombre (ardoise + émeraude + cyan), cartes `rounded-2xl` / `rounded-xl`, chiffres `tabular-nums`.
- Rendu SSR-safe : si `typeof window === "undefined"`, le calcul renvoie `null` et le composant ne rend rien.
- Responsive : 2 colonnes de cartes sur mobile, 4 sur desktop ; panneaux empilés sur mobile, 2 colonnes en `lg:`.

### Sources de données (lecture seule)
- Activités : `mt.act.${year}-${month}` → `Record<number, DayEntry>`.
- Finances : `mt.fin.lines.${year}-${month}` → `FinanceLine[]` avec `category ∈ {revenus, essentiel, investissement, epargne}` et `reel: number`.
- Mois affiché = mois en cours (`new Date()`), lecture tolérante aux erreurs (`try/catch` → `{}` ou `[]`).
- Liste d'activités de référence (11) : 🙏 Méditation, 📖 Lecture, 💪 Sport, 💻 Coding Vibe, 🎓 Formation, 📱 Réseaux Pro, 🍽️ Repas Sain, 💧 Eau 2L, 📝 Journal, 🌙 Sommeil <23h, 🎯 Tâche Prio.

### Calculs (un seul `useMemo`)
- Pour chaque jour du mois, score = nombre d'activités à `true` ; on cumule `total`, `activeDays` (score > 0) et `perAct[key]` (nombre de jours où l'activité est faite).
- `avg = total / nbJours` ; `pctScore = total / (nbJours × 11) × 100`.
- `rev / ess / inv / epa` = somme des `reel` par catégorie ; `dep = ess + inv + epa` ; `solde = rev − dep` ; `tx = rev ? epa / rev : 0`.
- Formats : `Intl.NumberFormat("fr-FR")` + ` F` pour les montants, pourcentages à 1 décimale.

### Structure visuelle (de haut en bas)

1. **Hero** — carte `rounded-2xl border-border p-6 lg:p-8`, fond `var(--gradient-card)`, avec un halo décoratif `absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-20 blur-3xl` en `var(--gradient-primary)`.
   - Sur-titre `Sparkles` + « Août 2026 » en `text-xs uppercase tracking-widest text-primary`.
   - Titre `text-2xl lg:text-3xl font-semibold tracking-tight` : « Bâtir Mind Graphix Solution, un jour à la fois. »
   - Sous-titre : « Vue d'ensemble de votre discipline quotidienne et de votre santé financière du mois en cours. »

2. **Quatre StatCards** (grille 2 / 4 colonnes) — chaque carte : libellé, grande valeur, sous-texte, icône dans une pastille teintée :
   | carte | valeur | sous-texte | ton | icône |
   |---|---|---|---|---|
   | Score moyen | `X.XX/11` | `n/31 jours actifs` | primary | `Activity` |
   | % Réussite | `XX.X%` | Discipline globale | accent | `Target` |
   | Solde net | `fmtCFA(solde)` | `revenus – dépenses` | success si ≥ 0 sinon destructive | `TrendingUp` / `TrendingDown` |
   | Taux d'épargne | `XX.X%` | `Épargne : montant` | primary | `Wallet` |

3. **Panneau « Performance par activité (mois courant) »** (colonne gauche) — action en haut à droite : lien texte « Saisir → » qui navigue vers l'onglet Activités.
   - Une ligne par activité : emoji (`w-6`), libellé tronqué, `ProgressBar` (`w-28 lg:w-40`) du ratio jours réalisés / jours du mois, puis `n/31` à droite en `tabular-nums`.
   - Tons de la barre : success ≥ 75 %, primary ≥ 50 %, warning ≥ 25 %, sinon destructive.

4. **Panneau « Répartition financière du mois »** (colonne droite) — action « Détails → » vers l'onglet Finances.
   - **Donut SVG maison** (pas de librairie) : `viewBox="0 0 160 160"`, classe `h-44 w-44 -rotate-90`, cercle de fond `r=60 strokeWidth=22` gris ardoise, puis un arc par segment via `strokeDasharray` = `fraction × 2πr` et `strokeDashoffset` cumulé.
   - Segments : Essentielles `oklch(0.62 0.22 25)`, Investissements `oklch(0.7 0.18 200)`, Épargne `oklch(0.78 0.16 175)`.
   - Légende à droite : carré `h-3 w-3 rounded-sm` de la couleur, libellé, montant `fmtCFA` ; ligne finale séparée par `border-t border-border` : « Total dépensé » en gras.
   - Si tout est à zéro, le donut reste affiché avec son cercle de fond (division protégée par `|| 1`).

### Comportements
- Le Dashboard est **purement en lecture** : il reflète instantanément ce qui est saisi dans Activités et Finances.
- Les deux liens « Saisir → » et « Détails → » déclenchent la navigation par onglet (callback `goto("activities" | "finances")`).
- **Mode discret** : si activé globalement, tous les montants s'affichent `••••• F`.
- Un storage vide doit produire des zéros propres, jamais `NaN` ni écran blanc.
