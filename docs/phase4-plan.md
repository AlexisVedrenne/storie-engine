# Storie Engine — édition visuelle contacts/threads/game (Phase 4a)

## Statut : implémentée, en attente de vérification manuelle Electron (voir plus bas)

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

## Vérifié

- `pnpm run build` (web) compile sans erreur (ESLint inclus).
- `findReferences()` vérifié en Node pur contre le fixture réel (voir ci-dessus).

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

## Feuille de route restante (Phase 4)

- Gestionnaire d'assets (import direct dans `assets/`, pas juste sélection de l'existant).
- Édition des dictionnaires i18n dans l'UI.
- Validation de projet (flag/contact référencé mais inexistant, chapitre orphelin...).
- Migration opportuniste des 10 formulaires d'entrée vers `useContactOptions()`.
- Icône d'app personnalisée pour le build.
