# PROMPT — Réplique exacte de « Mind Tracker »

Copie-colle ce prompt tel quel dans Lovable (projet vide) pour reconstruire l'application à l'identique, onglet par onglet.

---

## 0. Contexte & stack

Construis une application web mono-page nommée **Mind Tracker** (marque : *Mind Graphix Solution — MGS*), 100 % en français, orientée mobile-first (Android) et installable en PWA.

Stack imposée : **TanStack Start (React 19 + TanStack Router)**, **Vite**, **Tailwind CSS v4** (tokens dans `src/styles.css`), **lucide-react**, **recharts**, **sonner** (toasts). Aucune base de données : **toutes les données vivent dans `localStorage`**. Une seule route `/` qui affiche un `Shell` avec un onglet actif (state `tab`), pas de sous-routes.

## 1. Design system (obligatoire, thème sombre unique)

Tokens `oklch` dans `:root` de `src/styles.css`, tous les composants utilisent des classes sémantiques (jamais `text-white`, `bg-[#...]`) :

```
--background: oklch(0.16 0.02 250)   /* ardoise nuit */
--foreground: oklch(0.97 0.01 240)
--card:       oklch(0.21 0.025 250)
--primary:    oklch(0.78 0.16 175)   /* émeraude */
--accent:     oklch(0.7 0.18 200)    /* cyan */
--secondary:  oklch(0.27 0.03 250)
--muted-foreground: oklch(0.68 0.03 240)
--destructive: oklch(0.62 0.22 25)
--border:     oklch(0.3 0.03 250)
--input:      oklch(0.27 0.03 250)
--radius: 0.625rem
+ --success et --warning enregistrés dans @theme inline
+ --gradient-card : dégradé subtil appliqué en style={{ background: "var(--gradient-card)" }} sur les cartes
```

Style visuel : glassmorphism sombre, bordures `border-border` fines, coins `rounded-xl`, halos `shadow-[0_0_15px_-2px_var(--primary)]` sur les éléments actifs, chiffres en `tabular-nums`, emojis comme icônes de contenu, `lucide-react` pour l'UI.

Composants partagés dans `src/components/mind/ui.tsx` : `Panel` (titre + slot `action` + contenu), `NumberInput`, `TextInput`, `ProgressBar` (prop `tone` : primary | accent | success | warning | destructive).

## 2. Shell & navigation (`src/components/mind/Shell.tsx`)

- **Sidebar desktop** listant 8 onglets avec icône lucide, libellé et sous-titre :
  1. `dashboard` — Tableau de bord — *Vue globale* — `LayoutDashboard`
  2. `activities` — Activités du jour — *Suivi quotidien* — `CalendarCheck`
  3. `annual` — Synthèse annuelle — *Progression /11* — `TrendingUp`
  4. `finances` — Finances — *Budget mensuel* — `Wallet`
  5. `history` — Historique — *12 mois* — `LineChart`
  6. `roadmap` — Roadmap MGS — *Vision stratégique* — `Rocket`
  7. `guide` — Guides — *Mode d'emploi* — `BookOpen`
  8. `settings` — Paramètres — *PIN, rappels, exports* — `Settings`
- **Header** : brand Mind Tracker, salutation contextuelle (Bonjour / Bon après-midi / Bonsoir) + date du jour en toutes lettres, bouton **cadenas** (verrouillage manuel), bouton **œil** (mode discret qui masque les montants en `••••• F`).
- **Barre d'onglets fixe en bas sur mobile** avec 4 raccourcis : dashboard, activities, finances, roadmap.
- **Swipe horizontal** entre onglets sur mobile + raccourcis clavier `Alt+1..8` sur desktop.
- Bouton flottant **retour en haut** apparaissant au scroll.
- `<Toaster />` sonner monté une seule fois dans `__root.tsx`.

## 3. Sécurité — PIN (`src/lib/pin.ts`, `PinLock.tsx`)

- Code PIN **6 chiffres**, stocké **haché en SHA-256** (jamais en clair) dans localStorage.
- Écran `PinLock` plein écran : pavé numérique tactile, points de saisie, mode `setup` (création/changement avec double saisie) et mode `auto` (déverrouillage).
- Toutes les lectures de storage protégées par `typeof window !== "undefined"` et un flag d'hydratation `ready` pour éviter les erreurs SSR.
- **Verrouillage auto après 1 min d'inactivité** (`mousemove`, `keydown`, `touchstart`, `click`, `scroll`) et immédiatement quand l'onglet passe en `visibilitychange: hidden`.

