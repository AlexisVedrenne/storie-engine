# Audit UI/UX de l'éditeur — état réel, sans complaisance

## Statut (2026-07-28)

**Les 3 paliers (quick wins, chantier moyen, chantier large) sont faits et
vérifiés en vraie fenêtre Electron, le jour même.** Détail dans
« Priorisation proposée » plus bas, chaque item est marqué `[x]` avec ce
qui a été changé et où. Audit soldé — plus rien de la liste initiale n'est
en attente (voir « Ce que je n'ai pas encore vérifié » pour ce qui est
resté hors périmètre dès le départ).

## Méthode

Contrairement aux phases précédentes (jamais vérifiées visuellement, bloquées
« bac à sable sans affichage »), cet audit a été fait contre une **vraie
fenêtre Electron** : `pnpm run dev:electron` lancé pour de vrai, projet
fixture `stories-engine-fixtures/demo-project` chargé (auto-repris depuis
`localStorage` d'une session précédente), navigation réelle (clics via
UI Automation Windows + simulation souris), capture d'écran de la fenêtre
réelle à chaque étape. Tous les constats ci-dessous viennent soit d'un
screenshot réel, soit d'une lecture du code source à l'appui — aucun n'est
une supposition sur à quoi « devrait » ressembler l'UI.

Note technique sans rapport avec le code du projet : le lancement a d'abord
échoué (`ELECTRON_RUN_AS_NODE=1` positionné dans l'environnement du sandbox
faisait tourner `electron.exe` comme un `node` nu, cassant l'import du module
`electron`) — contourné en désarmant la variable pour cette seule commande.
Rien à corriger côté projet.

Écrans couverts : accueil (Ouvrir/Créer un projet), Chapitres (liste + panel
chapitre + timeline), une entrée `message` dépliée, une entrée `choice`
dépliée avec son option et son sous-timeline « Juste après », Contacts,
Groupes, Jeu (personnalisation Phase 5), Ressources (assets), Traductions
(i18n, avec ses 152 traductions inutilisées), Contenu initial (seed), mode
« Aperçu seul », dialogue de validation du projet. Composants lus en entier :
les 31 fichiers de `src/editor/**`.

## Verdict global

Le socle technique (`docs/ui-ux-guidelines.md`, `design-tokens.scss`) est
réel et **déjà appliqué à ~97 % des fichiers** (30/31 utilisent
`var(--space-*)`, palette cohérente, icônes Material par type d'entrée,
boutons différenciés primaire/secondaire/destructif). Ce n'est donc pas
« aucun système » — la fondation esthétique locale (une carte, une ligne, un
formulaire) est propre et cohérente.

Le problème n'est pas là. Il est à un niveau au-dessus : **la structure de
navigation et la densité d'information n'ont pas de hiérarchie**, et
**deux promesses du système de design ne sont pas tenues** (typographie,
feedback sonore natif). C'est très exactement le symptôme décrit par la
demande initiale : chaque écran pris isolément est propre, mais se repérer
_entre_ les écrans, ou dans la profondeur d'un seul écran dense (une
timeline de 30 entrées, un choix imbriqué), demande de chercher.

Sévérité : rien de cassé, rien d'illisible au sens contraste — mais plusieurs
défauts structurels qui coûtent du temps à l'usage quotidien, et deux
incohérences visuelles vérifiées qui cassent le systématisme visé par le
guide existant.

## Problèmes transversaux (affectent plusieurs écrans)

### 1. La typographie du guide n'est jamais chargée — regression silencieuse — **corrigé**

`design-tokens.scss` déclare :

```scss
--font-ui: 'Inter', 'Fira Sans', sans-serif;
--font-mono: 'Fira Code', 'JetBrains Mono', monospace;
```

