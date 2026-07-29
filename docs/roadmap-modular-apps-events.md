# Storie Engine — roadmap apps modulaires + système d'événements

## Statut : Phase 1 (modularisation + activation) implémentée, reste proposition

**Fait (2026-07-29)** :
- Toggle par app dans l'onglet Jeu (`game.disabledApps`, absent = tout
  activé) + `story.enabledAppIds`.
- Entrées de timeline liées à une app désactivée : masquées du menu
  "Ajouter une entrée" (`TimelineEditor.vue`) et sautées silencieusement à
  l'exécution si déjà présentes (`story.js` `advance()`/`runThen()`, même
  traitement qu'une condition `requires` ratée) — jamais supprimées du
  fichier chapitre.
- **Vraie modularisation** : `src/engine/apps/registry.js` scanne
  automatiquement (`import.meta.glob`) tout dossier
  `src/components/apps/<id>/` contenant un `manifest.js` (id/order/label/
  icône/couleur/badge) + `App.vue` — plus aucune liste d'apps à maintenir
  à la main. Un contributeur qui ajoute un dossier bien formé au dépôt
  obtient une app fonctionnelle, activable/désactivable comme les 5
  historiques, sans toucher `PhoneShell.vue`/`HomeScreen.vue`/
  `SetupWizard.vue`/`GameForm.vue`. Ça survit tel quel à la copie faite par
  `src-electron/ipc/build.js` (glob root-absolu, résolu contre le shell
  temporaire au moment de son propre build).

Volontairement pas fait : permissions/sandboxing (pas de bénéfice réel dans
une appli Electron mono-utilisateur), chargement dynamique à l'exécution
d'un plugin non présent dans le dépôt (ça reste une extension du moteur
open-source via contribution/build, pas un vrai plugin installable par un
joueur).

**Aussi fait (2026-07-29, même jour)** : les nouveaux types d'entrée de
timeline (contenu scriptable depuis un chapitre) sont maintenant
plug-and-play aussi — additif, pas une migration.
- `src/engine/apps/entryTypeRegistry.js` scanne (glob) tout
  `src/components/apps/*/entryType.js` (contrat : type/app/icon/label/help/
  form/defaultEntry/process/extractText/collectReferences).
- Les 5 fichiers moteur concernés (`story.js`, `TimelineEditor.vue`,
  `extractTranslatableStrings.js`, `validateProject.js`, `appIds.js`) ont
  chacun reçu UNE ligne de repli additive (`default:` du switch existant →
  regarde le registre) — les 10 types historiques (message/dm/choice/post/
  photo/story/reel/call/effect/timeskip) restent 100% codés en dur,
  intouchés, **volontairement** : ils encodent des mécaniques fines
  (délai de frappe, blocage sur action joueur, cinématique timeskip) qu'un
  nouveau type n'a pas besoin de réinventer — un type plug-in obtient le
  traitement "instantané + pause", comme post/photo/story/reel/effect.
- `story.js` a un nouveau bucket générique `state.customData` (persisté,
  jamais touché par le moteur lui-même) où un type plug-in range ses
  propres données.
- **Preuve concrète** : app "Email" complète (`src/components/apps/email/`
  — manifest.js, App.vue, entryType.js, EmailEntryForm.vue) construite en
  suivant UNIQUEMENT ces deux contrats, zéro autre édition moteur.
  Fonctionne, togglable comme les 5 historiques, buildé et vérifié présent
  dans le bundle.

**Phase 2 — EventManager (2026-07-29, MVP)** : fait, prouvé, pas encore
d'éditeur graphique.
- `src/engine/events/eventManager.js` — bus pub/sub minimal (`on`/`emit`/
  `clear`), pas un Pinia store (pas besoin de réactivité, évite une
  dépendance store-à-store entre `phone.js` et `story.js`).
- 2 triggers réels câblés : `app.opened` (`phone.js` `openApp()`),
  `photo.viewed` (Galerie, à l'ouverture d'une photo).
- `story.js` `handleEngineEvent()` — réutilise `checkConditions`/
  `applyEffects`/`runThen` déjà là (principe §5 : pas de deuxième système
  narratif). Les réactions sont lues depuis `game.events[]` (même bucket
  libre-schéma que `game.disabledApps`/`game.sounds` — zéro nouveau fichier
  projet, zéro plomberie IPC/build.js supplémentaire).
- `findMatchingEvents()` (`src/engine/events/matchEvent.js`) extrait en
  fonction pure, testée en Node standalone (6 assertions, toutes vertes) —
  même précédent que la phase 5.
- **Limite connue, assumée pour ce premier jet** : une réaction dont le
  `then` bloque (choice/call) écrase `timelineResume` si la timeline
  principale est DÉJÀ bloquée sur son propre choix/appel au même moment —
  pas résolu génériquement ; garder les réactions d'event à du non-bloquant
  (message/dm/post/photo/story/reel/effect) pour l'instant.
**Phase 3 — authoring (2026-07-29, en liste, pas en graphe)** : `game.events`
n'a plus besoin d'être écrit à la main.
- `src/editor/components/EventsEditor.vue` — nouvel onglet "Events" dans
  l'éditeur, entre Jeu et Ressources. Liste de cartes dépliables (même
  patron que `SeedBucketEditor.vue`) : sélecteur de trigger, champ de
  correspondance optionnel (`match`) selon le trigger choisi, puis 3
  onglets réutilisant tel quel `RequiresBuilder`/`EffectsBuilder`/
  `TimelineEditor` — exactement le même trio qu'une option de `choice`.
  Zéro nouveau composant de condition/effet/timeline créé.
  Ajouter un 3ᵉ trigger = ajouter une entrée dans `TRIGGER_LABELS`/
  `MATCH_FIELD_BY_TRIGGER` du fichier, même poids que l'ajouter dans
  `ENGINE_TRIGGERS`.
- Persistance : les events vivent dans `gameConfig` (même fichier que le
  reste de l'onglet Jeu) — branché sur le dirty-tracking/autosave existant
  d'`EditorPage.vue` (`activeResource`/`save()`), pas de nouveau flux IPC.
- **Pas fait** (délibérément, pas demandé) : la vraie visualisation en
  graphe Vue Flow imaginée dans le brouillon original — la liste suffit
  tant que les events restent indépendants les uns des autres (pas de
  branchement event → event à représenter visuellement pour l'instant).

Reste à faire : apps externes/plugins post-build (phase 4, cf. discussion
"marketplace" — mis de côté pour l'instant, modèle actuel = extension du
dépôt source + rebuild).

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
