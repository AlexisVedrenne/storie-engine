# UI/UX moderne et optimisée — guide de référence pour Storie Engine

Doc de référence, pas un plan d'implémentation : explique ce qu'est une UI/UX "moderne et optimisée" pour ce type d'outil (éditeur desktop Electron, thème sombre, UI dense — sidebars, formulaires, panneaux redimensionnables), et sert de base commune avant de rebâtir l'interface de l'éditeur.

## 1. Les principes qui définissent une bonne UI/UX

Une interface "moderne" n'est pas une question de mode visuelle (glassmorphism, néons...) — c'est une question de **clarté au service de la tâche**. Cinq principes non négociables :

1. **Hiérarchie visuelle claire** — à tout instant, l'œil doit savoir ce qui est le plus important sur l'écran. Se fait par la taille, le poids, le contraste, la position — jamais par la couleur seule (accessibilité).
2. **Densité au service de la tâche, pas de l'esthétique** — un éditeur de contenu (comme celui-ci) affiche BEAUCOUP de champs. La densité est acceptable et même souhaitable, mais elle doit rester *scannable* : espacement régulier, alignement strict, groupement logique.
3. **Cohérence systématique** — un bouton "primaire" a toujours la même couleur/forme partout. Un espacement de 8px est un multiple de 8px partout. Une police pour le code/id, une pour le texte — jamais un mélange ad hoc composant par composant.
4. **Feedback immédiat** — chaque action (clic, sauvegarde, erreur, chargement) a une réponse visuelle en moins de 300ms. Rien ne doit laisser l'utilisateur se demander "est-ce que ça a marché ?".
5. **Accessibilité clavier et contraste** — un outil utilisé des heures par jour doit être navigable au clavier (Tab, focus visible) et lisible sans fatigue (contraste texte ≥ 4.5:1 en thème sombre aussi).

## 2. Système d'espacement — la base de tout

Le symptôme n°1 d'une UI "pas claire" : chaque composant invente son propre espacement (8px ici, 10px là, 12px ailleurs — déjà visible dans le code actuel de `src/editor/components/*`). La solution : un **système de tokens** basé sur une seule unité de base (8px), partagé partout.

```css
/* src/css/design-tokens.scss — à créer, source unique de vérité */
:root {
  --space-1: 4px;   /* micro-espacement (entre icône et label) */
  --space-2: 8px;   /* espacement de base */
  --space-3: 12px;  /* padding standard d'un champ/carte */
  --space-4: 16px;  /* padding standard d'un panneau */
  --space-6: 24px;  /* séparation entre sections */
  --space-8: 32px;  /* séparation entre blocs majeurs */

  --radius-sm: 4px;  /* boutons, badges */
  --radius-md: 8px;  /* cartes, champs */
  --radius-lg: 12px; /* panneaux, dialogs */

  --header-height: 48px;   /* topbar */
  --sidebar-width: 280px;  /* ChapterList */
  --row-height: 36px;      /* une ligne de liste (chapitre, entrée repliée) */
}
```

Règle simple : **toute valeur de marge/padding dans le CSS doit être une de ces variables**, jamais un nombre en dur. C'est ce qui donne l'impression de rigueur "vrai logiciel" plutôt que "bricolage".

## 3. Typographie

Deux polices seulement, chacune avec un rôle fixe :

| Rôle | Police | Usage |
|---|---|---|
| Interface (labels, boutons, texte courant) | **Inter** ou **Fira Sans** (sans-serif, très lisible en petite taille) | Tout le texte UI |
| Identifiants / code / chemins de fichiers | **Fira Code** ou **JetBrains Mono** (monospace) | `entry.type`, `chapter.id`, chemins d'assets, JSON |

Échelle de tailles (peu de paliers, cohérents partout) :

```css
--text-xs: 11px;   /* labels de section, badges, méta-info */
--text-sm: 13px;   /* texte de formulaire standard */
--text-base: 14px; /* texte de contenu principal */
--text-lg: 16px;   /* titres de panneau */
line-height: 1.4 à 1.5 partout (jamais 1 — trop serré, fatigue l'œil sur une session longue)
```

## 4. Couleur — palette dark cohérente

Une UI sombre "moderne" n'est pas juste `#111` partout — elle a une échelle de gris avec des **rôles précis**, plus un seul accent (jamais deux couleurs "primaires" qui se battent) :

| Rôle | Valeur | Usage |
|---|---|---|
| `--bg` | `#0F172A` | fond de l'app |
| `--surface` | `#1E293B` | panneaux, cartes |
| `--surface-hover` | `#334155` | hover sur une ligne/carte |
| `--border` | `rgba(255,255,255,0.10)` | séparateurs — jamais plus opaque, jamais moins visible |
| `--text` | `#F8FAFC` | texte principal |
| `--text-muted` | `#94A3B8` | labels secondaires, méta-info — **jamais en dessous de ce gris**, sinon illisible |
| `--accent` | `#4C8BF5` (bleu, déjà utilisé pour "chapitre actif") | action principale, sélection, lien |
| `--success` | `#22C55E` | sauvegarde réussie |
| `--danger` | `#F44336` | suppression, erreur |
| `--warning` | `#FFC107` | "modifié non sauvegardé" (déjà utilisé) |

Règle de contraste : texte principal sur fond ≥ 4.5:1 (WCAG AA minimum) — se vérifie en 10 secondes avec n'importe quel color-contrast checker.

## 5. Hiérarchie & densité de l'information

