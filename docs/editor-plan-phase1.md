# Stories Engine — éditeur visuel du moteur narratif (Phase 1)

## Statut : ✅ terminée et confirmée fonctionnelle (2026-07-27)

Pipeline bout-en-bout validé par l'utilisateur : ouverture de projet, chargement dynamique (chapitres/contacts/threads/seed/i18n), aperçu `PhoneShell` live, images via `storie-asset://`, traduction EN. Seul correctif nécessaire après la première passe : `MainLayout.vue` doit envelopper les pages dans `q-layout > q-page-container` (`q-page` exige cet ancêtre, sinon warning Quasar). Voir [`docs/phase2-plan.md`](./phase2-plan.md) pour la suite.

## Contexte

Le moteur narratif de NTR (`docs/story-engine.md` dans le dépôt NTR) fonctionne bien mais tout le contenu (chapitres, contacts, seed) s'écrit à la main en JS, sans aperçu, avec un enregistrement manuel de chaque chapitre dans `data/story/index.js`. L'auteur veut un vrai logiciel d'édition : ouvrir/créer un projet n'importe où sur le disque, éditer visuellement (formulaires par type d'entrée, pas du code brut), voir un aperçu téléphone live à côté, et un bouton "Build" qui empaquette projet + moteur en jeu jouable.

Décisions déjà actées avec l'utilisateur (ne pas rediscuter) :

- Chapitres restent en `.js` (pas de migration JSON).
- **Un seul logiciel** (l'éditeur, Electron + Quasar) — le jeu livré est juste le _résultat_ d'un Build, pas un second projet à maintenir.
- Édition visuelle (formulaires) dès le MVP, pas un simple pane de code.
- Nouveau dépôt : `stories-engine` (ce dépôt). NTR n'est pas touché par ce travail — sert uniquement de référence à porter.

Cette phase 1 vise à dérisquer le point le plus dur avant d'investir dans les formulaires visuels : prouver que l'app Electron peut ouvrir un dossier-projet arbitraire, charger dynamiquement son contenu JS (sans rebuild), et afficher un **aperçu téléphone live en lecture seule**. Pas d'édition de formulaire, pas de Build dans cette phase.

## Constat clé issu de l'exploration de NTR

- `src/stores/story.js` importe en dur `chapters/getContact/getThread/socialHandle` (`@/data/story`) et les 5 exports seed — un seul projet possible par build. Le reste de la logique (`advance()`, `checkConditions()`, `applyEffects()`, `seedInitialContent()`) est déjà paramétrique sur "ce que sont `chapters`/contacts/threads/seed en ce moment" : seul le **point d'origine** de ces bindings doit changer (import statique → injecté au runtime).
- **Blocage n°1 : les images.** Partout, `import x from '../images/...'` (51 imports, jamais via `@/assets`) — résolu par Vite au build. Un projet ouvert dynamiquement par Node à l'exécution ne passe pas par ce pipeline. → convention à changer : chemin relatif **string** (`"images/mira/parc_4.png"`), résolu par un helper injectable (`resolveAssetUrl`) différent selon contexte (éditeur vs build final).
- **Blocage n°2 : i18n story.** `src/i18n/story/index.js` utilise `import.meta.glob(..., {eager:true})`, fixé à un dossier connu au build — même limite, même remède (chargé dynamiquement par `loadProject()`).
- `contacts.js`/`threads.js` mélangent aujourd'hui données + fonctions (`getContact`, `socialHandle`, `getThread`) — dans le nouveau format projet, ces fichiers deviennent des données pures ; les fonctions renaissent comme _getters_ du store, lisant `this.project.contacts`/`this.project.threads`.
- Les composants `src/components/phone/*` et `apps/*` (11 + 18 fichiers) sont portables tels quels (pas de vue-router, chaque composant fait son propre `useStoryStore()`) SAUF ~10 fichiers qui importent aussi `getContact`/`contacts`/`gameConfig` directement depuis `@/data/story` — à rebrancher sur le store.
- `PhonePage.vue` appelle `story.init()` **de façon synchrone, avant le montage** (pas dans `onMounted`) pour que `PhoneShell` sache dès le premier rendu s'il faut afficher l'assistant de configuration. Cet ordre doit être reproduit : `story.loadProject(data)` doit être résolu avant de monter `<PhoneShell/>`.
- **Risque tooling déjà dérisqué empiriquement** : `Boite-Outil-Merch` (même machine, même stack pnpm/Node/`@quasar/app-vite` rc) a déjà `quasar mode add electron` fonctionnel avec `contextIsolation`, `contextBridge`, un dossier `ipc/` par handler agrégés dans `ipc/index.js`. On réutilise ce pattern tel quel.

## Décisions verrouillées pour cette phase

1. **Assets = chemins relatifs string**, résolus via `resolveAssetUrl()` injectable. En éditeur : protocole Electron custom `storie-asset://` mappé sur le dossier `assets/` du projet ouvert (plus sûr que `file://`, compatible CSP).
2. **Portage en fichiers source**, pas de package partagé/monorepo — moteur + UI téléphone copiés dans `stories-engine/src/`, NTR non modifié.
3. **`loadProject(projectData)`** remplace tous les imports statiques du store ; **aucune persistance réelle en phase 1** (pas de `localStorage`) — l'aperçu vit entièrement en mémoire, réinitialisé à chaque ouverture de projet. Ça évite tout le problème de clé de sauvegarde par projet.
4. **Format d'un projet sur disque** :
   ```
   mon-projet/
   ├── project.json          # { name, entryChapterId?, chapterOrder? }
   ├── chapters/               # .js, export default {id, title, requires, timeline}
   ├── seed/                    # messages.js, dms.js, posts.js, reels.js, photos.js
   ├── contacts.js               # export default [...] (données pures, plus de fonctions)
   ├── threads.js
   ├── game.js
   ├── assets/                     # images, référencées par chemin relatif string
   └── i18n/<locale>/<bucket>.js
   ```
5. Electron sécurisé : `contextIsolation: true`, `nodeIntegration: false`, tout passe par `contextBridge` + IPC ; le process main fait les `import()` dynamiques Node des fichiers `.js` du projet et renvoie des données pures (JSON-clonable) au renderer.

## Plan de fichiers — `stories-engine`

### `src/engine/` (moteur porté, project-agnostic)

| Fichier                                     | Source NTR                            | Changement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/engine/stores/story.js`                | `stores/story.js`                     | Supprime les imports statiques (`chapters`, `getContact`, `getThread`, `socialHandle`, seed, `storyTranslations`). Ajoute `project: null` à `defaultState()` + action `loadProject(projectData)`. Remplace chaque usage de `chapters` par `this.project?.chapters ?? []`. Transforme `getContact`/`getThread`/`socialHandle` en **getters** lisant `state.project.contacts`/`threads`. `resolveStoryText` lit `this.project.i18n[locale]?.[bucket]` au lieu de l'import glob. Vide `save()`/`load()`/`resetSave()` (no-op, gardés pour ne pas casser les call-sites) — phase 1 sans persistance. Le reste (`advance`, `checkConditions`, `applyEffects`, `seedInitialContent`, timing des messages/timeskip) se porte tel quel. |
| `src/engine/stores/phone.js`                | `stores/phone.js`                     | Copie conforme, aucune donnée story couplée.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/engine/i18n/instance.js`, `locales.js` | `i18n/instance.js`, `i18n/locales.js` | Copie conforme (i18n UI-chrome, indépendant du contenu story).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `src/engine/utils/sound.js`                 | `utils/sound.js`                      | Copie conforme, ajuste juste l'import du store.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/engine/assets.js`                      | _(nouveau)_                           | `resolveAssetUrl(relPath)` → `storie-asset://project/${relPath}` en phase 1 (seule branche nécessaire, celle du build viendra en phase 3).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

`public/sounds/*.mp3` copiés une fois depuis NTR.

### `src/components/phone/` + `src/components/apps/`

Portage dossier-pour-dossier (11 + 18 fichiers), deux retouches mécaniques seulement :

1. Les ~10 fichiers importateurs directs de `@/data/story` (`LockScreen`, `CallsApp`, `IncomingCallScreen`, `ChatThread`, `MessagesApp`, `CommentsSheet`, `DmListScreen`, `DmThreadScreen`, `ExploreGrid`, `PostCard`, `ProfileScreen`, `ReelsScreen`, `StoriesBar`) → `useStoryStore()` + `story.getContact(...)` etc.
2. Chaque binding `<img>` sur une valeur `image`/`media`/`url`/`avatar` passe par `resolveAssetUrl(...)` (`AppAvatar.vue` en particulier).

`src/css/app.scss` (reset global) porté tel quel.

### `src-electron/` (nouveau — jamais initialisé dans ce repo)

Scaffoldé via `pnpm exec quasar mode add electron`. Retouches manuelles (modèle = `Boite-Outil-Merch\src-electron\electron-main.js` + `ipc\index.js`, déjà fonctionnels sur cette machine) :

- **`electron-main.js`** : ajoute `protocol.registerSchemesAsPrivileged([{ scheme: 'storie-asset', privileges: { standard:true, secure:true, supportFetchAPI:true, stream:true } }])` en haut du fichier (**avant** `app.whenReady()` — sinon silencieusement ignoré), puis dans `whenReady()` : `session.defaultSession.protocol.handle('storie-asset', ...)` avec garde anti path-traversal, et l'appel `registerAllHandlers(mainWindow)`.
- **`electron-preload.js`** : `contextBridge.exposeInMainWorld('storieAPI', { selectProjectFolder, loadProject })`.
- **`src-electron/ipc/project.js`** (nouveau) : `registerProjectHandlers(mainWindow)` — dialog + scan dossier + `import()` dynamique de chaque fichier + assemblage `ProjectData`. Garde `currentAssetsRoot` en state module.
- **`src-electron/ipc/index.js`** (nouveau) : agrégateur `registerAllHandlers`.

### `src/editor/` (coquille minimale phase 1)

| Fichier                                | Rôle                                                                                                                                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/editor/pages/OpenProjectPage.vue` | Remplace `IndexPage.vue`. Bouton "Ouvrir un projet" → `storieAPI.selectProjectFolder()` → `storieAPI.loadProject(path)` → `story.loadProject(data)` (synchrone, avant navigation) → route vers `/preview`.               |
| `src/editor/pages/PreviewPage.vue`     | Quasi identique à `NTR\src\pages\PhonePage.vue` : monte `<PhoneShell/>` + un panneau JSON/arbre repliable en lecture seule du `story.project` chargé. N'appelle pas `story.init()` — les données arrivent déjà chargées. |
| `src/router/routes.js`                 | `/` → `OpenProjectPage`, `/preview` → `PreviewPage`.                                                                                                                                                                     |
| `src/layouts/MainLayout.vue`           | Simplifié à un simple `<router-view/>`.                                                                                                                                                                                  |

## `ProjectData` — forme exacte et `loadProject()`

```js
{
  rootPath: "C:/.../mon-projet",
  manifest: { name: "...", entryChapterId: "chapter1", chapterOrder: [...] },
  chapters: [{ id, title, requires, timeline, __sourceFile }],
  contacts: [{ id, name, color, bio?, avatar?, socialAvatar?, hasSocial?, ... }],
  threads: [{ id, name, participants, group }],
  gameConfig: { title },
  seed: { messages: {...}, dms: {...}, posts: [...], reels: [...], photos: [...] },
  i18n: { "en-US": { common: {...}, chapter1: {...} } },
  assetsRoot: "assets"
}
```

```js
// src/engine/stores/story.js
loadProject(projectData) {
  Object.assign(this, defaultState())
  this.project = projectData
  // ne déclenche PAS startIfNeeded()/seedInitialContent() ici — le flow
  // boot existant de PhoneShell (Boot → Setup → startIfNeeded) reste inchangé
}
```

## Chargement dynamique côté main process (`src-electron/ipc/project.js`)

- Scan récursif de `chapters/` (sous-dossiers acceptés), un `import(pathToFileURL(abs).href + '?t=' + Date.now())` par fichier — le suffixe `?t=` casse le cache ESM de Node pour que ré-ouvrir un projet après une édition sur disque reflète bien le changement.
- `contacts.js`/`threads.js`/`game.js` : même `import()` dynamique, `export default` attendu.
- `seed/*.js` : même mécanisme.
- `i18n/<locale>/<bucket>.js` : scan des sous-dossiers de `i18n/`, un `import()` par fichier.
- `project.json` : **lecture directe** `fs.readFileSync` + `JSON.parse` — jamais `import()`.
- Ordre des chapitres : si `project.json.chapterOrder` existe, trie dessus ; sinon ordre de scan du dossier.
- Avant de renvoyer au renderer via `ipcMain.handle`, passer le blob assemblé par `JSON.parse(JSON.stringify(...))` — garantit qu'il est bien clonable par IPC.
- `storieAPI.loadProject(path)` (renderer) → `story.loadProject(data)` → navigation vers `/preview`, dans cet ordre strict.

## Risques phase 1 et parades

1. **Cache ESM de Node sur re-chargement** — paré par le `?t=Date.now()`.
2. **Sérialisation IPC** — `JSON.parse(JSON.stringify(...))` défensif avant retour du handler.
3. **`quasar dev -m electron` fonctionne-t-il sur cette machine ?** Déjà prouvé empiriquement par `Boite-Outil-Merch`.
4. **Timing d'enregistrement du protocole custom** — `registerSchemesAsPrivileged` doit être appelé en top-level du module, avant `app.whenReady()`.
5. **Ordre des chapitres non déterministe** si `project.json` ne précise pas `chapterOrder` — accepté avec avertissement console pour la phase 1.

## Vérification

1. Créer un projet fixture en portant `chapter1.js` + `contacts.js` + `threads.js` + `game.js` + `seed/*` + `i18n/en-US/{common,chapter1}.js` de NTR, en réécrivant chaque `import ... from '../images/...'` en chemin string + copie du fichier image dans `demo-project/assets/images/...`.
2. `pnpm exec quasar dev -m electron` → une fenêtre Electron s'ouvre sur `OpenProjectPage`.
3. "Ouvrir un projet" → sélectionner `demo-project` → panneau JSON de `PreviewPage` montre bien chapitres/contacts/threads/gameConfig/seed/i18n chargés.
4. `<PhoneShell/>` démarre (Boot → Setup), le watermark du lock screen affiche `gameConfig.title`.
5. Déverrouiller, vérifier que les premiers messages de chapter1 s'affichent avec le bon délai de frappe et le bon contact/avatar.
6. Déclencher le `choice` de chapter1, vérifier que la timeline bloque puis reprend après sélection.
7. Ouvrir la conversation seedée dans Messages, vérifier l'historique + timestamps relatifs.
8. Vérifier qu'une image (`storie-asset://`) s'affiche correctement.
9. Éditer `chapter1.js` sur disque sans relancer Electron, ré-ouvrir le même dossier, confirmer que le changement apparaît.
10. Changer la langue en anglais dans Settings, vérifier que le texte vient bien de `i18n/en-US/chapter1.js`.

## Feuille de route (non conçue ici, juste actée)

- **Phase 2** : éditeur visuel par formulaires (un par type d'entrée), sérialiseur d'écriture (modèle en mémoire → source `.js` reformaté, via Prettier).
- **Phase 3** : pipeline de Build — copie moteur + projet dans un shell embarqué, `assets/` → `public/story-assets/`, bascule de `resolveAssetUrl` vers la branche URL statique, `quasar build`.
- **Phase 4** : validation de projet, gestionnaire d'assets, édition des dictionnaires i18n dans l'UI.