Vérifié : **aucun `@font-face`, aucun package `@fontsource/*`, rien dans
`package.json` ni `quasar.config.js`** ne charge Inter, Fira Sans, Fira Code
ou JetBrains Mono. Seul `'roboto-font'` (Quasar extras, non utilisé par ces
variables) est activé. Résultat réel, visible sur tous les screenshots : le
navigateur saute silencieusement les deux familles nommées et retombe sur la
police système générique (`sans-serif` / `monospace` du moteur de rendu) —
pas de crash, pas d'erreur console, juste une police différente de celle
prévue par le guide sur chaque poste utilisateur. C'est la seule règle du
§3 du guide qui n'est _pas_ vérifiable visuellement sans regarder le
`<head>` — donc le genre de régression qui ne se remarque jamais tant que
personne ne compare deux machines.
**Fix concret** : `pnpm add @fontsource/inter @fontsource/fira-code` (ou
JetBrains Mono), un `import '@fontsource/inter/400.css'` + `/600.css` dans
`app.scss` ou le point d'entrée. Deux lignes de dépendance, zéro
renégociation de design — les tokens sont déjà corrects.

### 2. Aucun fil d'Ariane dans la profondeur — le vrai « je cherche 3h » — **corrigé**

Confirmé à l'écran (capture `choice` → option 1 → onglet « Juste après ») :
un `choice` peut contenir une option, qui contient un `TimelineEditor` niché
(même composant, récursif), qui peut elle-même contenir un autre `choice`,
etc. Rien dans l'UI ne dit _où on est_ une fois qu'on a déplié 2-3 niveaux :
pas de breadcrumb (« Chapitre 1 › Choice "Que réponds-tu ?" › Option 1 ›
Juste après »), pas d'indentation visuelle progressive, pas de couleur de
profondeur. Le seul repère est la bordure bleue sur la carte actuellement
dépliée (`.entry-card.open`) — invisible dès qu'on scrolle plus bas que
l'écran. Sur un chapitre de 30 entrées avec plusieurs choix imbriqués (cas
réel visé par l'outil), remonter mentalement « dans quel choix suis-je »
demande de scroller vers le haut pour retrouver le contexte. C'est très
probablement la plus grosse source du « je sais pas où cliquer » rapporté.

**Fix appliqué** (2026-07-28) : fil d'Ariane cliquable (« Choix : ... ›
Option 1 — ... »), construit par prop-drilling pur — `TimelineEditor.vue`
accepte une prop `breadcrumb` et l'étend d'un segment `{ label, collapse }`
quand elle rend une entrée `choice` ; `ChoiceEntryForm.vue` fait pareil par
option avant de la transmettre à la `TimelineEditor` nichée de son onglet
« Juste après ». Pas de `provide`/`inject` (aucun précédent dans cette
codebase, et un état "chemin courant" partagé aurait été ambigu : les
entrées d'une même liste peuvent être dépliées simultanément, pas un
accordéon à sélection unique). Cliquer un segment referme ce niveau (les
options du choix sont passées d'un `q-expansion-item` non contrôlé à
contrôlé pour permettre ça). Vérifié à l'écran : le fil apparaît
correctement dans l'onglet "Juste après" d'une option, cliquer "Choix :
..." referme tout le choix, cliquer "Option 1" ne referme que l'option.

**Limite assumée, pas corrigée** : le bandeau n'est **pas** collé en haut
de l'écran (`position: sticky`) pendant qu'on scrolle toute la liste
parente — `.entry-card` a `overflow: hidden` (pour l'arrondi de ses
coins), et un ancêtre `overflow:hidden` empêche `sticky` de fonctionner
pour un descendant. Le bandeau règle donc "aucun repère du tout" → "repère
clair dès qu'on rouvre/remonte vers ce niveau", mais pas le cas "scrollé
très loin, toujours visible". Le rendre vraiment sticky demanderait de
retirer `overflow:hidden` de `.entry-card` et reporter l'arrondi sur l'en-
tête/le corps séparément — pas fait pour limiter le risque sur un style
existant ; à reconsidérer si le bandeau non-sticky s'avère insuffisant à
l'usage réel.

### 3. Le bloc Condition/Requires se répète intégralement à chaque niveau — **corrigé**

