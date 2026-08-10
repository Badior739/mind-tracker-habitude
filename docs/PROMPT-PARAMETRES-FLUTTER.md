# PROMPT — Écran « Paramètres » (Mind Tracker) en Flutter

> Copie-colle ce prompt tel quel dans ton agent Flutter. Objectif : réplique **exacte** de l'onglet Paramètres de Mind Tracker, sans rien omettre. Code Dart formaté avec **virgules finales (trailing commas)** partout.

---

## 1. Stack imposée

- Flutter 3.x, **Material 3**, `useMaterial3: true`, thème **sombre**.
- Persistance : `shared_preferences` (clés préfixées `mt.`).
- Notifications : `flutter_local_notifications` + `permission_handler` + `timezone` (fuseaux IANA).
- Fichiers : `file_picker` (import), `path_provider` + `share_plus` (export), `csv` (CSV), `printing`/`pdf` (PDF).
- Hash PIN : `crypto` (SHA-256).
- Architecture : `lib/screens/settings_screen.dart`, `lib/models/prefs.dart`, `lib/services/{notif_service,backup_service,export_service,pin_service}.dart`.

## 2. Design system (identique à l'app)

- Fond `#0B1220`, surfaces `#111A2B`, bordures `#1E2A3F`.
- `primary` = émeraude `#10B981`, `accent` = cyan `#22D3EE`, `destructive` = `#EF4444`,
  `success` = `#22C55E`, `warning` = `#F59E0B`, texte secondaire `#94A3B8`.
- Rayon des cartes 16, padding 16, ombre douce.
- **Panel** = carte avec un titre en ligne : icône colorée 16px + libellé semi-gras 14px, puis le contenu.
- **Row** = ligne `label` (14 semi-gras) + `hint` optionnel (12, gris) à gauche, contrôle à droite,
  séparée par un `Divider` 1px `#1E2A3F` (pas de divider sur la dernière ligne).
- **Switch** = `Switch.adaptive` teinté primary.
- Toute la copie est en **français**, garde les emojis des sous-titres.

## 3. Modèles (lib/models/prefs.dart)

```dart
class NotifPrefs {
  bool enabled;                 // false
  bool activitiesEnabled;       // true
  String activitiesFrequency;   // 'daily' | 'weekly'  -> 'daily'
  String activitiesTime;        // 'HH:MM' -> '21:00'
  bool financesEnabled;         // true
  String financesFrequency;     // 'weekly'
  String financesTime;          // '19:00'
  String timezone;              // détecté, défaut 'Africa/Abidjan'
  bool budgetAlerts;            // true
  bool scoreCongrats;           // true
}

class AppPrefs {
  bool discreet;                // false — masque les montants
  int lockTimeoutMs;            // 60000
}
```

Clés SharedPreferences : `mt.notifs.v1` et `mt.app.v1` (JSON encodé). Sauvegarde immédiate à chaque changement.

## 4. Contenu de l'écran — 6 panneaux, dans cet ordre exact

### 4.1 🔒 « Sécurité — Code PIN » (icône `Icons.lock`, primary)
- Row « Code PIN défini » — hint : `"Votre PIN protège l'accès à l'application."` si PIN présent, sinon `"Aucun PIN défini pour le moment."` ; valeur à droite : `✓ Actif` en vert ou `Non défini` en gris.
- Row « Verrouillage automatique » — hint « Durée d'inactivité avant verrouillage » ; `DropdownButton<int>` : 30 s / 1 min / 2 min / 5 min (30000, 60000, 120000, 300000).
- Deux boutons : « Changer le PIN » (outline, `Icons.refresh`) → callback `onChangePin` ; « Supprimer le PIN » (outline destructive, `Icons.verified_user`) → `AlertDialog` « Supprimer le code PIN ? » puis `clearPin()`.

