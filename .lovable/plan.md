# Notifications PWA en arrière-plan

## Objectif
Remplacer les rappels déclenchés uniquement à l’ouverture par de vraies notifications Web Push. Elles seront envoyées à l’heure choisie même si Mind Tracker est fermé, tant que l’appareil est connecté à Internet et que le système autorise les notifications.

## Mise en œuvre
- Enregistrer chaque installation PWA et son abonnement push dans Lovable Cloud, sans imposer la création d’un compte.
- Synchroniser depuis Réglages les choix Activités/Finances, fréquence, heure et fuseau horaire avec cette installation.
- Mettre à niveau le worker de notifications pour recevoir un événement push, afficher la notification et ouvrir Mind Tracker au toucher.
- Ajouter une tâche planifiée qui vérifie chaque minute les rappels arrivés à échéance et les envoie une seule fois par période.
- Conserver le test immédiat et les notifications locales comme solution de repli lorsque Web Push n’est pas disponible.
- Afficher dans Réglages un diagnostic distinct : permission navigateur, abonnement push actif et rappels en arrière-plan actifs.

## Sécurité et fiabilité
- Valider strictement les abonnements et préférences reçus.
- Utiliser un identifiant d’installation aléatoire et un secret local par appareil pour empêcher la modification des rappels d’un autre appareil.
- Garder les clés d’envoi push uniquement côté serveur.
- Supprimer automatiquement les abonnements expirés ou refusés et empêcher les doublons d’envoi.

## Limites à respecter
- Android/Chrome : fonctionne après installation ou autorisation du site, même app fermée.
- iPhone/iPad : nécessite l’ajout à l’écran d’accueil avant l’autorisation des notifications.
- Une fermeture forcée, le mode économie d’énergie, l’absence d’Internet ou les restrictions système peuvent retarder une notification.
- Les rappels horaires Activités/Finances fonctionneront en arrière-plan. Les alertes dépendant de données encore stockées uniquement sur l’appareil (budget dépassé, score du jour) resteront calculées lors de l’ouverture tant que ces données ne sont pas synchronisées dans Cloud.

## Validation
- Tester l’inscription push, l’envoi immédiat serveur et la réception par le worker.
- Vérifier qu’une préférence modifiée est bien synchronisée.
- Vérifier la tâche planifiée et la protection contre les envois répétés.
- Contrôler le rendu et le diagnostic sur mobile.