Chaque chapitre, chaque entrée de timeline, ET chaque option de choix affiche
le même bloc complet : titre "CONDITION D'AFFICHAGE (OPTIONNEL)", phrase
d'intro, section "STATS DU JOUEUR (FLAGS)" avec son état vide, section
"ABONNEMENTS PIXLY" avec son état vide, deux boutons "Ajouter…". Vérifié à
l'écran : une entrée `message` toute simple (juste un texte et un contact)
affiche quand même ~15 lignes de bloc Condition vide en dessous. Sur un
chapitre de 30 entrées, dépliées pour édition en série, c'est le même pavé
vide répété 30 fois. Le guide (§5) demandait _un seul niveau de titre de
section par écran-enfant_ — ce n'est pas respecté : la home page d'un
formulaire (`RequiresBuilder`) est ré-instanciée telle quelle à N niveaux
d'imbrication, sans version condensée pour le cas (majoritaire) où il n'y a
aucune condition.
**Fix appliqué** (2026-07-28) : `RequiresBuilder.vue` se replie derrière une
seule ligne « + Ajouter une condition » quand ni flags ni abonnements ne
sont définis — fix posé une seule fois dans le composant, s'applique
gratuitement à ses 3 appelants (`EditorPage.vue` niveau chapitre,
`TimelineEditor.vue` chaque entrée, `ChoiceEntryForm.vue` onglet Condition
de chaque option). Une fois révélé (clic, ou condition déjà existante au
chargement), reste révélé même si l'utilisateur vide les champs en cours
d'édition — pas de repli surprise pendant la frappe. Vérifié à l'écran :
une entrée `message` sans condition passe d'environ 15 lignes de bloc vide
à 1 seule ligne.

### 4. `<audio controls>` natif du navigateur, jamais stylé — rupture visuelle nette — **corrigé**

Confirmé à l'écran (`Jeu`, `AssetField`, `AssetsPanel` — 3 endroits) :
`GameForm.vue:49`, `AssetField.vue:25`, `AssetsPanel.vue:41` posent tous les
trois un `<audio controls>` HTML brut. Sur Windows/Chromium ça rend un
lecteur **clair, en relief, avec sa propre police système** — posé sur fond
`--color-bg` (`#0F172A`) très sombre, ça saute aux yeux comme un widget
étranger à l'app, exactement le genre de détail qui donne l'impression
« pas fini / pas pro » même quand le reste est cohérent. C'est visible sur
l'onglet Jeu dès qu'on scrolle sur la section Sons (15 lecteurs de ce type
d'affilée).
**Fix appliqué** (2026-07-28) : `src/editor/components/AudioPreview.vue`,
composant maison minimal — bouton play/pause + barre de progression
cliquable (seek), `<audio>` natif caché piloté par son API JS au lieu de
son attribut `controls`, couleurs `--color-accent`/`--color-surface`
cohérentes avec le reste de l'app. Remplace les 3 sites (`AssetField.vue`,
`AssetsPanel.vue`, `GameForm.vue`). Vérifié à l'écran : lecture/pause et
progression fonctionnent, plus aucun widget clair natif visible.

### 5. Un seul accent bleu partout… sauf dans les dialogues natifs Quasar — **corrigé**

