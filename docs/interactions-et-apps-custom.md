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
partagée entre le picker éditeur (`ZonePicker.vue`) et le runtime (position +
hit-testing).

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
(`stepKinds.js`) + son cas dans `InteractionPlayer.vue`'s pointer handlers +
ses champs dans `InteractionStepsEditor.vue`. Pas de registry à toucher
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

### Bloc "Conversation" — premier module vraiment interactif

Jusqu'ici tous les blocs sont du rendu pur (donnée authored → affichage),
zéro écriture d'état de jeu. Le bloc `conversations` est le premier à
casser cette règle : c'est un vrai module de chat (liste de discussions +
fil ouvert + réponses par choix), pas juste un widget visuel. Direction
retenue après discussion avec l'utilisateur : pas de système de "modules"
générique/pluggable — **un catalogue fixe de modules codés en dur, comme
les blocs eux-mêmes**, ce bloc `conversations` en étant le premier
exemplaire concret. Réutilise entièrement la mécanique DM Pixly native
(`story.js`, `igThreads`/`pushDm`/`activeChoice.thread`/`typingDm`) plutôt
que de réinventer un système de conversation — les DM supportent déjà les
groupes (1:1 + groupes), ce que le système SMS natif ne fait pas.

- **Données** : `story.appThreads[appId][threadId]`/`appUnread[appId][threadId]`
  — miroir exact de `igThreads`/`igUnread`, juste re-clé par app pour
  qu'une conversation d'app custom ne partage jamais son fil avec les SMS/DM
  natifs ni avec une AUTRE app custom. **Seule la MESSAGERIE (historique)
  est re-clée par app — les DÉFINITIONS de thread restent le
  `project.threads` natif**, réutilisé tel quel via `story.getThread()`
  (même fallback 1:1 implicite que le DM natif). Premier jet avait réinventé
  une mini-gestion de groupes par bloc (`block.threads` + un
  `collectAppThreads.js` pour les retrouver) — retour utilisateur : ré-écrit
  une roue qui existait déjà (l'onglet Threads du projet). Supprimé ;
  `ConversationsBlock.vue`/`AppDmEntryForm.vue`/`ChoiceEntryForm.vue`
  utilisent directement `story.getThread()`/`useContactOptions().threadOptions`
  — les mêmes qu'utilise déjà `DmEntryForm.vue` pour le DM natif.
- **Entrée timeline `appDm`** : même forme que `dm` (app + thread + from +
  texte + image), même délai de frappe (`scheduleAppDm`/`typingAppDm`).
  `choice` gagne un champ optionnel `app` (mode dans `ChoiceEntryForm.vue`,
  à côté de SMS/DM Pixly) pour scoper une réponse à choix à un thread d'app
  plutôt qu'au natif — `makeChoice()` teste `app` en premier avant
  `thread`/`contact`.
- **Nommage réel, pas "App custom" générique** (retour utilisateur après
  coup) : le menu "ajouter une entrée" de `TimelineEditor.vue` propose UNE
  option par app custom du projet, avec le vrai nom de l'app (valeur
  composite `appDm::<appId>`, décodée par `defaultEntry()`/`iconFor()`/
  `helpFor()` — pas de champ "quelle app ?" séparé à remplir après coup).
  Même logique pour `ChoiceEntryForm.vue` : le bouton-toggle SMS/DM
  Pixly/… propose un bouton par app custom (nom réel, valeur `app:<appId>`)
  au lieu d'un bouton générique "App custom" + un sélecteur d'app séparé.
  Si un 2ᵉ type d'entrée scopé par app existe un jour, le regrouper sous
  la même app plutôt que d'aplatir app×type.
- **Runtime** — `ConversationsBlock.vue` : liste de threads ↔ thread ouvert,
  bascule **locale au bloc** (`ref` simple, pas `phone.activeConversation`/
  `activeDmThread`) — demande explicite de l'utilisateur ("reste dans
  l'écran de l'app"), pas une prise de contrôle plein écran comme le natif.
  Markup/bulles/indicateur de frappe/choice-box copiés de
  `DmThreadScreen.vue`/`DmListScreen.vue` (mêmes règles groupe vs 1:1).
  Deux réglages d'affichage authored sur le bloc : `showAvatar` (bool) et
  `nameField` (`'name'`|`'pseudo'`).
