# PROMPT UNIQUE — Onglet « Activités du jour » (réplique exacte en Flutter)

Copie-colle le prompt ci-dessous tel quel dans un agent de génération Flutter.

---

## Prompt

Crée en **Flutter (Dart, null-safety, Material 3)** un écran unique nommé `ActivitiesScreen` qui reproduit **à l'identique** l'onglet « Activités du jour » de l'application **Mind Tracker** (interface en français). Respecte scrupuleusement chaque valeur, libellé, emoji, couleur, arrondi, espacement et règle de calcul décrits ci-dessous, sans rien omettre.

### 1. Dépendances et persistance
- `shared_preferences` pour le stockage local (équivalent de `localStorage`).
- Aucune API, aucune base distante. Tout est local.
- Clés utilisées :
  - `mt.act.<year>-<month>` (month = index 0-11) → JSON `Map<String, DayEntry>` indexé par le numéro du jour (`"1"`, `"2"`, …).
  - `mt.activities` → JSON `List<CustomActivity>`.
- Écriture immédiate à chaque modification (sauvegarde automatique).

### 2. Modèles
```dart
class CustomActivity {
  final String key;
  String label;
  String emoji;
}

class DayEntry {
  String? reveil;            // ex. "06:30"
  String? notes;
  String? prio1;
  String? prio2;
  String? prio3;
  Map<String, bool> checks;  // clé d'activité -> coché
}
```

### 3. Activités par défaut (dans cet ordre exact)
| key | label | emoji |
| --- | --- | --- |
| meditation | Méditation | 🙏 |
| lecture | Lecture | 📖 |
| sport | Sport | 💪 |
| coding | Coding Vibe | 💻 |
| formation | Formation | 🎓 |
| reseaux | Réseaux Pro | 📱 |
| repas | Repas Sain | 🍽️ |
| eau | Eau 2L | 💧 |
| journal | Journal | 📝 |
| sommeil | Sommeil <23h | 🌙 |
| priorite | Tâche Prio | 🎯 |

### 4. Thème sombre (tokens à définir une seule fois)
- `background` : `#0B1220` — `foreground` : `#E6EDF7`
- `primary` (émeraude) : `#10B981` — `accent` (cyan) : `#22D3EE`
- `success` : `#22C55E` — `warning` : `#F59E0B` — `destructive` : `#EF4444`
- `border` : `#1E293B` — `secondary` : `#111C2E` — `mutedForeground` : `#94A3B8`
- `gradientCard` : `LinearGradient` de `#0F172A` vers `#111C2E` (haut-gauche → bas-droite).
- Rayons : cartes `20`, tuiles `12`, boutons `8`. Police système, titres en `w600`, chiffres en `w700`.

### 5. Règle de mois
L'écran est **verrouillé sur le mois en cours** (`DateTime.now()`), aucune navigation entre les mois. Chaque nouveau mois repart d'un calendrier vierge (nouvelle clé de stockage). Les mois passés restent stockés et consultables ailleurs (« Synthèse annuelle », hors périmètre de cet écran).

