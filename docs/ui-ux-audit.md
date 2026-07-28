# Audit UI/UX de l'éditeur — état réel, sans complaisance

## Méthode

Contrairement aux phases précédentes (jamais vérifiées visuellement, bloquées
« bac à sable sans affichage »), cet audit a été fait contre une **vraie
fenêtre Electron** : `pnpm run dev:electron` lancé pour de vrai, projet
fixture `storie-engine-fixtures/demo-project` chargé (auto-repris depuis
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
*entre* les écrans, ou dans la profondeur d'un seul écran dense (une
timeline de 30 entrées, un choix imbriqué), demande de chercher.

Sévérité : rien de cassé, rien d'illisible au sens contraste — mais plusieurs
défauts structurels qui coûtent du temps à l'usage quotidien, et deux
incohérences visuelles vérifiées qui cassent le systématisme visé par le
guide existant.

## Problèmes transversaux (affectent plusieurs écrans)

### 1. La typographie du guide n'est jamais chargée — regression silencieuse

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
§3 du guide qui n'est *pas* vérifiable visuellement sans regarder le
`<head>` — donc le genre de régression qui ne se remarque jamais tant que
personne ne compare deux machines.
**Fix concret** : `pnpm add @fontsource/inter @fontsource/fira-code` (ou
JetBrains Mono), un `import '@fontsource/inter/400.css'` + `/600.css` dans
`app.scss` ou le point d'entrée. Deux lignes de dépendance, zéro
renégociation de design — les tokens sont déjà corrects.

### 2. Aucun fil d'Ariane dans la profondeur — le vrai « je cherche 3h »

Confirmé à l'écran (capture `choice` → option 1 → onglet « Juste après ») :
un `choice` peut contenir une option, qui contient un `TimelineEditor` niché
(même composant, récursif), qui peut elle-même contenir un autre `choice`,
etc. Rien dans l'UI ne dit *où on est* une fois qu'on a déplié 2-3 niveaux :
pas de breadcrumb (« Chapitre 1 › Choice "Que réponds-tu ?" › Option 1 ›
Juste après »), pas d'indentation visuelle progressive, pas de couleur de
profondeur. Le seul repère est la bordure bleue sur la carte actuellement
dépliée (`.entry-card.open`) — invisible dès qu'on scrolle plus bas que
l'écran. Sur un chapitre de 30 entrées avec plusieurs choix imbriqués (cas
réel visé par l'outil), remonter mentalement « dans quel choix suis-je »
demande de scroller vers le haut pour retrouver le contexte. C'est très
probablement la plus grosse source du « je sais pas où cliquer » rapporté.

### 3. Le bloc Condition/Requires se répète intégralement à chaque niveau

Chaque chapitre, chaque entrée de timeline, ET chaque option de choix affiche
le même bloc complet : titre "CONDITION D'AFFICHAGE (OPTIONNEL)", phrase
d'intro, section "STATS DU JOUEUR (FLAGS)" avec son état vide, section
"ABONNEMENTS PIXLY" avec son état vide, deux boutons "Ajouter…". Vérifié à
l'écran : une entrée `message` toute simple (juste un texte et un contact)
affiche quand même ~15 lignes de bloc Condition vide en dessous. Sur un
chapitre de 30 entrées, dépliées pour édition en série, c'est le même pavé
vide répété 30 fois. Le guide (§5) demandait *un seul niveau de titre de
section par écran-enfant* — ce n'est pas respecté : la home page d'un
formulaire (`RequiresBuilder`) est ré-instanciée telle quelle à N niveaux
d'imbrication, sans version condensée pour le cas (majoritaire) où il n'y a
aucune condition.
**Piste concrète** : collapse le bloc Condition par défaut derrière une
ligne « + Ajouter une condition d'affichage » quand il est vide (au lieu
d'afficher les deux sous-titres + état vide + 2 boutons en permanence) —
le contenu rempli resterait visible tel quel, seul l'état vide se
condenserait.

### 4. `<audio controls>` natif du navigateur, jamais stylé — rupture visuelle nette

