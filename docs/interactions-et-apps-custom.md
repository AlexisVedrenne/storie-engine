# Interactions & Apps custom — comment ça marche

Deux systèmes ajoutés au moteur début août 2026, tous deux construits sur le
même principe déjà en place pour les events (`docs/roadmap-modular-apps-events.md`) :
**l'auteur produit de la donnée dans l'éditeur, un seul composant runtime
générique l'interprète** — jamais un composant Vue codé en dur par instance.

Aucun des deux n'a encore été cliqué en vrai (lint + build réels seulement,
voir `docs/roadmap-modular-apps-events.md` pour le précédent de vérification
sur ce moteur). Premier truc à tester manuellement si tu lis ça pour la
première fois.

## 1. Interactions — gestes téléphone authored par l'auteur

**Le besoin** : des moments narratifs où le joueur interagit physiquement
avec le téléphone (brancher un câble, essuyer la poussière, taper un code)
— pas des mini-jeux façon WarioWare pré-codés, un vocabulaire de gestes
génériques que l'auteur compose lui-même.

### Vocabulaire de steps — `src/engine/interactions/stepKinds.js`

7 primitives fixes, volontairement bornées (pas de canevas libre) :
`tap`, `hold`, `swipe`, `drag`, `wipe`, `code` (clavier numérique), `wait`
(aucune interaction, juste un délai). Chaque step porte `text`/`icon`/`image`
(son propre asset, prioritaire sur l'icône) et un `timeLimitMs` optionnel
(sauf `wait`, qui utilise son propre `durationMs`). Règle uniforme : un
input hors-cible est ignoré, seul le dépassement du délai fait échouer
l'interaction entière.

Zones — `src/engine/interactions/zones.js` : grille 3×3 + `'anywhere'`,
partagée entre le picker éditeur (`ZonePicker.vue`) et le runtime (position
+ hit-testing).

### Runtime — `src/components/phone/interactions/InteractionPlayer.vue`

Un seul composant, props `{ steps }`, émet `finish({ success })`. Monté
par `PhoneShell.vue` quand `story.activeInteraction` est posé.

### Stockage — `game.interactions[]`

Même bucket libre-schéma que `game.events`, dans `game.js` — zéro fichier
projet supplémentaire. Auteur les construit dans l'onglet **Interactions**
de l'éditeur (`InteractionDefList.vue`/`InteractionDefForm.vue`/
`InteractionStepsEditor.vue`), puis les appelle par id depuis une entrée de
timeline `interaction` (`InteractionEntryForm.vue`).

### Bloquant ou parallèle, au choix par entrée

`entry.blocking` (défaut `true`). Bloquant = même mécanique que `choice`/
`call` dans `story.js` (`presentBlockingEntry`, `pendingInteractions[]`).
Parallèle = timeline continue tout de suite, l'interaction reste affichée
et jouable ; son résultat ne remonte QUE via l'event `interaction.won`/
`interaction.lost` (`src/engine/events/triggers.js`) et les branches
`onWin`/`onLose` propres à l'entrée (`effects`/`then`, même forme qu'une
option de `choice`).

### Étendre

Ajouter un nouveau kind de step = une entrée dans `STEP_KINDS`
(`stepKinds.js`) + son cas dans `InteractionPlayer.vue`'s pointer handlers
+ ses champs dans `InteractionStepsEditor.vue`. Pas de registry à toucher
ailleurs.

## 2. Apps custom — créateur d'applications no-code

**Le besoin** : que des non-devs créent une nouvelle app téléphone (comme
Messages/Pixly/Journal) sans coder de composant Vue. Direction retenue
après plusieurs itérations (voir mémoire de session si besoin) : catalogue
de **blocs visuels bornés façon BeeFree**, pas de canevas libre ni de
moteur de règles — et **v1 = visuel seulement, aucune action de jeu
branchée sur les blocs**.

### Catalogue de blocs — `src/engine/customApps/blockKinds.js`

