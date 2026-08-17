# Stories Engine — sauvegarde cloud via rclone (plan)

## Statut : implémentée (v1), en attente de vérification manuelle Electron (voir plus bas)

## Ce qui a été construit (2026-08-17, 4ᵉ retour utilisateur)

- **Sauvegarde auto en arrière-plan** — toggle "Sauvegarde auto (cloud,
  toutes les 5 min)" dans le dialogue Cloud. Un timer partagé
  (`useCloudSync.js` `startAutoSync`/`stopAutoSync`/`AUTO_SYNC_INTERVAL_MS`)
  déclenche un push silencieux toutes les 5 min si : la préférence est
  activée (persistée en `localStorage`, même patron que le toggle
  "Sauvegarde auto" local d'`EditorPage.vue`), rclone est installé, un
  remote est sélectionné, et aucune synchro n'est déjà en cours. Pas de
  détection fine de "y a-t-il vraiment eu un changement" avant de
  déclencher : rclone ne retransfère de lui-même que ce qui diffère
  réellement (checksum/date), donc un tick "pour rien" est quasi gratuit —
  bien plus simple et fiable que d'accrocher un hook sur chaque point de
  sauvegarde locale (chapitres/contacts/jeu/i18n/seed/assets, une bonne
  dizaine d'endroits dans `EditorPage.vue`).
  - `runSync`/`pollJob` gagnent un paramètre `silent` : pas de toast de
    succès pour un push automatique (silencieux par design, sinon un toast
    toutes les 5 min devient vite pénible) — mais les **erreurs restent
    toujours remontées**, silencieux ou pas.
  - Le timer vit tant que `CloudSyncButton.vue` est monté (donc tant qu'un
    projet est ouvert dans l'éditeur), pas tant que le dialogue est ouvert
    — c'est bien un vrai arrière-plan, démarré dès `onMounted` si la
    préférence était déjà active lors d'une session précédente.
  - Activer le toggle déclenche aussi un premier push immédiat (pas
    d'attente jusqu'à 5 min pour la toute première sauvegarde).

## Ce qui a été construit (2026-08-17, 3ᵉ retour utilisateur)

- **Un seul compte cloud à la fois** — `useCloudSync.js` expose
  `atConnectionLimit` (`remotes.length >= 1`), `CloudProviderConnect.vue`
  masque les boutons de connexion tant qu'un remote existe déjà (message
  "un seul compte à la fois — déconnecte celui-ci pour en changer").
  Contrainte UI uniquement, pas appliquée côté main process.
- **Déconnexion en 2 temps** — `CloudSyncButton.vue` `confirmDisconnect` :
  d'abord confirmer la déconnexion, PUIS (seulement si confirmée) demander
  si les données déjà poussées sur ce compte doivent aussi être supprimées
  (`operations/purge` via le nouveau `cloud:purgePath`) ou rester en place.
  Déconnecter seul ne supprime jamais rien côté distant.
- **Suppressions propagées** — `cloud:push`/`cloud:pull` sont passés de
  `sync/copy` à `sync/sync` : un fichier supprimé d'un côté est maintenant
  aussi supprimé de l'autre après sync (avant, seuls les ajouts/modifs
  étaient propagés). rclone ne retransfère déjà que les fichiers
  changés/nouveaux de lui-même (diff par checksum/date) — rien à faire
  pour ça, c'était déjà le comportement.
- **État de la sauvegarde visible, partagé entre machines** — plutôt qu'un
  horodatage local (qui n'aurait de sens que sur LA machine ayant fait le
  dernier push), un fichier `cloudsync.json` (`{lastSyncedAt, device}`) est
  écrit à la racine du projet et réécrit à CHAQUE push, AVANT le transfert
  — donc inclus dans ce même push et lisible après un pull sur n'importe
  quelle autre machine (suggestion utilisateur). `cloud:readSyncState` le
  lit ; `CloudSyncButton.vue` l'affiche ("Dernière synchro : {date} (depuis
  {device})" / "Jamais synchronisé"). Jamais chargé par `project:load` (fichier
  racine inconnu du pipeline), jamais copié dans le jeu exporté.
  Délibérément préféré à un diff en direct (dry-run rclone) : plus fiable
  à construire sans accès à un vrai rclone pour vérifier le comportement
  exact d'un dry-run RC, et résout mieux le vrai problème (visibilité
  cross-machine) qu'un statut local à la machine courante.

