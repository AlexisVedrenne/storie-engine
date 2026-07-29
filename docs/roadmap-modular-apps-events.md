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

**Restructuration liste/détail + catalogue par app (même jour)** : le
placeholder "listés à droite, pas ici" a été remplacé par le vrai panneau
gauche, même patron que Contacts/Threads.
- `src/engine/events/triggers.js` — catalogue central (nom, app propriétaire,
  label, champ de correspondance + `optionsFrom: 'apps'|'contacts'`).
  `eventManager.js`/`EventList.vue`/`EventForm.vue` en dérivent tous —
  ajouter un vrai trigger = une entrée ici, rien d'autre.
- 2 nouveaux triggers réels câblés : `post.liked` (`story.toggleLike()`,
  seulement au moment du like, pas du unlike) et `contact.followed`
  (`story.toggleFollow()`, idem).
- `EventList.vue` (gauche) : events déjà créés (clic → sélection) +
  "Ajouter par application" — clique une app, un event pré-rempli pour son
  trigger principal est créé et sélectionné direct.
- `EventForm.vue` (droite) : le formulaire d'un seul event, toujours
  déplié (comme `ContactForm.vue`) — le champ de correspondance devient un
  vrai sélecteur (apps ou contacts) au lieu d'un id à taper à l'aveugle,
  quand `optionsFrom` le permet (`postId`/`photoId` restent en texte libre,
  pas de liste connue à l'auteur pour l'instant).
- Ancien `EventsEditor.vue` (liste+cartes en un seul panneau) supprimé,
  remplacé par ces deux composants.

**Correction du menu "Ajouter" (même jour, après retour utilisateur)** :
le premier jet montrait `app.opened` sous CHAQUE app (redondant) et un
seul trigger par app pré-rempli à corriger après coup. Structure demandée
et faite : "Commun" en premier (triggers cross-app), puis un groupe par
app listant SES triggers propres, cliquables directement (pas d'étape
intermédiaire "choisis l'app puis corrige").
- Nouveaux triggers réels : `app.closed` (Commun — délai passé dans
  N'IMPORTE quelle app avant de la quitter, seuil minimum en secondes),
  `profile.opened` (Pixly — `ProfileScreen`), `conversation.opened`
  (Messages — ouverture d'une conversation SMS).
- `phone.js` trackait déjà `currentApp` mais pas depuis quand — ajout de
  `appOpenedAt` + `closeCurrentApp()` (appelé par `openApp`/`goHome`/
  `lock`/`requestReboot`) pour calculer les secondes réellement passées.
- `matchEvent.js` généralisé : un champ de correspondance peut être
  `numeric` (seuil minimum, `payload ≥ valeur`) au lieu d'égalité stricte —
  nécessaire pour "au moins N secondes", réutilisable pour un futur trigger
  du même genre (compteurs, durées). Testé en Node (4 assertions vertes).
- `triggers.js` reste l'unique catalogue : `commonTriggers()`/
  `triggersForApp()` remplacent l'ancien comportement qui rajoutait
  `app.opened` partout.

**Filtres plus fins + titre d'event (même jour, 2ᵉ retour utilisateur)** :
- `matchField` (singulier) → `matchFields` (tableau) — `app.closed` a
  maintenant 2 filtres (application optionnelle + délai minimum), tous les
  autres triggers en ont 1 (pas de cas spécial dans le code, juste un
  tableau à un seul élément). Testé en Node (5 assertions vertes, filtres
  combinés `app` + `seconds` ET `authorId`).
- `post.liked` filtre maintenant par **auteur** (`authorId`, liste
  déroulante des contacts) plutôt que par `postId` opaque — `story.js`
  `toggleLike()` retrouve l'auteur dans `feedPosts`/`reels` au moment du
  like.
- `photo.viewed` filtre par **chemin d'asset** (`url`) avec vraie liste
  déroulante à miniatures, pas par id — l'id d'une entrée `photo` est
  auto-généré si non renseigné (`story.js` `processEntry`), donc
  impossible à deviner de façon fiable depuis l'éditeur. Nouveau
  `src/project/collectPhotoOptions.js` (pur) scanne chapitres + seed pour
  lister toutes les photos authored.
- **Titre optionnel** sur chaque event (`evt.title`, avec bouton emoji
  comme tous les autres champs texte) — prioritaire dans le résumé de la
  liste, pour distinguer plusieurs events sur le même trigger.
- `post.liked` et `photo.viewed` acceptent maintenant une publication/photo
  **existante OU à venir** (combobox liste+saisie libre, même patron que
  `FlagNameField.vue`) — `PostEntryForm.vue` a un nouveau champ Id
  optionnel pour ça (`collectPostOptions.js`, même limite que les photos :
  seules les entrées avec un id explicite sont listables, l'id
  auto-généré n'est pas prévisible statiquement).

**Le bug de collision documenté plus haut est corrigé (même jour, 3ᵉ
retour utilisateur)** : un choix/appel de la timeline principale ET un
choix/appel déclenché par un Event peuvent maintenant être en attente en
même temps sans que l'un écrase l'autre.
- `activeChoice`/`pendingCall`/`timelineResume` étaient 3 champs uniques
  partagés — le 2ᵉ qui tentait de s'afficher écrasait silencieusement
  l'état du 1er, qui restait bloqué pour de bon.
- Ajout d'une file `pendingInteractions[]` + `presentBlockingEntry()`
  (affiche tout de suite si le téléphone est libre, sinon met en file) +
  `presentNextQueuedInteraction()` (appelée par `makeChoice`/`declineCall`/
  `endCall` juste après avoir libéré le téléphone).
- Point d'attention traité : capturer et vider `timelineResume` AVANT
  d'appeler `presentNextQueuedInteraction()` (qui pose son propre
  `timelineResume` pour l'élément suivant) — sinon le "resume" repris
  aurait été le mauvais.
- Vérifié par simulation Node autonome (scénario exact : choix principal
  en attente + choix d'event qui tente de s'afficher en même temps → mis
  en file, pas écrasé → répondre au premier révèle le second → les deux
  "resume" se déclenchent une fois chacun, rien perdu).

**Posts sans id explicite maintenant listés (même jour, 4ᵉ retour)** :
`collectPostOptions.js` recalcule le même id que `story.js` utiliserait à
l'exécution (`entry.id || `${chapitre}-post-${index}``) au lieu d'exiger un
id posé à la main — un post nested dans un `then` de choix hérite de
l'index du choix englobant (le moteur n'avance jamais `timelineIndex`
dedans), donc plusieurs posts sans id sous la même option partagent le
même id de repli — pas un bug introduit ici, juste rendu fidèle au
comportement réel du moteur. Testé en Node (4 assertions vertes,
top-level/id-explicite/nested tous corrects). Les photos n'avaient pas ce
problème : elles étaient déjà indexées par chemin d'asset (`url`), pas par
id, donc toujours listées peu importe si un id a été renseigné.

Onglet **Events** déplacé juste après **Chapitres** dans la barre
d'onglets de l'éditeur.

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
