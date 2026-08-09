# PROMPT UNIQUE — Onglet « Finances » de Mind Tracker

Utilise ce prompt seul pour reproduire à l'identique l'onglet Finances de l'application Mind Tracker.

---

## Prompt à copier-coller

Crée l'onglet **Finances** d'une application de suivi personnel & financier nommée **Mind Tracker** (interface 100 % en français, monnaie **F CFA**).

### Stack et contraintes
- React + TypeScript, Tailwind CSS, icônes `lucide-react`, graphiques `recharts`, toasts `sonner`.
- Aucune base de données : toutes les données vivent dans `localStorage`.
- Aucune couleur codée en dur : uniquement des tokens sémantiques (`primary`, `accent`, `success`, `warning`, `destructive`, `border`, `muted-foreground`, `secondary`, `input`) et la variable `--gradient-card`.
- Thème sombre (ardoise + émeraude + cyan), cartes `rounded-2xl` / `rounded-xl`, bordures fines `border-border`, chiffres en `tabular-nums`.
- Responsive : **tableau sur desktop (`md:` et +)**, **cartes verticales empilées sur mobile**.
- Rendu SSR-safe : tout accès à `localStorage` protégé par `typeof window !== "undefined"`.

### Verrouillage sur le mois en cours
La saisie est **toujours** verrouillée sur le mois courant (`year = new Date().getFullYear()`, `month = new Date().getMonth()`). Aucun sélecteur de mois/année. Chaque nouveau mois repart d'un budget vierge ; l'historique se consulte dans l'onglet **Historique** (12 mois).

### Données (localStorage)
- `mt.fin.lines.${year}-${month}` → `FinanceLine[]`
  ```ts
  type FinanceCategory = "revenus" | "essentiel" | "investissement" | "epargne";
  type FinanceLine = {
    id: string; category: FinanceCategory; emoji: string;
    label: string; budget: number; reel: number; notes?: string;
  };
  ```
- `mt.fin.goals` → `Record<string, number>` (objectif par ligne d'épargne). Défaut : `{ "epa-1": 300000, "epa-2": 100000 }`.

Hook `useLocalStorage(key, initial)` avec état couplé `{ k, v }` : il relit le storage dès que la clé change et n'écrit que si `state.k === key` (sinon les données d'un mois écrasent le suivant).

Métadonnées de catégories :
| clé | emoji | libellé | ton |
|---|---|---|---|
| revenus | 📥 | Revenus mensuels | `text-success` |
| essentiel | 📤 | Dépenses essentielles | `text-destructive` |
| investissement | 🎓 | Investissements — Croissance MGS | `text-accent` |
| epargne | 🏦 | Épargne & filet de sécurité | `text-primary` |

Lignes par défaut (21) :
- **Revenus** : 💵 Salaire contrat 85000 (note « Entrer 0 si contrat terminé »), 🚀 MGS — Freelance / Projets 0, 🎓 MGS — Formations vendues 0, 📱 MGS — Réseaux / Affiliation 0, 💼 Autres revenus 0.
- **Essentiel** : 🏠 Loyer / logement 20000, 🍽️ Alimentation / épicerie 15000, 🚌 Transport 5000, 📱 Téléphone + Internet 5000, 🏥 Santé / pharmacie 3000, 💡 Électricité / eau 2000.
- **Investissement** : 🎓 Formations / certifications 5000, 📚 Livres / ressources 2000, 🛠️ Outils dev (Cursor, Vercel…) 3000, 🌐 Domaine + hébergement MGS 2000, 📣 Marketing / publicité MGS 3000, 🤝 Réseau / événements 2000.
- **Épargne** : 🏦 Épargne urgence mensuelle 10000, 💡 Fonds de lancement MGS 5000, 🎉 Loisirs / sorties 3000, 📦 Tampon imprévus (5%) 3350.
Tous les `reel` démarrent à 0.

