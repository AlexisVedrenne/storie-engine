# Storie Engine — roadmap apps modulaires + système d'événements

## Statut : Phase 1 (activation/désactivation) implémentée, reste proposition

**Fait (2026-07-29)** : registre partagé `src/engine/apps/registry.js`
(component + icône + couleur + badge + clé i18n par app, remplace 3 listes
dupliquées dans `PhoneShell.vue`/`HomeScreen.vue`/`SetupWizard.vue`) + toggle
par app dans l'onglet Jeu (`game.disabledApps`) + `story.enabledAppIds`.
Volontairement pas encore : `manifest.json` par app, apps custom/plugins,
event system (phases 2-4 ci-dessous) — le registre est pensé pour absorber
ça sans retouche de ce qui existe déjà (voir commentaire en tête de
`registry.js`).

Note apportée par l'utilisateur le 2026-07-29, consignée telle quelle comme
référence pour une future session. Vision cible : passer d'un moteur à 5
apps codées en dur à un moteur extensible (catalogue d'apps activables +
système d'événements interactifs déclaratif).

---

Pour faire évoluer Storie Engine vers un vrai moteur extensible, je ferais les
modifications dans cet ordre :

# 1. Rendre les applications modulaires

Objectif : passer de **"le téléphone possède 5 apps codées en dur"** à **"le
projet possède un catalogue d'applications activables"**.

## État actuel

Probablement quelque chose comme :

```
Phone
 ├ Messages.vue
 ├ Pixly.vue
 ├ Gallery.vue
 ├ Calls.vue
 └ Settings.vue
```

Le problème : chaque nouvelle app nécessite une modification du moteur.

---

## Nouvelle architecture

Créer un App Manager :

```
Phone
 └ AppManager
      |
      ├ Messages App
      ├ Pixly App
      ├ Gallery App
      ├ Calls App
      ├ Settings App
      └ Custom Apps
```

Chaque app devient un module indépendant.

Exemple :

```
apps/
 ├ messages/
 │    ├ manifest.json
 │    ├ App.vue
 │    └ events.ts
 │
 ├ pixly/
 │    ├ manifest.json
 │    ├ App.vue
 │    └ events.ts
```

---

## Ajouter un manifest d'app

Exemple :

```json
{
  "id": "messages",
  "name": "Messages",
  "icon": "sms.png",
  "enabled": true,
  "permissions": [
    "notifications",
    "contacts"
  ]
}
```

Dans l'éditeur :

```
Applications

☑ Messages
☑ Pixly
☑ Galerie
☑ Appels
☑ Réglages

☐ Mail
☐ Notes
☐ Navigateur
☐ Dictaphone
```

Le build ne prend que les apps activées.

---

## Ajouter une API commune aux apps

Pour éviter que chaque app fasse n'importe quoi :

```ts
phone.notify()
phone.addMessage()
phone.addPhoto()
phone.setFlag()
phone.triggerEvent()
```

Une app utilise le moteur, elle ne parle jamais directement aux autres apps.

Exemple :

Galerie :

```
photo ouverte
       |
       ↓
eventManager.emit(
 "gallery.photo.open",
 {
  photoId:"123"
 }
)
```

Elle ne sait pas ce qui arrivera ensuite.

---

# 2. Créer le système d'événements interactifs

C'est la grosse évolution.

Actuellement :

```
Timeline
   ↓
Action
```

Il faut ajouter :

```
Interaction joueur
        ↓
Trigger
        ↓
Condition
        ↓
Action
```

---

## Créer un Event Manager global

Un service central :

```
EventManager

listen()
emit()
checkConditions()
executeActions()
```

Toutes les apps peuvent envoyer des événements.

---

## Les triggers de base à ajouter

Je commencerais petit :

### Téléphone

```
phone.unlocked
phone.locked
phone.low_battery
```

### Applications

```
app.opened
app.closed
```

Avec :

```json
{
 "event": "app.opened",
 "app": "gallery"
}
```

---

### Contenu

```
message.read
photo.viewed
post.liked
profile.visited
story.watched
```

---

### Social

```
contact.followed
contact.unfollowed
post.created
```

---

# 3. Créer les actions d'événement

Quand un trigger arrive :

```
Trigger
 ↓
Action
```

Actions disponibles :

```
Envoyer SMS
Créer DM
Ajouter photo
Créer notification
Modifier flag
Modifier profil
Lancer appel
Changer chapitre
Ajouter follower
Publier contenu
```

---

Exemple concret :

Dans l'éditeur :

```
EVENT

Quand :
[Photo ouverte]

Photo :
[IMG_0245]


Conditions :
[Flag enquête >= 3]


Actions :
☑ Ajouter flag "preuve_trouvee"
☑ Envoyer SMS à Sarah
☑ Débloquer chapitre 5
```

---

# 4. Ajouter un éditeur graphique d'événements

Vu que tu utilises déjà Vue Flow, tu as déjà la techno.

Je ferais un deuxième graphe :

```
Narrative Graph

Chapitre 1
    |
 Timeline


Event Graph

[Photo ouverte]
       |
       ↓
[Flag trouvé]
       |
       ↓
[SMS envoyé]
```

---

# 5. Faire communiquer Event System et Timeline

Très important.

Ne crée pas un deuxième système narratif.

Fais plutôt :

```
Event
 |
 ↓
Inject Timeline Entry
 |
 ↓
Moteur existant
```

Exemple :

Le joueur ouvre une photo.

L'event déclenche :

```
Ajouter dans timeline :

type:
 message

from:
 Sarah

text:
 "Pourquoi tu as regardé cette photo ?"
```

Comme ça tu réutilises tout ton système actuel.

---

# Ordre de développement que je ferais

### Phase 1

✅ Extraire les apps existantes en modules
✅ App Manager
✅ Activation/désactivation dans l'éditeur

### Phase 2

✅ EventManager interne
✅ Triggers de base
✅ Actions de base

### Phase 3

✅ Event Editor avec Vue Flow
✅ Conditions sur événements
✅ Injection dans la timeline

### Phase 4

✅ Apps externes/plugins
✅ Marketplace éventuelle

---

Le gros avantage : tu n'as pas besoin de refaire ton moteur. Ton architecture
actuelle est déjà très proche. Tu dois surtout transformer deux choses qui
sont probablement aujourd'hui "codées en dur" en **systèmes déclaratifs
pilotables par données**.
