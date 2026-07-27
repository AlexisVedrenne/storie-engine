# Storie Engine — pipeline de Build (Phase 3)

## Statut : ✅ confirmée fonctionnelle par l'utilisateur (2026-07-27)

Bouton Build utilisé pour de vrai depuis l'éditeur Electron, jeu exporté et fonctionnel. Avant cette confirmation, le pipeline avait déjà été testé bout-en-bout dans le bac à sable de dev (assemblage + `pnpm install` + `quasar build -m electron` + packaging, contre le fixture `demo-project`) — quatre bugs réels trouvés et corrigés au total, voir plus bas.

## Décisions actées

- Sortie : **app desktop Electron packagée** (dossier + `.exe` via `bundler: 'packager'`, pas d'installeur).
- Après build : **export dans un dossier choisi, terminé** — pas d'aperçu navigateur.

## Ce qui a été construit

- `templates/game-shell/` — squelette Quasar+Electron minimal committé (package.json, quasar.config.js, index.html, App/layout/router/stores, src-electron vanilla, `engine-overrides/assets.js`, `pnpm-workspace.yaml`).
- `src/pages/GamePage.vue` (dans le shell) — assemble le `ProjectData` depuis `./project-data/` (imports statiques + `import.meta.glob` pour chapitres/i18n), chapitres retrouvés **par `id`** via `project.json.chapterOrder` (pas par chemin de fichier).
- `src-electron/ipc/build.js` (dans l'éditeur) — orchestration complète : copie fraîche de `src/engine`/`src/components/phone|apps`/`src/boot`/`src/i18n`/`src/css`/`src/utils` depuis l'éditeur + le projet ouvert, `pnpm install`, `quasar build -m electron`, copie du dossier packagé vers la destination choisie, nettoyage.
- Bouton **Build** dans la topbar de `EditorPage.vue` (état `building`, désactive Changer de projet pendant l'opération).

## Bugs trouvés et corrigés par le test réel

1. **`src/utils/chatTime.js` manquant** — `ChatThread.vue`/`DmThreadScreen.vue` l'importent (`@/utils/chatTime`), pas seulement `@/engine/*`/`@/components/*`. Le tout premier build a échoué avec `[UNLOADABLE_DEPENDENCY]`. Corrigé : `src/utils/` ajouté à la liste des dossiers copiés dans `assembleShell()`.
2. **`pnpm install` bloquait les scripts d'installation** (`[ERR_PNPM_IGNORED_BUILDS]`) — un dossier fraîchement généré n'a pas l'approbation pnpm nécessaire pour `electron`/`esbuild` (le binaire Electron ne se téléchargeait pas). Corrigé : `templates/game-shell/pnpm-workspace.yaml` committé avec `allowBuilds: { electron: true, esbuild: true, ... }`.
3. **URL d'assets absolue cassée en `file://`** — `resolveAssetUrl` générait `/story-assets/...` (racine absolue), qui pointe vers la racine du disque sous `file://`, pas vers le dossier de l'app. Confirmé en inspectant le bundle compilé : les propres balises `<script>`/`<link>` d'`index.html` généré par Quasar utilisent toutes des chemins relatifs (`./assets/...`) pour cette exact raison. Corrigé : `./story-assets/...` (relatif) — revérifié dans le bundle compilé après correction.
4. **Un succès masqué par l'échec du nettoyage** — trouvé en usage réel, pas dans le bac à sable : `fs.rmSync(tmpDir)` dans le `finally` de `buildGame()` pouvait lever `EPERM` (verrou fichier Windows transitoire sur le dossier temp, après la sortie des process enfants) — et un `finally` qui throw **écrase** ce que le `try` avait renvoyé, donc un build **déjà réussi** remontait comme une erreur côté UI. Corrigé : cleanup avec retry (5x, backoff) qui abandonne silencieusement plutôt que de faire échouer l'opération — un dossier temp non supprimé est sans gravité, contrairement à un faux échec.

## Vérifié en conditions réelles

Rendu visuel de `PhoneShell` dans l'exe généré, chargement d'image, autonomie vis-à-vis du projet/éditeur d'origine — tout confirmé par l'utilisateur en usage réel.

## Risques restants

- **Racine de storie-engine résolue via `process.cwd()`** — valide tant que l'éditeur tourne via `pnpm run dev:electron` depuis les sources. Si l'éditeur est un jour lui-même packagé/distribué, ce chemin devra pointer vers des ressources embarquées (`extraResources`) — hors scope.
- **Pas d'icône d'app custom** — le build affiche un avertissement bénin ("Could not find icon..."), utilise l'icône Electron par défaut. Cosmétique, à améliorer en Phase 4 si besoin.
- **Temps de build** (~20-40s dans ce test, dépend du cache pnpm) — pas de barre de progression détaillée, juste le spinner du bouton Build.

## Checklist de vérification (passée avec succès)

1. Ouvrir un projet dans l'éditeur, cliquer **Build**, choisir un dossier. ✅
2. Notification de succès. ✅
3. `<Nom>.exe` + ressources présents dans le dossier choisi. ✅
4. `PhoneShell` démarre et joue le chapitre correctement dans l'exe. ✅
5. Image(s) affichée(s) correctement (URL relative). ✅
6. Autonomie vis-à-vis du projet/éditeur d'origine. ✅

## Feuille de route restante (Phase 4)

- Éditer `contacts.js`/`threads.js`/`game.js`/`seed/*` dans l'UI (aujourd'hui toujours à la main).
- Gestionnaire d'assets (import direct dans `assets/`, pas juste sélection de ce qui existe déjà).
- Édition des dictionnaires i18n dans l'UI.
- Validation de projet (flag/contact référencé mais inexistant, chapitre orphelin...).
- Icône d'app personnalisée pour le build.
