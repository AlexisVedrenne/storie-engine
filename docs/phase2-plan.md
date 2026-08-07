# Stories Engine — éditeur visuel par formulaires (Phase 2)

## Statut : implémentée, en attente de vérification manuelle Electron (voir plus bas)

## Contexte

Phase 1 a prouvé le chargement dynamique d'un projet + aperçu téléphone live en lecture seule. Phase 2 ajoute l'édition réelle : créer/réordonner des chapitres, éditer chaque entrée de leur timeline via un formulaire dédié à son type, et écrire ces modifications sur disque.

Décisions actées :

- Un composant de formulaire sur-mesure par type d'entrée (pas de formulaire générique piloté par schéma).
- Sauvegarde : bouton "Enregistrer" (+ Ctrl+S) toujours disponible, PLUS un toggle "sauvegarde auto" (débounce ~1.2s).
- Réordonnancement : boutons monter/descendre (pas de glisser-déposer).

## Ce qui a été construit

- `src/project/serializeChapter.js` — `toJsLiteral()` + `serializeChapter()`, sérialise un objet chapitre en JS valide (clés non-quotées, `undefined` supprimé). **Testé en Node standalone** : round-trip identique sur `demo-project/chapters/chapter1.js`, gère clés non-identifiants, `undefined` supprimé, structures `choice`/`options`/`then` imbriquées.
- `src-electron/ipc/project.js` — 5 nouveaux handlers : `project:saveChapter`, `project:createChapter`, `project:deleteChapter`, `project:reorderChapters`, `project:pickAsset`. Le formatage final passe par **Prettier standalone** (`prettier/standalone` + plugins `babel`/`estree`, config alignée sur `.prettierrc.json` — semi:false, singleQuote:true, printWidth:100). **Testé en Node standalone** (même script) : formatage correct, style conforme.
- `src-electron/electron-preload.js` — `storieAPI` étendu avec les 5 nouveaux canaux.
- `quasar.config.js` — plugins Quasar `Dialog` et `Notify` activés (nécessaires pour les confirmations de suppression et les toasts de sauvegarde).
- `src/editor/pages/EditorPage.vue` — remplace `PreviewPage.vue`. Layout 3 colonnes (`ChapterList` / `TimelineEditor` du chapitre sélectionné / `PhoneShell`), barre du haut (nom projet, indicateur "modifié", toggle sauvegarde auto, Enregistrer, Relancer l'aperçu, Changer de projet). Route renommée `preview` → `editor`.
- `src/editor/components/ChapterList.vue` — liste, ▲▼, "Nouveau chapitre" (dialog), suppression (confirm dialog), "Prévisualiser depuis ce chapitre" (`story.startChapter(id)`, déjà existant côté engine).
- `src/editor/components/TimelineEditor.vue` — liste d'entrées (carte repliable, résumé, ▲▼/dupliquer/supprimer), menu d'ajout par type, réutilisé récursivement pour `option.then`.
- `src/editor/components/RequiresBuilder.vue` / `EffectsBuilder.vue` / `AssetField.vue` / `CommentsListField.vue` — constructeurs partagés.
- `src/editor/components/entries/*EntryForm.vue` — un composant par type (message/choice/post/photo/story/dm/reel/call/effect/timeskip), conformes à `docs/story-engine.md` section 4 (dépôt NTR).

## Vérifié

- `pnpm run build` (web) compile sans erreur (ESLint inclus — `vue/no-mutating-props` reconfiguré en `shallowOnly` pour autoriser la mutation de champs imbriqués d'un prop objet, le pattern voulu ici puisque `entry`/`entries` sont les mêmes objets réactifs que lit la preview).
- `serializeChapter()` + formatage Prettier testés en Node pur (sans Electron) contre le fixture réel — round-trip fidèle, edge cases (clé non-identifiant, `undefined`, imbrication choice/then) corrects.

## Non vérifié (bloqué dans ce bac à sable)

Comme en Phase 1, `ELECTRON_RUN_AS_NODE=1` + pas d'affichage dans cet environnement empêchent de lancer réellement la fenêtre Electron. Tout ce qui touche l'IPC réel (dialogues fichier, écriture disque via `project:saveChapter`/`createChapter`/`deleteChapter`/`reorderChapters`/`pickAsset`, rendu visuel des formulaires, aperçu live) reste à vérifier à la main via `pnpm run dev:electron` — voir la checklist ci-dessous.

## Vérification manuelle à faire

1. Ouvrir `demo-project`, atterrir sur `EditorPage`.
2. Ajouter une entrée `message` dans chapter1, l'éditer, "Enregistrer" → rouvrir `chapters/chapter1.js` sur disque, confirmer le contenu formaté.
3. Créer un 2ème chapitre → confirmer nouveau fichier + `project.json.chapterOrder` mis à jour.
4. Réordonner (▲▼) → confirmer `chapterOrder` réécrit.
5. Éditer un `choice` avec `then` imbriqué + `effects`/`requires` sur une option → sauvegarder → confirmer la structure imbriquée.
6. Activer "sauvegarde auto", modifier un champ, attendre ~1.2s, confirmer l'écriture disque sans clic.
7. "Prévisualiser depuis ce chapitre" sur le 2ème chapitre → confirme que `PhoneShell` saute direct dessus.
8. Champ image d'un `post` → "Parcourir…" → sélectionner une image sous `assets/` → confirmer le chemin relatif correct.
9. Supprimer un chapitre → confirmer le dialog de confirmation, le fichier disparaît, `chapterOrder` mis à jour.

## Feuille de route restante

- **Phase 3** : pipeline de Build — copie moteur + projet dans un shell embarqué, `assets/` → `public/story-assets/`, bascule de `resolveAssetUrl` vers la branche URL statique, `quasar build`.
- **Phase 4** : validation de projet, gestionnaire d'assets (import/organisation), édition des dictionnaires i18n dans l'UI, édition de `contacts.js`/`threads.js`/`seed/*` (hors scope Phase 2, qui ne couvre que les chapitres).