## Ce qui a été construit (2026-08-17)

- `src-electron/ipc/downloadUtils.js` — `downloadFile()`/`extractZipFlattenSingleRoot()`
  extraits d'`androidToolchain.js` (comportement inchangé, juste rendus
  réutilisables) — `androidToolchain.js` les importe maintenant au lieu de
  les dupliquer.
- `src-electron/ipc/rcloneToolchain.js` — détection/téléchargement/extraction
  du binaire rclone à la demande, version pinnée (`RCLONE_VERSION`), même
  forme que `androidToolchain.js` (`toolchainRoot` passé explicitement,
  idempotent).
- `src-electron/ipc/cloudSync.js` — cycle de vie du démon `rclone rcd`
  (port libre + token aléatoire par lancement), et les 9 handlers IPC de
  l'étape 3 (`cloud:checkRclone`, `installRclone`, `listProviders`,
  `listRemotes`, `connectProvider`, `disconnectRemote`, `push`, `pull`,
  `jobStatus`).
- **Chiffrage du config abandonné (2026-08-17, corrigé après test réel)** :
  le plan initial pilotait `rclone config encryption set` via stdin (mot de
  passe généré + stocké via `safeStorage`) au premier lancement du démon.
  Testé par l'utilisateur sur un vrai build → plantage (`Chiffrement du
  config rclone échoué (code 1)`, `Failed to read line: EOF` — rclone
  attendait une entrée supplémentaire que le script ne fournissait pas).
  Cause du fait que "ça avait l'air de marcher quand même" ensuite : le
  démon `rcd` lui-même démarre AVANT cette étape et reste actif malgré
  l'échec du chiffrage — `daemon` restait donc positionné, et tout appel
  IPC suivant sautait `startDaemon()` (`if (daemon) return daemon`),
  masquant l'échec sur les appels suivants. Protocole stdin exact
  impossible à déboguer sans accès à un vrai binaire rclone pour itérer →
  **abandonné**, pas rafistolé à l'aveugle. `rclone.conf` (tokens OAuth des
  remotes connectés) est maintenant stocké **en clair** sous
  `userData/rclone-toolchain/rclone.conf`, protégé uniquement par les
  permissions du profil OS — même modèle de confiance que la plupart des
  credentials stockés par des apps desktop. `safeStorage`/`getOrCreateConfigPass()`/
  `setConfigEncryption()` supprimés de `cloudSync.js`.
- `src-electron/ipc/index.js` / `electron-preload.js` / `electron-main.js` —
  handlers enregistrés, `storieAPI.cloud.*` exposé au renderer,
  `stopCloudSyncOnQuit()` câblé sur `before-quit` (même pattern que
  `stopWebPreviewOnQuit`).
- **Placement UI — retour utilisateur (2026-08-17)** : pas dans l'onglet Jeu
  (trop enterré pour une fonctionnalité qu'on veut utiliser souvent, pas
  juste régler une fois). Repris sur le même patron que Build/Preview web —
  un bouton dans la toolbar de `EditorPage.vue`, juste à côté du toggle
  "Sauvegarde auto", qui reflète l'état en un coup d'œil (icône/couleur :
  vérification / non installé / installation / pas de compte / prêt /
  synchro en cours) et ouvre un dialogue complet au clic.
  - `src/editor/composables/useCloudSync.js` — état partagé (refs
    module-level, même forme que `useAssetLibrary.js`) entre le bouton et
    son dialogue : `rcloneInstalled`/`installing`/`remotes`/`syncing`/etc.,
    plus toutes les actions (check/install/connect/disconnect/push/pull).
    Un seul point de vérité, pas de prop-drilling depuis `EditorPage.vue`.
  - `src/editor/components/CloudSyncButton.vue` — le bouton toolbar (icône
    calculée depuis `useCloudSync().status`) + le dialogue de gestion (3
    boutons rapides, liste des comptes connectés, champ dossier distant,
    push/pull avec confirmation avant écrasement local, progression via
    poll de `cloud:jobStatus`) + le sous-dialogue du mode avancé (recherche
    parmi les 70+ providers, formulaire dynamique). Remplace l'ancien
    `CloudSyncPanel.vue` (supprimé) qui vivait dans `GameForm.vue`.
- **Charger un projet depuis le cloud (2026-08-17, retour utilisateur)** :
  jusque-là, push/pull ne concernaient que le projet **déjà ouvert en
  local** — aucun moyen de récupérer un projet sur une machine qui n'a pas
  déjà son dossier (le cas d'usage explicite : ouvrir l'éditeur sur un
  autre PC). Ajouté :
  - `src-electron/ipc/cloudSync.js` — `cloud:listRemoteProjects` (RC
    `operations/list` sur `PROJECTS_ROOT = 'stories-engine'` à la racine du
    remote, filtré aux dossiers ; liste vide si rien poussé encore, erreur
    "not found"/"404" traitée comme vide plutôt que remontée — **heuristique
    non vérifiée contre un vrai remote**, voir "Non vérifié").
  - `src-electron/ipc/project.js` — `project:reserveNewFolder` (même garde
    anti-collision + `slugify` que `project:createProject`, mais crée juste
    un dossier vide — c'est le pull qui le remplit, pas de scaffolding).
  - `src/editor/composables/useCloudSync.js` — `connect()` gagne un
    paramètre `skipSelect` (ne touche pas `story.project.manifest`, qui
    n'existe pas encore sur l'écran d'accueil) ; nouvelle action
    `listRemoteProjects()`.
  - `src/editor/components/CloudProviderConnect.vue` (nouveau) — les 3
    boutons rapides + le sous-dialogue du mode avancé extraits de
    `CloudSyncButton.vue` en composant partagé (`skipSelect` en prop,
    `@connected` en event), réutilisé par `CloudSyncButton.vue` ET le
    nouveau `CloudLoadButton.vue` — pas de duplication.
  - `src/editor/components/CloudLoadButton.vue` (nouveau) — bouton "Charger
    depuis le cloud" sur `OpenProjectPage.vue` (écran d'accueil, avant tout
    projet ouvert). Dialogue en 2 étapes : choisir/connecter un compte →
    lister les projets trouvés sous `stories-engine/` sur ce remote → au
    clic, choisir un dossier parent local (même dialogue "Choisir où créer
    le projet" que "Nouveau projet" — **aucun emplacement par défaut**,
    cohérent avec le reste de l'app) → `reserveNewFolder` → pull → écrit
    `manifest.cloudSync = {remote, remotePath}` sur le projet frais
    téléchargé (pour que push/pull "marchent tout seuls" ensuite, sans
    reconnexion) → ouvre le projet.
  - `OpenProjectPage.vue` — 3ᵉ bouton à côté de "Ouvrir"/"Nouveau projet" ;
    `onCloudLoaded(rootPath, data)` réutilise `enterProject()` déjà là.
- `src/editor/i18n/fr-FR.js` / `en-US.js` — bloc `cloudSyncPanel` étoffé,
  parité vérifiée (773 clés de chaque côté, script Node ad hoc).
- Frontière build/export : **rien à faire** — vérifié en lisant
  `shellAssembly.js`, qui construit le shell exporté depuis
  `templates/game-shell/` + une copie fraîche de `src/engine`,
  `src/components/{phone,apps,shared}`, `src/boot`, `src/i18n`, `src/css`,
  `src/utils` uniquement. Le `src-electron/` de l'éditeur (donc
  `cloudSync.js`/`rcloneToolchain.js`) n'est jamais copié — la frontière
  existait déjà par construction, avant même ce chantier.

## Vérifié dans ce bac à sable

- `pnpm exec eslint` + `pnpm exec prettier --check` sur tous les fichiers
  touchés (backend + UI) — propres.
- `node --check` (syntaxe pure) sur les 7 fichiers `src-electron/*.js`
  touchés — tous valides.
- `pnpm run build` (web/SPA, inclut l'éditeur) — compile sans erreur après
  chaque itération (implémentation initiale, puis restructuration UI),
  `CloudSyncButton.vue`/`useCloudSync.js` inclus dans le bundle.
- Parité fr-FR/en-US des nouvelles clés `cloudSyncPanel.*` confirmée par
  script (781 clés de chaque côté).

## Non vérifié (bloqué dans ce bac à sable, comme les phases précédentes)

Pas d'affichage ni de vrai process Electron disponibles ici — tout ce qui
suit nécessite `pnpm run dev:electron` sur une vraie machine :

1. **Téléchargement réel du binaire rclone** — l'URL
   `https://downloads.rclone.org/v1.68.2/rclone-v1.68.2-<os>-<arch>.zip` et
   le nom exact de l'exécutable dans l'archive n'ont pas pu être vérifiés
   contre un vrai téléchargement depuis cet environnement. Si `1.68.2`
   n'existe plus ou si le format d'URL a changé, `installRclone()`
   échouera avec une 404 explicite (pas un échec silencieux) — premier
   point à corriger si le téléchargement échoue.
2. ~~`rclone config encryption set` en mode non-interactif~~ — **testé,
   confirmé cassé, retiré** (voir "Ce qui a été construit" ci-dessus).
   `rclone.conf` reste désormais en clair, plus de piste ouverte ici.
3. **`config/create` pour un provider OAuth (Drive/OneDrive/Dropbox)** —
   rclone doit ouvrir le navigateur système et attendre le callback OAuth ;
   le comportement exact de l'appel RC (bloque-t-il jusqu'à la fin du
   flow ? faut-il un paramètre `opt` supplémentaire pour un flow non
   interactif du côté RC lui-même ?) est documenté par rclone mais pas
   testé ici.
4. Cycle complet : installer rclone → connecter un compte → push d'un
   projet avec assets → modifier localement → pull → confirmer
   l'écrasement → vérifier l'arborescence côté provider.
5. Fermeture de l'app pendant qu'un démon rclone tourne → vérifier qu'aucun
   process `rclone` ne reste orphelin.
6. Mode avancé : connecter un remote via le formulaire dynamique (ex.
   Dropbox sans passer par le bouton rapide) → vérifier que
   `config/providers` renvoie bien un champ `providers` (nom exact supposé,
   pas confirmé) avec la structure `Options[].{Name,Help,Type,Default}`
   utilisée par `CloudProviderConnect.vue`.
7. **`operations/list` sur un dossier `stories-engine/` absent côté
   distant** (compte tout juste connecté, rien poussé encore) —
   `cloud:listRemoteProjects` suppose que l'erreur renvoyée matche
   `/not found|doesn.t exist|404/i` pour la traiter comme "liste vide"
   plutôt que la remonter comme une vraie erreur. Pas vérifié contre un
   vrai remote (le message d'erreur rclone diffère peut-être selon le
   provider — Drive/OneDrive/Dropbox n'ont pas forcément la même formulation).
   Si "Charger depuis le cloud" affiche une erreur au lieu d'une liste vide
   sur un compte fraîchement connecté, c'est ce filtre à corriger en premier.
8. Cycle complet "Charger depuis le cloud" de bout en bout : depuis
   `OpenProjectPage.vue`, connecter un compte déjà utilisé sur une autre
   machine, lister ses projets, en télécharger un, vérifier que
   `manifest.cloudSync` est bien écrit sur le projet frais et que
   push/pull fonctionnent ensuite sans reconnexion.
9. **`sync/sync` (au lieu de `sync/copy`)** pour push/pull — la distinction
   CLI `rclone sync` vs `rclone copy` est stable/documentée depuis
   longtemps, confiance raisonnable sur le nom des endpoints RC
   correspondants, mais le comportement exact des suppressions propagées
   (est-ce vraiment symétrique dans les deux sens, y a-t-il un délai) n'a
   pas pu être observé sur un vrai transfert.
10. **`operations/purge`** (suppression du dossier distant à la
    déconnexion) — endpoint RC standard, mais jamais appelé contre un vrai
    remote ici. Si la déconnexion+purge échoue avec une erreur RC
    inattendue, c'est le premier endroit à vérifier.
11. **`cloudsync.json`** — écrit avant chaque push, lu à l'ouverture du
    dialogue Cloud. Le round-trip complet (écrit sur la machine A au push,
    lu correctement sur la machine B après un pull ou un "Charger depuis
    le cloud") n'a pas pu être vérifié de bout en bout ici.
12. **Push auto en arrière-plan** — logique testée mentalement, pas en
    conditions réelles : laisser l'éditeur ouvert 10-15 min avec le toggle
    actif, vérifier qu'un push silencieux se déclenche bien toutes les
    5 min (pas de toast, mais `cloudsync.json`/l'icône toolbar doivent
    refléter le nouveau push), que ça n'entre pas en conflit avec un push/
    pull manuel lancé entre-temps, et qu'un échec (ex: token expiré)
    remonte bien un toast malgré le mode silencieux.

## Contexte (discussion initiale, 2026-08-17)

Discussion du 2026-08-17 : le besoin est une sauvegarde cloud des projets,
utilisable par d'autres personnes que l'auteur (le soft pourrait être
distribué). Trois pistes évaluées :

1. **API maison** — écartée : met l'auteur du logiciel responsable du
   stockage/auth/RGPD/coûts d'hébergement des données de chaque
   utilisateur. Rejetée d'entrée.
2. **Intégration directe des SDK officiels** (Google Drive / OneDrive /
   Dropbox, un SDK + un flow OAuth par provider) — écartée : reproduit le
   travail d'auth/upload/retry/conflit **trois fois**, maintenance qui
   triple à chaque changement d'API d'un provider.
3. **rclone comme couche d'intégration unique** — retenue. Un seul outil,
   plus de 70 providers gérés (Drive/OneDrive/Dropbox inclus), l'OAuth est
   géré par rclone lui-même (ouverture navigateur, refresh token), et son
   mode démon expose une API HTTP/JSON locale pilotable depuis le process
   principal Electron — pas de CLI parsing.

Un projet Stories Engine est une **arborescence de fichiers** (project.json,
chapters/\*.js, contacts.js, threads.js, game.js, i18n/, seed/, assets/,
apps/), pas un blob unique — c'est exactement le cas d'usage pour lequel
rclone `sync`/`copy` existe (dossier local ↔ remote).

## Décisions actées (ne pas rediscuter)

- **rclone** comme unique couche d'intégration cloud, pas de backend maison,
  pas de SDK natif par provider.
- **Sync manuelle** : boutons "Sauvegarder dans le cloud" (push) /
  "Restaurer depuis le cloud" (pull) explicites. Pas de `bisync`
  automatique en v1 — trop de risque de résolution de conflit foireuse sur
  un dossier avec beaucoup de petits fichiers, pour un gain faible tant que
  l'usage est mono-utilisateur.
- **3 providers "un clic"** (Drive/OneDrive/Dropbox) en avant, **+ un mode
  avancé** "Autre fournisseur" qui expose les 70+ providers de rclone via
  un formulaire généré dynamiquement (même appel IPC, pas un deuxième
  système).
- La cible cloud d'un projet (`remote` + chemin distant) est stockée dans
  **`project.json`** (`manifest.cloudSync`), écrite via le handler
  `project:saveManifest` déjà existant ([project.js:190](../src-electron/ipc/project.js#L190)) —
  zéro nouvelle plomberie de sauvegarde de manifeste.
- **rclone est téléchargé à la demande**, pas bundlé dans l'installeur —
  même pattern que le toolchain Android JDK/SDK
  ([android.js](../src-electron/ipc/android.js),
  [androidToolchain.js](../src-electron/ipc/androidToolchain.js)) : ~1
  téléchargement par machine, dans un dossier persistant sous
  `app.getPath('userData')`.
- **Démon rclone RC local uniquement** : bind `127.0.0.1`, port choisi par
  l'OS, token d'auth aléatoire régénéré à chaque lancement de l'app —
  jamais exposé, jamais persisté en clair.
- ~~Le mot de passe de chiffrement de la config rclone est stocké via
  `safeStorage`~~ — **abandonné après test réel** (voir "Ce qui a été
  construit"). `rclone.conf` (tokens OAuth des remotes connectés) est en
  clair sous `userData/rclone-toolchain/`, protégé par les seules
  permissions du profil OS.
- rclone est un **outil de l'éditeur uniquement** — jamais copié dans le
  jeu exporté (même frontière que `src/editor/`/`src/project/`, voir
  mémoire `stories-engine-build-boundary` et le bug de build découvert le
  2026-07-31 dans `docs/roadmap-modular-apps-events.md`).

## Architecture — vue d'ensemble

```
Renderer (Vue/Pinia)
   │  storieAPI.cloud.*  (contextBridge)
   ▼
Process principal Electron — src-electron/ipc/cloudSync.js
   │  spawn + HTTP JSON localhost (127.0.0.1:<port>, token aléatoire)
   ▼
Démon "rclone rcd"  (binaire téléchargé à la demande)
   │  gère lui-même l'OAuth (ouvre le navigateur système), le stockage
   │  chiffré des tokens, l'upload/download/retry/delta
   ▼
Provider (Google Drive / OneDrive / Dropbox / … choisi par l'utilisateur)
```

Le renderer ne parle jamais à rclone directement — tout passe par les
handlers `ipcMain.handle` de `cloudSync.js`, comme le reste de
l'application (voir `project.js`, `android.js`).

---

## Étapes d'implémentation

### Étape 1 — Acquisition du binaire rclone

Fichier : `src-electron/ipc/rcloneToolchain.js` (miroir direct
d'`androidToolchain.js`).

- `getRcloneRoot()` → `path.join(app.getPath('userData'), 'rclone-toolchain')`,
  persistant (survit aux mises à jour/redémarrages de l'app).
- `detectRclone(root)` → vérifie la présence du binaire attendu
  (`rclone.exe` sous Windows, `rclone` sous macOS/Linux) et qu'il s'exécute
  (`--version`).
- `installRclone(root, onProgress)` → télécharge le zip officiel
  correspondant à la plateforme/l'archi courante (`process.platform`,
  `process.arch`), l'extrait dans `root`, reporte la progression
  (téléchargement + extraction) via le callback.
- Pas de vérification de checksum supplémentaire dans un premier temps
  (rclone sert déjà ses binaires en HTTPS depuis son propre domaine) — à
  revisiter si besoin de durcissement plus tard.

### Étape 2 — Cycle de vie du démon RC

Fichier : `src-electron/ipc/cloudSync.js`.

- Démarrage **paresseux** : le démon n'est spawné qu'au premier usage de la
  fonctionnalité cloud dans une session (pas au lancement de l'app).
- `startRcloneDaemon()` :
  - génère un port libre (`--rc-addr=127.0.0.1:0`, ou résolution manuelle
    d'un port libre avant spawn) et un token aléatoire
    (`crypto.randomBytes`) pour `--rc-user`/`--rc-pass`.
  - `spawn(rclonePath, ['rcd', '--rc-addr=127.0.0.1:<port>', '--rc-user=...', '--rc-pass=...', '--config=<chemin config chiffrée>'])`.
  - attend que le démon réponde sur `core/pid` avant de considérer le
    démarrage réussi (retry court, pas de sleep arbitraire).
- `stopRcloneDaemon()` appelé sur `app.on('before-quit')` (kill propre du
  process enfant).
- Un seul démon partagé pour toute la session, réutilisé par tous les
  projets ouverts.

### Étape 3 — Surface IPC (contrat renderer ↔ main)

Handlers `ipcMain.handle` dans `cloudSync.js`, exposés dans
`electron-preload.js` sous `storieAPI.cloud.*` :

| Canal | Rôle |
| --- | --- |
| `cloud:checkRclone` | Détecte si le binaire est déjà installé (mirroir `android:checkToolchain`). |
| `cloud:installRclone` | Télécharge/installe, reporte la progression via `mainWindow.webContents.send('cloud:installProgress', …)` (mirroir `android:installToolchain`). |
| `cloud:listProviders` | Proxy de l'endpoint RC `config/providers` — liste des 70+ providers + schéma de champs par provider. Mis en cache mémoire côté main (ne change pas en cours de session). |
| `cloud:listRemotes` | Proxy `config/listremotes` — remotes déjà connectés sur cette machine. |
| `cloud:connectProvider` | `{ provider, name, options }` → `config/create`. Pour Drive/OneDrive/Dropbox, `options` est réduit au minimum (rclone gère l'OAuth : ouverture navigateur système, attente du callback). Pour le mode avancé, `options` vient du formulaire dynamique (étape 7). |
| `cloud:disconnectRemote` | `{ name }` → `config/delete`. |
| `cloud:push` | `{ rootPath, remote, remotePath }` → `sync/copy` (local → distant). Retourne un `jobid`. |
| `cloud:pull` | `{ rootPath, remote, remotePath }` → `sync/copy` (distant → local). Retourne un `jobid`. Le renderer doit avoir affiché l'avertissement d'écrasement AVANT d'appeler ce canal (voir étape 6). |
| `cloud:jobStatus` | `{ jobid }` → proxy `job/status` + `core/stats`, pour afficher la progression (fichiers transférés/restants, erreurs). |

### Étape 4 — Persistance de la config cloud par projet

- Nouveau champ optionnel dans `project.json` :
  ```json
  {
    "cloudSync": { "remote": "gdrive-perso", "remotePath": "stories-engine/mon-jeu" }
  }
  ```
- Écrit via le handler existant `project:saveManifest`
  ([project.js:190](../src-electron/ipc/project.js#L190)) — aucun nouveau
  handler de sauvegarde nécessaire.
- À l'ouverture d'un projet, si `manifest.cloudSync` est présent, le panneau
  Cloud (étape 6) pré-sélectionne ce remote/chemin.

### Étape 5 — Sécurité

- **Localhost uniquement** : `--rc-addr=127.0.0.1:<port>`, jamais `0.0.0.0`.
- **Token aléatoire par lancement** : `--rc-user`/`--rc-pass` régénérés à
  chaque démarrage du démon, jamais écrits sur disque en clair, gardés en
  mémoire côté process principal uniquement.
- ~~Config rclone chiffrée via un mot de passe stocké par `safeStorage`~~ —
  tenté, cassé contre un vrai build (voir "Ce qui a été construit"),
  **abandonné**. `rclone.conf` reste en clair sous `userData/rclone-toolchain/` ;
  la protection est celle du profil OS de l'utilisateur, pas un chiffrage
  applicatif.
- Aucun log ne doit jamais imprimer le token RC ni le mot de passe de
  config (attention particulière dans les messages d'erreur remontés au
  renderer).

### Étape 6 — UI renderer : panneau Cloud

Nouveau composant, ex. `src/editor/components/CloudSyncPanel.vue`, placé
dans l'onglet **Jeu** existant (cohérent avec les autres réglages projet-
wide comme les toggles d'app, cf. `docs/roadmap-modular-apps-events.md`) ou
en accès rapide depuis la topbar, à trancher au moment de l'implémentation.

Flow :

1. **Pas de remote connecté** → 3 boutons "Connecter Google Drive / OneDrive
   / Dropbox" + un lien discret "Autre fournisseur (avancé)".
2. Clic sur un bouton → `cloud:connectProvider` → rclone ouvre le
   navigateur système → une fois le remote créé, apparaît dans un menu
   déroulant.
3. **Remote sélectionné** → deux boutons "Sauvegarder dans le cloud"
   (push) / "Restaurer depuis le cloud" (pull), + indicateur de statut sur
   le même modèle visuel que l'indicateur "non-sauvegardé" déjà présent
   dans `EditorPage.vue` (idle / en cours / synchronisé / erreur).
4. **Pull** → dialog de confirmation obligatoire ("Ceci va écraser vos
   modifications locales non poussées") avant d'appeler `cloud:pull` — même
   patron que les confirmations de suppression existantes (`q-dialog` +
   `Notify`).
5. Progression pendant push/pull : poll `cloud:jobStatus` (ou écoute d'un
   event poussé par le main process), affichage fichiers
   transférés/restants + erreurs éventuelles.

### Étape 7 — Mode avancé ("Autre fournisseur")

- Combobox de recherche sur la liste renvoyée par `cloud:listProviders`
  (id + nom + description par provider).
- Une fois un provider choisi, formulaire généré dynamiquement à partir de
  son schéma d'options (`name`, `help`, `type`, `default`, `required`,
  `examples` — champs retournés tels quels par `config/providers`) :
  simple champ texte pour la plupart, cases à cocher pour les booléens.
- Soumission → même canal `cloud:connectProvider` que les 3 boutons rapides
  (juste avec des `options` explicites au lieu du minimum OAuth) — pas de
  deuxième chemin de code.
- **Point ouvert** : certains providers avancés (S3, WebDAV, SFTP…)
  n'ont pas d'OAuth — le formulaire doit gérer ce cas (pas d'ouverture de
  navigateur, juste soumission directe des champs).

### Étape 8 — Build / packaging

- Vérifier que `src-electron/ipc/rcloneToolchain.js` et `cloudSync.js`
  restent dans le process principal de l'**éditeur** uniquement — jamais
  copiés par `src-electron/ipc/build.js` dans le shell du jeu exporté
  (même frontière que `src/editor/`/`src/project/`, cf. le bug de build du
  2026-07-31 documenté dans `docs/roadmap-modular-apps-events.md`).
- Le dossier `userData/rclone-toolchain/` ne doit jamais être inclus dans
  un build de jeu — à vérifier explicitement dans `build.js` au moment de
  l'implémentation (liste d'exclusion), même s'il n'a normalement aucune
  raison d'être référencé depuis ce pipeline.

### Étape 9 — Vérification manuelle à faire

Comme pour les phases précédentes, tout ce qui touche l'IPC réel et
l'affichage ne peut pas être vérifié en bac à sable et nécessite
`pnpm run dev:electron` :

1. Première utilisation : `cloud:checkRclone` renvoie faux → clic
   "Installer" → progression affichée → binaire présent dans
   `userData/rclone-toolchain/`.
2. Connecter Google Drive → navigateur système s'ouvre → consentement →
   remote apparaît dans le menu déroulant.
3. Push d'un projet réel (avec assets) → vérifier sur Drive que
   l'arborescence complète est présente et fidèle.
4. Modifier un fichier local, Pull → confirmer le dialog d'avertissement,
   confirmer l'écrasement correct après validation.
5. Couper la connexion réseau en cours de push → vérifier qu'une erreur
   claire remonte au renderer (pas de crash du démon ni de l'app).
6. Fermer l'app pendant qu'un démon rclone tourne → vérifier qu'aucun
   process `rclone` ne reste orphelin (`before-quit` bien câblé).
7. Mode avancé : connecter un remote non pré-configuré (ex. Dropbox via le
   formulaire dynamique plutôt que le bouton rapide) → vérifier que le
   résultat est identique à la connexion rapide.

---

## Hors scope v1 (explicitement)

- Synchronisation bidirectionnelle automatique (`bisync`) — reste en push/
  pull manuels explicites.
- Résolution de conflit fine (dernier push gagne, écrasement complet côté
  distant ou local selon le sens choisi).
- Collaboration multi-utilisateur / édition simultanée.
- Démon rclone permanent en arrière-plan — reste lancé à la demande.

## Points d'attention / risques

- **Écriture multi-fichiers non atomique** : les handlers de
  `project.js` écrivent chapitre par chapitre, fichier par fichier — un
  push déclenché pendant une série de sauvegardes pourrait capturer un
  état transitoire incohérent. À mitiger en désactivant le bouton push
  pendant qu'une sauvegarde est en cours, pas de solution générale prévue
  en v1.
- **Branding OAuth** : par défaut, `config/create` sans `client_id`/
  `client_secret` explicite utilise les identifiants d'application partagés
  de rclone lui-même — l'écran de consentement affichera "rclone" comme nom
  de l'application demandant l'accès, pas "Stories Engine". Fonctionnel
  immédiatement, zéro démarche d'enregistrement, mais moins soigné côté
  UX/confiance utilisateur. Enregistrer sa propre app OAuth par provider
  (surtout Google, qui a un processus de vérification pour sortir de l'état
  "app non vérifiée") est une amélioration possible mais volontairement
  **différée** — pas nécessaire pour un premier jet fonctionnel.
- **Process rclone orphelin** : si l'app crash sans passer par
  `before-quit`, le démon peut rester actif en arrière-plan — acceptable
  en v1 (processus léger, bind localhost uniquement), à surveiller si
  des rapports utilisateur remontent le problème.