## 4. Modèle de données (`src/lib/mind-data.ts`)

11 activités par défaut : Méditation 🙏, Lecture 📖, Sport 💪, Coding Vibe 💻, Formation 🎓, Réseaux Pro 📱, Repas Sain 🍽️, Eau 2L 💧, Journal 📝, Sommeil <23h 🌙, Tâche Prio 🎯. L'utilisateur peut en ajouter / supprimer / renommer ; le score `/11` s'ajuste automatiquement au nombre d'activités.

4 catégories financières : `revenus` (📥 Revenus mensuels), `essentiel` (📤 Dépenses essentielles), `investissement` (🎓 Investissements — Croissance MGS), `epargne` (🏦 Épargne & filet de sécurité), avec ~21 lignes par défaut : Salaire contrat 85000, MGS Freelance, MGS Formations, MGS Réseaux/Affiliation, Autres revenus / Loyer 20000, Alimentation 15000, Transport 5000, Téléphone+Internet 5000, Santé 3000, Électricité-eau 2000 / Formations 5000, Livres 2000, Outils dev 3000, Domaine+hébergement 2000, Marketing 3000, Réseau 2000 / Épargne urgence 10000, Fonds de lancement MGS 5000, Loisirs 3000, Tampon imprévus 3350. Devise **F CFA**, format `Intl.NumberFormat("fr-FR")` + " F".

Roadmap par défaut : 5 phases (Fondations, Acquisition, Scaling, Indépendance, Croissance) avec période, objectif et coche `done`.

Clés localStorage : `mt.act.{année}-{mois}`, `mt.fin.lines.{année}-{mois}`, `mt.roadmap`, `mt.app.v1`, `mt.notifs.v1`, `mt.act.year`, `mt.fin.year`.

**Hook `useLocalStorage(key, initial)` critique** : il garde un état couplé `{ k: key, v: value }`, relit le storage dès que la clé change et n'écrit que si `state.k === key`. Sans ça, les données d'un mois se réécrivent sur le mois suivant.

## 5. Onglets — spécification écran par écran

### 5.1 Tableau de bord
Cartes de métriques du mois en cours : revenus, dépenses, solde net, taux d'épargne, score d'activité moyen /11 et % de réussite. Chaque carte est cliquable et navigue vers l'onglet correspondant. En dessous, panneau **Streaks & badges** : série en cours (icône flamme), record, badges débloqués selon la régularité.

### 5.2 Activités du jour — vue centrée calendrier
- Verrouillé sur le **mois en cours** (badge « Mois en cours », aucune navigation temporelle) ; message expliquant que les mois passés sont archivés dans la Synthèse annuelle.
- **Grille calendrier mensuelle** : chaque case colorée selon le score du jour (vert ≥ 75 %, orange ≥ 50 %, rouge < 25 %) mais **neutre (`bg-secondary/40`) si le jour est vide** (aucune activité cochée, ni note, ni réveil) — une fonction `hasEntry(entry)` conditionne la couleur. Le jour courant est mis en évidence et sélectionné par défaut.
- Cliquer une date ouvre en dessous le **panneau détail du jour** : heure de réveil, cases à cocher des activités (grille 2 colonnes sur mobile), champ notes, score /N et %, mention « Enregistré automatiquement » + bouton **Enregistrer**.
- Section repliable **🎯 Tâches prioritaires du jour** : 3 sélecteurs (`select`) alimentés automatiquement par les activités cochées ce jour-là, avec une option « Saisie libre ».
- Panneau **Configurer mes activités** : ajouter / renommer / supprimer une habitude (emoji + libellé).
- Stats hebdomadaires (moyenne par semaine) et mini-dashboard performance : série en cours, record, meilleur jour, jours manqués.

### 5.3 Synthèse annuelle
Sélecteur d'année. 4 métriques : score annuel moyen /11, % de réussite annuelle, meilleur mois, mois à renforcer. Tableau 12 colonnes (Janv…Déc) avec 3 lignes : ⭐ score moyen /11, 📊 % réussite (mini `ProgressBar` colorée par palier), 📅 jours actifs `x/31`. Puis grille de cartes « Progression par activité (année) » : total/possible + barre de progression + %.

### 5.4 Finances
- Verrouillé sur le **mois en cours** (pas de sélecteur mois/année).
- Tableau Budget / Réel / Écart par catégorie sur desktop, **cartes verticales empilées sur mobile**. Chaque catégorie a un bouton « Ajouter une ligne » et chaque ligne une icône poubelle ; emoji, libellé, budget, réel et notes éditables inline.
- Totaux automatiques : revenus, dépenses (essentiel + investissement + épargne), solde net, taux d'épargne.
- **Doughnut Recharts** de répartition des dépenses (Essentiel / Investissement / Épargne).
- **Objectifs d'épargne** éditables avec barres de progression.
- **Tendances** ↑↓ comparant le mois courant au mois précédent.
- Tous les montants respectent le mode discret (`••••• F`).

