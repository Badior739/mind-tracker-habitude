# PROMPT UNIQUE — Onglet « Activités du jour » de Mind Tracker

Utilise ce prompt seul pour reproduire à l'identique l'onglet Activités de l'application Mind Tracker.

---

## Prompt à copier-coller

Crée l'onglet **Activités du jour** d'une application de suivi personnel nommée **Mind Tracker** (interface 100 % en français).

### Stack et contraintes
- React + TypeScript, Tailwind CSS, icônes `lucide-react`, toasts `sonner`.
- Aucune base de données : tout vit dans `localStorage`.
- Aucune couleur codée en dur : uniquement des tokens sémantiques (`primary`, `accent`, `success`, `warning`, `destructive`, `border`, `secondary`, `muted-foreground`, `foreground`, `background`) et la variable `--gradient-card`.
- Thème sombre (ardoise + émeraude + cyan), cartes `rounded-2xl` / `rounded-xl`, bordures `border-border`, chiffres en `tabular-nums`.
- Rendu SSR-safe : tout accès à `localStorage` protégé par `typeof window !== "undefined"`.
- Mobile-first : grilles adaptatives, cellules du calendrier en `aspect-square`.

### Verrouillage sur le mois en cours
La saisie est **toujours** verrouillée sur le mois courant (`year = new Date().getFullYear()`, `month = new Date().getMonth()`). Aucun sélecteur de mois. Chaque nouveau mois démarre avec un calendrier **vierge** (aucune couleur héritée) ; les mois passés se consultent dans l'onglet **Synthèse annuelle** (12 mois).

### Données (localStorage)
- `mt.act.${year}-${month}` → `Record<number, DayEntry>` (clé = numéro du jour)
  ```ts
  type DayEntry = {
    reveil?: string;
    notes?: string;
    prio1?: string; prio2?: string; prio3?: string;
    [activityKey: string]: string | boolean | undefined; // activité cochée = true
  };
  ```
- `mt.activities` → `CustomActivity[]` = `{ key: string; label: string; emoji: string }`.

Liste par défaut (11 activités) : 🙏 Méditation, 📖 Lecture, 💪 Sport, 💻 Coding Vibe, 🎓 Formation, 📱 Réseaux Pro, 🍽️ Repas Sain, 💧 Eau 2L, 📝 Journal, 🌙 Sommeil <23h, 🎯 Tâche Prio.

Hook `useLocalStorage(key, initial)` avec état couplé `{ k, v }` : il relit le storage dès que la clé change et n'écrit que si `state.k === key` (sinon les données d'un mois écrasent le suivant).

### Calculs
- `maxScore = activities.length` (11 par défaut).
- Score d'un jour = nombre d'activités à `true` ce jour-là.
- `avg = totalScore / nbJoursDuMois` ; `pctAvg = totalScore / (nbJours × maxScore) × 100`.
- `streakThreshold = Math.max(1, Math.ceil(maxScore * 0.72))` (8 sur 11).
- **Série actuelle** : on remonte du dernier jour vers le premier ; on incrémente tant que `score >= seuil`, on s'arrête au premier jour renseigné sous le seuil (les jours futurs vides ne cassent pas la série).
- **Meilleure série** : plus longue suite de jours `>= seuil`.
- **Jours manqués** : jours déjà passés dans le mois avec un score de 0.
- **Stats hebdomadaires** : blocs de 7 jours (coupure à `d % 7 === 0` et au dernier jour) → moyenne, max, total.
- Un jour est « vide » si aucune activité cochée **et** ni réveil, ni notes, ni priorités.

### Couleurs du calendrier (règle exacte)
| condition | fond | texte |
|---|---|---|
| jour vide (aucune donnée) | `bg-secondary/40` | `text-muted-foreground` |
| ≥ 80 % | `bg-[color:var(--success)]/70` | `text-[color:var(--success)]` |
| ≥ 60 % | `bg-primary/60` | `text-primary` |
| ≥ 40 % | `bg-[color:var(--warning)]/60` | `text-[color:var(--warning)]` |
| > 0 % | `bg-destructive/50` | `text-destructive` |

**Jamais de rouge sur un jour vide** : le neutre prime toujours.