Confirmé à l'écran (`Jeu`, `AssetField`, `AssetsPanel` — 3 endroits) :
`GameForm.vue:49`, `AssetField.vue:25`, `AssetsPanel.vue:41` posent tous les
trois un `<audio controls>` HTML brut. Sur Windows/Chromium ça rend un
lecteur **clair, en relief, avec sa propre police système** — posé sur fond
`--color-bg` (`#0F172A`) très sombre, ça saute aux yeux comme un widget
étranger à l'app, exactement le genre de détail qui donne l'impression
« pas fini / pas pro » même quand le reste est cohérent. C'est visible sur
l'onglet Jeu dès qu'on scrolle sur la section Sons (15 lecteurs de ce type
d'affilée).
**Piste concrète** : un composant `AudioPreview.vue` minimal (play/pause
+ barre de progression en CSS, pas de lib) réutilisé aux 3 endroits —
même effort que les icônes par type d'entrée déjà faites pour
`TimelineEditor`.

### 5. Un seul accent bleu partout… sauf dans les dialogues natifs Quasar

Le bouton "OK" du dialogue de validation (`Dialog.create()` dans
`EditorPage.vue`) rend en **doré/ambre**, pas en `--color-accent` bleu
(`#4C8BF5`) utilisé partout ailleurs (onglet actif, bouton Enregistrer,
sélection de chapitre). Confirmé à l'écran sur la boîte "Validation du
projet". `Dialog.create()`/`Notify.create()` utilisent la couleur
`primary` par défaut de Quasar (`quasar.variables.scss`), qui n'est
apparemment pas alignée sur `--color-accent` malgré le commentaire dans
`design-tokens.scss` qui affirme que si (« kept in sync with
quasar.variables.scss »). Le guide (§4) est explicite : *jamais deux
couleurs "primaires" qui se battent*. Ce sont les seuls endroits de
toute l'app qui violent cette règle — précisément parce que ce sont
des composants Quasar génériques, pas des composants maison.
**Fix concret** : vérifier `quasar.variables.scss` (à relire — pas encore
fait dans cet audit) et aligner `$primary` dessus, ou passer
`color="primary"` explicitement sur les boutons de `Dialog.create()`.

### 6. Onglets de navigation sans nom accessible — confirmé par l'arbre d'accessibilité

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

### 8. Aucune recherche/filtre sur les listes qui grossissent le plus

Confirmé à l'écran : l'onglet Traductions affiche une liste plate de
**152 « traductions inutilisées »**, chacune sur 2 colonnes (FR/EN) avec un
bouton supprimer — sans recherche, sans tri, sans suppression groupée. Sur
un vrai projet de plusieurs chapitres, cette liste ne peut que grossir. Même
remarque plus modérée pour `ChapterList` (pas de recherche, mais peu de
chapitres en pratique) et pour `AssetsPanel` (grille sans recherche, mais
navigable par dossier). Le point Traductions est le plus urgent parce que
c'est une liste plate, non-hiérarchique, qui n'a **aucune** structure de
navigation pour s'y retrouver au-delà du scroll.

### 9. Troncature de texte incohérente : parfois un tooltip de secours, parfois rien

`ChapterList.vue:14` (`.chapter-title`) tronque au `text-overflow: ellipsis`
**sans `:title`** — confirmé à l'écran : avec le ratio de split par défaut
(colonne ~230px), le titre "Nouveau téléphone" est coupé en "Nouveau
tél…" et il n'y a aucun moyen de voir le titre complet sans élargir
manuellement le panneau. À l'inverse, `AssetsPanel.vue:43`
(`.asset-name`) et l'éditeur i18n ont bien un `:title="…"` qui affiche le
texte complet au survol. Incohérence facile à corriger partout où un
`text-overflow: ellipsis` existe sans attribut `title` jumeau.

### 10. « Aperçu seul » ne fait pas ce que son commentaire de code promet

Le commentaire dans `EditorPage.vue` dit que ce mode sert à « juger le
téléphone en pleine taille ». Confirmé à l'écran : le téléphone garde
exactement la même taille qu'en mode docké, simplement recentré au milieu
d'un immense fond vide (`padding: var(--space-8)` de chaque côté, sans
`max-height`/`transform: scale` qui grossirait le rendu). Sur un écran
1920px de large, ~700px de chaque côté restent vides. Le bouton fait ce
qu'il dit (cacher l'édition) mais pas ce que son intention documentée
promettait (voir le téléphone en grand).

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
1. Charger réellement Inter + Fira Code (point 1) — 2 lignes de dépendance.
2. Aligner la couleur `primary` de Quasar sur `--color-accent` (point 5).
3. Ajouter `:title` partout où `text-overflow: ellipsis` existe sans lui
   (point 9), à commencer par `ChapterList.vue`.
4. Nommer les onglets pour l'accessibilité (`aria-label` ou équivalent
   Quasar) (point 6).

**Chantier moyen :**
5. Composant `AudioPreview.vue` maison pour remplacer les 3 `<audio
   controls>` natifs (point 4).
6. Condenser le bloc Condition vide en une ligne "+ Ajouter une condition"
   à tous les niveaux (point 3).
7. Vrai agrandissement du téléphone en mode Aperçu seul (point 10).

**Chantier plus large (à cadrer avant de commencer, comme d'habitude) :**
8. Fil d'Ariane de profondeur pour la navigation imbriquée choice/then
   (point 2) — touche potentiellement `TimelineEditor.vue` et
   `EditorPage.vue`, demande de décider comment représenter la pile de
   contexte (breadcrumb texte ? panneau latéral ? autre ?).
9. Recherche/filtre sur la liste des traductions inutilisées (point 8) —
   et more generally réfléchir si d'autres listes (assets, chapitres) en
   auront besoin à mesure qu'un vrai projet grossit.
10. Rendre les états vides d'écran entier (Traductions sans langue
    sélectionnée, Groupes avec peu de contenu) moins vides — probablement
    en resserrant la mise en page plutôt qu'en ajoutant du contenu factice.

## Ce que je n'ai pas encore vérifié

Par souci de temps/périmètre, cet audit n'a pas couvert en détail : les 10
formulaires d'entrée de `src/editor/components/entries/*` un par un (seul
`ChoiceEntryForm` a été vu à l'écran ; les 9 autres ont été lus en source
mais pas tous capturés visuellement), le flux complet de création de
projet, le comportement du redimensionnement des panneaux splitter à la
souris, et le rendu en thème clair (l'app semble n'avoir qu'un thème sombre
— à confirmer si c'est voulu). À creuser si la Phase 6 les inclut.