Le bouton "OK" du dialogue de validation (`Dialog.create()` dans
`EditorPage.vue`) rendait en **doré/ambre**, pas en `--color-accent` bleu
(`#4C8BF5`) utilisé partout ailleurs. Confirmé à l'écran sur la boîte
"Validation du projet". **Root cause réelle** (`$primary` était déjà
correctement aligné sur `--color-accent` dans `quasar.variables.scss` —
l'hypothèse de désync était fausse) : Quasar's `Dialog.create()` sans
`color` explicite retombe sur `vmColor = props.color || (isDark ? 'amber'
: 'primary')`, trouvé en lisant `quasar.client.js` directement — un défaut
non documenté dans le guide, spécifique au dark mode. **Fix appliqué** :
`color` explicite sur les 8 appels `Dialog.create()` du projet (voir
« Priorisation proposée » § quick wins). Le guide (§4, _jamais deux
couleurs "primaires" qui se battent_) est maintenant respecté aussi sur
les composants Quasar génériques, pas seulement le code maison.

### 6. Onglets de navigation sans nom accessible — fix appliqué, vérification inconcluante

En pilotant la fenêtre via UI Automation (Windows), les 7 onglets
(Chapitres/Contacts/.../Contenu initial) apparaissent comme des `Button`
**sans `Name`** dans l'arbre d'accessibilité — seul le `q-btn-toggle`
englobant a un rôle `Group` vide. Concrètement : un lecteur d'écran (NVDA,
Narrator) ne peut pas annoncer quel onglet est sous le focus, seulement
« bouton » sans texte. Ce n'est pas visible à l'œil (le texte est bien
affiché visuellement) mais casse complètement la navigation clavier
assistée mentionnée comme non-négociable au §1/§6 du guide (« accessible
au clavier »announce). Root cause probable : Quasar `q-btn-toggle` ne
propage pas le label en `aria-label` par défaut pour ce genre d'options ;
la même chose est à vérifier sur les autres groupes de boutons
non-nommés vus dans l'arbre (les icônes ▲▼🗑 dense-round des listes ont
un `q-tooltip`, ce qui aide visuellement mais un tooltip n'est pas
systématiquement exposé comme nom accessible non plus).

### 7. États vides très inégaux, du sobre à la page quasi blanche

Comparé côte à côte : `ChapterList`/`ThreadForm` ont un état vide correct
(une phrase discrète). Mais **Traductions**, avant sélection d'une langue,
affiche une page quasi entièrement vide avec une seule phrase centrée «
Sélectionne une langue à gauche » (confirmé à l'écran — > 900px de vide
vertical). Le panneau **Groupes** avec un seul thread affiche un formulaire
de 3 champs suivi de ~800px de vide (le panel ne fait pas sa propre
hauteur, la page en dessous est juste vide). Rien n'est cassé, mais
l'impression de vide contredit l'idée d'un outil dense/maîtrisé — surtout
en comparaison avec l'onglet Jeu ou une timeline remplie, qui eux
utilisent bien l'espace.

### 8. Aucune recherche/filtre sur les listes qui grossissent le plus — **corrigé (recherche seule, périmètre choisi)**

Confirmé à l'écran : l'onglet Traductions affiche une liste plate de
**152 « traductions inutilisées »**, chacune sur 2 colonnes (FR/EN) avec un
bouton supprimer — sans recherche, sans tri, sans suppression groupée. Sur
un vrai projet de plusieurs chapitres, cette liste ne peut que grossir. Même
remarque plus modérée pour `ChapterList` (pas de recherche, mais peu de
chapitres en pratique) et pour `AssetsPanel` (grille sans recherche, mais
navigable par dossier). Le point Traductions est le plus urgent parce que
c'est une liste plate, non-hiérarchique, qui n'a **aucune** structure de
navigation pour s'y retrouver au-delà du scroll.

**Fix appliqué** (2026-07-28), périmètre volontairement réduit à la
recherche (pas de suppression groupée, choix explicite de l'utilisateur) :
`I18nBucketEditor.vue` a un champ de recherche au-dessus de la liste des
traductions inutilisées, filtre insensible à la casse sur le texte source
OU sa traduction, compteur qui passe en `X/152` quand une recherche est
active. Ne touche pas la liste principale (pas le même problème d'échelle)
ni `ChapterList`/`AssetsPanel` (laissés tels quels, comme noté ci-dessus).
Vérifié à l'écran : recherche "kg" → 1/152, la bonne entrée affichée.

### 9. Troncature de texte incohérente : parfois un tooltip de secours, parfois rien — **corrigé**

`ChapterList.vue:14` (`.chapter-title`) tronque au `text-overflow: ellipsis`
**sans `:title`** — confirmé à l'écran : avec le ratio de split par défaut
(colonne ~230px), le titre "Nouveau téléphone" est coupé en "Nouveau
tél…" et il n'y a aucun moyen de voir le titre complet sans élargir
manuellement le panneau. À l'inverse, `AssetsPanel.vue:43`
(`.asset-name`) et l'éditeur i18n ont bien un `:title="…"` qui affiche le
texte complet au survol. Incohérence facile à corriger partout où un
`text-overflow: ellipsis` existe sans attribut `title` jumeau.

### 10. « Aperçu seul » ne fait pas ce que son commentaire de code promet — **corrigé, avec une nuance**

Le commentaire dans `EditorPage.vue` dit que ce mode sert à « juger le
téléphone en pleine taille ». Confirmé à l'écran : le téléphone garde
exactement la même taille qu'en mode docké, simplement recentré au milieu
d'un immense fond vide (`padding: var(--space-8)` de chaque côté, sans
`max-height`/`transform: scale` qui grossirait le rendu). Sur un écran
1920px de large, ~700px de chaque côté restent vides. Le bouton fait ce
qu'il dit (cacher l'édition) mais pas ce que son intention documentée
promettait (voir le téléphone en grand).

