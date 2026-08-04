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
- Zéro test GUI réel sur les deux systèmes à date de cette doc.