### 4.2 🔔 « Notifications & rappels » (icône `Icons.notifications`, accent)
- **Bloc diagnostic** en haut : bordure/fond vert si les notifications système sont disponibles, sinon orange (warning). Icône `check_circle` / `cancel`. Ligne 1 : `Diagnostic : <message>`. Ligne 2 (gris, 11px) : `Autorisation : accordée|bloquée|pas encore demandée · HTTPS : oui|non · App installée : oui|non` (sur Flutter : `Autorisation … · Canal notif : oui/non · Exact alarms : oui/non`).
- Si permission refusée définitivement : encart rouge « Les notifications sont bloquées par le navigateur/le système. Autorisez-les dans les réglages pour activer les rappels. » + bouton `openAppSettings()`.
- Row « Activer les notifications » (hint « Autorise l'envoi de rappels depuis Mind Tracker ») : Switch actif seulement si permission accordée. À l'activation : demander la permission, créer le canal, planifier, envoyer « Notifications activées / Vous recevrez vos rappels Mind Tracker. » et un SnackBar de succès. Si refusée → SnackBar rouge.
- Sous-titre `🎯 Activités` (11px, gras, majuscules, primary) :
  - Row « Rappel pour les activités » — hint « Si toutes les activités ne sont pas cochées » — Switch.
  - Row « Fréquence » — dropdown Quotidien / Hebdomadaire (dimanche).
  - Row « Heure du rappel » — `showTimePicker`, affichage `HH:MM`.
- Sous-titre `💰 Finances` (accent) : mêmes 3 lignes (« Rappel financier », hint « Bilan / vérification des dépenses »).
- Sous-titre `🌍 Fuseau horaire` : Row « Fuseau », hint `Détecté : <tz locale>`, dropdown avec exactement cette liste :
  `Africa/Abidjan, Africa/Dakar, Africa/Casablanca, Africa/Algiers, Africa/Tunis, Africa/Lagos, Africa/Douala, Africa/Kinshasa, Africa/Nairobi, Africa/Johannesburg, Europe/Paris, Europe/London, Europe/Madrid, Europe/Rome, Europe/Brussels, America/Montreal, America/New_York, America/Los_Angeles, Asia/Dubai, Asia/Tokyo`.
- Sous-titre `🔔 Autres` :
  - Row « Alertes de dépassement budget » — hint « Quand une dépense dépasse le budget prévu ».
  - Row « Félicitations score élevé » — hint « Notification quand vous atteignez 9/11 ou plus ».
- Bouton pleine largeur primary « Tester maintenant » (`Icons.notifications`) : demande la permission si besoin, envoie « Notification de test ✅ / Tout fonctionne ! Vous recevrez bien vos rappels. », puis SnackBar succès / avertissement / erreur selon le résultat.
- Encart d'état sous le bouton : vert `✓ Notifications autorisées`, rouge `✗ Notifications bloquées`, ou gris `⚠ Permission non demandée`.
- Note 11px : « Astuce : sur Android, autorisez les notifications de l'app dans les réglages système et désactivez l'optimisation de batterie pour Mind Tracker. Sur iPhone, acceptez la demande d'autorisation au premier lancement. »

### 4.3 🙈 « Confidentialité — Mode discret » (icône `Icons.visibility_off`, primary)
- Row « Masquer les montants » — hint « Remplace les sommes financières par ••••• F » — Switch lié à `AppPrefs.discreet`.

### 4.4 ⬇️ « Exporter mes données » (icône `Icons.download`, accent)
- Sélecteurs Mois (dropdown Janvier…Décembre) et Année (champ numérique largeur ~96), initialisés au mois/année courants.
- Trois boutons outline : « Activités (CSV / Excel) », « Finances (CSV / Excel) », « Imprimer / PDF ».
- Génère le fichier puis `Share.shareXFiles`. Note 11px : « Les CSV s'ouvrent directement dans Excel, Google Sheets ou LibreOffice. »

### 4.5 💾 « Sauvegarde & Restauration (multi-appareils) » (icône `Icons.save`, primary)
- Paragraphe 12px : « Exportez un fichier `.json` contenant **toutes vos données** (activités, finances, paramètres). Importez-le ensuite sur un autre appareil pour retrouver exactement le même contenu. »
- Bouton primary « Exporter toutes mes données » → JSON `{ version, exportedAt, data: { <toutes les clés mt.*> } }` partagé sous `mind-tracker-backup-AAAA-MM-JJ.json`.
- Bouton outline « Restaurer depuis un fichier » → `FilePicker` (.json) → dialogue de confirmation :
  - mode replace : « Restaurer ce fichier ? ⚠️ Toutes les données actuelles seront REMPLACÉES. »
  - mode merge : « Fusionner ce fichier avec les données actuelles ? »
  - Succès → SnackBar « Restauration réussie — N éléments restaurés » puis rechargement de l'app (redémarrage de l'arbre de widgets). Échec → SnackBar rouge avec le message d'erreur.
- Row « Mode de restauration » — hint dynamique (« Efface les données actuelles avant import. » / « Conserve l'existant et ajoute/écrase les clés du fichier. ») — dropdown « Remplacer tout » / « Fusionner ».
- Encart gris 11px : « **Astuce multi-appareils :** exportez depuis l'appareil source, envoyez-vous le fichier (e-mail, cloud, WhatsApp…), puis importez-le sur l'autre appareil. »

### 4.6 ♻️ « Réinitialiser les données » (icône `Icons.refresh`, destructive)
- Paragraphe 12px : « Videz les données du **mois en cours** pour repartir sur une saisie propre, ou effacez **tout l'historique**. Pensez à *exporter une sauvegarde* avant. »
- Bouton outline destructive « Vider le mois en cours » : confirmation « Vider les activités ET les finances du mois en cours (M/AAAA) ? Les autres mois restent intacts. » → supprime `mt.act.<y>-<m>`, `mt.fin.lines.<y>-<m>`, `mt.fin.goals.<y>-<m>` (m = index 0-11) → SnackBar + rechargement.
- Bouton destructive rempli « Tout effacer » : **double** confirmation (« ⚠️ EFFACER TOUTES LES DONNÉES Mind Tracker (activités, finances, roadmap, réglages) ? Cette action est irréversible. » puis « Confirmer définitivement la suppression complète ? ») → supprime toutes les clés commençant par `mt.` → SnackBar + rechargement.

## 5. Règles non négociables

1. Respecter **l'ordre, les libellés, les hints et les emojis** ci-dessus au caractère près.
2. Aucun `setState` sans persistance immédiate dans `shared_preferences`.
3. Les notifications planifiées utilisent le fuseau choisi (`tz.getLocation(prefs.timezone)`) et se replanifient à chaque changement d'heure/fréquence/fuseau ; hebdomadaire = **dimanche**.
4. Écran scrollable (`ListView`) avec espacement vertical de 24 entre panneaux, `SafeArea`, et bon rendu en 360dp de large.
5. Toutes les actions destructives passent par un `AlertDialog` de confirmation.
6. Code Dart avec **trailing commas** systématiques, `const` partout où possible, aucun warning d'analyse.