### Calculs (`useMemo` sur `lines`)
- Par catégorie : total `budget` et total `reel`.
- `depB / depR` = essentiel + investissement + épargne.
- `soldeB = revenus.budget − depB` ; `soldeR = revenus.reel − depR`.
- `txEpargne = epargne.reel / revenus.reel` (0 si revenus nuls).
- `ratioEss = essentiel.reel / revenus.reel`.
- Écart d'une ligne = `reel − budget` : **positif = rouge (`destructive`), négatif = vert (`success`), nul = neutre**.
- Formats : `Intl.NumberFormat("fr-FR")` + ` F` ; pourcentages à 1 décimale.

### Structure visuelle (de haut en bas)

1. **Bandeau mois** — carte `rounded-xl`, fond `var(--gradient-card)` : icône `Wallet`, « Août 2026 » (capitalisé), badge pilule « Mois en cours » (`bg-primary/15 text-primary border-primary/30`). À droite, texte discret : « 🔄 Nouveau budget vierge chaque mois · Historique 12 mois → onglet **Historique** ».

2. **Quatre cartes de statistiques** (2 colonnes mobile / 4 desktop) : « Revenus (réel) » (`TrendingUp`, ton success), « Dépenses totales » (`TrendingDown`, destructive), « Solde net » (`Wallet`, success si ≥ 0 sinon destructive), « Taux d'épargne » (`PiggyBank`, primary, sous-texte « Essentielles : XX.X% »).
   Les trois premières affichent en sous-texte un composant **Tendance** comparant au mois précédent (`mt.fin.lines.${py}-${pm}`) : flèche `ArrowUpRight` verte ou `ArrowDownRight` rouge, `+montant F (+x.x%) vs mois préc.` ; « — » si aucune donnée précédente.

3. **Ligne graphique + objectifs** (grille 3 colonnes desktop) :
   - **Carte « Répartition dépenses »** (1 col) : donut Recharts `PieChart` 128 × 128, `innerRadius` 36, `outerRadius` 58, `paddingAngle` 3, `stroke: none`, tooltip formaté en F CFA. Segments : Essentiel (destructive), Investissement (accent), Épargne (primary) — on n'affiche que les valeurs > 0. Légende à droite : pastille ronde, libellé, pourcentage du total.
   - **Panneau « Objectifs d'épargne »** (2 col, icône `Target`) : pour chaque ligne de catégorie `epargne` → emoji + libellé, `réel / objectif`, barre de progression (`success` ≥ 100 %, `primary` ≥ 50 %, sinon `warning`), et un champ numérique « Objectif : » éditable qui écrit dans `mt.fin.goals`.

4. **Quatre panneaux, un par catégorie** (revenus, essentiel, investissement, epargne). En-tête : emoji + libellé coloré au ton de la catégorie ; à droite « Total : réel / budget » puis « Écart : ±montant » coloré.
   - **Mobile (`md:hidden`)** : une carte par ligne — champ emoji (10 px de large, centré), champ libellé, bouton poubelle ; puis 2 colonnes Budget / Réel ; puis ligne « Écart » colorée ; puis champ « Notes… ».
   - **Desktop (`hidden md:block`)** : tableau avec colonnes Icône · Poste · Budget · Réel · Écart · Notes · (bouton supprimer). Tous les champs éditables inline (`TextInput` / `NumberInput`), lignes séparées par `border-t border-border`.
   - En bas de chaque panneau : bouton « + Ajouter une ligne » (`bg-primary/15 text-primary border-primary/30`). Nouvelle ligne = `{ id: \`${category}-${Date.now()}\`, label: "Nouveau poste", budget: 0, reel: 0 }` avec emoji par défaut : revenus 💰, essentiel 🧾, investissement 🚀, épargne 🏦.

### Comportements
- Toute modification (emoji, libellé, budget, réel, notes) est **enregistrée immédiatement** dans localStorage.
- Ajout d'une ligne → toast de succès « Nouvelle ligne ajoutée ».
- Suppression → `window.confirm("Supprimer « libellé » ?")` puis toast avec action **Annuler** qui réinsère la ligne.
- **Mode discret** : si activé globalement, tous les montants s'affichent `••••• F`.
- Aucune donnée ne quitte l'appareil ; si le storage est vide, on repart des lignes par défaut sans jamais planter.
