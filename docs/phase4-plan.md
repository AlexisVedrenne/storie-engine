# Storie Engine — contacts/threads/game (4a) + validation (4b) + assets (4c)

## Statut : implémentées, en attente de vérification manuelle Electron (voir plus bas)

## Contexte

Phases 1-3 confirmées fonctionnelles. `contacts.js`/`threads.js`/`game.js` étaient
encore chargés en lecture seule uniquement — édités à la main sur disque. Phase 4
(feuille de route actée dans `docs/phase3-plan.md`) couvre : contacts/threads/game
dans l'UI, gestionnaire d'assets, édition i18n, validation de projet. Cette
sous-phase (4a) traite le premier de ces quatre chantiers — c'est celui qui
bloque le plus l'usage quotidien.

Décisions actées avec l'utilisateur avant implémentation :
- Ordre : contacts/threads/game d'abord.
- **Suppression d'un contact/thread encore référencé = bloquée**, pas juste
  avertie — le dialog liste les références trouvées et refuse la suppression.

## Ce qui a été construit

- `src/project/serializeChapter.js` — `serializeContacts()`/`serializeThreads()`/`serializeGame()`, wrappers fins sur `toJsLiteral()` (déjà générique, aucune logique nouvelle).
- `src-electron/ipc/project.js` — 3 nouveaux handlers `project:saveContacts`/`saveThreads`/`saveGame`, calqués sur `saveChapter` (écrasement complet du fichier plat, formatage Prettier via `formatJs()` existant). Pas de create/delete IPC dédié : ajout/suppression = mutation en mémoire du tableau réactif + save complet, comme les entrées de timeline d'un chapitre.
- `src-electron/electron-preload.js` — `storieAPI` étendu avec les 3 nouveaux canaux.
- `src/project/findReferences.js` (nouveau) — `findReferences(project, {type: 'contact'|'thread', id})`, pure, sans dépendance au store Pinia (`src/project/` reste une couche sans dépendance). Scanne chapitres (récursif dans `choice.options[].then`), `threads.js` (`participants`), et tous les buckets de `seed/*`. Retourne un tableau de chaînes lisibles (breadcrumbs), `[]` = suppression sûre. **Testé en Node standalone** contre le fixture réel (`storie-engine-fixtures/demo-project`) : `erwan` (référencé dans chapter1 + squad) → 13 réfs ; un id inventé → `[]` ; `squad` (thread) → 28 réfs.
- `src/editor/composables/useContactOptions.js` (nouveau) — extraction du pattern `contactOptions`/`threadOptions` dupliqué dans ~10 formulaires d'entrée (`ChoiceEntryForm.vue` avait la version la plus complète). Passé de `const` à `computed()` pour rester correct maintenant que les contacts/threads sont éditables en cours de session. **Portée volontairement restreinte** : câblé uniquement dans le nouveau code de cette phase (`ThreadForm.vue`) — les 10 fichiers existants ne sont pas touchés, migration laissée pour plus tard.
- `src/editor/components/ContactList.vue` / `ContactForm.vue` — liste (nom, pastille couleur, id mono) + formulaire (identité, bio, réseau social, avatars via `AssetField.vue` réutilisé tel quel). `me` non supprimable (bouton masqué, tooltip). Tous les ids sont verrouillés après création (readonly dans le formulaire) — `findContact`/`findThread` échouent silencieusement sur un id orphelin (stub gris `#999999`), donc un id librement éditable sans réécriture des références aurait été strictement pire que le blocage de suppression déjà demandé.
- `src/editor/components/ThreadList.vue` / `ThreadForm.vue` — même structure. Le formulaire n'édite que les groupes (`group: true` implicite, jamais une case à cocher) ; `participants` via un `q-select multiple` avec `'me'` pré-inclus et non retirable.
- `src/editor/components/GameForm.vue` — un seul champ (`title`), pas de liste.
- `src/editor/pages/EditorPage.vue` — ajout d'un `viewMode` (`chapters`/`contacts`/`threads`/`game`) piloté par un `q-btn-toggle` dans la topbar (réutilise le pattern déjà utilisé par `ChoiceEntryForm.vue` pour SMS/DM — aucune route/tab n'existait dans l'app). Les 3 nouveaux modes réutilisent la même disposition 2-volets + aperçu téléphone que les chapitres. Le flag `dirty`/l'autosave restent globaux (un seul `dirty` ref, une seule bascule autosave) mais généralisés : `watchActiveResource()` observe désormais soit le chapitre sélectionné, soit le tableau/objet complet (`contacts`/`threads`/`gameConfig`) selon `viewMode`, et `save()` distribue vers le bon handler IPC + sérialiseur.