### 6. Calculs (identiques au web)
- `maxScore = activities.length` (minimum 1).
- `score(jour) = nombre d'activités cochées ce jour`.
- `totalScore = somme des scores du mois` ; `dim = nombre de jours du mois`.
- `avg = totalScore / dim` (affiché avec 2 décimales) ; `pctAvg = totalScore / (dim * maxScore) * 100` (1 décimale).
- `streakThreshold = max(1, (maxScore * 0.72).ceil())`.
- `currentStreak` : parcourir les jours du dernier vers le premier ; incrémenter tant que `score >= streakThreshold` ; couper si `score > 0` mais inférieur au seuil ; couper aussi sur un jour à 0 qui n'est pas le dernier jour du mois.
- `bestStreak` : plus longue suite de jours avec `score >= streakThreshold`.
- `bestDay` : jour au score le plus élevé (premier atteint en cas d'égalité).
- `missedDays` : nombre de jours **déjà passés** (index < jour du mois actuel) dont le score vaut 0.
- `weeklyStats` : découpe séquentielle, on clôture une semaine quand `jour % 7 == 0` ou au dernier jour du mois ; pour chaque semaine, stocker `week`, `avg`, `best` (score max), `total`.
- `hasEntry(jour)` : vrai si `reveil`, `notes`, `prio1`, `prio2` ou `prio3` est non vide, ou si au moins une activité est cochée.

### 7. Couleurs de score
`getScoreColor(score, max, empty)` :
- `empty == true` → `secondary` à 40 % d'opacité,
- `p = score / max * 100` : `p >= 80` → `success` 70 %, `p >= 60` → `primary` 60 %, `p >= 40` → `warning` 60 %, `p > 0` → `destructive` 50 %, sinon `secondary` 40 %.

`getScoreTextColor(score, max)` : `>= 80` → `success`, `>= 60` → `primary`, `>= 40` → `warning`, sinon `destructive`. Si le jour est vide, utiliser `mutedForeground`.

### 8. Structure de l'écran (dans cet ordre, séparés par 24 px)

#### Carte A — « Mes activités (N) »
- Titre avec icône réglages en `primary` : `⚙️ Mes activités (N)` où N = nombre d'activités.
- Actions en haut à droite : bouton `＋ Ajouter` (fond `primary` 15 %, bordure `primary` 30 %, texte `primary`) et bouton `Configurer` / `Masquer` (bordure `border`).
- Mode **replié** : chips arrondies (`StadiumBorder`, bordure `border`) affichant `emoji + label`.
- Mode **configuration** : grille responsive (1 colonne en mobile, 2 en tablette, 3 en desktop). Chaque ligne = champ emoji (largeur 48, centré) + champ label extensible + bouton corbeille (au survol/appui : couleur `destructive`).
- `Ajouter` crée `{ key: "act-<timestampMs>", label: "Nouvelle activité", emoji: "✨" }` et affiche un SnackBar « Activité ajoutée — Personnalise son nom et son emoji. ».
- Supprimer demande une confirmation « Supprimer l'activité « <label> » ? » puis affiche un SnackBar « Activité supprimée » avec une action **Annuler** qui la restaure.

#### Carte B — Calendrier du mois
- Titre : icône calendrier `primary` + `<Mois> <Année>` (mois en français, première lettre en majuscule) + badge pilule `Mois en cours` (fond `primary` 15 %, bordure `primary` 30 %).
- À droite du titre : `Score moyen : X.XX/<max>` (valeur en `primary`) et `Réussite : XX.X%` (valeur en `accent`).
- Bandeau d'information : fond `secondary` 30 %, bordure `border` 60 %, texte 11 px : « 🔄 Chaque nouveau mois, un calendrier vierge est créé. Les mois passés restent consultables dans **Synthèse annuelle** (12 mois). »
- Sous-titre « Vue calendrier » avec icône calendrier.
- **Grille 7 colonnes**, espacement 6 px, en-têtes `Lun, Mar, Mer, Jeu, Ven, Sam, Dim` (semaine commençant **lundi**). Cellules vides avant le 1er du mois : `secondary` 30 %.
- Chaque case de jour : carré (`aspect ratio` 1), rayon 12, fond = `getScoreColor`, contenant le numéro du jour (10 px, `foreground` 80 %) au-dessus du score (10 px, gras, couleur de texte du score). Tooltip : `<jour libellé> — <score>/<max>`.
- Jour courant : anneau `primary` de 2 px. Jour sélectionné : contour `accent` de 2 px et légère mise à l'échelle (1.05). Appui = sélection du jour.
- Par défaut, le jour sélectionné est **aujourd'hui**.

#### Panneau de détail du jour sélectionné (affiché sous le calendrier)
- Carte rayon 16, bordure `accent` 40 %, fond `gradientCard`, padding 16.
- En-tête : libellé complet du jour (ex. « Lundi 10 août »), badge `Aujourd'hui` si applicable ; à droite `score/max` coloré, pourcentage entier, et bouton `✕` pour désélectionner.
- Barre de progression du jour : `>= 75 %` `success`, `>= 50 %` `primary`, `>= 25 %` `warning`, sinon `destructive`.
- Deux champs côte à côte (empilés en mobile) : `⏰ Réveil` (placeholder `06:30`) et `📝 Notes` (placeholder `…`).
- Section « Activités » : grille de 2 colonnes (3 en écran large) de boutons bascule. Coché → fond `primary` 15 %, bordure `primary` 50 %, texte `primary`, coche `✓` à droite. Non coché → bordure `border`, texte `mutedForeground`.
- Section repliable `🎯 Tâches prioritaires du jour` (ouverte d'office si au moins une priorité est renseignée), chevron `▾` pivotant :
  - trois champs `Priorité 1`, `Priorité 2`, `Priorité 3`, chacun un **menu déroulant** ;
  - options : `— Choisir une activité —` (valeur vide), puis les activités **cochées ce jour** (`emoji + espace + label`), ou toutes les activités si aucune n'est cochée, puis `✏️ Autre (saisie libre)` ;
  - choisir la saisie libre affiche un champ texte avec le placeholder `Objectif clé n°<n>…` ;
  - si aucune activité n'est cochée, afficher en italique 10 px : « 💡 Coche des activités ci-dessus pour restreindre la liste aux activités du jour. »
- Pied de panneau séparé par une ligne `border` 60 % : à gauche « ✓ Enregistré automatiquement » en `success` pendant 1800 ms après chaque modification, sinon « 💾 Modifications sauvegardées en direct » ; à droite le bouton `💾 Enregistrer` (style `primary` 15 %) qui force la sauvegarde et affiche un SnackBar « Journée enregistrée » avec le libellé du jour.

#### Bloc statistiques rapides (4 tuiles : 2 colonnes en mobile, 4 en large)
Chaque tuile : rayon 16, bordure `border`, fond `gradientCard`, pastille carrée 36 px avec icône, puis grande valeur et légende 10 px.
1. Icône flamme `primary` — valeur `currentStreak` — « Série actuelle ».
2. Icône trophée `accent` — valeur `bestStreak` — « Meilleure série ».
3. Icône trophée `success` — valeur `bestDay.score/max` — « Meilleur jour (<numéro>) ».
4. Icône calendrier `destructive` — valeur `missedDays` — « Jours manqués ».

#### Bloc « 📊 Progression hebdomadaire »
Une ligne par semaine : libellé `Semaine <n>` (largeur fixe 56), barre de progression (`avg / maxScore * 100`) dont la teinte suit `avg >= streakThreshold` → `success`, `avg >= max * 0.45` → `primary`, `avg >= max * 0.25` → `warning`, sinon `destructive`, puis `X.X/<max>` aligné à droite et `max <best>` en 10 px.

#### État vide
Si aucun jour n'est sélectionné, afficher un encadré en pointillés, texte centré 12 px : « 👆 Cliquez sur une date du calendrier pour voir et renseigner les activités de ce jour. »

### 9. Exigences de qualité
- Code Dart formaté (`dart format`), compilant sans erreur ni avertissement, **sans virgule manquante** ni argument oublié : chaque argument nommé se termine par une virgule finale (trailing comma) pour un formatage propre.
- Découper en widgets réutilisables : `PanelCard`, `StatTile`, `ProgressBarWidget`, `CalendarGrid`, `DayDetailPanel`, `ActivityChip`.
- Gérer proprement l'absence de données (aucune exception, valeurs par défaut à zéro).
- Adaptatif : `LayoutBuilder` pour basculer 1/2/3 colonnes selon la largeur.