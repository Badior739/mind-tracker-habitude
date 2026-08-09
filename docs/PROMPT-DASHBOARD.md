# PROMPT UNIQUE — Onglet « Dashboard » de Mind Tracker

Utilise ce prompt seul pour reproduire à l'identique l'onglet Dashboard (tableau de bord) de l'application Mind Tracker.

---

## Prompt à copier-coller

Crée l'onglet **Dashboard** d'une application de suivi personnel & financier nommée **Mind Tracker** (interface en français, monnaie FCFA).

### Stack et contraintes
- React + TypeScript, Tailwind CSS, icônes `lucide-react`.
- Aucune base de données : toutes les données sont lues depuis `localStorage`.
- Aucune couleur codée en dur : utiliser uniquement des tokens sémantiques (`primary`, `accent`, `success`, `warning`, `destructive`, `border`, `muted-foreground`, `secondary`) et les variables `--gradient-card` / `--gradient-primary`.
- Thème sombre élégant (ardoise + émeraude + cyan), coins arrondis `rounded-2xl`, halos flous, typographie `tracking-tight`.
- Responsive : 2 colonnes sur mobile, 4 sur desktop pour les statistiques.

### Données lues (localStorage)
- `mt.act.year` (number), `mt.act.month` (0-11) — période affichée, défaut = mois en cours.
- `mt.act.${year}-${month}` → `Record<number, DayEntry>` où `DayEntry = { reveil?: string; notes?: string; [activityKey]: boolean }`.
- `mt.fin.lines.${year}-${month}` → `FinanceLine[]` avec au minimum `{ category: "revenus" | "essentiel" | "investissement" | "epargne"; budget: number; reel: number }`.

Liste des 11 activités par défaut :
`🙏 Méditation, 📖 Lecture, 💪 Sport, 💻 Coding Vibe, 🎓 Formation, 📱 Réseaux Pro, 🍽️ Repas Sain, 💧 Eau 2L, 📝 Journal, 🌙 Sommeil <23h, 🎯 Tâche Prio`.

### Calculs (mois affiché uniquement)
- `total` = somme des activités cochées sur tous les jours du mois.
- `activeDays` = nombre de jours avec au moins une activité.
- `avg = total / nombre de jours du mois` → affiché `X.XX/11`.
- `pctScore = total / (jours × nb activités) × 100`.
- `rev` = somme des `reel` de catégorie `revenus`.
- `dep` = essentiel + investissement + épargne (valeurs `reel`).
- `solde = rev - dep` ; `taux d'épargne = épargne / revenus`.
- Formatage montants : `Intl.NumberFormat("fr-FR")` + suffixe ` F` (ex. `125 000 F`).
- Formatage pourcentages : 1 décimale.

### Structure visuelle (de haut en bas)

1. **Bandeau héros** — carte `rounded-2xl` avec fond `var(--gradient-card)`, halo circulaire flouté en haut à droite (`var(--gradient-primary)`, opacité 20 %, `blur-3xl`).
   - Micro-label en majuscules espacées, couleur `primary`, icône `Sparkles` : `MOIS ANNÉE` (ex. « AOÛT 2026 »).
   - Titre : « Bâtir Mind Graphix Solution, un jour à la fois. »
   - Sous-titre : « Vue d'ensemble de votre discipline quotidienne et de votre santé financière du mois en cours. »

2. **Quatre cartes de statistiques** (grille 2 × 2 mobile / 4 colonnes desktop), chacune avec libellé, grande valeur, sous-texte et icône colorée :
   - « Score moyen » → `X.XX/11`, sous-texte `N/JJ jours actifs`, ton `primary`, icône `Activity`.
   - « % Réussite » → `XX.X%`, sous-texte « Discipline globale », ton `accent`, icône `Target`.
   - « Solde net » → montant, sous-texte `revenus – dépenses`, ton `success` si ≥ 0 sinon `destructive`, icône `TrendingUp` / `TrendingDown`.
   - « Taux d'épargne » → pourcentage, sous-texte `Épargne : montant`, ton `primary`, icône `Wallet`.

3. **Deux panneaux côte à côte** (empilés sur mobile) :
   - **« Performance par activité (mois courant) »** avec un lien d'action « Saisir → » qui navigue vers l'onglet Activités. Pour chaque activité : emoji, libellé, barre de progression et compteur `n/jours`. Couleur de la barre : ≥ 75 % `success`, ≥ 50 % `primary`, ≥ 25 % `warning`, sinon `destructive`.
   - **« Répartition financière du mois »** avec un lien « Détails → » vers l'onglet Finances, contenant un **donut SVG** de 160 × 160 (rayon 60, `strokeWidth` 22, pivoté `-90°`) construit avec `strokeDasharray` / `strokeDashoffset`. Trois segments : Essentielles (rouge), Investissements (cyan), Épargne (émeraude), sur une piste de fond neutre. À droite, la légende avec pastille de couleur, libellé, montant, puis une ligne séparée « Total dépensé » en gras.

4. **Panneau « Streaks & badges »** en bas du dashboard :
   - Titre avec icône `Flame` en couleur `warning`.
   - Trois tuiles : « Actuel » (jours consécutifs avec score ≥ 8, couleur `warning`), « Record » (meilleure série sur 12 mois, couleur `primary`), « Parfaits » (jours à 11/11, couleur `accent`).
   - Grille de 8 badges (4 colonnes) : 🔥 3 jours, ⚡ 1 semaine, 🌟 2 semaines, 🏆 30 jours, 💎 Journée parfaite, 👑 5 jours parfaits, 📚 Régularité (30 jours enregistrés), 🚀 100 jours. Badge débloqué = bordure `primary/40` + fond `primary/10` ; verrouillé = opacité 50 %. Infobulle avec la condition au survol.
   - Note de bas de panneau avec icône `Trophy` : « Maintenez un score ≥ 8/11 chaque jour pour étendre votre série. »

### Comportements
- Rendu SSR-safe : ne rien afficher tant que `window` est indisponible ; recalculer via `useMemo` sur `[year, month]`.
- Les liens « Saisir → » et « Détails → » appellent une prop `goto(tab)`.
- Si aucune donnée n'existe, afficher zéros et barres vides — jamais d'erreur.