**Correctif post-4a** : les 4 onglets (`viewMode`) vivaient chacun dans leur propre branche `q-splitter`, chacune avec son propre `<PhoneShell/>` — Vue détruit/recrée toute une branche `v-if`/`v-else-if` au changement, donc chaque clic d'onglet redémarrait l'aperçu (reboot complet de `PhoneShell`). Corrigé en remontant un seul arbre de splitters + une seule instance `PhoneShell` à une position fixe du template, seul le contenu liste/formulaire à l'intérieur change avec `viewMode`. Le même problème existe encore sur le bouton « Aperçu seul » (`focusPreview`, pré-existant depuis la Phase 2, branche séparée) — pas corrigé, non demandé.

## Phase 4b — Validation de projet

Décisions actées : **erreurs dures uniquement** (pas de détection de flag jamais
défini — non prouvable en général, ordre/choix-dépendant, faux positifs), et
résultats affichés dans un **dialog popup** (pas de panneau persistant),
même pattern que le dialog « Suppression impossible » de la 4a.

- `src/project/validateProject.js` (nouveau, pur, sans dépendance store — même convention que `findReferences.js`) :
  - `collectReferences()` (interne) — même balayage que `findReferences.js` mais collecte *toutes* les références (pas seulement celles pointant vers un id cible), puis chacune est vérifiée contre `contacts`/`threads` (avec le fallback thread = contact 1:1 de `findThread`).
  - `validateProject(project)` → `{errors, warnings}` — références cassées + 3 checks structurels de chapitres : id dans `chapterOrder` sans fichier correspondant (erreur), fichier chapitre absent de `chapterOrder` (avertissement, ordre non garanti), `entryChapterId` invalide (erreur, le jeu ne démarre pas).
  - `collectAssetPaths(project)` → `[{path, labels}]`, dédupliqué — pas de vérification d'existence ici (le renderer n'a pas accès à `fs`).
- `src-electron/ipc/project.js` — nouveau handler `project:checkAssets({rootPath, assetsRoot, paths})`, retourne le sous-ensemble de chemins introuvables sur disque (`fs.existsSync`, même logique que `project:pickAsset`).
- `src-electron/electron-preload.js` — canal `checkAssets` ajouté.
- `src/editor/pages/EditorPage.vue` — bouton « Valider le projet » dans la topbar (groupé avec Enregistrer/Build/Changer de projet, pas avec le cluster aperçu). Lance `validateProject()` + `collectAssetPaths()` + l'appel IPC, fusionne les assets manquants dans `errors`, affiche un `Dialog.create()` unique (erreurs puis avertissements, ou « Aucun problème détecté. »).

**Testé en Node standalone** contre le fixture réel : projet propre → `{errors: [], warnings: []}` ; typo injectée sur `message.contact` → erreur avec le bon breadcrumb ; id fantôme dans `chapterOrder` → erreur ; `entryChapterId` invalide → erreur ; chapitre absent de `chapterOrder` → avertissement. Les 5 cas confirmés corrects.

## Vérifié

- `pnpm run build` (web) compile sans erreur (ESLint inclus).
- `findReferences()` vérifié en Node pur contre le fixture réel (voir ci-dessus).
- `validateProject()`/`collectAssetPaths()` vérifiés en Node pur contre le fixture réel (voir Phase 4b ci-dessus).

## Non vérifié (bloqué dans ce bac à sable, comme en Phase 2)

Pas d'affichage Electron possible ici. Tout ce qui touche l'IPC réel et le
rendu visuel reste à vérifier via `pnpm run dev:electron`.

## Vérification manuelle à faire