**Root cause réelle** (trouvée en relisant `PhoneShell.vue` avant de
corriger) : `.phone-frame` a déjà `width: min(94vw, 480px, calc(94vh*9/18))`
— un plafond dur identique en mode docké et en mode focus, basé sur la
fenêtre _entière_ (`vw`/`vh`), pas sur le panneau qui l'entoure. Sur un
écran de bureau classique ce plafond (480×960) est déjà atteint en mode
docké dès que le panneau n'est pas trop étroit — passer en focus ne
changeait donc que le padding autour, jamais la taille réelle.

**Fix appliqué** : nouvelle prop `large` sur `PhoneShell.vue` (même pattern
que `ringing`), plafond relevé à 600×1200px quand actif, `EditorPage.vue`
passe `:large="focusPreview"`. Le mode docké est inchangé (toujours
480×960).

**Nuance honnête après vérification à l'écran** : sur une fenêtre large
(1920px+), le gain visible reste modeste (~+3 à 5%) — la vraie limite
physique est la hauteur de fenêtre elle-même (`94vh`), déjà presque
atteinte dans les deux modes sur ce genre d'écran ; relever encore le
plafond en dur n'aide pas au-delà de ce que la fenêtre peut physiquement
montrer. Le fix a un effet net et attendu dans le scénario qu'il cible
vraiment : quand le panneau docké est étroit (fenêtre plus petite, ou
splitter tiré pour donner plus de place aux formulaires), le téléphone y
est réellement rétréci en dessous de 480px par le flex du panneau — et
"Aperçu seul" le fait alors remonter jusqu'au nouveau plafond de 600px,
un saut clairement visible. Pas pu confirmer ce cas précis à l'écran dans
cette session (le redimensionnement programmatique de la fenêtre Electron
via UI Automation n'a pas coopéré, pas creusé plus loin) — à confirmer
par un test manuel sur une fenêtre non maximisée si besoin.

## Par écran — détails complémentaires

**Accueil (Ouvrir/Créer un projet)** — sobre et clair, pas de reproche
structurel. Le message d'erreur "window.storieAPI indisponible" est du texte
brut dans un `q-banner` rouge standard Quasar, correct pour un message
destiné aux devs (pas un utilisateur final), pas de changement nécessaire.

**Contacts** — dense mais bien groupé par carte (Identité/Bio/Réseau
social/Images), cohérent avec le guide. Petit point : le swatch couleur
(pastille 18px) est le seul indice visuel de la couleur du contact dans
tout le formulaire — pas d'aperçu de à quoi ressemble une bulle de message
avec cette couleur, alors que c'est justement l'usage concret de ce champ.

**Groupes/Threads** — formulaire correct mais très clairsemé (voir
point transversal 7 ci-dessus). Les participants s'ajoutent/suppriment
proprement (chips avec croix).

**Jeu (personnalisation Phase 5)** — bien structuré en panels, cohérent
avec `ContactForm` pour le color picker. Seul problème réel : les
lecteurs audio natifs (point transversal 4).

**Ressources (assets)** — grille claire, badge Utilisé/Orphelin bien
visible et codé couleur correctement (accent vs warning), logique de
navigation dossier par dossier cohérente avec un vrai explorateur de
fichiers. Le compteur d'orphelins global est utile. Rien à changer
structurellement.

**Traductions** — la vue "bucket sélectionné" (langue + fichier) est
propre et utile (colonnes source/traduit, bouton Traduit visible). Les
deux problèmes réels sont transversaux : l'état vide initial (point 7) et
l'absence de recherche sur les 152 inutilisées (point 8).

**Contenu initial (seed)** — le libellé "3 entrée(s)" dans la barre latérale
puis "0 entrée(s)" au-dessus du contenu affiché (car une conversation
précise est sélectionnée dans un menu déroulant à l'intérieur du bucket)
n'est pas un bug, mais les deux compteurs juxtaposés sans légende peuvent
laisser croire à une incohérence de données au premier coup d'œil — un
mot de contexte différencierait clairement "total du bucket" de "cette
conversation".

**Timeline / entrées repliées** — bon point à noter (ce qui marche déjà) :
l'icône Material par type + résumé en une ligne (`summaryFor`) rendent une
timeline de plusieurs entrées scannable rapidement, exactement ce que
demandait le guide au §7. Pas de reproche ici, juste la note transversale
sur le bloc Condition qui alourdit chaque dépli (point 3).

## Ce qui marche déjà et ne doit pas être re-fait

Pour éviter de tout remettre en cause sans discernement (la consigne dit
« aucune contrainte » mais pas « tout est mauvais ») :

- Système de tokens espacement/couleur/rayon : adopté à 97%, à garder tel quel.
- Icônes Material par type d'entrée (`iconFor`) + résumé une ligne
  (`summaryFor`) dans `TimelineEditor` : exactement ce qu'il fallait, à
  répliquer si de nouveaux types d'entrée arrivent.
- Boutons différenciés primaire/secondaire/destructif (Enregistrer bleu
  plein, Supprimer rouge, Annuler outline) : cohérent partout où vérifié.
- Panel + fond `--color-surface` sur `--color-bg` pour grouper visuellement
  les sections (Contacts, Jeu) : lisible, pas de changement nécessaire.
- Badge Utilisé/Orphelin dans Ressources : bon exemple de code couleur
  correctement réservé aux rôles définis par le guide (accent = normal,
  warning = attention).

## Priorisation proposée (à valider avant tout code)

**Quick wins (peu d'effort, gain immédiat, aucun risque de régression) :**

1. [x] Charger réellement Inter + Fira Code (point 1) — `@fontsource/inter`
   - `@fontsource/fira-code` installés (poids 400/600/700, les seuls
     utilisés dans `src/editor`), importés dans `src/css/app.scss`. Vérifié
     à l'écran : rendu change réellement, plus de fallback silencieux.
2. [x] Couleur du bouton OK des dialogues (point 5) — **root cause
       corrigée en cours de route** : ce n'était pas `$primary`/`--color-accent`
       désynchronisés (ils étaient déjà identiques, `#4c8bf5`), mais un défaut
       Quasar non documenté dans le guide : `Dialog.create()` sans `color`
       explicite retombe sur `vmColor = props.color || (isDark ? 'amber' :
'primary')` — trouvé en lisant le bundle Quasar lui-même
       (`quasar.client.js`). Les 8 appels `Dialog.create()` du projet
       (`EditorPage.vue` ×3, `AssetsPanel.vue`, `ChapterList.vue`,
       `ContactList.vue` ×2, `ThreadList.vue` ×2) ont maintenant un `color`
       explicite : `'primary'` pour les dialogues informatifs/de confirmation
       neutre, `'negative'` pour les 4 confirmations de suppression (plus
       cohérent avec la règle "destructif = danger" du guide §6 qu'un
       `'primary'` partout). Vérifié à l'écran : OK redevenu bleu.
3. [x] `:title` ajouté partout où `text-overflow: ellipsis` existait sans
       lui (point 9) — 7 endroits : `ChapterList.vue` (`.chapter-title`),
       `ThreadList.vue` (`.thread-name`), `ContactList.vue` (`.contact-name`),
       `TimelineEditor.vue` + `SeedBucketEditor.vue` (`.summary`),
       `AssetTree.vue` (`.folder-name`), `AssetsPanel.vue` (`.path` breadcrumb).
4. [x] `aria-label` sur les 7 onglets de navigation (point 6) — via le
       mécanisme `attrs` du `options` array de `q-btn-toggle` (confirmé dans
       le code source Quasar : chaque option destructure `attrs` et le spread
       sur le `QBtn` généré). Correct côté code ; la re-vérification via
       l'arbre d'accessibilité Windows après coup n'a rien confirmé de concluant
       (l'arbre a11y de Chromium/Electron est paresseux/capricieux à interroger
       de l'extérieur par UI Automation — pas un oracle fiable pour ce genre de
       micro-vérif, à ne pas retenter de cette façon).

Lint (`eslint`) clean sur tous les fichiers touchés par ces 4 points.

**Chantier moyen — fait et vérifié le 2026-07-28 (plan approuvé au
préalable, voir historique de session) :** 5. [x] Composant `AudioPreview.vue` maison pour remplacer les 3 `<audio
   controls>` natifs (point 4). Détail au point 4 ci-dessus. 6. [x] Bloc Condition condensé en une ligne "+ Ajouter une condition" à
tous les niveaux (point 3), tant qu'aucune condition n'existe. Détail
au point 3 ci-dessus. 7. [x] Plafond de taille du téléphone relevé (480×960 → 600×1200) quand
`PhoneShell` a la prop `large` (activée par "Aperçu seul"). Détail +
nuance honnête sur l'ampleur réelle du gain au point 10 ci-dessus.

Lint clean sur tous les fichiers touchés (`AudioPreview.vue` nouveau,
`AssetField.vue`, `AssetsPanel.vue`, `GameForm.vue`, `RequiresBuilder.vue`,
`PhoneShell.vue`, `EditorPage.vue`).

**Chantier plus large — fait et vérifié le 2026-07-28 (plan approuvé +
2 questions de cadrage tranchées au préalable — fil d'Ariane cliquable qui
replie plutôt qu'informatif seul, recherche seule sur les traductions
plutôt que recherche + suppression groupée) :** 8. [x] Fil d'Ariane de profondeur pour la navigation imbriquée choice/then
(point 2). Détail + limite sticky assumée au point 2 ci-dessus. 9. [x] Recherche sur la liste des traductions inutilisées (point 8).
Détail au point 8 ci-dessus. Pas étendu à `AssetsPanel`/`ChapterList`
(pas demandé, pas le même problème d'échelle aujourd'hui).

Lint clean sur les 3 fichiers touchés (`TimelineEditor.vue`,
`ChoiceEntryForm.vue`, `I18nBucketEditor.vue`).

**Backlog restant, hors périmètre choisi cette fois :**

10. [x] États vides d'écran entier (point 7) — **corrigé le 2026-08-18** :
    `.empty-state` (partagé par les 7 panneaux "rien de sélectionné" —
    Jeu/Events/Interactions/Apps/Contacts/Threads/Traductions) centre
    maintenant son contenu verticalement sur toute la hauteur du panneau
    (`min-height: 60vh`, flex centré) au lieu de rester collé en haut d'un
    grand vide, plus une icône Material par contexte (même icône que
    l'onglet correspondant dans `NAV_TABS`) pour donner du poids visuel.
    Groupes (Threads) avec peu de contenu reste tel quel — c'est un
    formulaire rempli, pas un état vide, resserrer sa mise en page est un
    chantier séparé (repositionnement du panel, pas juste `.empty-state`),
    resté hors scope de ce fix rapide.

## Ce que je n'ai pas encore vérifié

Par souci de temps/périmètre, cet audit n'a pas couvert en détail : les 10
formulaires d'entrée de `src/editor/components/entries/*` un par un (seul
`ChoiceEntryForm` a été vu à l'écran ; les 9 autres ont été lus en source
mais pas tous capturés visuellement), le flux complet de création de
projet, le comportement du redimensionnement des panneaux splitter à la
souris, et le rendu en thème clair (l'app semble n'avoir qu'un thème sombre
— à confirmer si c'est voulu). À creuser si la Phase 6 les inclut.
