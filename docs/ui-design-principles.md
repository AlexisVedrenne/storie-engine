# Widgets de champ à valeur unique — le pattern validé

Ce doc capture une règle concrète, validée par l'utilisateur le 2026-07-28
sur `AssetField.vue` puis répliquée sur `GameForm.vue` (Couleur d'interface,
Sons) : à chaque fois qu'un champ montre **une valeur unique avec un
aperçu** (un fichier, une couleur, un son...), il suit la même forme. Ne
pas réinventer une mise en page différente pour le prochain champ de ce
type — copier ce pattern.

## Le problème que ça corrige

Avant : un `q-input outlined` pleine largeur pour la valeur (souvent un
chemin de fichier ou un hex — texte technique, pas ce qu'on veut lire en
premier), un aperçu minuscule à côté ou en dessous, et 1-2 boutons
`label + icône` pleine taille pour les actions. Résultat détesté par
l'utilisateur : « un input immense, une image toute petite et moche, deux
gros boutons ».

## Le pattern

1. **Une seule légende** — le nom du champ ("Fond d'écran du téléphone",
   "Couleur d'interface"...), affichée une fois, jamais dupliquée.
2. **Aperçu grand, en premier** — image/couleur/son occupe toute la
   largeur disponible, pas une vignette de 18-40px écrasée entre deux
   autres éléments. Format cohérent : boîte arrondie, fond `--color-bg`,
   bordure `--color-border`.
3. **Valeur actuelle = légende discrète**, pas un input plein — texte
   petit, `--font-mono`, `--color-text-muted`, tronqué avec `:title` si
   long. Jamais un `q-input` pleine largeur pour juste *afficher* une
   valeur qu'on ne tape presque jamais à la main.
4. **Actions = icônes seules + tooltip**, jamais `label + icône` pleine
   taille pour des actions secondaires répétées (importer, parcourir,
   retirer...). `q-btn dense flat round icon="..." size="sm"` partout.
5. **Un seul widget par valeur** — jamais deux blocs empilés ("état par
   défaut" + "état personnalisé") pour la même donnée. Si une valeur a un
   comportement de repli (ex: son par défaut du moteur tant qu'aucun
   fichier n'est choisi), c'est le **même** composant qui affiche l'un ou
   l'autre selon l'état, pas deux composants côte à côte.

## Où c'est appliqué (référence de code)

- **`src/editor/components/AssetField.vue`** — le modèle de référence.
  `preview-box`/`audio-box` (aperçu) + `meta-row` (légende + icônes). La
  prop `fallbackAudioSrc` est l'implémentation du point 5 : un seul
  `AssetField` sait afficher soit le son par défaut du moteur soit le
  fichier choisi, sans bloc dupliqué.
- **`src/editor/components/GameForm.vue`** :
  - Icône du build / Fond d'écran → `AssetField` directement, gratuit.
  - Couleur d'interface → même forme reproduite à la main (`swatch-box` +
    `meta-row`), une couleur n'est pas un fichier donc pas le même
    composant, mais la même forme visuelle.
  - Sons → un seul `AssetField` par son avec `fallback-audio-src` (au lieu
    d'un bloc "son par défaut" + un `AssetField` vide empilés dessous).
- **`src/editor/components/ContactForm.vue`** — Couleur reprend le même
  `swatch-box`/`meta-row` que GameForm (avant : `q-input` + pastille de 18px
  en prepend, comme l'ancienne Couleur d'interface). Correction au passage :
  la couleur de repli était `#4c8bf5` (l'accent du jeu, sans rapport) au
  lieu du vrai gris `#999999` que `ContactList.vue`/`ThreadForm.vue`
  utilisent déjà pour un contact sans couleur.

## Pastille d'identité (couleur de contact) — validé le 2026-07-28

Partout où un contact apparaît en dehors de son propre formulaire (liste,
chip, badge...), sa couleur doit être visible sous forme d'une petite
pastille ronde — pas juste du texte. Déjà le cas dans `ChapterList.vue`/
`ContactList.vue` (barre/point de couleur) ; étendu aux chips
"Participants" de `ThreadForm.vue` (`contactColor(id)` → `story.getContact(id)?.color || '#999999'`,
span rond 8px avant le label du chip). Look "cool" validé par
l'utilisateur — à répliquer si un contact apparaît ailleurs sous forme de
chip/tag sans pastille.

## Check avant d'ajouter un nouveau champ de ce genre

- [ ] Aperçu grand, en haut, pas une vignette écrasée
- [ ] Le nom du champ apparaît une seule fois
- [ ] La valeur actuelle est une légende discrète (mono, muted), pas un input pleine largeur
- [ ] Les actions sont des icônes seules avec tooltip, pas des boutons label+icône
- [ ] Un seul widget gère tous les états (vide / par défaut / rempli) — jamais deux blocs empilés