`header`, `text`, `image`, `avatar`, `row` (ligne façon réglages —
icône+label+chevron), `card` (conteneur récursif avec fond visuel), `layout`
(conteneur récursif SANS fond, direction row/column configurable, écart
réglable — ajouté après coup pour permettre p.ex. deux badges côte à côte),
`badge`, `divider`, `button` (visuel seulement, pas encore d'action),
`tabs` (change l'écran actif de l'app — navigation pure, aucune donnée de
jeu touchée).

### Runtime — `src/components/phone/customApps/`

`CustomAppRenderer.vue` (trouve l'app via `phone.currentApp`, gère l'écran
actif, fournit `navigateToScreen`/`activeScreenId` via `provide`/`inject`
pour `TabsBlock`) → `BlockList.vue` (le vrai interprète récursif, un
dispatch `type → composant`, réutilisé par `CardBlock`/`LayoutBlock` pour
leurs enfants).

### Stockage — un fichier JSON par app

`apps/<id>.json` à la racine du projet — **JSON pur, pas un `.js`** comme
le reste des données projet : c'est délibéré, une app est faite pour être
exportée/partagée (potentiellement avec un inconnu), et du JSON est de la
donnée inerte, jamais exécutée, contrairement à un module JS.

`src-electron/ipc/customApps.js` : scan/save/create/delete + export/import
en `.zip` (json + assets référencés, walkés récursivement dans les `card`/
`layout`). Import namespace les assets sous `assets/imported/<id>/` dans le
projet cible et dé-collide l'id (`-2`, `-3`...) si besoin.

### Fusion avec les apps codées en dur

`story.mergedAppRegistry` (dans `story.js`) = `APP_REGISTRY` (code,
`src/engine/apps/registry.js`) + `story.project.customApps` normalisées,
toutes avec `component: CustomAppRenderer` (une seule instance de
composant partagée). `PhoneShell.vue`/`HomeScreen.vue`/`GameForm.vue` lisent
cette liste fusionnée, pas `APP_REGISTRY` brut.

### Pipeline de build

`apps/` copié par `shellAssembly.js` (build ET preview web, même fonction).
Le jeu compilé (`templates/game-shell/src/pages/GamePage.vue`) fait son
propre `import.meta.glob('../project-data/apps/*.json', {eager:true})` —
résolu par Vite à CHAQUE build/preview, aucune lecture disque à
l'exécution dans le jeu shippé (confirmé : rien dans le jeu compilé ne lit
jamais le disque directement, tout est bundlé).

### Preview live dans l'éditeur

