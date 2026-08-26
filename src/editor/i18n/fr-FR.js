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
    tabInteractions:
      'Interactions — gestes téléphone construits par toi, appelables depuis la timeline',
    tabApps: 'Apps — applications téléphone construites par blocs visuels',
    tabSchemas:
      'Schémas — catalogue de données structurées (plusieurs champs par instance) utilisables dans les apps',
    tabContacts: 'Contacts',
    tabThreads: 'Groupes',
    tabGame: 'Jeu',
    tabAssets: 'Ressources',
    tabI18n: 'Traductions',
    tabSeed: 'Contenu initial',
    showEditing: "Afficher l'édition",
    previewOnly: 'Aperçu seul',
    autosaveLabel: 'Sauvegarde auto (locale)',
    restartPreviewTooltip: "Relancer l'aperçu",
    validateTooltip:
      'Valider le projet — cherche les références cassées (contact/thread/image introuvable) et les problèmes de chapitres',
    globalSearchTooltip: 'Recherche globale (Ctrl+K)',
    undoTooltip: 'Annuler (Ctrl+Z)',
    redoTooltip: 'Rétablir (Ctrl+Maj+Z)',
    undoTargetGone: "Impossible d'annuler : cet élément a été supprimé depuis.",
    saveBtn: 'Enregistrer',
    buildTooltip: 'Build — exporter ce projet en jeu jouable (desktop et/ou Android)',
    webPreviewTooltip: 'Preview web — tester sur ton téléphone via le Wi-Fi',
    switchProjectTooltip: 'Changer de projet',
    backToGraphTooltip: 'Retour au graphe',
    chapterTitleLabel: 'Titre',
    chapterRenamed: 'Chapitre renommé — id mis à jour.',
    previewFromChapterTooltip: 'Prévisualiser depuis ce chapitre',
    flagsTooltip: 'Flags — catalogue de toutes les stats du joueur utilisées dans le projet',
    gameEmptyState: 'Le titre du jeu est un champ unique — pas de liste.',
    eventsEmptyState: 'Sélectionne ou crée un event à gauche.',
    interactionsEmptyState: 'Sélectionne ou crée une interaction à gauche.',
    appsEmptyState: 'Sélectionne ou crée une application à gauche.',
    schemasEmptyState: 'Sélectionne ou crée un schéma à gauche.',
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
    buildTargetWin: 'Windows (x64)',
    buildTargetMacIntel: 'macOS (Intel)',
    buildTargetMacArm: 'macOS (Apple Silicon)',
    buildTargetLinux: 'Linux (x64)',
    androidToolchainInstallOk: 'Installer',
    androidStageJdkDownload: 'Téléchargement JDK… {percent}%',
    androidStageJdkExtract: 'Extraction JDK…',
    androidStageSdkDownload: 'Téléchargement SDK Android… {percent}%',
    androidStageSdkExtract: 'Extraction SDK Android…',
    androidStageSdkLicenses: 'Acceptation des licences…',
    androidStageSdkPackages: 'Installation des paquets SDK…',
    androidStageDone: 'Toolchain prête.',
    moreActionsTooltip: 'Plus d’actions',
    validateLabel: 'Valider',
    buildLabel: 'Build',
    webPreviewLabel: 'Preview web',
    navMenuTooltip: 'Navigation',
    navLabelEvents: 'Events',
    navLabelInteractions: 'Interactions',
    navLabelApps: 'Apps',
    navLabelSchemas: 'Schémas',
  },

  buildStepper: {
    stepVersionTitle: 'Version',
    stepDistributionTitle: 'Distribution',
    stepBuildTitle: 'Build',
    continue: 'Continuer',
    back: 'Retour',
    startBuild: 'Lancer le build',
    buildTargetAndroid: 'Android (.apk)',
    toolchainChecking: 'Vérification du toolchain Android…',
    toolchainReady: 'Toolchain Android prête.',
    toolchainMissing:
      'Toolchain Android absente (JDK + SDK, ~700 Mo, une seule fois, connexion internet requise).',
    buildCancelled: 'Export annulé.',
    buildingGeneric: 'Build en cours…',
  },

  chapterGraph: {
    newChapter: 'Nouveau chapitre',
    visitedTooltip: 'Déjà visité pendant cet aperçu',
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

  chapterEndScreen: {
    title: 'Écran de fin',
    help: 'Ce chapitre n’a aucune suite — personnalise l’écran affiché au joueur ici, ou laisse vide pour l’écran par défaut.',
    titleLabel: 'Titre',
    textLabel: 'Texte (optionnel)',
    imageLabel: 'Image (optionnel)',
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
    vfxStopSummary: 'Arrête l’effet en cours',
    vfxUntilStopped: 'jusqu’à arrêt manuel',
    musicStopSummary: 'Arrête la musique en cours',
    interactionBlocking: 'bloque la timeline',
    interactionParallel: 'en parallèle',
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
      appDm: {
        label: 'Conversation (app custom)',
        help: 'Un message dans le bloc Conversation d’une app custom — choisis quelle app et quel contact/groupe dans le formulaire.',
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
      vfx: {
        label: 'Effet visuel (vfx)',
        help: 'Effet visuel plein écran sur le téléphone (glitch, parasites, corruption, secousse, écran fissuré, coupure de courant) — purement cosmétique, ne bloque pas la timeline. Peut se désactiver tout seul après une durée, ou rester actif jusqu’à un autre vfx en mode « Arrêter » plus loin dans la timeline.',
      },
      music: {
        label: 'Musique',
        help: 'Joue une musique de fond sur le téléphone — démarre une piste (en boucle par défaut) ou arrête celle en cours. Purement cosmétique, ne bloque pas la timeline.',
      },
      timeskip: {
        label: 'Ellipse temporelle (timeskip)',
        help: 'Une ellipse temporelle — verrouille le téléphone et avance l’heure/date.',
      },
      interaction: {
        label: 'Interaction',
        help: 'Un geste construit par toi dans l’onglet Interactions (brancher un câble, essuyer l’écran...) — gagné/perdu déclenche une branche différente et un event, en bloquant la timeline ou en parallèle selon le réglage.',
      },
      hallucination: {
        label: 'Hallucination',
        help: 'Une fausse conversation que le joueur ne peut que regarder — les messages s’enchaînent tout seuls puis disparaissent après un effet glitch. Rien n’est écrit dans les vraies discussions.',
      },
      fakeTyping: {
        label: 'Faux « en train d’écrire »',
        help: 'Affiche les 3 petits points « en train d’écrire » dans une conversation SMS ou DM, pendant une durée choisie — aucun message n’arrive ensuite.',
      },
      pause: {
        label: 'Pause',
        help: 'Ne montre rien — attend simplement une durée choisie avant de reprendre la suite.',
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
      deleteAfterLabel:
        'Supprimé automatiquement après (optionnel — le joueur peut re-cliquer pour le réafficher)',
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
      deleteAfterLabel:
        'Supprimé automatiquement après (optionnel — le joueur peut re-cliquer pour le réafficher)',
    },
    appDm: {
      appLabel: 'Application',
      threadLabel: 'Conversation (1:1 ou groupe)',
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
    vfx: {
      intro:
        'Déclenche un effet visuel plein écran sur le téléphone. Purement cosmétique — la timeline continue tout de suite, sans attendre la fin de l’effet.',
      modeStart: 'Démarrer',
      modeStop: 'Arrêter',
      stopHelp:
        'Désactive l’effet visuel actuellement affiché, quel qu’il soit — à placer plus loin dans la timeline pour couper un effet laissé actif sans durée.',
      effectLabel: 'Effet',
      kinds: {
        glitch: 'Glitch (distorsion couleur)',
        static: 'Parasites (bruit TV)',
        corrupted: 'Corruption (blocs pixels)',
        shake: 'Secousse',
        crack: 'Écran fissuré',
        blackout: 'Coupure de courant (flicker puis noir)',
      },
      durationLabel: 'Durée (optionnel)',
      durationHelp:
        'Laisse vide pour que l’effet reste actif jusqu’à un entry « Arrêter » plus loin dans la timeline.',
    },
    music: {
      intro:
        'Joue une musique de fond sur le téléphone. Purement cosmétique — la timeline continue tout de suite, sans attendre.',
      modeStart: 'Démarrer',
      modeStop: 'Arrêter',
      stopHelp:
        'Arrête la musique actuellement en cours, quelle qu’elle soit — à placer plus loin dans la timeline pour couper un morceau laissé en boucle.',
      trackLabel: 'Piste (fichier audio)',
      titleLabel: 'Titre affiché (optionnel)',
      titleHelp:
        'Montré dans le widget musique de l’écran d’accueil. Vide = déduit du nom de fichier.',
      loopLabel: 'Reprendre en boucle',
      volumeLabel: 'Volume de la piste',
      volumeHelp:
        'Niveau de mixage propre à cette piste — se combine avec le volume musique du joueur (Réglages), ne le remplace pas.',
      fadeLabel: 'Fondu (optionnel)',
      fadeStartHelp:
        'Durée du fondu à l’entrée. Si une musique jouait déjà, elle disparaît en fondu sur la même durée au lieu de s’arrêter net.',
      fadeStopHelp: 'Durée du fondu à la sortie avant l’arrêt complet.',
    },
    timeskip: {
      intro: "Verrouille le téléphone et fait avancer l'heure/la date d'un coup.",
      clockLabel: 'Heure (optionnel)',
      dateLabel: 'Date (optionnel)',
      labelLabel: 'Message (optionnel)',
      labelPlaceholder: 'ex: Le lendemain',
      labelHelp:
        "Affiché sur l'écran verrouillé par défaut. Si une app est choisie ci-dessous, il apparaît plutôt en fondu en haut de l'écran une fois arrivé sur l'app, puis disparaît.",
      blockingLabel: "Bloque la timeline jusqu'au déverrouillage",
      blockingHelp:
        "Activé (par défaut) : l'histoire attend que le joueur déverrouille avant de continuer — coupure nette. Désactivé : la suite se joue en coulisses derrière l'écran verrouillé (messages/DM/appel s'accumulent normalement), comme un vrai téléphone dans une poche.",
      blockingLandAppHelp:
        "Sans effet ici : une app choisie ci-dessous saute l'écran verrouillé, donc la suite reprend tout de suite.",
      landAppLabel: 'Ouvrir une app au déverrouillage (optionnel)',
      landAppHelp:
        "Sans ça, le joueur retombe sur l'écran d'accueil comme d'habitude, en passant par l'écran verrouillé. Avec, il arrive directement sur l'app choisie, sans passer par l'écran verrouillé.",
      landThreadLabel: 'Ouvrir une conversation précise (optionnel)',
      landThreadHelp: "Sinon, le joueur arrive sur la liste des discussions de l'app.",
    },
    interaction: {
      pickLabel: 'Interaction',
      blockingLabel: 'Comportement',
      blockingOn: 'Bloque la timeline',
      blockingOff: 'En parallèle',
      blockingOnHelp:
        "L'histoire attend le résultat (gagné/perdu) avant de continuer — comme un choix ou un appel.",
      blockingOffHelp:
        "La timeline continue tout de suite, l'interaction reste jouable à l'écran — son résultat ne se répercute que via ses propres branches et l'event correspondant (interaction.won / interaction.lost), pas en bloquant la suite.",
      branchesTitle: 'Résultat',
      winLabel: 'Victoire',
      loseLabel: 'Défaite',
      noneAuthoredHelp:
        'Aucune interaction créée pour l’instant — construis-en une dans l’onglet Interactions, puis reviens l’appeler ici.',
      stepsCount: '{n} étapes',
    },
    hallucination: {
      intro:
        'Une fausse conversation qui s’affiche par-dessus l’écran actuel, message par message, puis disparaît après un effet glitch — le joueur ne peut ni y répondre ni la retrouver ensuite, rien n’est écrit dans les vraies discussions.',
      messagesTitle: 'Messages',
      messagesHelp:
        'S’affichent un par un, dans l’ordre, avec le même rythme « en train d’écrire » qu’un SMS.',
      noMessages: 'Aucun message — l’hallucination sera vide.',
      messagePlaceholder: 'Texte du message',
      removeMessage: 'Retirer',
      addMessage: 'Ajouter un message',
      enterEffectLabel: 'Effet d’entrée',
      exitEffectLabel: 'Effet de sortie',
      blockingLabel: "Bloque la timeline jusqu'à la fin",
      blockingHelp:
        "Activé (par défaut) : l'histoire attend que l'hallucination se termine avant de continuer. Désactivé : la suite se joue derrière, l'hallucination reste affichée en même temps.",
    },
    fakeTyping: {
      intro:
        'Affiche les points « en train d’écrire » d’une conversation, sans qu’aucun message n’arrive après — purement cosmétique, la timeline continue tout de suite.',
      modeSms: 'SMS',
      modeDm: 'DM Pixly',
      contactLabel: 'Contact (SMS)',
      threadLabel: 'Conversation (1:1 ou groupe)',
      fromLabel: 'Qui « écrit »',
      durationLabel: 'Durée',
    },
    pause: {
      intro: 'Un silence — rien ne se passe, la timeline attend juste avant de continuer.',
      durationLabel: 'Durée',
    },
  },

  interactionList: {
    empty: 'Aucune interaction créée.',
    stepsCount: '{n} étapes',
    newInteraction: 'Nouvelle interaction',
    idLabel: 'Identifiant (id)',
    nameLabel: 'Nom',
    idTaken: 'Cet identifiant est déjà utilisé.',
  },

  interactionDefForm: {
    identityTitle: 'Identité',
    nameLabel: 'Nom',
    backgroundTitle: 'Fond d’écran',
    backgroundHelp:
      'Image de fond affichée pendant toute l’interaction (optionnel) — ex: une photo du bas du téléphone pour "brancher le câble", ou l’écran couvert de poussière.',
    backgroundLabel: 'Image de fond',
    stepsTitle: 'Étapes',
    stepsHelp:
      'Le joueur doit réussir chaque étape dans l’ordre pour que l’interaction soit gagnée — le dépassement du délai d’une étape la fait échouer.',
  },

  entitySchemaList: {
    empty: 'Aucun schéma créé.',
    fieldsCount: '{n} champs',
    newSchema: 'Nouveau schéma',
    idLabel: 'Identifiant (id)',
    labelLabel: 'Nom affiché',
    idTaken: 'Cet identifiant est déjà utilisé.',
  },

  entitySchemaForm: {
    identityTitle: 'Identité',
    labelLabel: 'Nom affiché',
    fieldsTitle: 'Champs',
    fieldsHelp:
      'Chaque instance de ce schéma (créée/modifiée via les effets d’une entrée timeline, d’un bouton...) aura ces champs. Utilisable dans un bloc liste (source "Entités") d’une app custom — {item:<clé du champ>} dans son contenu répété.',
    fieldsEmpty: 'Aucun champ — ajoute-en au moins un.',
    addField: 'Ajouter un champ',
    fieldKeyLabel: 'Clé',
    fieldLabelLabel: 'Nom affiché',
    fieldTypeLabel: 'Type',
    refSchemaLabel: 'Schéma visé',
    typeText: 'Texte',
    typeNumber: 'Nombre',
    typeBoolean: 'Oui / non',
    typeRefContact: 'Référence — contact du projet',
    typeRefEntity: 'Référence — autre schéma',
    seedTitle: 'Instances de départ',
    seedHelp:
      'Présentes dès le début d’une partie neuve, sans qu’un Effet n’ait besoin de tourner — comme le contenu de l’onglet "Contenu initial", mais pour ce schéma.',
    seedNeedsFields: 'Ajoute d’abord au moins un champ ci-dessus.',
    seedEmpty: 'Aucune instance de départ — le schéma démarre vide.',
    seedIdLabel: 'Identifiant (optionnel)',
    seedIdAutoHint: 'Vide = identifiant généré automatiquement',
    addSeedRow: 'Ajouter une instance de départ',
  },

  stepsEditor: {
    empty: 'Aucune étape — ajoute-en au moins une.',
    stepHeader: 'Étape {n} — {kind}',
    kindLabel: 'Type de geste',
    textLabel: 'Texte affiché',
    imageLabel: 'Image (ton propre asset — prioritaire sur l’icône)',
    iconLabel: 'Icône (optionnel, si pas d’image)',
    iconHelp:
      'Nom d’icône Material (ex: power, cleaning_services) — ignoré si une image est choisie au-dessus.',
    timeLimitLabel: 'Délai maximum (optionnel)',
    timeLimitHelp:
      'Passé ce délai, l’interaction entière échoue. Laisse vide pour ne pas limiter cette étape.',
    zoneLabel: 'Zone',
    fromLabel: 'Départ',
    toLabel: 'Arrivée',
    directionLabel: 'Direction',
    directions: {
      up: 'Haut',
      down: 'Bas',
      left: 'Gauche',
      right: 'Droite',
    },
    durationLabel: 'Durée',
    digitsLabel: 'Code attendu',
    digitsHelp: 'Chiffres uniquement, ex: 1234.',
    addStep: 'Ajouter une étape',
  },

  stepKinds: {
    tap: { label: 'Toucher' },
    hold: { label: 'Maintenir appuyé' },
    swipe: { label: 'Glisser (swipe)' },
    drag: { label: 'Glisser-déposer (drag)' },
    wipe: { label: 'Frotter / essuyer' },
    code: { label: 'Code numérique' },
    wait: { label: 'Attendre (sans action)' },
  },

  zonePicker: {
    anywhere: 'N’importe où',
    zones: {
      topLeft: 'Haut gauche',
      top: 'Haut',
      topRight: 'Haut droite',
      left: 'Gauche',
      center: 'Centre',
      right: 'Droite',
      bottomLeft: 'Bas gauche',
      bottom: 'Bas',
      bottomRight: 'Bas droite',
    },
  },

  customAppList: {
    empty: 'Aucune application créée.',
    newApp: 'Nouvelle application',
    import: 'Importer (.zip)',
    export: 'Exporter',
    idLabel: 'Identifiant (id)',
    labelLabel: 'Nom',
    confirmDeleteTitle: 'Supprimer cette application ?',
    confirmDeleteMessage: '« {name} » sera supprimée du disque. Cette action est irréversible.',
    appDeleted: 'Application supprimée.',
    exported: 'Application exportée (.zip).',
    imported: 'Application importée.',
  },

  customAppEditor: {
    identityTitle: 'Identité',
    labelLabel: 'Nom',
    iconLabel: 'Icône (accueil du téléphone)',
    iconHelp:
      'Nom d’icône Material — affichée sur l’écran d’accueil, distincte des icônes posées dans les blocs.',
    screensTitle: 'Écrans',
    screenLabelLabel: 'Nom de l’écran',
    addScreen: 'Ajouter un écran',
    screenBackgroundLabel: 'Fond d’écran (optionnel)',
  },

  blockBuilder: {
    empty: 'Aucun bloc — glisse-en un depuis la palette au-dessus.',
    duplicate: 'Dupliquer',
  },

  blockPresets: {
    'profile-header': { label: 'En-tête profil' },
    'stat-row': { label: 'Ligne de stats' },
    'settings-section': { label: 'Section réglages' },
    'call-to-action': { label: 'Appel à l’action' },
  },

  blockKinds: {
    header: { label: 'En-tête' },
    text: { label: 'Texte' },
    image: { label: 'Image' },
    avatar: { label: 'Avatar' },
    row: { label: 'Ligne' },
    card: { label: 'Carte' },
    layout: { label: 'Disposition (rangée/colonne)' },
    badge: { label: 'Badge' },
    divider: { label: 'Séparateur' },
    button: { label: 'Bouton' },
    tabs: { label: 'Onglets' },
    list: { label: 'Liste (contacts)' },
    conversations: { label: 'Conversation' },
  },

  blockProps: {
    titleLabel: 'Titre',
    iconLabel: 'Icône',
    styleTitle: 'Titre',
    styleBody: 'Paragraphe',
    contentLabel: 'Contenu',
    imageLabel: 'Image',
    fullBleedLabel: 'Bord à bord (plein largeur)',
    fullBleedHelp:
      'Ignore la marge de l’écran — l’image touche les bords gauche/droit. Ne s’aligne pas parfaitement si le bloc est imbriqué dans une carte/disposition.',
    textColorLabel: 'Couleur du texte',
    textSizeLabel: 'Taille (optionnel)',
    textSizeHelp: 'Laisse vide pour garder la taille du style choisi ci-dessus.',
    labelLabel: 'Texte',
    iconFallbackLabel: 'Icône (si pas d’image)',
    iconFallbackHelp:
      'Nom d’icône Material, utilisée seulement si aucune image n’est choisie au-dessus.',
    sublabelLabel: 'Sous-texte (optionnel)',
    chevronLabel: 'Chevron (indique qu’on peut cliquer)',
    iconColorLabel: 'Couleur de l’icône',
    bgColorLabel: 'Couleur de fond (optionnel)',
    radiusLabel: 'Arrondi',
    cardHelp: 'Une carte regroupe visuellement d’autres blocs à l’intérieur.',
    layoutHelp:
      'Arrange d’autres blocs en rangée ou en colonne, sans fond visuel par défaut — contrairement à la carte, sauf si tu choisis une couleur de fond ci-dessous.',
    directionRow: 'Rangée (horizontal)',
    directionColumn: 'Colonne (vertical)',
    gapLabel: 'Écart entre les blocs',
    buttonHelp: 'Bouton purement visuel — choisis une action ci-dessus pour le rendre interactif.',
    actionNone: 'Aucune',
    actionEffect: 'Effet',
    actionNavigateScreen: 'Changer d’écran',
    actionEvent: 'Événement',
    actionEffectHelp:
      'Applique ces effets (flags, social...) au tap — même mécanisme qu’une option de choix.',
    actionNavigateScreenLabel: 'Écran ciblé',
    actionEventHelp:
      'Déclenche l’événement "Bouton pressé" — crée une réaction dans l’onglet Events qui filtre sur cet id pour savoir quel bouton a été pressé.',
    actionEventButtonIdLabel: 'Id du bouton (optionnel)',
    actionEventButtonIdHint: 'Laisse vide si un seul bouton de ce genre existe dans le projet.',
    tabLabelLabel: 'Texte de l’onglet',
    tabScreenLabel: 'Écran ciblé',
    addTab: 'Ajouter un onglet',
    spacingTitle: 'Espacement (avancé)',
    spacingBeforeLabel: 'Espace avant (optionnel)',
    spacingAfterLabel: 'Espace après (optionnel)',
    useItemAvatarLabel: 'Utiliser l’avatar du contact',
    onlyFollowedLabel: 'Seulement les contacts suivis',
    listSourceContacts: 'Contacts',
    listSourceCollection: 'Collection (flag)',
    listSourceEntity: 'Entités (schéma)',
    listHelp:
      'Le contenu ci-dessous est répété une fois par contact — utilise le bouton variable pour insérer {item:name} dans un champ texte, ou la case ci-dessus sur un bloc avatar.',
    listCollectionHelp:
      'Le contenu ci-dessous est répété une fois par élément de la collection choisie (remplie via les effets d’une entrée timeline, d’un bouton...) — utilise le bouton variable pour insérer {item:key}/{item:value}.',
    listSchemaLabel: 'Schéma',
    listEntityHelp:
      'Le contenu ci-dessous est répété une fois par instance du schéma choisi (créées/modifiées via les effets d’une entrée timeline, d’un bouton...) — utilise le bouton variable pour insérer {item:<nom du champ>}.',
    conversationsHelp:
      'Un vrai module de conversation (comme Messages/Pixly) — liste de discussions, ouverture d’un fil, réponses par choix. Les messages sont envoyés depuis la timeline. Les groupes viennent de l’onglet Threads du projet (même contacts/groupes que les DM natifs) — rien à configurer ici pour ça.',
    showAvatarLabel: 'Afficher l’avatar du contact',
    nameFieldName: 'Nom',
    nameFieldPseudo: 'Pseudo (@...)',
  },

  colorField: {
    defaultLabel: 'Couleur',
  },

  variablePicker: {
    tooltip: 'Insérer une variable',
    widgetsTitle: 'Données du téléphone',
    tokens: {
      playerName: 'Nom du joueur',
      battery: 'Batterie (%)',
      steps: 'Pas (podomètre)',
      stepsGoal: 'Objectif de pas',
      weather: 'Température',
      itemName: 'Nom du contact',
      itemHandle: 'Pseudo affiché (@pseudo ou nom)',
      itemPseudo: 'Pseudo brut',
      itemFollowers: 'Nombre d’abonnés',
      itemFollowing: 'Nombre d’abonnements',
      itemColor: 'Couleur (code hex)',
      itemKey: 'Clé de l’élément',
      itemValue: 'Valeur de l’élément',
    },
    entitiesTitle: 'Entités (schémas)',
    entitiesHint:
      '"*" = 1ère/seule instance — remplace par un id précis si le schéma en a plusieurs',
    flagsTitle: 'Flags du projet',
    noFlags: 'Aucun flag dans ce projet pour l’instant.',
    itemTitle: 'Contact (bloc liste)',
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
    collectionsTitle: 'Collections',
    collectionsHelp:
      'Vérifie une collection (flag qui stocke une liste clé→valeur) — sa taille, et/ou si elle contient une clé précise. Les deux sont indépendantes, cochables ensemble.',
    noCollectionCondition: 'Aucune condition de collection.',
    sizeConditionLabel: 'Taille',
    hasConditionLabel: 'Contient la clé',
    itemKeyLabel: 'Clé',
    addCollectionCondition: 'Ajouter une condition de collection',
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
    collectionsTitle: 'Collections',
    collectionsHelp:
      'Une collection est un flag qui stocke une liste clé→valeur (texte ou nombre) au lieu d’un simple nombre — pratique pour un historique, un inventaire... Affichable via un bloc Liste (source "Collection").',
    noCollectionChange: 'Aucune collection modifiée.',
    modeAdd: 'ajouter un élément',
    modeRemove: 'retirer un élément',
    modeIncrement: 'incrémenter un nombre',
    itemKeyLabel: 'Clé (optionnel)',
    itemKeyAutoHint:
      'Vide = clé générée automatiquement (pratique pour un historique qui s’empile)',
    itemKeyRequiredHint: 'Requis — c’est la clé du compteur à incrémenter/décrémenter.',
    deltaLabel: 'Variation (+/-)',
    valueLabel: 'Valeur',
    valueTypeText: 'Texte',
    valueTypeNumber: 'Nombre',
    addCollectionChange: 'Ajouter un changement de collection',
    entitiesTitle: 'Entités',
    entitiesHelp:
      'Crée/modifie/supprime une instance d’un schéma (défini dans l’onglet Schémas) — plusieurs champs typés par instance, contrairement à une collection. Affichable via un bloc Liste (source "Entités").',
    noEntityChange: 'Aucune entité modifiée.',
    schemaLabel: 'Schéma',
    entityIdLabel: 'Identifiant (optionnel)',
    entityIdAutoHint: 'Vide = identifiant généré automatiquement',
    modeSet: 'créer / modifier',
    modeRemoveEntity: 'supprimer',
    addEntityChange: 'Ajouter un changement d’entité',
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

  editorSettings: {
    title: 'Réglages',
    languageLabel: "Langue de l'éditeur",
    autosaveLabel: 'Sauvegarde',
    projectLabel: 'Projet',
  },

  globalSearch: {
    placeholder: 'Chercher un chapitre, contact, flag, app custom…',
    hint: 'Tape pour chercher dans tout le projet.',
    noResults: 'Aucun résultat.',
    truncated: '{n}+ résultats, affine ta recherche pour voir le reste.',
  },

  debugPanel: {
    toggleTooltip: 'Panneau debug — forcer des flags sans rejouer',
    title: 'Debug / QA',
    hint: 'Force une valeur pour tester une branche sans rejouer depuis le début. Remis à zéro par "Relancer l\'aperçu".',
    empty: 'Aucun flag dans ce projet pour l’instant.',
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
    creditsTitle: 'Crédits',
    creditsHelp:
      'Texte libre affiché sur bouton depuis l\'écran de fin ("Voir les crédits") — un seul bloc de crédits pour tout le jeu, quelle que soit la fin obtenue.',
    creditsLabel: 'Crédits (texte libre, multi-lignes)',
    entryChapterTitle: 'Chapitre de départ',
    entryChapterHelp:
      'Le chapitre par lequel le jeu commence. Renommer ce chapitre garde ce réglage à jour automatiquement.',
    entryChapterLabel: 'Chapitre de départ',
    entryChapterDefault: 'Premier chapitre (par défaut)',
    buildIconTitle: 'Icône du build',
    buildIconHelp:
      "Icône du fichier .exe exporté. Format .ico recommandé pour l'icône Windows (Explorateur/barre des tâches) — un .png fonctionne aussi mais ne donnera que l'icône de la fenêtre pendant l'exécution, pas celle du fichier .exe lui-même.",
    buildIconLabel: 'Icône (.ico recommandé, .png accepté)',
    wallpaperTitle: "Fond d'écran du téléphone",
    wallpaperLabel: "Fond d'écran (accueil)",
    lockWallpaperLabel: "Fond d'écran (verrouillage — vide = reprend celui de l'accueil)",
    accentColorTitle: "Couleur d'interface",
    accentColorHelp:
      "Recolore les éléments d'accent du téléphone (bulles de message envoyées, DM, égaliseur...). Laisse vide pour garder la couleur par défaut du moteur.",
    accentColorDefault: 'Par défaut (#4c8bf5)',
    caseColorLabel: 'Couleur de la coque',
    caseColorHelp:
      "Couleur du contour du téléphone (visible sur grand écran — masquée sur un vrai mobile, où le jeu remplit l'écran sans coque).",
    caseColorDefault: 'Par défaut (#0b0b12)',
    brandingTitle: 'Marque du téléphone',
    brandingHelp:
      "Nom du système fictif du téléphone (écran de démarrage, Réglages > Informations) et nom de l'app de réseau social — purement cosmétique.",
    osNameLabel: 'Nom du système (OS)',
    osNameDefault: 'PhoneOS',
    socialAppNameLabel: "Nom de l'app réseau social",
    socialAppNameDefault: 'Pixly',
    matureContentTitle: 'Contenu adulte',
    matureContentHelp:
      "Affiche un écran d'avertissement 18+ avant même l'animation de démarrage du téléphone — le joueur doit confirmer son âge pour continuer. Utilise les traductions du jeu compilé (pas celles de l'éditeur).",
    matureContentLabel: 'Avertir avant de lancer (contenu réservé aux adultes)',
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

  cloudSyncPanel: {
    title: 'Cloud',
    help: 'Sauvegarde/restaure ce projet vers un compte cloud (Google Drive, OneDrive, Dropbox, ou un autre fournisseur en mode avancé) via rclone. Manuelle par défaut, ou automatique toutes les 5 min via le toggle ci-dessous.',
    forceSyncTooltip: 'Forcer la synchro cloud maintenant',
    configureInSettings: "Configure d'abord un compte cloud dans Réglages",
    checking: 'Vérification de rclone…',
    notInstalled: "rclone n'est pas encore installé sur cette machine.",
    installBtn: 'Installer rclone',
    installing: 'Installation en cours…',
    installStageDownload: 'Téléchargement de rclone…',
    installStageExtract: 'Extraction…',
    connectTitle: 'Connecter un compte',
    connectGdrive: 'Google Drive',
    connectOnedrive: 'OneDrive',
    connectDropbox: 'Dropbox',
    advancedLink: 'Autre fournisseur (avancé)',
    advancedDialogTitle: 'Connecter un autre fournisseur',
    advancedSearchLabel: 'Rechercher un fournisseur',
    advancedNameLabel: 'Nom de la connexion',
    advancedMoreOptions: 'Options avancées ({count})',
    advancedConnectBtn: 'Connecter',
    remoteLabel: 'Compte connecté',
    remotePathLabel: 'Dossier distant',
    pushBtn: 'Sauvegarder dans le cloud',
    pullBtn: 'Restaurer depuis le cloud',
    pullConfirmTitle: 'Restaurer depuis le cloud ?',
    pullConfirmBody:
      'Ceci va écraser les modifications locales de ce projet par la version sauvegardée dans le cloud. Continuer ?',
    disconnectTooltip: 'Déconnecter ce compte',
    disconnectConfirmTitle: 'Déconnecter "{name}" ?',
    disconnectConfirmBody:
      "Le projet ne pourra plus se synchroniser avec ce compte tant qu'il n'est pas reconnecté.",
    syncingPush: 'Sauvegarde en cours…',
    syncingPull: 'Restauration en cours…',
    syncSuccess: 'Synchronisation terminée.',
    syncError: 'Échec de la synchronisation.',
    noRemote: 'Connecte un compte pour activer la sauvegarde cloud.',
    filesTransferred: '{done} / {total} fichiers',
    connectError: 'Connexion échouée.',
    remoteConnected: 'Compte connecté.',
    remoteDisconnected: 'Compte déconnecté.',
    loadFromCloudBtn: 'Charger depuis le cloud',
    loadDialogTitle: 'Charger un projet depuis le cloud',
    pickRemoteHint: 'Choisis un compte déjà connecté, ou connecte-en un nouveau.',
    loadingRemoteProjects: 'Recherche des projets…',
    noRemoteProjects: 'Aucun projet trouvé à cet emplacement.',
    downloadingProject: 'Téléchargement du projet…',
    oneAccountLimit: 'Un seul compte à la fois — déconnecte celui-ci pour en changer.',
    purgeConfirmTitle: 'Supprimer aussi les données cloud ?',
    purgeConfirmBody:
      'Le dossier "{path}" sera définitivement supprimé sur ce compte. Cette action est irréversible.',
    purgeKeep: 'Garder les données',
    purgeDelete: 'Tout supprimer',
    neverSynced: 'Jamais synchronisé.',
    lastSyncedAt: 'Dernière synchro : {date} (depuis {device})',
    autoSyncLabel: 'Sauvegarde auto (cloud, toutes les 5 min)',
  },

  flagsPanel: {
    intro:
      "Tous les flags utilisés quelque part dans le projet (chapitres, flèches du graphe, choix, events) — donne un libellé à chacun pour t'y retrouver dans les conditions/effets. Pour un flag numérique, la plage affichée est la valeur la plus basse et la plus haute qu'il peut réellement atteindre en jouant l'histoire (en tenant compte des choix) — pas la simple liste des deltas tapés un par un. Optimiste : elle suppose que chaque branche qui modifie ce flag est atteignable, sans vérifier les autres conditions qui pourraient bloquer l'accès à une branche donnée.",
    empty:
      "Aucun flag utilisé pour l'instant — un flag apparaît ici dès qu'il est référencé dans une condition ou un effet (RequiresBuilder/EffectsBuilder, n'importe où dans le projet).",
    deleteUnusedOne: 'Supprimer le flag inutilisé',
    deleteUnusedMany: 'Supprimer les {n} flags inutilisés',
    boolean: 'booléen',
    collection: 'collection',
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
    readyHint:
      'Scanne ce code depuis ton téléphone (même réseau Wi-Fi), ou rends-toi sur ce lien :',
    firewallHint:
      "Si Windows demande d'autoriser l'accès réseau, clique sur Autoriser (réseaux privés).",
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
    groupContactNames: 'Noms des contacts',
    groupContactBios: 'Bios des contacts',
    groupGroupNames: 'Noms de groupes',
    groupApp: 'App : {name}',
    groupSeedMessages: 'Messages (contenu initial)',
    groupSeedDms: 'DM (contenu initial)',
    groupSeedPosts: 'Posts (contenu initial)',
    groupSeedReels: 'Reels (contenu initial)',
    groupSeedPhotos: 'Photos (contenu initial)',
    groupChapterTitles: 'Titres de chapitres',
    groupFlagLabels: 'Libellés de flags',
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
    'button.pressed': {
      label: 'Bouton pressé (app custom)',
      fields: { app: { label: 'Application' }, buttonId: { label: 'Bouton (id)' } },
    },
    'interaction.won': {
      label: 'Interaction gagnée',
      fields: { interactionId: { label: 'Interaction' } },
    },
    'interaction.lost': {
      label: 'Interaction perdue',
      fields: { interactionId: { label: 'Interaction' } },
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