### Structure visuelle (de haut en bas)

1. **Panneau « Mes activités (n) »** — icône `Settings`, deux boutons à droite : « + Ajouter » (`bg-primary/15 text-primary border-primary/30`) et « Configurer / Masquer ».
   - Mode replié : pastilles `rounded-full border-border` « emoji + libellé ».
   - Mode configuration : grille 1/2/3 colonnes, une carte par activité avec champ emoji (`w-12`, centré), champ libellé, bouton poubelle (hover `text-destructive`).
   - Ajout → `{ key: \`act-${Date.now()}\`, label: "Nouvelle activité", emoji: "✨" }` + toast.
   - Suppression → `window.confirm("Supprimer l'activité « X » ?")` puis toast avec action **Annuler** qui réinsère.

2. **Panneau « Mois Année »** (capitalisé) + badge pilule « Mois en cours ». À droite : « Score moyen : X.XX/11 » (primary) et « Réussite : XX.X% » (accent).
   - Bandeau d'info `bg-secondary/30` : « 🔄 Chaque nouveau mois, un calendrier vierge est créé. Les mois passés restent consultables dans **Synthèse annuelle** (12 mois). »

3. **Vue calendrier** — grille `grid-cols-7 gap-1.5`, en-têtes Lun→Dim, cases vides avant le 1er (semaine commençant lundi : `firstDay === 0 ? 6 : firstDay - 1`).
   - Chaque jour = bouton `aspect-square rounded-lg`, affiche le numéro du jour puis son score, `hover:scale-105`, `title` = « lundi 12 août — 8/11 ».
   - Jour du jour : `ring-2 ring-primary ring-offset-1`. Jour sélectionné : `outline outline-2 outline-accent scale-105`.
   - Au chargement, le jour sélectionné est **aujourd'hui**.

4. **Panneau détail du jour sélectionné** (s'affiche uniquement au clic sur une date) — carte `border-accent/40`, fond `var(--gradient-card)` :
   - En-tête : libellé complet du jour, badge « Aujourd'hui » si applicable, score `n/11` coloré, pourcentage, bouton ✕ pour fermer.
   - `ProgressBar` (success ≥ 75 %, primary ≥ 50 %, warning ≥ 25 %, sinon destructive).
   - Deux champs : « ⏰ Réveil » (placeholder `06:30`) et « 📝 Notes ».
   - **Activités cochables** : grille 2/3 colonnes, un bouton par activité ; coché = `bg-primary/15 border-primary/50 text-primary` avec ✓, sinon `border-border text-muted-foreground`.
   - **`<details>` « 🎯 Tâches prioritaires du jour »** (ouvert si une priorité existe) : 3 listes déroulantes Priorité 1/2/3 alimentées **par les activités cochées du jour** (repli sur toutes les activités si aucune n'est cochée), valeur = `"emoji label"`, plus une option « ✏️ Autre (saisie libre) » qui affiche un champ texte. Message d'aide si rien n'est coché : « 💡 Coche des activités ci-dessus pour restreindre la liste aux activités du jour. »
   - Pied : « ✓ Enregistré automatiquement » (1,8 s après chaque modification) sinon « 💾 Modifications sauvegardées en direct », et bouton « 💾 Enregistrer » qui affiche un toast avec la date.

5. **Quatre cartes statistiques** (2 colonnes mobile / 4 desktop) : `Flame` primary « Série actuelle », `Trophy` accent « Meilleure série », `Trophy` success « Meilleur jour » (jour + score), `CalendarDays` destructive « Jours manqués ».

6. **📊 Progression hebdomadaire** — une ligne par semaine : « Semaine n », `ProgressBar` de la moyenne, `X.X/11`, `max n`.

7. Si aucune date n'est sélectionnée : encart pointillé « 👆 Cliquez sur une date du calendrier pour voir et renseigner les activités de ce jour. »

### Comportements
- Toute modification (activité cochée, réveil, notes, priorité) est **écrite immédiatement** dans `localStorage`, sans bouton obligatoire.
- Le calendrier, les scores, les séries et les stats se recalculent en direct via `useMemo`.
- Aucune donnée ne quitte l'appareil ; un storage vide ne doit jamais planter l'écran.