Sélectionner une app dans l'onglet Apps bascule automatiquement le preview
téléphone (docké à droite) sur cette app, déverrouillé
(`EditorPage.vue`'s `previewCustomApp()`) — comme `CustomAppRenderer` lit
`story.project.customApps` en direct, chaque modif de bloc s'affiche
immédiatement, sans bouton ni rechargement.

### Étendre

Ajouter un type de bloc = une entrée dans `BLOCK_KINDS`+`defaultBlock()`
(`blockKinds.js`) + un composant runtime (`src/components/phone/customApps/`)
enregistré dans `BlockList.vue`'s dispatch + ses champs dans
`BlockPropertiesForm.vue`. Pas de registry à toucher ailleurs — même
patron que les steps d'interaction.

### Confort d'édition (ajouté 2026-08-04, même jour)

- **Drag entre conteneurs** : `BlockBuilder.vue` n'utilise plus un état de
  drag local — `CustomAppEditor.vue` `provide()` un `blockDragState`
  réactif partagé par toutes les instances (racine + une par `card`/
  `layout` imbriqué), donc un bloc glissé peut changer de conteneur, pas
  juste se réordonner sur place. Garde anti-cycle (`isOwnDescendantArray`)
  pour empêcher de déposer un conteneur dans ses propres enfants.
- **Dupliquer** : bouton à côté de supprimer, clone JSON profond.
- **Presets** : `src/engine/customApps/blockPresets.js` — petits arbres de
  blocs pré-assemblés (en-tête profil, ligne de stats, section réglages,
  appel à l'action), insérés en un clic, toujours juste de la donnée du
  même vocabulaire.
- **Sélection depuis le preview** : `phone.editorSelectedBlock` (dans
  `phone.js`, écrit sans condition, inoffensif dans le jeu shippé où rien
  ne le lit) — `BlockList.vue` enveloppe chaque bloc rendu d'un
  `@click.stop`, `BlockBuilder.vue` observe ce champ et déplie/scrolle
  jusqu'à la bonne ligne (et déplie aussi chaque carte/disposition
  ancêtre sur le chemin).
- **Fond d'écran par écran** : `screen.background` (asset), même mécanisme
  que `def.background` des interactions.
- **Image plein largeur, texte couleur/taille, espacement avant/après par
  bloc** : champs optionnels supplémentaires sur les blocs existants, rien
  de structurel.

### Condition d'affichage par bloc (dynamisme, étape 1)

Premier pas vers du "dynamique" — chaque bloc peut porter un `requires`
optionnel (flags/following), **exactement la même forme et le même
`story.checkConditions()`** que `entry.requires` sur une entrée de timeline.
Authoring : section "Condition d'affichage" dans `BlockPropertiesForm.vue`
(réutilise `RequiresBuilder.vue` tel quel), badge "condition" dans
`BlockBuilder.vue` (mêmes clés i18n que `TimelineEntryCard.vue`, pas
dupliquées). Runtime : `BlockList.vue`'s `visibleBlocks` computed filtre
avant de rendre — un bloc dont la condition échoue est silencieusement
absent, pas juste caché en CSS.

### Interpolation de variables (dynamisme, étape 2)

`src/engine/customApps/resolveDynamicText.js` — deux formes de token :
`{flag:clé}` (lit `story.flags[clé]`, toujours un nombre — les flags
restent LE mécanisme de variable du projet, pas de concept parallèle) et un
petit catalogue fixe de données déjà affichées ailleurs sur le téléphone
(`{playerName}`, `{battery}`, `{steps}`, `{stepsGoal}`, `{weather}`).
Délibérément PAS `story.fill()` (celui-là résout aussi la traduction i18n
par chapitre, sans rapport avec un bloc d'app qui n'appartient à aucun
chapitre).

Chaque composant runtime avec un champ texte (`HeaderBlock`, `TextBlock`,
`RowBlock`, `BadgeBlock`, `ButtonBlock`, `AvatarBlock`, `TabsBlock`) résout
son propre champ via un `computed` — pas de résolution centralisée dans
`BlockList.vue` (cloner le bloc y aurait cassé l'identité d'objet utilisée
par la sélection depuis le preview, voir plus haut).

Authoring : `VariablePickerBtn.vue` (même contrat que `EmojiPickerBtn.vue`
— émet `pick` avec le token, inséré au curseur via `insertEmojiAtCaret`
déjà générique) à côté de chaque champ concerné. Liste les tokens fixes +
les flags du projet (réutilise `collectFlags.js`, même catalogue que le
dialogue Flags).

Compteurs sociaux/messages (listés comme option 3 pendant la discussion) :
écartés, pas assez de besoin concret confirmé pour l'instant.

### Bloc liste — répète un sous-arbre par contact (dynamisme, étape 3)

Troisième pas : un bloc `list` qui répète un **template** (sous-arbre de
blocs, authored une fois) une fois par contact du projet — première brique
de composant vraiment dynamique (nombre de rendus variable, pas juste du
texte/une visibilité qui change). Scope délibérément étroit, décidé avec
l'utilisateur avant de coder : une seule source possible (`project.contacts`,
toggle "seulement les suivis" via `story.isFollowing()` — le même mécanisme
de suivi que le Fil social), pas de source générique ni de pagination/tri.

- `blockKinds.js` : `{ type: 'list', onlyFollowed: false, template: [] }`.
  `template` a exactement la même forme que `card.blocks`/`layout.blocks`
  (un sous-arbre de blocs classique) — pas un nouveau concept.
- Runtime : `ListBlock.vue` calcule la liste de contacts (filtrée ou non),
  puis pour CHAQUE contact monte une instance de `ListItemScope.vue`
  (`provide('customAppListItem', item)` + `<BlockList :blocks="template">`).
  Un `provide()` est scopé à l'instance de composant qui l'appelle — une
  instance séparée par itération est ce qui permet à chaque copie du
  template de voir SON PROPRE contact plutôt que le dernier de la boucle.
  Card/layout imbriqués dans le template héritent du contexte
  automatiquement (provide/inject traverse tout l'arbre de composants
  descendants, y compris à travers plusieurs niveaux de récursion).
