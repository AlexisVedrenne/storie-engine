// French — always the complete, source-of-truth dictionary (see
// src/editor/i18n/index.js's fallback rule). Grouped by component, one
// top-level key per .vue file under src/editor/, mirroring how
// src/i18n/{locale}/index.js groups by phone screen.
export default {
  common: {
    cancel: 'Annuler',
    create: 'Créer',
    close: 'Fermer',
    delete: 'Supprimer',
    save: 'Enregistrer',
    add: 'Ajouter',
  },

  editorPage: {
    noProject: 'Aucun projet chargé — redirection…',
    untitledProject: '(projet)',
    unsavedTooltip: 'Modifications non enregistrées',
    tabChapters: 'Chapitres',
    tabEvents: 'Events — réactions aux actions du joueur (hors timeline)',
    tabContacts: 'Contacts',
    tabThreads: 'Groupes',
    tabGame: 'Jeu',
    tabAssets: 'Ressources',
    tabI18n: 'Traductions',
    tabSeed: 'Contenu initial',
    showEditing: "Afficher l'édition",
    previewOnly: 'Aperçu seul',
    autosaveLabel: 'Sauvegarde auto',
    restartPreviewTooltip: "Relancer l'aperçu",
    validateTooltip:
      'Valider le projet — cherche les références cassées (contact/thread/image introuvable) et les problèmes de chapitres',
    saveBtn: 'Enregistrer',
    buildTooltip: 'Build — exporter ce projet en jeu jouable (app Electron packagée)',
    webPreviewTooltip: 'Preview web — tester sur ton téléphone via le Wi-Fi',
    switchProjectTooltip: 'Changer de projet',
    backToGraphTooltip: 'Retour au graphe',
    chapterTitleLabel: 'Titre',
    previewFromChapterTooltip: 'Prévisualiser depuis ce chapitre',
    flagsTooltip: 'Flags — catalogue de toutes les stats du joueur utilisées dans le projet',
    gameEmptyState: 'Le titre du jeu est un champ unique — pas de liste.',
    eventsEmptyState: 'Sélectionne ou crée un event à gauche.',
    contactsEmptyState: 'Sélectionne un contact à gauche.',
    threadsEmptyState: 'Sélectionne un thread à gauche.',
    i18nEmptyState: 'Sélectionne une langue à gauche.',
    previewExitHint: 'Aperçu — cliquer pour revenir à l’édition',
    flagsDialogTitle: 'Flags du projet',
    saved: 'Enregistré.',
    missingAssetError: 'Fichier introuvable dans assets/ : "{path}" (référencé par {labels})',
    validationTitle: 'Validation du projet',
    validationNone: 'Aucun problème détecté.',
    validationErrorsHeader: 'ERREURS ({n}) :',
    validationWarningsHeader: 'AVERTISSEMENTS ({n}) :',
    buildCancelled: "Build annulé — corrige les erreurs de validation d'abord.",
    warningsDialogTitle: 'Avertissements de validation',
    warningsDialogMessage:
      '{n} avertissement(s) détecté(s) :\n\n{list}\n\nLancer le build quand même ?',
    versionDialogTitle: 'Version du build',
    versionDialogMessage: 'Version actuelle : {version}',
    versionNone: 'Rebuild — pas de montée de version',
    versionPatch: 'Version normale (patch)',
    versionMinor: 'Mineure',
    versionMajor: 'Majeure',
    buildOk: 'Build',
    buildExported: 'Jeu exporté en v{version} dans {outDir}',
  },

  chapterGraph: {
    newChapter: 'Nouveau chapitre',
    titleLabel: 'Titre',
    edgeLabelField: 'Libellé (optionnel)',
    edgeLabelHint:
      'Affiché sur la flèche à la place de la condition. Vide = comportement inchangé.',
    edgeConditionTitle: 'Condition de cette flèche',
    deleteEdge: 'Supprimer cette flèche',
    confirmDeleteTitle: 'Supprimer ce chapitre ?',
    confirmDeleteMessage: '« {title} » sera supprimé du disque. Cette action est irréversible.',
    deletedNoEdges: 'Chapitre supprimé.',
    deletedWithEdgesOne: 'Chapitre supprimé (1 flèche pendante retirée).',
    deletedWithEdgesMany: 'Chapitre supprimé ({n} flèches pendantes retirées).',
    chapterCreated: 'Chapitre créé.',
    endingBadge: 'FIN',
    duplicate: 'Dupliquer',
  },

  timelineEditor: {
    selectedOne: '1 entrée sélectionnée',
    selectedMany: '{n} entrées sélectionnées',
    groupSelection: 'Grouper en accordéon',
    entriesCount: '{n} entrées',
    ungroup: 'Dissoudre le groupe',
    addEntry: 'Ajouter une entrée…',
    notAdjacent:
      'Ces entrées doivent être adjacentes pour former un groupe — réordonne-les d’abord.',
    newGroup: 'Nouveau groupe',
    group: 'Groupe',
    emptyPrompt: '(prompt vide)',
    linesCount: '{n} répliques',
    types: {
      message: {
        label: 'Message (SMS)',
        help: 'Un SMS reçu de ce contact — apparaît dans Messages.',
      },
      choice: {
        label: 'Choix (choice)',
        help: 'Bloque la conversation et propose un choix de réponse au joueur.',
      },
      post: {
        label: 'Publication (post)',
        help: 'Une publication dans le fil Pixly (comme un post Instagram).',
      },
      photo: { label: 'Photo', help: 'Une photo ajoutée à la Galerie du téléphone.' },
      story: { label: 'Story', help: 'Une story Pixly éphémère (cercle en haut du fil).' },
      dm: {
        label: 'DM Pixly',
        help: 'Un message privé Instagram — arrive dans une conversation DM, pas dans Messages.',
      },
      reel: { label: 'Reel', help: 'Un Reel dans l’onglet vidéos verticales de Pixly.' },
      call: {
        label: 'Appel (call)',
        help: 'Un appel entrant, avec un script de dialogue défilant.',
      },
      effect: {
        label: 'Effet (effect)',
        help: 'Modifie l’état du jeu (stats, météo, batterie...) sans rien montrer au joueur.',
      },
      timeskip: {
        label: 'Ellipse temporelle (timeskip)',
        help: 'Une ellipse temporelle — verrouille le téléphone et avance l’heure/date.',
      },
    },
  },

  timelineEntryCard: {
    hasCondition: "Cette entrée a une condition d'affichage",
    conditionBadge: 'condition',
    moveUp: 'Monter',
    moveDown: 'Descendre',
    displayCondition: "Condition d'affichage (optionnel)",
    displayConditionHelp:
      "N'affiche cette entrée que si toutes les conditions sont vraies. Rien d'ajouté = toujours affichée.",
    choiceBreadcrumb: 'Choix : {prompt}',
  },

  entries: {
    message: {
      fromLabel: 'De (qui envoie le SMS)',
      textLabel: 'Texte du message',
      textPlaceholder: 'ex: Coucou ! Ça va ?',
      imageLabel: 'Photo jointe (optionnel)',
    },
    choice: {
      replyTargetLabel: 'Où arrive la réponse du joueur ?',
      contactLabel: 'Contact',
      threadLabel: 'Conversation (1:1 ou groupe)',
      promptLabel: 'Question posée au joueur',
      promptPlaceholder: 'ex: Que réponds-tu ?',
      optionsTitle: 'Options de réponse',
      optionsHelp:
        'Chaque option devient un bouton proposé au joueur. Le texte choisi part comme sa réponse.',
      optionHeader: 'Option {n}{text}',
      optionEmpty: ' (texte vide)',
      needsOneOption: "Un choix a besoin d'au moins une option",
      removeOption: 'Supprimer cette option',
      buttonTextLabel: 'Texte du bouton',
      buttonTextPlaceholder: "ex: Ok, j'arrive",
      tabThen: 'Juste après',
      tabEffects: 'Conséquences',
      tabRequires: 'Condition',
      tabThenHelp:
        "Ce qui se joue immédiatement après ce choix (ex: la réponse du contact) — tous les types d'entrée sont disponibles ici, comme dans la timeline principale.",
      tabEffectsHelp:
        "Change des stats/l'état du jeu quand le joueur choisit cette option (indépendant de ce qui s'affiche juste après).",
      tabRequiresHelp:
        "Cette option n'est proposée que si toutes ces conditions sont vraies. Garde toujours au moins une option sans condition, sinon le choix peut se retrouver vide.",
      addOption: 'Ajouter une option',
    },
    post: {
      authorLabel: 'Auteur de la publication',
      captionLabel: 'Légende',
      captionPlaceholder: 'ex: dernière lumière du soir ✨',
      idLabel: 'Id (optionnel — pour cibler cette publication précise depuis un Event)',
      idPlaceholder: 'ex: post-plage-erwan',
      imageLabel: 'Image (optionnel)',
      likesLabel: 'Nombre de likes (optionnel — sinon aléatoire)',
    },
    photo: {
      fromLabel: 'Envoyée par',
      imageLabel: 'Image',
      captionLabel: 'Légende (optionnel)',
      captionPlaceholder: 'ex: Le café de ce matin',
    },
    story: {
      characterLabel: 'Personnage',
      imageLabel: 'Image (optionnel — sinon emoji sur fond coloré)',
      emojiLabel: 'Emoji',
      bgLabel: 'Couleur de fond',
      captionLabel: 'Légende (optionnel)',
      captionPlaceholder: 'ex: petit dej du dimanche',
    },
    dm: {
      threadLabel: 'Conversation Instagram (1:1 ou groupe)',
      fromLabel: 'De (qui envoie le message)',
      textLabel: 'Texte du message',
      textPlaceholder: 'ex: Je préfère te le dire en privé 😉',
      imageLabel: 'Photo jointe (optionnel)',
    },
    reel: {
      authorLabel: 'Auteur du reel',
      mediaLabel: 'Média (vidéo/image)',
      captionLabel: 'Légende (optionnel)',
      captionPlaceholder: 'ex: lundi matin ☕',
      musicLabel: 'Musique (optionnel)',
      musicPlaceholder: 'ex: Son original',
    },
    call: {
      contactLabel: 'Qui appelle',
      scriptTitle: "Script de l'appel",
      scriptHelp:
        "Les répliques s'affichent une par une, dans l'ordre, une fois l'appel décroché — le joueur clique pour faire avancer la conversation.",
      noLines: "Aucune réplique — l'appel se terminera sans dialogue.",
      linePlaceholder: 'Texte de la réplique',
      removeLine: 'Retirer',
      addLine: 'Ajouter une réplique',
    },
    timeskip: {
      intro: "Verrouille le téléphone et fait avancer l'heure/la date d'un coup.",
      clockLabel: 'Heure (optionnel)',
      dateLabel: 'Date (optionnel)',
      labelLabel: 'Label affiché sur le lock screen (optionnel)',
      labelPlaceholder: 'ex: Le lendemain',
      blockingLabel: "Bloque la timeline jusqu'au déverrouillage",
      blockingHelp:
        "Activé (par défaut) : l'histoire attend que le joueur déverrouille avant de continuer — coupure nette. Désactivé : la suite se joue en coulisses derrière l'écran verrouillé (messages/DM/appel s'accumulent normalement), comme un vrai téléphone dans une poche.",
    },
  },

  requiresBuilder: {
    addCondition: 'Ajouter une condition',
    intro:
      "Toutes les conditions ci-dessous doivent être vraies pour que ce contenu apparaisse. Rien d'ajouté = toujours affiché.",
    flagsTitle: 'Stats du joueur (flags)',
    flagsHelp:
      'Un flag est une valeur mémorisée par l’histoire (un nombre qui s’accumule, comme la confiance, ou un vrai/faux ponctuel) — posée ailleurs via un Effet, relue ici pour faire varier le contenu.',
    noFlagCondition: 'Aucune condition de stat.',
    removeCondition: 'Retirer cette condition',
    conditionLabel: 'Condition',
    trueLabel: 'vrai',
    valueLabel: 'valeur',
    addFlagCondition: 'Ajouter une condition de stat',
    followingTitle: 'Abonnements Pixly',
    followingHelp:
      'Vérifie si le joueur suit (ou non) ce personnage sur Pixly au moment où l’histoire atteint cette entrée.',
    noFollowingCondition: "Aucune condition d'abonnement.",
    playerFollows: 'le joueur le suit',
    addFollowingCondition: "Ajouter une condition d'abonnement",
    modeBool: 'vrai / faux',
    modeExact: 'est exactement…',
    modeMin: 'au moins…',
    modeMax: 'au plus…',
    modeRange: 'entre… et…',
  },

  effectsBuilder: {
    intro:
      "Modifie l'état du jeu quand cette entrée se joue — rien n'est montré au joueur, contrairement à un message ou une story. Toutes les sections ci-dessous sont optionnelles.",
    flagsHelp:
      "Un flag est une valeur mémorisée (nombre qui s'accumule, ou vrai/faux ponctuel) — relis-la plus tard via une Condition (requires) pour faire varier l'histoire.",
    noFlagChange: 'Aucune stat modifiée.',
    actionLabel: 'Action',
    addFlagChange: 'Ajouter une stat à modifier',
    widgetsTitle: 'Widgets du téléphone',
    weatherLabel: 'Météo',
    weatherCaption: "Change le widget météo de l'écran d'accueil",
    cityLabel: 'Ville',
    tempLabel: 'Température',
    conditionLabel: 'Condition',
    iconLabel: 'Icône (emoji)',
    captionLabel: 'Légende',
    stepsLabel: 'Pas (steps)',
    stepsCaption: "Widget podomètre de l'écran d'accueil",
    currentStepsLabel: 'Pas actuels',
    goalLabel: 'Objectif',
    batteryLabel: 'Batterie',
    batteryCaption: 'Fixe le % affiché — utile pour une tension narrative (batterie qui se vide)',
    batteryPercentLabel: '% batterie',
    networkLabel: 'Réseau',
    networkCaption: 'Barres de réseau + Wi-Fi affichés dans la barre de statut',
    signalLabel: 'Barres (0-4)',
    clockLabel: 'Horloge',
    clockCaption: "Fige l'heure affichée (verrouillage, barre de statut) au lieu de l'heure réelle",
    dateLabel: 'Date',
    dateCaption: 'Fige la date affichée au lieu de la date réelle',
    socialTitle: 'Réseau social (Pixly)',
    socialHelp:
      "Fait varier le nombre d'abonnés/abonnements affiché sur le profil d'un personnage.",
    noSocialChange: "Aucun changement d'abonnés.",
    followersLabel: '+abonnés',
    followingLabel: '+abonnements',
    newFollowersTitle: 'Nouveaux abonnés',
    newFollowersHelp:
      "Ces personnages se mettent à suivre le joueur — déclenche une notification 'a commencé à te suivre'.",
    noneOption: 'Aucun',
    modeDelta: 'ajoute/retire (nombre)',
    modeTrue: 'passe à vrai',
    modeFalse: 'passe à faux',
    clockUnset: 'ne pas toucher',
    clockSet: 'fixer à…',
    clockClear: 'libérer (revenir à l’heure réelle)',
  },

  contactList: {
    meLocked: 'Le contact « me » est requis par le moteur — non supprimable.',
    newContact: 'Nouveau contact',
    idLabel: 'Identifiant (id)',
    nameLabel: 'Nom',
    colorLabel: 'Couleur (hex)',
    deleteImpossibleTitle: 'Suppression impossible',
    stillReferenced: '« {name} » est encore référencé :\n\n{refs}',
    confirmDeleteTitle: 'Supprimer ce contact ?',
    confirmDeleteMessage: '« {name} » sera supprimé du disque. Cette action est irréversible.',
    contactDeleted: 'Contact supprimé.',
    contactCreated: 'Contact créé.',
  },

  contactForm: {
    identityTitle: 'Identité',
    nameLabel: 'Nom',
    colorLabel: 'Couleur (hex)',
    defaultColor: 'Par défaut (#999999)',
    resetColor: 'Revenir à la couleur par défaut',
    bioTitle: 'Bio',
    bioLabel: 'Bio (profil Pixly)',
    socialTitle: 'Réseau social (Pixly)',
    socialHelp:
      'Contrôle la présence de ce contact sur Pixly (le réseau social du téléphone) — indépendant des SMS/Appels, qui utilisent toujours name.',
    hasSocialLabel: 'A un compte Pixly',
    pseudoLabel: 'Pseudo (sans @, optionnel)',
    followersLabel: 'Followers (optionnel)',
    followingLabel: 'Following (optionnel)',
    followedByDefaultLabel: 'Suivi par défaut en début de partie',
    imagesTitle: 'Images',
    avatarLabel: 'Avatar (Téléphone / Messages / Appels)',
    socialAvatarLabel: 'Avatar Pixly (Fil / Stories / DM / Profil)',
  },

  threadList: {
    newThread: 'Nouveau thread',
    newThreadDialogTitle: 'Nouveau thread (groupe)',
    groupNameLabel: 'Nom du groupe',
    confirmDeleteTitle: 'Supprimer ce thread ?',
    confirmDeleteMessage: '« {name} » sera supprimé du disque. Cette action est irréversible.',
    threadDeleted: 'Thread supprimé.',
    threadCreated: 'Thread créé.',
  },

  threadForm: {
    title: 'Groupe de discussion (DM Pixly)',
    help: "Seuls les groupes ont besoin d'une entrée ici — les DM 1:1 utilisent directement l'id du contact comme thread, sans passer par threads.js.",
    participantsLabel: 'Participants',
  },

  eventList: {
    paneLabel: 'Events',
    empty: "Aucun event pour l'instant.",
    addEvent: 'Ajouter un event',
    common: 'Commun',
    noTrigger: '(sans trigger)',
  },

  eventForm: {
    intro:
      "Réagit à une action du joueur (pas à la timeline d'un chapitre) — ouvrir une app, liker un post... Réutilise les mêmes conditions/effets que partout ailleurs.",
    introHelp:
      "Voir docs/roadmap-modular-apps-events.md — un event n'est pas un deuxième système narratif : ses conséquences (onglet 'Ensuite') sont jouées par le même moteur que la timeline d'un chapitre.",
    titleLabel: "Titre (optionnel — pour s'y retrouver dans la liste)",
    whenLabel: 'Quand',
    optionalExistingOrFuture: ' (optionnel — existante ou à venir)',
    optionalAny: ' (optionnel — vide = n’importe lequel)',
    optionalNoMinimum: ' (optionnel — vide = aucun minimum)',
    typeFuturePhoto: "Tape le chemin d'une photo à venir (ex: images/erwan/plage.jpg)",
    typeFuturePost: "Tape l'id d'une publication à venir (défini dans son propre champ Id)",
    tabThen: 'Ensuite',
    tabThenHelp:
      "Ce qui se joue quand cet event se déclenche — mêmes types d'entrée que dans une timeline de chapitre.",
    tabRequiresHelp:
      "Ne se déclenche que si ces conditions sont vraies au moment de l'action du joueur.",
  },

  gameForm: {
    titleTitle: 'Titre',
    titleFieldLabel: "Titre (affiché sur l'écran verrouillé)",
    buildIconTitle: 'Icône du build',
    buildIconHelp:
      "Icône du fichier .exe exporté. Format .ico recommandé pour l'icône Windows (Explorateur/barre des tâches) — un .png fonctionne aussi mais ne donnera que l'icône de la fenêtre pendant l'exécution, pas celle du fichier .exe lui-même.",
    buildIconLabel: 'Icône (.ico recommandé, .png accepté)',
    wallpaperTitle: "Fond d'écran du téléphone",
    wallpaperLabel: 'Fond d’écran (verrouillage + accueil)',
    accentColorTitle: "Couleur d'interface",
    accentColorHelp:
      "Recolore les éléments d'accent du téléphone (bulles de message envoyées, DM, égaliseur...). Laisse vide pour garder la couleur par défaut du moteur.",
    accentColorDefault: 'Par défaut (#4c8bf5)',
    appsTitle: 'Applications',
    appsHelp:
      "Désactive une app du téléphone pour ce projet — elle disparaît de l'écran d'accueil et de l'animation de démarrage. Rien ne détecte automatiquement du contenu qui pointerait encore vers une app désactivée (ex: un SMS alors que Messages est coupé) — à l'auteur de vérifier.",
    soundsTitle: 'Sons',
    soundsHelp:
      "Remplace un son d'interface par défaut du moteur par un fichier audio du projet. Laisse vide pour garder le son par défaut.",
    soundSmsReceive: 'Message reçu (SMS)',
    soundSmsSend: 'Message envoyé (SMS)',
    soundDmReceive: 'DM Pixly reçu',
    soundDmSend: 'DM Pixly envoyé',
    soundCallRingtone: "Sonnerie d'appel",
    soundCallAccept: 'Appel décroché',
    soundCallEnd: 'Appel terminé',
    soundLike: 'Like (Pixly)',
    soundNewFollower: 'Nouvel abonné (Pixly)',
    soundStoryTap: 'Story consultée (Pixly)',
    soundPostShare: 'Publication partagée (Pixly)',
    soundSystemBoot: 'Démarrage du téléphone',
    soundSystemUnlock: 'Déverrouillage',
    soundSystemNotification: 'Notification',
    soundLowBattery: 'Batterie faible',
  },

  flagsPanel: {
    intro:
      "Tous les flags utilisés quelque part dans le projet (chapitres, flèches du graphe, choix, events) — donne un libellé à chacun pour t'y retrouver dans les conditions/effets. Pour un flag numérique, la plage affichée est la valeur la plus basse et la plus haute qu'il peut réellement atteindre en jouant l'histoire (en tenant compte des choix) — pas la simple liste des deltas tapés un par un. Optimiste : elle suppose que chaque branche qui modifie ce flag est atteignable, sans vérifier les autres conditions qui pourraient bloquer l'accès à une branche donnée.",
    empty:
      "Aucun flag utilisé pour l'instant — un flag apparaît ici dès qu'il est référencé dans une condition ou un effet (RequiresBuilder/EffectsBuilder, n'importe où dans le projet).",
    deleteUnusedOne: 'Supprimer le flag inutilisé',
    deleteUnusedMany: 'Supprimer les {n} flags inutilisés',
    boolean: 'booléen',
    reachable: 'atteignable : {min} → {max}',
    neverModified: 'lu, jamais modifié',
    neverModifiedTooltip:
      'Une condition lit ce flag quelque part, mais aucun effet ne le modifie nulle part dans le projet.',
    unused: 'non utilisé',
    usageOne: '1 usage',
    usageMany: '{n} usages',
    deleteLabelTooltip: 'Supprimer ce libellé — plus référencé nulle part dans le projet',
    labelPlaceholder: 'Libellé (optionnel) — ex: Confiance de Clara',
    confirmDeleteUnusedTitle: 'Supprimer les flags inutilisés ?',
    confirmDeleteUnusedOne: 'Un libellé plus référencé nulle part dans le projet sera supprimé.',
    confirmDeleteUnusedMany:
      '{n} libellés plus référencés nulle part dans le projet seront supprimés.',
  },

  flagNameField: {
    label: 'Nom du flag',
    noOption: 'Tape pour créer un nouveau flag',
    numericHint: 'numérique, atteignable entre {min} et {max}',
    neverModifiedHint: '⚠ lu, jamais modifié par un effet',
  },

  assetField: {
    defaultLabel: 'Image',
    defaultSound: 'Son par défaut du moteur',
    noFileSelected: 'Aucun fichier sélectionné',
    importTooltip: "Importer… — copier un fichier depuis n'importe où sur le disque dans assets/",
    browseTooltip: 'Parcourir… — choisir un fichier déjà présent dans assets/',
    removeTooltip: 'Retirer',
    apiUnavailable: 'window.storieAPI indisponible — lance en mode Electron.',
  },

  assetTree: {
    paneLabel: 'Dossiers',
    newSubfolderTooltip: 'Nouveau sous-dossier ici',
    newFolder: 'Nouveau dossier',
    inLabel: 'Dans :',
    folderNameLabel: 'Nom du dossier',
    folderCreated: 'Dossier créé.',
  },

  assetsPanel: {
    countSummary: '{folders} dossier(s), {files} fichier(s), {orphans} orphelin(s) au total',
    importFile: 'Importer un fichier',
    refreshTooltip: 'Recharger la liste depuis le disque',
    empty: 'Aucun fichier ni dossier dans assets/.',
    parentFolder: '.. (dossier parent)',
    used: 'Utilisé',
    orphan: 'Orphelin',
    deleteUnusedTooltip: 'Supprimer ce fichier inutilisé',
    confirmDeleteTitle: 'Supprimer ce fichier ?',
    confirmDeleteMessage:
      "« {path} » n'est référencé nulle part dans le projet. Il sera supprimé du disque. Cette action est irréversible.",
    fileDeleted: 'Fichier supprimé.',
  },

  localeList: {
    paneLabel: 'Langues',
    translatedProgress: '{done}/{total} traduits',
    newLocale: 'Nouvelle langue',
    allAdded: "Toutes les langues d'interface disponibles sont déjà ajoutées à ce projet.",
    constraintHint:
      "Limité aux langues d'interface déjà supportées par le moteur — sinon les menus/réglages resteraient non traduits pour cette langue.",
    systemLocaleHidden:
      '« {locale} » masquée — langue système détectée de cette machine, probablement celle utilisée pour écrire les chapitres.',
    languageLabel: 'Langue',
    localeCreated: 'Langue créée.',
    deleteTooltip: 'Supprimer cette langue',
    confirmDeleteTitle: 'Supprimer « {locale} » ?',
    confirmDeleteBody:
      'Toutes les traductions enregistrées pour cette langue seront définitivement supprimées. Cette action est irréversible.',
    localeDeleted: 'Langue supprimée.',
  },

  webPreviewDialog: {
    loading: 'Chargement de la preview...',
    readyTitle: 'Preview prête',
    readyHint: 'Rends-toi sur ce lien depuis ton téléphone (même réseau Wi-Fi) :',
    firewallHint: "Si Windows demande d'autoriser l'accès réseau, clique sur Autoriser (réseaux privés).",
    errorTitle: 'Échec de la preview',
    stop: 'Arrêter la preview',
  },

  i18nBucketEditor: {
    translatedInFolder: '{done}/{total} traduits dans ce dossier',
    noStrings: "Aucune chaîne traduisible trouvée dans ce dossier pour l'instant.",
    searchPlaceholder: 'Rechercher une phrase à traduire…',
    hideTranslated: 'Masquer les traduites',
    noMatch: 'Aucune phrase ne correspond à ce filtre.',
    translated: 'Traduit',
    missing: 'Manquant',
    unusedTranslations: 'Traductions inutilisées',
    unusedTranslationsHelp:
      'Ces clés existent dans le dictionnaire mais ne correspondent plus à aucune phrase du contenu actuel — probablement du texte modifié ou supprimé depuis.',
    searchOrphansPlaceholder: 'Rechercher parmi les traductions inutilisées…',
    deleteUnusedTooltip: 'Supprimer cette entrée inutilisée',
  },

  seedBucketList: {
    entryCount: '{n} entrée(s)',
    messages: 'Messages',
    dms: 'DM Pixly',
    posts: 'Publications',
    reels: 'Reels',
    photos: 'Galerie',
  },

  seedBucketEditor: {
    conversationWith: 'Conversation avec',
    thread: 'Thread',
    chooseConversation: 'Choisis une conversation ci-dessus.',
    noEntries: "Aucune entrée pour l'instant.",
    fromLabel: 'De',
    authorLabel: 'Auteur',
    daysAgoLabel: 'Il y a N jours',
    textLabel: 'Texte',
    addMessage: 'Ajouter un message',
    addPost: 'Ajouter une publication',
    addReel: 'Ajouter un reel',
    addPhoto: 'Ajouter une photo',
  },

  commentsListField: {
    title: 'Commentaires (optionnel)',
    empty: 'Aucun commentaire écrit à la main.',
    textPlaceholder: 'Texte du commentaire',
    addComment: 'Ajouter un commentaire',
    countLabel: 'Nombre de commentaires affiché (optionnel — sinon = nombre réel ci-dessus)',
  },

  // Overrides for text authored in src/engine/events/triggers.js (shipped
  // in the game — see sharedOverrides.js's own header comment for why this
  // can't just live there). Keyed by trigger.name, then by matchField key.
  triggers: {
    'app.opened': {
      label: 'Application ouverte',
      fields: { app: { label: 'Application' } },
    },
    'app.closed': {
      label: 'Application quittée (délai passé dedans)',
      fields: {
        app: { label: 'Application' },
        seconds: { label: 'Temps minimum (secondes)' },
      },
    },
    'photo.viewed': {
      label: 'Photo consultée',
      fields: { url: { label: 'Photo' } },
    },
    'post.liked': {
      label: 'Publication likée',
      fields: {
        authorId: { label: 'Auteur de la publication' },
        postId: { label: 'Publication (id)' },
      },
    },
    'contact.followed': {
      label: 'Contact suivi',
      fields: { contactId: { label: 'Contact' } },
    },
    'profile.opened': {
      label: 'Profil ouvert',
      fields: { contactId: { label: 'Contact' } },
    },
    'conversation.opened': {
      label: 'Conversation ouverte',
      fields: { contactId: { label: 'Contact' } },
    },
  },

  // Same idea, for plug-in entry types authored in a project app's own
  // entryType.js (e.g. src/components/apps/email/entryType.js).
  entryTypes: {
    email: {
      label: 'Email',
      help: 'Un email reçu — apparaît dans l’app Email.',
    },
  },

  openProjectPage: {
    reopening: 'Réouverture du dernier projet…',
    subtitle: 'Éditeur du moteur narratif',
    apiWarningBefore: "window.storieAPI est indisponible — lance l'app en mode Electron",
    apiWarningAfter: ', pas dans un simple navigateur.',
    openBtn: 'Ouvrir un projet',
    newBtn: 'Nouveau projet',
    nameLabel: 'Nom du projet',
    loadError: 'Échec du chargement du projet : {error}',
    createError: 'Échec de la création du projet : {error}',
  },
}