1. Ouvrir `demo-project`, basculer sur l'onglet **Contacts**.
2. Ajouter un contact, remplir les champs, Enregistrer → rouvrir `contacts.js` sur disque, confirmer le contenu formaté.
3. Éditer la couleur/l'avatar d'`erwan` → confirmer que l'aperçu `PhoneShell` se met à jour en direct.
4. Essayer de supprimer `erwan` (référencé dans chapter1 + seed) → confirmer le blocage avec la liste des références, pas de suppression.
5. Supprimer un contact de test non référencé → confirmer la suppression sur disque.
6. Confirmer que le bouton supprimer de `me` est bien masqué/désactivé.
7. Onglet **Threads** : créer un groupe, ajouter des participants, Enregistrer → confirmer `threads.js` sur disque.
8. Onglet **Jeu** : éditer le titre, Enregistrer → confirmer le filigrane de l'écran verrouillé dans l'aperçu.
9. Activer la sauvegarde auto, éditer un champ contact, attendre ~1.2s → confirmer l'écriture disque sans clic.
10. Changer d'onglet (Chapitres ↔ Contacts) avec des modifications non enregistrées → confirmer que ça se comporte comme changer de chapitre aujourd'hui (le point "modifié" se réinitialise, pas de prompt de confirmation — comportement volontairement identique, pas une régression).
11. Confirmer que changer d'onglet ne redémarre plus l'aperçu `PhoneShell` (correctif post-4a ci-dessus).
12. Cliquer « Valider le projet » sur le fixture propre → « Aucun problème détecté. ».
13. Casser un `message.contact`, retirer un id de `chapterOrder`, renommer un fichier dans `assets/` sur disque → revalider, confirmer que les 3 problèmes remontent dans le même dialog avec les bons libellés.

## Correctifs/ajouts post-4b (demandés par l'utilisateur après usage réel)

- **Validation avant build** — `buildGame()` lance désormais la même validation que le bouton dédié avant de construire : erreurs dures → build annulé, dialog affiché ; avertissements seuls → dialog de confirmation (continuer quand même ?) ; projet propre → build direct sans friction. Logique partagée via `computeValidation()`/`showValidationDialog()` dans `EditorPage.vue`.
- **Réouverture du dernier projet** — `rootPath` du dernier projet ouvert/créé stocké dans `localStorage` (`storie-engine-last-project`), réouvert silencieusement au lancement (`OpenProjectPage.vue`, `onMounted`). « Changer de projet » efface cette clé — une sortie volontaire n'est pas annulée par le lancement suivant.
- **Bouton « Nouveau projet »** — dialog nom → `project:selectNewProjectLocation` (choisit le dossier parent) → `project:createProject` (nouveaux handlers IPC) crée `project.json` + `chapters/chapter1.js` + `contacts.js` (avec le contact `me` requis) + `threads.js`/`game.js` vides, en réutilisant `serializeChapter.js` (pur, sans dépendance Electron/navigateur — importable tel quel depuis le process principal, pas de duplication de logique de sérialisation). Scaffold vérifié en Node standalone (fichiers valides, `contacts.js` réimportable).

## Phase 4c — Gestionnaire d'assets

Décisions actées : import-depuis-le-disque **et** onglet dédié (pas juste le
fix minimal d'import) ; destination d'import pour un champ lié à un contact
= `assets/images/<contact-id>/<fichier>` (suit la convention déjà visible
dans le fixture), sinon racine de `assets/`.

- `AssetField.vue` — nouveau bouton « Importer… » (à côté de « Parcourir… »,
  qui reste pour sélectionner un fichier déjà présent dans `assets/`),
  nouvelle prop `contactId` câblée aux 7 usages (`ContactForm` ×2, et
  `entry.contact`/`entry.author`/`entry.from` selon le formulaire).
- `src-electron/ipc/project.js` — 3 nouveaux handlers : `project:importAsset`
  (dialog non restreint + copie collision-safe, `photo.png` → `photo-2.png`…),
  `project:listAssetFiles` (scan récursif de `assets/`), `project:deleteAsset`
  (même validation anti-traversal que `pickAsset`).
- `src/editor/components/AssetsPanel.vue` (nouveau, 5ème onglet « Assets ») —
  grille de vignettes, badge Utilisé/Orphelin (réutilise `collectAssetPaths()`
  déjà construit pour la 4b), suppression des orphelins uniquement, bouton
  « Importer un fichier » (racine, sans contexte contact) + rafraîchir.
- **Testé en Node standalone** : logique de nommage collision-safe vérifiée
  contre un dossier scratch — 3 imports du même fichier → suffixes `-2`/`-3`
  corrects, pas d'écrasement.

## Feuille de route restante (Phase 4)

- Édition des dictionnaires i18n dans l'UI.
- Migration opportuniste des 10 formulaires d'entrée vers `useContactOptions()`.
- Icône d'app personnalisée pour le build.
- (Optionnel, hors scope) correctif du remount `PhoneShell` sur le bouton « Aperçu seul ».