- Texte : tokens `{item:name}`/`{item:handle}`/`{item:pseudo}`/
  `{item:followers}`/`{item:following}`/`{item:color}` (`resolveDynamicText.js`,
  3ᵉ paramètre `item` optionnel) — `handle`/`followers`/`following` réutilisent
  `story.socialHandle()`/`story.socialStats()`, les mêmes fonctions qui
  affichent déjà ces infos sur les écrans sociaux (pas de recalcul parallèle).
  Chaque composant texte fait `inject('customAppListItem', null)` et le passe
  en 3ᵇ argument, même patron que `customAppActiveScreenId` (déjà utilisé par
  `TabsBlock.vue`).
  Pas de `{item:avatar}` textuel : `AssetField` (le widget image) n'a
  aucun champ texte libre où taper un token, donc l'avatar contact passe
  par une case à cocher dédiée à la place (voir juste en dessous).
- Avatar : `block.useItemAvatar` (bool, uniquement affiché dans le
  formulaire quand on édite à l'intérieur d'un template de liste) — si
  coché, `AvatarBlock.vue` prend `listItem.avatar` au lieu de son propre
  `block.src` statique.
- Authoring : `itemScope` (bool) est propagé en prop à travers toute la
  chaîne `BlockBuilder.vue` → `BlockPropertiesForm.vue` → (nested)
  `BlockBuilder.vue`, forcé à `true` uniquement pour le `BlockBuilder`
  imbriqué du `template` d'un bloc `list` — ça détermine si
  `VariablePickerBtn.vue` propose la section "Contact (bloc liste)"
  (liste séparée `ITEM_TOKENS`, distincte de `FIXED_TOKENS`/flags).
- Drag & drop / cycle guard / auto-scroll-vers-le-bloc-sélectionné
  (`BlockBuilder.vue`) et export/import zip (`collectAssetRefs`/
  `rewriteBlockSrcs`, `src-electron/ipc/customApps.js`) marchent sur
  `block.template` exactement comme sur `block.blocks` — même traitement,
  pas de code dupliqué.
- **Vérifié par un vrai build du jeu compilé** (pas juste lint+build
  éditeur) : projet de test scratch avec un `apps/*.json` contenant un
  bloc `list` (contacts + `onlyFollowed`, template avec `card`/`avatar`
  `useItemAvatar`/`row`/`badge`/`{item:name}`), assemblage manuel du
  template `game-shell` (même liste de copies que `shellAssembly.js`),
  `quasar build` réel — succès, et présence confirmée dans le bundle
  (`useItemAvatar`, `onlyFollowed`, `customAppListItem`, le contenu de
  l'app de test) en grepant le JS buildé.

### Piège IPC à connaître

`story.project.customApps[i]` est un objet réactif Pinia (Proxy) — jamais
l'envoyer tel quel via `window.storieAPI.*` (Electron IPC = structured
clone, échoue sur un Proxy, même en surface avec `{ ...obj }` puisque le
spread est peu profond). Toujours `JSON.parse(JSON.stringify(data))` avant
d'envoyer (voir `EditorPage.vue`'s `save()`, cas `'apps'`) — même trick que
`project.js`'s `loadProjectFromDisk` applique déjà côté lecture.

## Limites connues (v1, les deux systèmes)

- Aucune action de jeu branchée sur un bloc d'app custom (bouton visuel
  seulement) — reporté à une phase 2, pas encore scopée.
- Pas de branchement/conditions à l'intérieur d'une séquence de steps
  d'interaction (linéaire uniquement) — évoqué, volontairement pas
  construit tant qu'aucun besoin concret ne le justifie.
- Bloc `list` : une seule source possible (contacts du projet) — pas de
  générateur/source personnalisée, pas de tri/pagination.
- Zéro test GUI réel sur les deux systèmes à date de cette doc (le bloc
  `list` a eu un vrai build du jeu compilé en plus du lint+build éditeur —
  voir sa section — mais toujours aucun clic réel dans l'éditeur).