- **Simplification v1 assumée avec l'utilisateur** : `pushAppMessage()`
  n'a PAS l'équivalent de `isViewingDmThread()` — pas de suppression
  notif/badge quand le joueur regarde déjà le thread, puisque la navigation
  est locale au bloc et le moteur n'a aucun signal phone-level à tester.
  Notif/badge incrémentés à chaque message, même thread déjà ouvert.
- **i18n** : nom de groupe authored passe par `story.translateStory(name,
  'common')` (même bucket qu'un `project.threads` natif) —
  `extractTranslatableStrings.js`/`validateProject.js` marchent l'arbre de
  chaque app (`collectAppThreads`) pour l'extraction de traduction et la
  validation de références (`kind: 'app'`/`kind: 'appThread'`, nouveaux à
  côté de `'contact'`/`'thread'`). Deux nouvelles clés runtime
  (`customApps.conversations.empty`/`.privateNotice`) ajoutées aux 5
  locales de `src/i18n/` (arbre séparé de `src/editor/i18n/`, pour le texte
  affiché AU JOUEUR, pas à l'auteur).
- **Vérifié par un vrai build du jeu compilé**, comme le bloc `list` :
  app de test avec un bloc `conversations` (thread de groupe + entrées
  `appDm`/`choice` scopées), `quasar build` réel — succès, présence
  confirmée dans le bundle (`appThreads`, `pushAppMessage`, `typingAppDm`,
  le nom du groupe de test, la classe CSS du bloc, la clé i18n runtime).

**Premier vrai bug trouvé par un clic utilisateur réel** (pas juste
lint/build) sur le bloc `list` juste avant celui-ci : glisser-déposer depuis
la palette d'un bloc conteneur imbriqué ne fonctionnait pas — un
`dragstart` natif bulle, et la ligne draggable du conteneur parent
réinterceptait l'événement avant `performDrop`. Corrigé dans
`BlockBuilder.vue` (`stopPropagation()` manquant sur
`onPaletteDragStart`/`onBlockDragStart`/`performDrop`/`onRootDragOver`,
déjà présent sur le `dragover` par ligne). Diagnostiqué en direct avec
l'utilisateur via un `console.log` temporaire dans `performDrop`, pas
deviné à l'aveugle.

### Actions sur le bloc `button`

Catalogue fixe, deux kinds pour l'instant, choisi avec l'utilisateur avant
de coder (même discipline que le reste de cette doc) : `block.action.type`
= `'none'` (défaut, purement visuel, comportement inchangé pour les blocs
existants sauvegardés avant cette feature) | `'effect'` (applique
`block.action.effects` via `story.applyEffects()` — exactement le mécanisme
déjà utilisé par une option de `choice`/`onWin` d'interaction, pas un
nouveau système) | `'navigateScreen'` (change l'écran actif de l'app via
`inject('customAppNavigate')` — la MÊME injection que `TabsBlock.vue`
consomme déjà, un seul mécanisme de navigation dans tout le moteur).
Authoring : toggle de kind + `EffectsBuilder.vue` (réutilisé tel quel) ou
un sélecteur d'écran (réutilise `screenOptions`, déjà là pour `tabs`) dans
`BlockPropertiesForm.vue`. Pas de kind "déclenche une entrée timeline" —
un bouton n'est pas rattaché à une position dans la timeline, complexité
jugée inutile tant qu'aucun besoin concret ne le justifie.

### Flags "collection" — variable clé→valeur, pas juste un nombre

Besoin de départ : afficher un historique (ex. relevé de compte) alimenté
depuis la timeline. Direction retenue après discussion avec l'utilisateur
(plusieurs allers-retours, voir mémoire de session) : **PAS** un nouveau
bucket d'état parallèle (`appLists` envisagé puis écarté) — un 3ᵉ "type" de
flag, la collection, parce que **les flags restent LE mécanisme de
variable du projet**, répété plusieurs fois cette session. Générique dans
le bon sens : un seul mécanisme (ajouter/retirer un élément par clé, texte
ou nombre) réutilisable pour un historique, un inventaire, une liste de
quêtes... — borné à 2 opérations et 2 types de valeur, pas un moteur de
script libre.

- **Stockage** : `story.flagCollections[flagKey] = { itemKey: string|number }`
  — SÉPARÉ de `story.flags` (qui reste 100% numérique, lu comme tel
  PARTOUT dans le moteur : `{flag:x}`, conditions min/max, delta
  `EffectsBuilder`, calcul de plage `collectFlags.js` — mélanger les
  formes aurait cassé tout ça). Une collection est authored/référencée
  comme un flag (même `FlagNameField.vue`, catalogue project-wide) mais
  vit dans un bucket à part. Vrai objet, pas un tableau : ajouter = `set`,
  retirer = `delete`, jamais de collision faute d'ordre.
- **Écriture — `effects.collections`** (liste d'opérations, pas un objet
  par flag : un seul effet peut toucher la même collection plusieurs
  fois) : `{flagKey, mode: 'add'|'remove', itemKey?, value?}`. `itemKey`
  vide sur `'add'` génère une clé automatique (même style d'id que
  `groupSelection` dans `TimelineEditor.vue`) — le cas courant pour un
  historique qui s'empile, l'auteur n'a jamais à réfléchir aux clés.
  Gratuit partout où `effects` marche déjà (entrée timeline `effect`,
  option de `choice`, interaction onWin/onLose, event, **bouton**) — zéro
  nouveau branchement, juste une nouvelle section dans
  `EffectsBuilder.vue`/`story.js`'s `applyEffects()`.
- **Lecture (condition) — `requires.collections`** : `{ flagKey: { size?:
  number|{min,max}, has?: itemKey } }` — `size` et `has` indépendantes,
  cochables ensemble sur une même ligne (pas un mode exclusif comme les
  flags numériques, un auteur peut vouloir "au moins 3 ET contient
  'épée'"). Nouvelle section dans `RequiresBuilder.vue`/`story.js`'s
  `checkConditions()`.
- **Affichage — bloc `list` étendu** : gagne `source: 'contacts' |
  'flagCollection'` (+ `flagKey` si collection) au lieu d'un nouveau bloc
  — le mécanisme de répétition de template existait déjà et le code le
  disait lui-même ("jusqu'à ce qu'une 2ᵉ source soit nécessaire", voir
  git blame). `ListBlock.vue` bascule sur `story.collectionItems(flagKey)`
  au lieu de `project.contacts`. Nouveaux tokens `{item:key}`/
  `{item:value}` (`resolveDynamicText.js`) — `ITEM_TOKENS` scindé en
  `CONTACT_ITEM_TOKENS`/`COLLECTION_ITEM_TOKENS`, et `itemScope` (prop
  filée `BlockBuilder.vue` → `BlockPropertiesForm.vue` →
  `VariablePickerBtn.vue`) devient `false | 'contacts' | 'flagCollection'`
  au lieu d'un simple bool, pour que le bouton variable propose le bon
  jeu de tokens et que le toggle "utiliser l'avatar du contact" (bloc
  avatar) reste caché pour une collection (pas de notion d'avatar sur un
  item clé/valeur).
- **Catalogue Flags** : `collectFlags.js` infère `isCollection` en
  scannant l'usage de `effects.collections`/`requires.collections`
  (même patron que `isBoolean`/`isNumeric`, purement observé, aucun champ
  "type" déclaré/persisté — rien au runtime n'a besoin de le savoir,
  contrairement à `isBoolean` que le Journal a besoin de lire côté jeu
  shippé). Badge "collection" dans `FlagsPanel.vue`, à côté des badges
  existants.
- **Vérifié par un vrai build du jeu compilé** : app de test avec un
  bouton "Recevoir virement" (effet ajoutant à la fois un flag numérique
  `solde` et un élément à la collection `historique`, texte complet
  "Blabla vous a fait un virement de 50"), un bloc `list` en source
  collection affichant `{item:value}`, et une condition d'affichage
  `requires.collections` dessus — `quasar build` réel, présence
  confirmée dans le bundle.

### Icon picker + options de style supplémentaires

Deux petits conforts d'édition ajoutés dans la foulée des flags collection,
sans rapport structurel entre eux (deux demandes groupées dans la même
session) :

- **`IconPickerBtn.vue`** (`src/components/shared/`, réutilisable partout,
  pas spécifique aux apps) — même contrat que `EmojiPickerBtn.vue`
  (recherche + grille par catégories dans un `q-menu`), mais émet un nom
  d'icône Material (`ic.n`, ex. `account_balance`) au lieu d'un glyphe
  emoji, et le consommateur assigne directement le champ (`block.icon = v`)
  plutôt que d'insérer au curseur — un champ icône ne contient jamais
  qu'UNE valeur, pas de concept de composition de texte. Catalogue curaté
  dans `src/components/shared/iconList.js` (~180 icônes, mêmes noms de
  ligature déjà utilisés à la main avant ce picker — rien de nouveau côté
  valeurs acceptées, juste plus facile à trouver). Branché sur TOUS les
  champs `q-icon`-Material authored en texte libre trouvés dans le repo, pas
  seulement les blocs d'app : `header.icon`/`avatar.icon` (fallback)/
  `row.icon` (`BlockPropertiesForm.vue`), l'icône de l'app elle-même
  affichée sur l'écran d'accueil (`def.icon`, `CustomAppEditor.vue`), et
  `step.icon` d'une interaction (`InteractionStepsEditor.vue`). Vérifié
  qu'aucun autre champ `.icon` du repo n'était dans le même cas — `weather.
  icon` (EffectsBuilder.vue) est un EMOJI affiché en texte brut (pas un
  `q-icon`), `game.icon` (build) est un `AssetField` (fichier, pas un nom),
  `bucket.icon`/`group.icon` viennent d'un catalogue fixe non-authorable —
  aucun des trois n'avait besoin de ce picker.
- **Options de style étendues**, même précédent que `text.color`/`text.size`
  (`TextBlock.vue`) — un champ optionnel, non renseigné = comportement
  identique à avant cette feature, zéro migration :
  - `card`/`layout` gagnent `bgColor` (optionnel). Pour `card`, override
    juste le fond translucide déjà codé en dur. Pour `layout` — qui n'avait
    AUCUN habillage visuel propre avant (pur arrangeur flex) — poser
    `bgColor` fait aussi apparaître le padding/arrondi habituels d'une
    carte (`LayoutBlock.vue`'s `wrapperStyle` computed), sinon un fond
    plein cadre sans marge aurait l'air d'un bug plutôt que d'un choix
    d'auteur. `ColorField.vue` a gagné une prop `clearable` (bouton croix
    pour revenir à `''`/pas de fond) — nécessaire ici puisque "pas de
    couleur" a un rendu visuel distinct du champ jamais touché, contrairement
    à `header`/`avatar`/`button`/`badge` où `color` retombe toujours sur la
    même couleur de marque par défaut.
  - `button`/`badge` gagnent `textColor` (défaut blanc, comme avant) et
    `radius` (px — défaut 12 pour `button`, 999/pilule pour `badge`, mêmes
    valeurs que le CSS codé en dur remplacé).
  - `row` gagne `iconColor` et `textColor` (tout était blanc fixe avant).
- **Vérifié par un vrai build du jeu compilé** : app de test avec `card`
  (bgColor), `layout` (bgColor + un bouton avec color/textColor/radius),
  `badge` (textColor/radius), et le `row` du template `list` existant
  (iconColor/textColor) — build réussi, tous les champs + le contenu du
  test présents dans le bundle grepé.

### `timeskip` — atterrir directement sur une app (+ conversation) au réveil

Extension de l'entrée `timeskip` (pas un nouveau système) : deux champs
optionnels sur l'entrée elle-même.

- `entry.landApp` — id d'une app, N'IMPORTE LAQUELLE (codée en dur ou
  custom, même catalogue que le panneau Applications de `GameForm.vue`).
  Non renseigné = comportement inchangé (écran verrouillé classique, retour
  à l'accueil après déverrouillage). Renseigné = **l'écran verrouillé est
  entièrement sauté** — le joueur atterrit directement sur l'app choisie,
  déjà déverrouillé (voir "premier jet corrigé" ci-dessous, ce n'était pas
  le cas de la toute première version).
- `entry.landThread` — quel picker de conversation dépend de l'app choisie
  (`TimeskipEntryForm.vue`'s `landThreadOptions` computed) : `'messages'`
  (SMS natif) → `contactOptionsNoMe` (1:1 uniquement, comme
  `MessageEntryForm.vue`) ; `'social'` (DM Pixly natif) → `threadOptions`
  complet (groupes + 1:1) ; une app custom → `threadOptions` aussi, mais
  SEULEMENT si elle possède un bloc `conversations` (`appHasBlockType`, voir
  plus haut) ; toute autre app (Journal, Galerie, Réglages...) → pas de
  picker, aucun concept de conversation. Résolution de l'écran à afficher
  pour une app custom via `findScreenWithBlockType(app, 'conversations')`
  (`appHasModule.js`, fonction sœur de `appHasBlockType`) — trouve L'ÉCRAN
  qui porte le bloc, pas juste l'app, puisqu'une app peut avoir plusieurs
  écrans (`tabs`).
- **Plomberie de "destination différée", app CUSTOM uniquement** :
  `phone.openApp(appId, { screenId, threadId })` (signature étendue, 2ᵉ
  param optionnel) pose `phone.pendingScreenId`/`pendingThreadId`
  (nouveaux, transitoires) au lieu de forcer l'écran/thread par défaut.
  `CustomAppRenderer.vue` lit et vide `pendingScreenId` à l'initialisation
  de son `activeScreenId` (consommé une fois). `ConversationsBlock.vue`
  fait pareil avec `pendingThreadId` (+ `markAppThreadRead` immédiat).
  Pour une app NATIVE (`messages`/`social`), pas besoin de ce mécanisme —
  `phone.openConversation(contactId)`/`phone.openDmThread(threadId)`
  existent déjà (mêmes actions que `NotificationBanner.vue` appelle déjà au
  clic sur une notif) ; appelées APRÈS `openApp()` (qui les remet à `null`),
  même ordre que `NotificationBanner.vue`.
- **Le message change de forme selon le cas** : SANS `landApp`, comportement
  inchangé — `entry.label` s'affiche sur le lock screen
  (`pendingTimeSkipLabel`) jusqu'au déverrouillage. AVEC `landApp`, le label
  n'est PAS posé sur le lock screen (il n'y en a plus) — à la place, un
  toast fondu-entrée/sortie (`TimeSkipToast.vue`, même patron que
  `NotificationBanner.vue`, auto-disparition 3.2s), monté dans
  `PhoneShell.vue`.
- **Premier jet corrigé — bug trouvé par l'utilisateur en test réel** : la
  toute première version gardait quand même l'écran verrouillé (atterrissage
  posé dans `continueAfterTimeSkip()`, appelé seulement APRÈS un tap manuel
  sur le lock screen) — l'utilisateur a testé en vrai et signalé "j'arrive
  quand même sur l'écran verrouillé... je dois être directement sur
  l'application sans devoir déverrouiller le tel". Corrigé en déplaçant
  toute la logique d'atterrissage dans `processEntry`'s cas `'timeskip'`
  directement (plus dans `continueAfterTimeSkip`, devenu mort pour ce cas) :
  `phone.lock()` n'est appelé QUE si `landApp` est absent. `scheduleTimeSkip`
  avance la timeline tout de suite quand `landApp` est posé
  (`entry.blocking === false || entry.landApp`, même branche que le mode
  non-bloquant existant) — puisqu'il n'y a plus de tap sur lock screen pour
  déclencher la reprise, `entry.blocking` n'a plus d'effet dans ce cas
  (toggle grisé + tooltip explicite dans `TimeskipEntryForm.vue`). Deuxième
  correction dans la même remontée utilisateur : le picker de conversation
  ne marchait QUE pour les apps custom, pas pour Messages/Pixly natifs —
  étendu comme décrit ci-dessus.
- **Vérifié par un vrai build du jeu compilé, deux fois** (une fois par
  correction) : entrées `timeskip` de test avec `landApp: 'vitrine'` +
  `landThread: 'squad'` (app custom, thread de groupe réel) ET
  `landApp: 'messages'` + `landThread: 'maman'` (SMS natif, contact réel) —
  builds réussis, `landApp`/`landThread`/`timeSkipToast`/`pendingScreenId`/
  `pendingThreadId`/`openConversation`/`openDmThread`/le texte des deux
  labels de test tous présents dans le bundle.

### Bug corrigé : picker "app conversation" listait toutes les apps

`TimelineEditor.vue`'s `appDmOptions` et `ChoiceEntryForm.vue`'s
`targetModeOptions` listaient TOUTES les apps custom du projet, même celles
sans aucun bloc `conversations` — rien à lire pour un message envoyé là.
Corrigé via `src/engine/customApps/appHasBlockType(app, type)`
(`src/engine/customApps/appHasModule.js`, nouveau) : marche l'arbre de
blocs d'une app (récursif à travers `block.blocks`/`block.template`, même
forme que `collectAssetRefs`/`rewriteBlockSrcs` de
`src-electron/ipc/customApps.js` — dupliqué plutôt qu'importé de là, ce
fichier statically-import `electron`, inutilisable côté éditeur/renderer).
Les deux pickers filtrent maintenant sur `appHasBlockType(app,
'conversations')` avant de lister l'app.

### Traduction des textes de bloc

Jusqu'ici les blocs n'étaient JAMAIS traduits — `resolveDynamicText.js`
faisait exprès de ne PAS passer par `story.fill()` (qui traduit via le
bucket du chapitre courant, sans rapport avec un écran d'app). Corrigé en
réutilisant le bucket **'common'** — le même que les noms/bios de contacts
et les noms de groupe de thread, puisqu'un bloc d'app n'est pas non plus
rattaché à un chapitre précis.

- `resolveDynamicText(text, story, item)` appelle maintenant
  `story.translateStory(text, 'common')` EN PREMIER (avant la substitution
  des tokens `{flag:x}`/`{item:x}`/tokens fixes) — même ordre que
  `story.js`'s propre `fill()` (traduit d'abord, substitue `{name}`
  ensuite). La clé de dictionnaire est donc le texte FR authored tel quel,
  tokens compris littéralement — un auteur qui traduit doit garder les
  tokens dans sa version traduite, au bon endroit.
- `extractTranslatableStrings.js` gagne `addBlockStrings(blocks, set)` —
  marche récursivement `block.blocks`/`block.template` (même forme que
  `appHasBlockType`/`collectAssetRefs`) et collecte le champ texte de
  chaque type qui en a un : `header.title`, `text.content`,
  `avatar.label`, `row.label`/`row.sublabel`, `badge.label`,
  `button.label`, chaque `tabs.tabs[].label`. `conversations` n'a aucun
  texte statique à extraire (son texte joueur — état vide, notice privée —
  vit déjà dans l'arbre `src/i18n/` séparé, pas authored par app).
  Branché dans `addCommonStrings` (alimente `result.common`, utilisé par
  le statut traduit/manquant) ET dans `extractCommonCategories` (une
  catégorie par app, nommée `App : <nom réel>`, même réflexe "vrai nom
  plutôt que catégorie générique" que le reste de l'éditeur).
- **Vérifié séparément pour les deux moitiés** : la marche récursive
  (`addBlockStrings`) via un script Node autonome (copie isolée de la
  fonction, testée contre un arbre `card`/`list.template`/`tabs`/`button`
  imbriqué — 8 assertions, toutes passées) puisque `extractTranslatableStrings.js`
  importe `@/engine/...` (alias Vite, pas résolvable par node nu). Le
  câblage runtime (`translateStory` dans `resolveDynamicText.js`) via un
  vrai build du jeu compilé — entrée `'Compte courant'` du dictionnaire
  `en-US/common.js` ajoutée en test, présente dans le bundle aux côtés de
  l'appel `translateStory` et du texte FR source.

### Piège IPC à connaître

`story.project.customApps[i]` est un objet réactif Pinia (Proxy) — jamais
l'envoyer tel quel via `window.storieAPI.*` (Electron IPC = structured
clone, échoue sur un Proxy, même en surface avec `{ ...obj }` puisque le
spread est peu profond). Toujours `JSON.parse(JSON.stringify(data))` avant
d'envoyer (voir `EditorPage.vue`'s `save()`, cas `'apps'`) — même trick que
`project.js`'s `loadProjectFromDisk` applique déjà côté lecture.

## Limites connues (v1, les deux systèmes)

- Bloc `button` : seulement 2 kinds d'action (`effect`/`navigateScreen`) —
  pas de "déclenche une entrée timeline", voir sa section.
- Pas de branchement/conditions à l'intérieur d'une séquence de steps
  d'interaction (linéaire uniquement) — évoqué, volontairement pas
  construit tant qu'aucun besoin concret ne le justifie.
- Bloc `list` : deux sources possibles (contacts, collection de flag) —
  pas de générateur/source personnalisée, pas de tri/pagination (ordre =
  insertion pour une collection).
- Flags collection : pas de décrément/upsert de valeur numérique par clé
  (retirer = suppression complète de la clé, pas "en retirer 5") — l'ajout
  écrase silencieusement si la clé est réutilisée, à l'auteur de laisser
  la clé vide (auto-générée) pour un historique qui doit s'empiler.
- Bloc `conversations` : pas de suppression notif/badge quand le thread est
  déjà affiché (voir sa section) ; pas de saisie libre côté joueur (comme
  le natif, uniquement des réponses par `choice`).
- Zéro test GUI réel sur les deux systèmes à date de cette doc, À PART le
  glisser-déposer du bloc `list` (voir le bug trouvé et corrigé dans la
  section `conversations`) — premier et seul clic réel en éditeur à ce
  jour. Le bloc `list` et le bloc `conversations` ont chacun eu un vrai
  build du jeu compilé en plus du lint+build éditeur.