### 5.5 Historique (12 mois)
Sélecteur d'année. Tableau 12 mois + colonne Total avec les lignes : 💵 Revenus, 📤 Dépenses, 💰 Solde net, 🏠 Essentielles, 🎓 Investissements, 🏦 Épargne. En dessous : histogramme **Revenus vs Dépenses** (barres vertes/rouges par mois + légende) puis **Évolution du solde net** (barre horizontale par mois, verte si positif, rouge si négatif, montant à droite).

### 5.6 Roadmap MGS
Timeline verticale avec ligne de liaison et pastille ronde cliquable pour valider une phase (halo émeraude quand `done`). Titre du panneau : « Roadmap stratégique MGS — X/Y phases validées ». Chaque carte : phase, objectif et période éditables inline + bouton supprimer ; bouton **Ajouter** dans l'en-tête.

### 5.7 Guides
Mode d'emploi intégré : comment remplir les activités quotidiennes, comment gérer le budget mensuel (règle de répartition), interprétation des scores et des couleurs.

### 5.8 Paramètres
- **Code PIN** : bouton « Changer le code PIN » (relance `PinLock` en mode setup).
- **Notifications & rappels** : interrupteur global, puis réglages **séparés Activités et Finances** (activé/désactivé, fréquence quotidien/hebdo, heure `HH:MM`), plus alertes budget et félicitations de score. Sélecteur de **fuseau horaire IANA** (défaut `Africa/Abidjan`). Bouton **Tester maintenant** et **bloc de diagnostic** affichant : permission (accordée / refusée / à demander), support navigateur, HTTPS, mode PWA standalone, service worker enregistré, plus un bouton « Ouvrir dans un onglet complet » (les iframes bloquent les notifications).
- **Export** : CSV activités du mois, CSV finances du mois, impression PDF (`window.print()`), séparateur `;` et BOM UTF-8 pour Excel.
- **Sauvegarde universelle** : export d'un fichier `.json` unique contenant toutes les clés `mt.*`, et import avec deux modes — *Remplacer tout* ou *Fusionner*. C'est le mécanisme de synchronisation entre appareils (pas de cloud).
- **Zone de purge** : « Vider le mois en cours » (supprime `mt.act.{ym}` et `mt.fin.lines.{ym}`) et « Tout effacer » (purge complète), avec confirmation.
- Interrupteur **mode discret**.

## 6. Notifications (`src/lib/notifications.ts` + `public/notifications/sw.js`)

- Service worker dédié enregistré sous le scope `/notifications/` (`ensureNotificationWorker`) pour permettre les notifications système sur Android.
- Demande de permission déclenchée au premier déverrouillage via un toast « Activer les rappels Mind Tracker ? » avec action **Autoriser** (une seule fois par session).
- `notify()` renvoie un résultat explicite : envoyée par le système, **repli automatique en toast interne**, ou échec avec cause.
- `runNotificationChecks(prefs)` tourne toutes les 60 s, compare l'heure locale calculée avec `Intl.DateTimeFormat` sur le fuseau choisi et déclenche : rappel activités, rappel finances, alerte dépassement de budget, félicitations si score élevé. Anti-doublon par jour via une clé localStorage.

## 7. PWA

`public/manifest.webmanifest` (nom « Mind Tracker », thème sombre, icônes), lien manifest injecté au montage, application installable et utilisable hors-ligne pour la saisie.

## 8. SEO / head

Route `/` avec `head()` : titre « Mind Tracker — Tableau de bord personnel & financier », description, `og:title`, `og:description`, `og:type`, `twitter:card`.

## 9. Règles non négociables

1. Aucune donnée ne quitte l'appareil ; pas de backend.
2. Les onglets **Activités** et **Finances** ne montrent **que le mois en cours** ; l'historique se consulte dans Synthèse annuelle et Historique.
3. Un jour sans donnée n'est **jamais** coloré en rouge.
4. Toutes les listes (activités, lignes financières, phases roadmap, objectifs d'épargne) sont ajoutables et supprimables par l'utilisateur.
5. Toute action destructive affiche un toast avec option **Annuler** ou une confirmation.
6. Interface intégralement en français, montants en F CFA.