Pour un outil dense (formulaires empilés, listes d'entrées, builders imbriqués), trois techniques concrètes :

- **Groupement par carte/section avec un fond légèrement différent** (`--surface` sur `--bg`) plutôt que des lignes de séparation partout — l'œil regroupe visuellement sans effort.
- **Un seul niveau de titre de section par écran-enfant** (ex. "Conditions (flags)" dans `RequiresBuilder`) — en `--text-xs` majuscule discret, jamais plus voyant que le contenu qu'il introduit.
- **Repli/dépli (déjà en place dans `TimelineEditor`)** — la bonne instinct — mais l'état réduit doit donner un résumé *utile immédiatement*, pas juste le type. C'est déjà fait (`summaryFor()`), à pousser plus loin visuellement (icône par type d'entrée plutôt qu'un badge texte — voir §7).

## 6. Feedback & affordance

- **Curseur pointeur** sur tout élément cliquable (lignes de chapitre, cartes d'entrée, boutons ▲▼) — actuellement pas garanti partout.
- **Transition de 150–250ms** sur les hover/focus (`transition: background-color 0.2s ease`) — jamais de changement instantané ni de transition >400ms qui ralentit la manipulation.
- **États de focus visibles au clavier** (`:focus-visible { outline: 2px solid var(--accent) }`) — indispensable pour un outil utilisé toute la journée, où naviguer au clavier entre champs de formulaire est plus rapide qu'à la souris.
- **Aucune icône emoji comme icône d'UI** (✨👍 etc. dans le code de l'app, pas dans le contenu narratif édité) — utiliser les icônes Material déjà fournies par Quasar (`q-icon`), cohérentes en taille et en style.
- **Boutons différenciés par intention** : primaire (Enregistrer, Créer — fond `--accent`), secondaire (Annuler, fermer — contour), destructif (Supprimer — `--danger`, jamais la même couleur qu'un bouton normal).

## 7. Application concrète à Storie Engine — ce qui manque aujourd'hui

Constat direct sur le code actuel (`src/editor/**`) :

- **Pas de tokens partagés** — chaque `.vue` définit ses propres couleurs/tailles/paddings en dur (`#16161f`, `#e8e8f0`, `rgba(255,255,255,0.1)` répétés partout, jamais les mêmes valeurs deux fois). C'est la cause n°1 du sentiment "pas clair" — rien ne se répond visuellement entre composants.
- **Densité non hiérarchisée** — dans `TimelineEditor`/`RequiresBuilder`/`EffectsBuilder`, tous les champs ont le même poids visuel (même taille, même gris) — impossible de scanner rapidement "qu'est-ce qui est rempli, qu'est-ce qui ne l'est pas".
- **Boutons non différenciés** — tous les `q-btn dense flat` se ressemblent (Enregistrer, Supprimer, Ajouter, ▲▼) — aucune hiérarchie d'action.
- **Pas d'icône par type d'entrée** — le badge texte (`message`, `choice`...) dans `TimelineEditor` oblige à lire au lieu de reconnaître visuellement — une icône dédiée par type (💬 message, ❓ choice, 📷 photo...) accélère énormément le scan d'une timeline de 30 entrées.
- **Formulaires "à plat"** — `EffectsBuilder`/`RequiresBuilder` empilent beaucoup de champs sans respiration visuelle claire entre sections (les `q-expansion-item` aident mais le contenu déplié reste dense sans espacement structuré).

## 8. Checklist avant de considérer une passe UI "terminée"

État réel vérifié le 2026-07-28 (voir `docs/ui-ux-audit.md` pour le détail
et les captures) — cette checklist était encore à l'état de vœux quand ce
doc a été écrit initialement, elle reflète maintenant ce qui est vraiment
en place :

- [x] Un seul fichier de tokens (couleur/espacement/rayon/typo), tout le reste les référence — `src/css/design-tokens.scss`, adopté à 30/31 fichiers de `src/editor`.
- [x] Palette dark à rôles fixes (§4), un seul accent — vérifié aussi sur les dialogues Quasar génériques (corrigé le 2026-07-28, voir audit point 5).
- [x] Deux polices max, échelle de tailles limitée à 4-5 paliers — Inter/Fira Code réellement chargées depuis le 2026-07-28 (`@fontsource/*`), auparavant juste des noms dans le CSS jamais servis (voir audit point 1).
- [x] Chaque bouton a une intention visuelle claire (primaire/secondaire/destructif)
- [x] Chaque type d'entrée a une icône reconnaissable, pas juste un badge texte
- [x] `cursor: pointer` + hover visible sur tout élément cliquable
- [x] Focus clavier visible sur tous les champs/boutons (`:focus-visible` global, `src/css/app.scss`)
- [ ] Contraste texte vérifié (4.5:1 minimum) sur fond sombre — jamais mesuré formellement, à faire si un vrai audit d'accessibilité est demandé un jour.
- [x] Aucune valeur de spacing/couleur en dur dans un nouveau composant — toujours une variable

## Prochaine étape

Ce doc décrit le système de référence (stable, pas de changement prévu).
Le suivi de ce qui est fait/reste à faire vit maintenant dans
`docs/ui-ux-audit.md` — c'est lui qu'il faut consulter pour l'état courant
et la suite (chantier moyen : `AudioPreview.vue` maison, bloc Condition
condensé, vrai agrandissement du mode Aperçu seul ; chantier large : fil
d'Ariane de profondeur, recherche sur les traductions inutilisées).
