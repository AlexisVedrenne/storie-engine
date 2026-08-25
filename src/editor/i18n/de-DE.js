// German — kept in lockstep key-for-key with fr-FR.js; a missing key here
// silently falls back to French (see src/editor/i18n/index.js), so an
// untranslated key is visible (shows up in French while the rest of the UI
// is German) rather than blank.
export default {
  common: {
    cancel: 'Abbrechen',
    create: 'Erstellen',
    close: 'Schließen',
    delete: 'Löschen',
    save: 'Speichern',
    add: 'Hinzufügen',
  },

  editorPage: {
    noProject: 'Kein Projekt geladen — Weiterleitung…',
    untitledProject: '(Projekt)',
    unsavedTooltip: 'Nicht gespeicherte Änderungen',
    tabChapters: 'Kapitel',
    tabEvents: 'Ereignisse — Reaktionen auf Spieleraktionen (außerhalb der Timeline)',
    tabInteractions: 'Interaktionen — selbst erstellte Handy-Gesten, aus der Timeline aufrufbar',
    tabApps: 'Apps — Handy-Anwendungen aus visuellen Blöcken',
    tabContacts: 'Kontakte',
    tabThreads: 'Gruppen',
    tabGame: 'Spiel',
    tabAssets: 'Assets',
    tabI18n: 'Übersetzungen',
    tabSeed: 'Ausgangsinhalte',
    showEditing: 'Bearbeitung anzeigen',
    previewOnly: 'Nur Vorschau',
    autosaveLabel: 'Automatisches Speichern (lokal)',
    restartPreviewTooltip: 'Vorschau neu starten',
    validateTooltip:
      'Projekt validieren — sucht nach defekten Referenzen (fehlender Kontakt/Thread/Bild) und Kapitelproblemen',
    globalSearchTooltip: 'Globale Suche (Strg+K)',
    undoTooltip: 'Rückgängig (Strg+Z)',
    redoTooltip: 'Wiederholen (Strg+Umschalt+Z)',
    undoTargetGone: 'Rückgängig nicht möglich: Dieses Element wurde inzwischen gelöscht.',
    saveBtn: 'Speichern',
    buildTooltip:
      'Erstellen — dieses Projekt als spielbares Spiel exportieren (Desktop und/oder Android)',
    webPreviewTooltip: 'Web-Vorschau — auf deinem Handy per WLAN testen',
    switchProjectTooltip: 'Projekt wechseln',
    backToGraphTooltip: 'Zurück zum Graphen',
    chapterTitleLabel: 'Titel',
    chapterRenamed: 'Kapitel umbenannt — ID aktualisiert.',
    previewFromChapterTooltip: 'Vorschau ab diesem Kapitel',
    flagsTooltip: 'Flags — Katalog aller im Projekt verwendeten Spielerwerte',
    gameEmptyState: 'Der Spieltitel ist ein einzelnes Feld — keine Liste.',
    eventsEmptyState: 'Wähle links ein Ereignis aus oder erstelle eines.',
    interactionsEmptyState: 'Wähle links eine Interaktion aus oder erstelle eine.',
    appsEmptyState: 'Wähle links eine App aus oder erstelle eine.',
    contactsEmptyState: 'Wähle links einen Kontakt aus.',
    threadsEmptyState: 'Wähle links einen Thread aus.',
    i18nEmptyState: 'Wähle links eine Sprache aus.',
    previewExitHint: 'Vorschau — klicke, um zur Bearbeitung zurückzukehren',
    flagsDialogTitle: 'Projekt-Flags',
    saved: 'Gespeichert.',
    missingAssetError: 'Datei nicht in assets/ gefunden: "{path}" (referenziert von {labels})',
    validationTitle: 'Projektvalidierung',
    validationNone: 'Keine Probleme gefunden.',
    validationErrorsHeader: 'FEHLER ({n}):',
    validationWarningsHeader: 'WARNUNGEN ({n}):',
    buildCancelled: 'Erstellung abgebrochen — behebe zuerst die Validierungsfehler.',
    warningsDialogTitle: 'Validierungswarnungen',
    warningsDialogMessage: '{n} Warnung(en) gefunden:\n\n{list}\n\nTrotzdem erstellen?',
    versionDialogTitle: 'Build-Version',
    versionDialogMessage: 'Aktuelle Version: {version}',
    versionNone: 'Neu erstellen — keine Versionserhöhung',
    versionPatch: 'Normale Version (Patch)',
    versionMinor: 'Kleine Version (Minor)',
    versionMajor: 'Große Version (Major)',
    buildTargetWin: 'Windows (x64)',
    buildTargetMacIntel: 'macOS (Intel)',
    buildTargetMacArm: 'macOS (Apple Silicon)',
    buildTargetLinux: 'Linux (x64)',
    androidToolchainInstallOk: 'Installieren',
    androidStageJdkDownload: 'JDK wird heruntergeladen… {percent}%',
    androidStageJdkExtract: 'JDK wird entpackt…',
    androidStageSdkDownload: 'Android SDK wird heruntergeladen… {percent}%',
    androidStageSdkExtract: 'Android SDK wird entpackt…',
    androidStageSdkLicenses: 'Lizenzen werden akzeptiert…',
    androidStageSdkPackages: 'SDK-Pakete werden installiert…',
    androidStageDone: 'Toolchain bereit.',
    moreActionsTooltip: 'Weitere Aktionen',
    validateLabel: 'Validieren',
    buildLabel: 'Erstellen',
    webPreviewLabel: 'Web-Vorschau',
    navMenuTooltip: 'Navigation',
    navLabelEvents: 'Ereignisse',
    navLabelInteractions: 'Interaktionen',
    navLabelApps: 'Apps',
  },

  buildStepper: {
    stepVersionTitle: 'Version',
    stepDistributionTitle: 'Verteilung',
    stepBuildTitle: 'Erstellung',
    continue: 'Weiter',
    back: 'Zurück',
    startBuild: 'Erstellung starten',
    buildTargetAndroid: 'Android (.apk)',
    toolchainChecking: 'Android-Toolchain wird geprüft…',
    toolchainReady: 'Android-Toolchain bereit.',
    toolchainMissing:
      'Android-Toolchain fehlt (JDK + SDK, ca. 700 MB, einmalig, Internet erforderlich).',
    buildCancelled: 'Export abgebrochen.',
    buildingGeneric: 'Wird erstellt…',
  },

  chapterGraph: {
    newChapter: 'Neues Kapitel',
    visitedTooltip: 'In dieser Vorschau bereits besucht',
    titleLabel: 'Titel',
    edgeLabelField: 'Beschriftung (optional)',
    edgeLabelHint:
      'Wird auf dem Pfeil anstelle der Bedingung angezeigt. Leer = unverändertes Verhalten.',
    edgeConditionTitle: 'Bedingung für diesen Pfeil',
    deleteEdge: 'Diesen Pfeil löschen',
    confirmDeleteTitle: 'Dieses Kapitel löschen?',
    confirmDeleteMessage:
      '"{title}" wird von der Festplatte gelöscht. Dies kann nicht rückgängig gemacht werden.',
    deletedNoEdges: 'Kapitel gelöscht.',
    deletedWithEdgesOne: 'Kapitel gelöscht (1 verwaister Pfeil entfernt).',
    deletedWithEdgesMany: 'Kapitel gelöscht ({n} verwaiste Pfeile entfernt).',
    chapterCreated: 'Kapitel erstellt.',
    endingBadge: 'ENDE',
    duplicate: 'Duplizieren',
  },

  chapterEndScreen: {
    title: 'Abspann-Bildschirm',
    help: 'Dieses Kapitel hat keine Fortsetzung — hier den dem Spieler gezeigten Bildschirm anpassen, oder leer lassen für den Standardbildschirm.',
    titleLabel: 'Titel',
    textLabel: 'Text (optional)',
    imageLabel: 'Bild (optional)',
  },

  timelineEditor: {
    selectedOne: '1 Eintrag ausgewählt',
    selectedMany: '{n} Einträge ausgewählt',
    groupSelection: 'Zu Akkordeon gruppieren',
    entriesCount: '{n} Einträge',
    ungroup: 'Gruppe auflösen',
    addEntry: 'Eintrag hinzufügen…',
    notAdjacent:
      'Diese Einträge müssen nebeneinander liegen, um eine Gruppe zu bilden — ordne sie zuerst neu an.',
    newGroup: 'Neue Gruppe',
    group: 'Gruppe',
    emptyPrompt: '(leere Frage)',
    linesCount: '{n} Zeilen',
    vfxStopSummary: 'Beendet den aktuellen Effekt',
    vfxUntilStopped: 'bis er manuell gestoppt wird',
    musicStopSummary: 'Beendet die aktuelle Musik',
    interactionBlocking: 'blockiert die Timeline',
    interactionParallel: 'parallel',
    types: {
      message: {
        label: 'Nachricht (SMS)',
        help: 'Eine von diesem Kontakt empfangene SMS — erscheint in Nachrichten.',
      },
      choice: {
        label: 'Auswahl',
        help: 'Blockiert das Gespräch und bietet dem Spieler eine Antwortauswahl.',
      },
      post: { label: 'Beitrag', help: 'Ein Beitrag im Pixly-Feed (wie ein Instagram-Post).' },
      photo: { label: 'Foto', help: 'Ein Foto, das der Galerie des Handys hinzugefügt wird.' },
      story: { label: 'Story', help: 'Eine flüchtige Pixly-Story (Kreis oben im Feed).' },
      dm: {
        label: 'Pixly-DM',
        help: 'Eine private Instagram-Nachricht — erscheint in einer DM-Unterhaltung, nicht in Nachrichten.',
      },
      appDm: {
        label: 'Unterhaltung (eigene App)',
        help: 'Eine Nachricht im Unterhaltungsblock einer eigenen App — wähle im Formular App und Kontakt/Gruppe aus.',
      },
      reel: { label: 'Reel', help: 'Ein Reel im vertikalen Video-Tab von Pixly.' },
      call: { label: 'Anruf', help: 'Ein eingehender Anruf mit ablaufendem Dialogskript.' },
      effect: {
        label: 'Effekt',
        help: 'Ändert den Spielzustand (Werte, Wetter, Akku...), ohne dem Spieler etwas anzuzeigen.',
      },
      vfx: {
        label: 'Visueller Effekt (VFX)',
        help: 'Ein Vollbild-Effekt auf dem Handy (Glitch, Rauschen, Bildstörung, Wackeln, Sprung im Display, Blackout) — rein optisch, blockiert die Timeline nie. Kann sich nach einer Dauer selbst beenden oder eingeschaltet bleiben, bis ein späterer VFX im Modus „Stopp" ihn beendet.',
      },
      music: {
        label: 'Musik',
        help: 'Spielt Hintergrundmusik auf dem Handy ab — startet einen Titel (standardmäßig in Dauerschleife) oder stoppt den gerade laufenden. Rein optisch, blockiert die Timeline nie.',
      },
      timeskip: {
        label: 'Zeitsprung',
        help: 'Eine Zeitellipse — sperrt das Handy und stellt Uhrzeit/Datum vor.',
      },
      interaction: {
        label: 'Interaktion',
        help: 'Eine selbst im Tab „Interaktionen" erstellte Geste (ein Kabel einstecken, den Bildschirm wischen...) — Gewinnen/Verlieren löst je nach Einstellung einen anderen Handlungsstrang und ein Ereignis aus, entweder blockierend oder parallel zur Timeline.',
      },
      hallucination: {
        label: 'Halluzination',
        help: 'Ein vorgetäuschtes Gespräch, das der Spieler nur beobachten kann — Nachrichten erscheinen von selbst und verschwinden dann nach einem Glitch-Effekt. Es wird in keine echte Unterhaltung geschrieben.',
      },
      fakeTyping: {
        label: 'Vorgetäuschtes „schreibt..."',
        help: 'Zeigt die „schreibt..."-Punkte in einer SMS- oder DM-Unterhaltung für eine gewählte Dauer — danach kommt nie eine Nachricht an.',
      },
      pause: {
        label: 'Pause',
        help: 'Zeigt nichts an — wartet nur eine gewählte Dauer, bevor es weitergeht.',
      },
    },
  },

  timelineEntryCard: {
    hasCondition: 'Dieser Eintrag hat eine Anzeigebedingung',
    conditionBadge: 'Bedingung',
    moveUp: 'Nach oben verschieben',
    moveDown: 'Nach unten verschieben',
    displayCondition: 'Anzeigebedingung (optional)',
    displayConditionHelp:
      'Zeigt diesen Eintrag nur an, wenn jede Bedingung wahr ist. Nichts hinzugefügt = immer angezeigt.',
    choiceBreadcrumb: 'Auswahl: {prompt}',
  },

  entries: {
    message: {
      fromLabel: 'Von (wer die SMS sendet)',
      textLabel: 'Nachrichtentext',
      textPlaceholder: 'z. B.: Hey! Wie geht es dir?',
      imageLabel: 'Angehängtes Foto (optional)',
      deleteAfterLabel:
        'Automatisch löschen nach (optional — der Spieler kann erneut tippen, um es anzuzeigen)',
    },
    choice: {
      replyTargetLabel: 'Wo landet die Antwort des Spielers?',
      contactLabel: 'Kontakt',
      threadLabel: 'Unterhaltung (Einzel- oder Gruppenchat)',
      promptLabel: 'Frage an den Spieler',
      promptPlaceholder: 'z. B.: Was sagst du?',
      optionsTitle: 'Antwortoptionen',
      optionsHelp:
        'Jede Option wird dem Spieler als Schaltfläche angezeigt. Der gewählte Text wird als Antwort gesendet.',
      optionHeader: 'Option {n}{text}',
      optionEmpty: ' (leerer Text)',
      needsOneOption: 'Eine Auswahl benötigt mindestens eine Option',
      removeOption: 'Diese Option entfernen',
      buttonTextLabel: 'Schaltflächentext',
      buttonTextPlaceholder: 'z. B.: Ok, ich komme',
      tabThen: 'Direkt danach',
      tabEffects: 'Auswirkungen',
      tabRequires: 'Bedingung',
      tabThenHelp:
        'Was direkt nach dieser Auswahl abgespielt wird (z. B. die Antwort des Kontakts) — hier stehen dieselben Eintragstypen wie in der Haupt-Timeline zur Verfügung.',
      tabEffectsHelp:
        'Ändert Werte/Spielzustand, wenn der Spieler diese Option wählt (unabhängig davon, was direkt danach angezeigt wird).',
      tabRequiresHelp:
        'Diese Option wird nur angeboten, wenn hier jede Bedingung wahr ist. Behalte immer mindestens eine Option ohne Bedingung, sonst könnte die Auswahl leer enden.',
      addOption: 'Option hinzufügen',
    },
    post: {
      authorLabel: 'Autor des Beitrags',
      captionLabel: 'Bildunterschrift',
      captionPlaceholder: 'z. B.: letztes Abendlicht ✨',
      idLabel: 'ID (optional — um diesen genauen Beitrag von einem Ereignis aus anzusprechen)',
      idPlaceholder: 'z. B.: strand-post-erwan',
      imageLabel: 'Bild (optional)',
      likesLabel: 'Anzahl der Likes (optional — sonst zufällig)',
    },
    photo: {
      fromLabel: 'Gesendet von',
      imageLabel: 'Bild',
      captionLabel: 'Bildunterschrift (optional)',
      captionPlaceholder: 'z. B.: Der Kaffee von heute Morgen',
    },
    story: {
      characterLabel: 'Figur',
      imageLabel: 'Bild (optional — sonst Emoji auf farbigem Hintergrund)',
      emojiLabel: 'Emoji',
      bgLabel: 'Hintergrundfarbe',
      captionLabel: 'Bildunterschrift (optional)',
      captionPlaceholder: 'z. B.: Sonntagsbrunch',
    },
    dm: {
      threadLabel: 'Instagram-Unterhaltung (Einzel- oder Gruppenchat)',
      fromLabel: 'Von (wer die Nachricht sendet)',
      textLabel: 'Nachrichtentext',
      textPlaceholder: 'z. B.: Das erzähle ich dir lieber privat 😉',
      imageLabel: 'Angehängtes Foto (optional)',
      deleteAfterLabel:
        'Automatisch löschen nach (optional — der Spieler kann erneut tippen, um es anzuzeigen)',
    },
    appDm: {
      appLabel: 'App',
      threadLabel: 'Unterhaltung (Einzel- oder Gruppenchat)',
      fromLabel: 'Von (wer die Nachricht sendet)',
      textLabel: 'Nachrichtentext',
      textPlaceholder: 'z. B.: Das erzähle ich dir lieber privat 😉',
      imageLabel: 'Angehängtes Foto (optional)',
    },
    reel: {
      authorLabel: 'Autor des Reels',
      mediaLabel: 'Medium (Video/Bild)',
      captionLabel: 'Bildunterschrift (optional)',
      captionPlaceholder: 'z. B.: Montagmorgen ☕',
      musicLabel: 'Musik (optional)',
      musicPlaceholder: 'z. B.: Originalton',
    },
    call: {
      contactLabel: 'Wer anruft',
      scriptTitle: 'Anrufskript',
      scriptHelp:
        'Die Zeilen erscheinen nacheinander in Reihenfolge, sobald der Anruf angenommen wird — der Spieler klickt, um das Gespräch fortzusetzen.',
      noLines: 'Keine Zeilen — der Anruf endet ohne Dialog.',
      linePlaceholder: 'Zeilentext',
      removeLine: 'Entfernen',
      addLine: 'Zeile hinzufügen',
    },
    vfx: {
      intro:
        'Löst einen Vollbild-Effekt auf dem Handy aus. Rein optisch — die Timeline läuft sofort weiter, ohne auf das Ende des Effekts zu warten.',
      modeStart: 'Start',
      modeStop: 'Stopp',
      stopHelp:
        'Schaltet den aktuell laufenden visuellen Effekt aus — platziere dies später in der Timeline, um einen Effekt zu beenden, der ohne Dauer laufen gelassen wurde.',
      effectLabel: 'Effekt',
      kinds: {
        glitch: 'Glitch (Farbversatz)',
        static: 'Rauschen (TV-Störung)',
        corrupted: 'Bildstörung (Pixelblöcke)',
        shake: 'Wackeln',
        crack: 'Sprung im Display',
        blackout: 'Blackout (Flackern, dann dunkel)',
      },
      durationLabel: 'Dauer (optional)',
      durationHelp:
        'Leer lassen, damit der Effekt bis zu einem späteren „Stopp"-Eintrag aktiv bleibt.',
    },
    music: {
      intro:
        'Spielt Hintergrundmusik auf dem Handy ab. Rein optisch — die Timeline läuft sofort weiter, ohne zu warten.',
      modeStart: 'Start',
      modeStop: 'Stopp',
      stopHelp:
        'Stoppt die gerade laufende Musik, egal welche — später in der Timeline platzieren, um einen in Dauerschleife gelassenen Titel zu beenden.',
      trackLabel: 'Titel (Audiodatei)',
      titleLabel: 'Angezeigter Titel (optional)',
      titleHelp: 'Wird im Musik-Widget des Startbildschirms angezeigt. Leer = aus dem Dateinamen abgeleitet.',
      loopLabel: 'In Dauerschleife wiederholen',
      volumeLabel: 'Lautstärke des Titels',
      volumeHelp:
        'Eigener Mixpegel dieses Titels — kombiniert sich mit der Musiklautstärke des Spielers (Einstellungen), ersetzt sie nicht.',
      fadeLabel: 'Überblendung (optional)',
      fadeStartHelp:
        'Dauer der Einblendung. Lief bereits Musik, wird sie über dieselbe Dauer ausgeblendet, statt abrupt zu stoppen.',
      fadeStopHelp: 'Dauer der Ausblendung vor dem vollständigen Stopp.',
    },
    timeskip: {
      intro: 'Sperrt das Handy und lässt Uhrzeit/Datum auf einmal vorspringen.',
      clockLabel: 'Uhrzeit (optional)',
      dateLabel: 'Datum (optional)',
      labelLabel: 'Nachricht (optional)',
      labelPlaceholder: 'z. B.: Am nächsten Tag',
      labelHelp:
        'Wird standardmäßig auf dem Sperrbildschirm angezeigt. Ist unten eine App gewählt, blendet sie sich stattdessen oben auf dieser App ein, sobald sie erreicht ist, und wieder aus.',
      blockingLabel: 'Blockiert die Timeline bis zur Entsperrung',
      blockingHelp:
        'An (Standard): Die Geschichte wartet, bis der Spieler entsperrt, bevor es weitergeht — ein sauberer Schnitt. Aus: Der Rest läuft hinter dem Sperrbildschirm weiter (Nachrichten/DMs/Anrufe stapeln sich weiter normal auf), wie ein echtes Handy in der Hosentasche.',
      blockingLandAppHelp:
        'Hier ohne Wirkung: Eine unten gewählte App überspringt den Sperrbildschirm komplett, sodass die Geschichte sofort weitergeht.',
      landAppLabel: 'Beim Entsperren eine App öffnen (optional)',
      landAppHelp:
        'Ohne diese Einstellung landet der Spieler wie üblich über den Sperrbildschirm auf dem Homescreen. Mit ihr landet er direkt auf der gewählten App, ohne den Sperrbildschirm zu sehen.',
      landThreadLabel: 'Eine bestimmte Unterhaltung öffnen (optional)',
      landThreadHelp: 'Andernfalls landet der Spieler auf der eigenen Thread-Liste der App.',
    },
    interaction: {
      pickLabel: 'Interaktion',
      blockingLabel: 'Verhalten',
      blockingOn: 'Blockiert die Timeline',
      blockingOff: 'Parallel',
      blockingOnHelp:
        'Die Geschichte wartet auf das Ergebnis (gewonnen/verloren), bevor es weitergeht — wie eine Auswahl oder ein Anruf.',
      blockingOffHelp:
        'Die Timeline läuft sofort weiter, die Interaktion bleibt auf dem Bildschirm spielbar — ihr Ergebnis erreicht die Geschichte nur über ihre eigenen Verzweigungen und das passende Ereignis (interaction.won / interaction.lost), nicht durch Blockieren des Weiteren.',
      branchesTitle: 'Ergebnis',
      winLabel: 'Gewonnen',
      loseLabel: 'Verloren',
      noneAuthoredHelp:
        'Noch keine Interaktion erstellt — erstelle eine im Tab „Interaktionen" und rufe sie dann hier auf.',
      stepsCount: '{n} Schritte',
    },
    hallucination: {
      intro:
        'Ein vorgetäuschtes Gespräch, das über dem aktuellen Bildschirm angezeigt wird, Nachricht für Nachricht, und dann mit einem Glitch-Effekt ausgeblendet wird — der Spieler kann weder antworten noch es danach wiederfinden, es wird in keine echte Unterhaltung geschrieben.',
      messagesTitle: 'Nachrichten',
      messagesHelp:
        'Werden nacheinander in Reihenfolge angezeigt, mit demselben „schreibt..."-Timing wie eine SMS.',
      noMessages: 'Keine Nachrichten — die Halluzination wird leer sein.',
      messagePlaceholder: 'Nachrichtentext',
      removeMessage: 'Entfernen',
      addMessage: 'Nachricht hinzufügen',
      enterEffectLabel: 'Einblendeffekt',
      exitEffectLabel: 'Ausblendeffekt',
      blockingLabel: 'Blockiert die Timeline bis zum Ende',
      blockingHelp:
        'An (Standard): Die Geschichte wartet, bis die Halluzination endet, bevor es weitergeht. Aus: Der Rest läuft währenddessen weiter, die Halluzination bleibt gleichzeitig sichtbar.',
    },
    fakeTyping: {
      intro:
        'Zeigt die „schreibt..."-Punkte einer Unterhaltung, ohne dass danach je eine Nachricht ankommt — rein optisch, die Timeline läuft sofort weiter.',
      modeSms: 'SMS',
      modeDm: 'Pixly-DM',
      contactLabel: 'Kontakt (SMS)',
      threadLabel: 'Unterhaltung (Einzel- oder Gruppenchat)',
      fromLabel: 'Wer „schreibt"',
      durationLabel: 'Dauer',
    },
    pause: {
      intro: 'Eine Stille — nichts passiert, die Timeline wartet nur, bevor es weitergeht.',
      durationLabel: 'Dauer',
    },
  },

  interactionList: {
    empty: 'Noch keine Interaktion erstellt.',
    stepsCount: '{n} Schritte',
    newInteraction: 'Neue Interaktion',
    idLabel: 'ID',
    nameLabel: 'Name',
    idTaken: 'Diese ID wird bereits verwendet.',
  },

  interactionDefForm: {
    identityTitle: 'Identität',
    nameLabel: 'Name',
    backgroundTitle: 'Hintergrund',
    backgroundHelp:
      'Hintergrundbild für die gesamte Interaktion (optional) — z. B. ein Foto der Handyunterseite für „Kabel einstecken" oder ein staubbedeckter Bildschirm.',
    backgroundLabel: 'Hintergrundbild',
    stepsTitle: 'Schritte',
    stepsHelp:
      'Der Spieler muss jeden Schritt der Reihe nach abschließen, damit die Interaktion gewonnen wird — läuft das Zeitlimit eines Schritts ab, schlägt er fehl.',
  },

  stepsEditor: {
    empty: 'Noch keine Schritte — füge mindestens einen hinzu.',
    stepHeader: 'Schritt {n} — {kind}',
    kindLabel: 'Gestentyp',
    textLabel: 'Angezeigter Text',
    imageLabel: 'Bild (eigenes Asset — hat Vorrang vor dem Symbol)',
    iconLabel: 'Symbol (optional, falls kein Bild)',
    iconHelp:
      'Name eines Material-Symbols (z. B. power, cleaning_services) — wird ignoriert, wenn oben ein Bild gewählt wurde.',
    timeLimitLabel: 'Zeitlimit (optional)',
    timeLimitHelp:
      'Nach Ablauf dieser Frist schlägt die gesamte Interaktion fehl. Leer lassen für kein Limit bei diesem Schritt.',
    zoneLabel: 'Bereich',
    fromLabel: 'Von',
    toLabel: 'Bis',
    directionLabel: 'Richtung',
    directions: {
      up: 'Nach oben',
      down: 'Nach unten',
      left: 'Nach links',
      right: 'Nach rechts',
    },
    durationLabel: 'Dauer',
    digitsLabel: 'Erwarteter Code',
    digitsHelp: 'Nur Ziffern, z. B. 1234.',
    addStep: 'Schritt hinzufügen',
  },

  stepKinds: {
    tap: { label: 'Tippen' },
    hold: { label: 'Halten' },
    swipe: { label: 'Wischen' },
    drag: { label: 'Ziehen' },
    wipe: { label: 'Wischen / Reiben' },
    code: { label: 'Zahlencode' },
    wait: { label: 'Warten (keine Eingabe)' },
  },

  zonePicker: {
    anywhere: 'Überall',
    zones: {
      topLeft: 'Oben links',
      top: 'Oben',
      topRight: 'Oben rechts',
      left: 'Links',
      center: 'Mitte',
      right: 'Rechts',
      bottomLeft: 'Unten links',
      bottom: 'Unten',
      bottomRight: 'Unten rechts',
    },
  },

  customAppList: {
    empty: 'Noch keine App erstellt.',
    newApp: 'Neue App',
    import: 'Importieren (.zip)',
    export: 'Exportieren',
    idLabel: 'ID',
    labelLabel: 'Name',
    confirmDeleteTitle: 'Diese App löschen?',
    confirmDeleteMessage:
      '"{name}" wird von der Festplatte gelöscht. Diese Aktion ist unwiderruflich.',
    appDeleted: 'App gelöscht.',
    exported: 'App exportiert (.zip).',
    imported: 'App importiert.',
  },

  customAppEditor: {
    identityTitle: 'Identität',
    labelLabel: 'Name',
    iconLabel: 'Symbol (Homescreen)',
    iconHelp:
      'Name eines Material-Symbols — wird auf dem Homescreen angezeigt, unabhängig von Symbolen innerhalb der Blöcke.',
    screensTitle: 'Bildschirme',
    screenLabelLabel: 'Bildschirmname',
    addScreen: 'Bildschirm hinzufügen',
    screenBackgroundLabel: 'Hintergrund (optional)',
  },

  blockBuilder: {
    empty: 'Noch keine Blöcke — ziehe einen aus der Palette oben hierher.',
    duplicate: 'Duplizieren',
  },

  blockPresets: {
    'profile-header': { label: 'Profilkopf' },
    'stat-row': { label: 'Wertezeile' },
    'settings-section': { label: 'Einstellungsbereich' },
    'call-to-action': { label: 'Handlungsaufforderung' },
  },

  blockKinds: {
    header: { label: 'Kopfbereich' },
    text: { label: 'Text' },
    image: { label: 'Bild' },
    avatar: { label: 'Avatar' },
    row: { label: 'Zeile' },
    card: { label: 'Karte' },
    layout: { label: 'Layout (Zeile/Spalte)' },
    badge: { label: 'Abzeichen' },
    divider: { label: 'Trennlinie' },
    button: { label: 'Schaltfläche' },
    tabs: { label: 'Tabs' },
    list: { label: 'Liste (Kontakte)' },
    conversations: { label: 'Unterhaltung' },
  },

  blockProps: {
    titleLabel: 'Titel',
    iconLabel: 'Symbol',
    styleTitle: 'Titel',
    styleBody: 'Absatz',
    contentLabel: 'Inhalt',
    imageLabel: 'Bild',
    fullBleedLabel: 'Randlos (volle Breite)',
    fullBleedHelp:
      'Ignoriert den eigenen seitlichen Rand des Bildschirms — das Bild berührt den linken/rechten Rand. Innerhalb einer Karte/eines Layouts wird es nicht perfekt bündig sein.',
    textColorLabel: 'Textfarbe',
    textSizeLabel: 'Größe (optional)',
    textSizeHelp: 'Leer lassen, um die eigene Größe des gewählten Stils zu behalten.',
    labelLabel: 'Text',
    iconFallbackLabel: 'Symbol (falls kein Bild)',
    iconFallbackHelp:
      'Name eines Material-Symbols, wird nur verwendet, wenn oben kein Bild gewählt wurde.',
    sublabelLabel: 'Untertext (optional)',
    chevronLabel: 'Pfeil (deutet an, dass darauf getippt werden kann)',
    iconColorLabel: 'Symbolfarbe',
    bgColorLabel: 'Hintergrundfarbe (optional)',
    radiusLabel: 'Eckenradius',
    cardHelp: 'Eine Karte fasst andere Blöcke visuell zusammen.',
    layoutHelp:
      'Ordnet andere Blöcke in einer Zeile oder Spalte an, standardmäßig ohne Hintergrund — im Gegensatz zu einer Karte, außer du wählst unten eine Hintergrundfarbe.',
    directionRow: 'Zeile (horizontal)',
    directionColumn: 'Spalte (vertikal)',
    gapLabel: 'Abstand zwischen den Blöcken',
    buttonHelp: 'Rein visuelle Schaltfläche — wähle oben eine Aktion, um sie interaktiv zu machen.',
    actionNone: 'Keine',
    actionEffect: 'Effekt',
    actionNavigateScreen: 'Bildschirm wechseln',
    actionEvent: 'Ereignis',
    actionEffectHelp:
      'Wendet diese Effekte (Flags, Soziales...) bei Tippen an — derselbe Mechanismus wie bei einer Auswahloption.',
    actionNavigateScreenLabel: 'Zielbildschirm',
    actionEventHelp:
      'Löst das Ereignis „Schaltfläche gedrückt" aus — erstelle im Tab „Ereignisse" eine Reaktion, die nach dieser ID filtert, um zu wissen, welche Schaltfläche gedrückt wurde.',
    actionEventButtonIdLabel: 'Schaltflächen-ID (optional)',
    actionEventButtonIdHint:
      'Leer lassen, wenn im Projekt nur eine Schaltfläche dieser Art existiert.',
    tabLabelLabel: 'Tab-Text',
    tabScreenLabel: 'Zielbildschirm',
    addTab: 'Tab hinzufügen',
    spacingTitle: 'Abstand (erweitert)',
    spacingBeforeLabel: 'Abstand davor (optional)',
    spacingAfterLabel: 'Abstand danach (optional)',
    useItemAvatarLabel: 'Avatar des Kontakts verwenden',
    onlyFollowedLabel: 'Nur gefolgte Kontakte',
    listSourceContacts: 'Kontakte',
    listSourceCollection: 'Sammlung (Flag)',
    listHelp:
      'Der untenstehende Inhalt wiederholt sich für jeden Kontakt — nutze die Variablenschaltfläche, um {item:name} in ein Textfeld einzufügen, oder die Checkbox oben bei einem Avatar-Block.',
    listCollectionHelp:
      'Der untenstehende Inhalt wiederholt sich für jedes Element der gewählten Sammlung (befüllt über einen Timeline-Eintrag/Schaltflächeneffekt...) — nutze die Variablenschaltfläche, um {item:key}/{item:value} einzufügen.',
    conversationsHelp:
      'Ein echtes Unterhaltungsmodul (wie Nachrichten/Pixly) — Thread-Liste, Öffnen eines Threads, auswahlgesteuerte Antworten. Nachrichten werden über die Timeline gesendet. Gruppen stammen aus dem Tab „Gruppen" des Projekts (dieselben Kontakte/Gruppen wie native DMs) — hierfür ist nichts weiter zu konfigurieren.',
    showAvatarLabel: 'Avatar des Kontakts anzeigen',
    nameFieldName: 'Name',
    nameFieldPseudo: 'Pseudonym (@...)',
  },

  colorField: {
    defaultLabel: 'Farbe',
  },

  variablePicker: {
    tooltip: 'Variable einfügen',
    widgetsTitle: 'Handy-Daten',
    tokens: {
      playerName: 'Spielername',
      battery: 'Akku (%)',
      steps: 'Schritte (Schrittzähler)',
      stepsGoal: 'Schrittziel',
      weather: 'Temperatur',
      itemName: 'Kontaktname',
      itemHandle: 'Angezeigter Handle (@Pseudonym oder Name)',
      itemPseudo: 'Rohes Pseudonym',
      itemFollowers: 'Anzahl Follower',
      itemFollowing: 'Anzahl gefolgter Konten',
      itemColor: 'Farbe (Hex-Code)',
      itemKey: 'Element-Schlüssel',
      itemValue: 'Element-Wert',
    },
    flagsTitle: 'Projekt-Flags',
    noFlags: 'In diesem Projekt gibt es noch keine Flags.',
    itemTitle: 'Kontakt (Listenblock)',
  },

  requiresBuilder: {
    addCondition: 'Bedingung hinzufügen',
    intro:
      'Jede untenstehende Bedingung muss wahr sein, damit dieser Inhalt angezeigt wird. Nichts hinzugefügt = immer angezeigt.',
    flagsTitle: 'Spielerwerte (Flags)',
    flagsHelp:
      'Ein Flag ist ein Wert, den sich die Geschichte merkt (eine Zahl, die sich anhäuft, wie Vertrauen, oder ein einmaliges wahr/falsch) — wird an anderer Stelle über einen Effekt gesetzt, hier gelesen, um Inhalte zu variieren.',
    noFlagCondition: 'Keine Wertebedingung.',
    removeCondition: 'Diese Bedingung entfernen',
    conditionLabel: 'Bedingung',
    trueLabel: 'wahr',
    valueLabel: 'Wert',
    addFlagCondition: 'Wertebedingung hinzufügen',
    collectionsTitle: 'Sammlungen',
    collectionsHelp:
      'Prüft eine Sammlung (ein Flag, das eine Schlüssel→Wert-Liste speichert) — ihre Größe und/oder ob sie einen bestimmten Schlüssel enthält. Beide sind unabhängig und können gemeinsam geprüft werden.',
    noCollectionCondition: 'Keine Sammlungsbedingung.',
    sizeConditionLabel: 'Größe',
    hasConditionLabel: 'Enthält Schlüssel',
    itemKeyLabel: 'Schlüssel',
    addCollectionCondition: 'Sammlungsbedingung hinzufügen',
    followingTitle: 'Pixly-Folgen',
    followingHelp:
      'Prüft, ob der Spieler dieser Figur auf Pixly folgt (oder nicht), sobald die Geschichte diesen Eintrag erreicht.',
    noFollowingCondition: 'Keine Folge-Bedingung.',
    playerFollows: 'der Spieler folgt ihr/ihm',
    addFollowingCondition: 'Folge-Bedingung hinzufügen',
    modeBool: 'wahr / falsch',
    modeExact: 'ist genau…',
    modeMin: 'mindestens…',
    modeMax: 'höchstens…',
    modeRange: 'zwischen… und…',
  },

  effectsBuilder: {
    intro:
      'Ändert den Spielzustand, wenn dieser Eintrag abgespielt wird — dem Spieler wird nichts angezeigt, anders als bei einer Nachricht oder Story. Jeder Abschnitt unten ist optional.',
    flagsHelp:
      'Ein Flag ist ein gespeicherter Wert (eine Zahl, die sich anhäuft, oder ein einmaliges wahr/falsch) — später über eine Bedingung (Voraussetzung) wieder auslesbar, um die Geschichte zu variieren.',
    noFlagChange: 'Kein Wert geändert.',
    actionLabel: 'Aktion',
    addFlagChange: 'Zu ändernden Wert hinzufügen',
    collectionsTitle: 'Sammlungen',
    collectionsHelp:
      'Eine Sammlung ist ein Flag, das eine Schlüssel→Wert-Liste (Text oder Zahl) statt einer einfachen Zahl speichert — praktisch für ein Verlaufsprotokoll, ein Inventar... Anzeigbar über einen Listenblock (Quelle „Sammlung").',
    noCollectionChange: 'Keine Sammlung geändert.',
    modeAdd: 'Element hinzufügen',
    modeRemove: 'Element entfernen',
    modeIncrement: 'Zahl erhöhen/verringern',
    itemKeyLabel: 'Schlüssel (optional)',
    itemKeyAutoHint:
      'Leer = automatisch generierter Schlüssel (praktisch für ein sich stets erweiterndes Verlaufsprotokoll)',
    itemKeyRequiredHint: 'Erforderlich — der Schlüssel des zu erhöhenden/verringernden Zählers.',
    deltaLabel: 'Änderung (+/-)',
    valueLabel: 'Wert',
    valueTypeText: 'Text',
    valueTypeNumber: 'Zahl',
    addCollectionChange: 'Sammlungsänderung hinzufügen',
    widgetsTitle: 'Handy-Widgets',
    weatherLabel: 'Wetter',
    weatherCaption: 'Ändert das Wetter-Widget auf dem Homescreen',
    cityLabel: 'Stadt',
    tempLabel: 'Temperatur',
    conditionLabel: 'Bedingung',
    iconLabel: 'Symbol (Emoji)',
    captionLabel: 'Bildunterschrift',
    stepsLabel: 'Schritte',
    stepsCaption: 'Schrittzähler-Widget des Homescreens',
    currentStepsLabel: 'Aktuelle Schritte',
    goalLabel: 'Ziel',
    batteryLabel: 'Akku',
    batteryCaption:
      'Legt den angezeigten Prozentsatz fest — nützlich für narrative Spannung (leerer werdender Akku)',
    batteryPercentLabel: 'Akku %',
    networkLabel: 'Netzwerk',
    networkCaption: 'Signalbalken + WLAN in der Statusleiste',
    signalLabel: 'Balken (0–4)',
    clockLabel: 'Uhr',
    clockCaption:
      'Friert die angezeigte Uhrzeit ein (Sperrbildschirm, Statusleiste) statt der echten Zeit',
    dateLabel: 'Datum',
    dateCaption: 'Friert das angezeigte Datum ein statt des echten Datums',
    socialTitle: 'Soziales Netzwerk (Pixly)',
    socialHelp:
      'Ändert die auf dem Profil einer Figur angezeigte Anzahl von Followern/gefolgten Konten.',
    noSocialChange: 'Keine Follower-Änderung.',
    followersLabel: '+Follower',
    followingLabel: '+Folge ich',
    newFollowersTitle: 'Neue Follower',
    newFollowersHelp:
      'Diese Figuren beginnen, dem Spieler zu folgen — löst eine Benachrichtigung „folgt dir jetzt" aus.',
    noneOption: 'Keine',
    modeDelta: 'addieren/subtrahieren (Zahl)',
    modeTrue: 'auf wahr setzen',
    modeFalse: 'auf falsch setzen',
    clockUnset: 'nicht ändern',
    clockSet: 'festlegen auf…',
    clockClear: 'freigeben (zurück zur echten Zeit)',
  },

  editorSettings: {
    title: 'Einstellungen',
    languageLabel: 'Sprache des Editors',
    autosaveLabel: 'Speichern',
    projectLabel: 'Projekt',
  },

  globalSearch: {
    placeholder: 'Kapitel, Kontakt, Flag, eigene App suchen…',
    hint: 'Tippe, um im gesamten Projekt zu suchen.',
    noResults: 'Keine Ergebnisse.',
    truncated: '{n}+ Ergebnisse, grenze deine Suche ein, um den Rest zu sehen.',
  },

  debugPanel: {
    toggleTooltip: 'Debug-Panel — Flags erzwingen, ohne neu abzuspielen',
    title: 'Debug / QA',
    hint: 'Erzwinge einen Wert, um einen Verzweigungspfad zu testen, ohne von vorn abzuspielen. Wird durch „Vorschau neu starten" zurückgesetzt.',
    empty: 'In diesem Projekt gibt es noch keine Flags.',
  },

  contactList: {
    meLocked: 'Der Kontakt „ich" wird von der Engine benötigt — kann nicht gelöscht werden.',
    newContact: 'Neuer Kontakt',
    idLabel: 'ID',
    nameLabel: 'Name',
    colorLabel: 'Farbe (Hex)',
    deleteImpossibleTitle: 'Löschen nicht möglich',
    stillReferenced: '"{name}" wird noch referenziert:\n\n{refs}',
    confirmDeleteTitle: 'Diesen Kontakt löschen?',
    confirmDeleteMessage:
      '"{name}" wird von der Festplatte gelöscht. Dies kann nicht rückgängig gemacht werden.',
    contactDeleted: 'Kontakt gelöscht.',
    contactCreated: 'Kontakt erstellt.',
  },

  contactForm: {
    identityTitle: 'Identität',
    nameLabel: 'Name',
    colorLabel: 'Farbe (Hex)',
    defaultColor: 'Standard (#999999)',
    resetColor: 'Auf Standardfarbe zurücksetzen',
    bioTitle: 'Bio',
    bioLabel: 'Bio (Pixly-Profil)',
    socialTitle: 'Soziales Netzwerk (Pixly)',
    socialHelp:
      'Steuert die Präsenz dieses Kontakts auf Pixly (dem sozialen Netzwerk des Handys) — unabhängig von SMS/Anrufen, die immer den Namen verwenden.',
    hasSocialLabel: 'Hat ein Pixly-Konto',
    pseudoLabel: 'Handle (ohne @, optional)',
    followersLabel: 'Follower (optional)',
    followingLabel: 'Folgt (optional)',
    followedByDefaultLabel: 'Wird zu Spielbeginn standardmäßig gefolgt',
    imagesTitle: 'Bilder',
    avatarLabel: 'Avatar (Telefon / Nachrichten / Anrufe)',
    socialAvatarLabel: 'Pixly-Avatar (Feed / Stories / DM / Profil)',
  },

  threadList: {
    newThread: 'Neuer Thread',
    newThreadDialogTitle: 'Neuer Thread (Gruppe)',
    groupNameLabel: 'Gruppenname',
    confirmDeleteTitle: 'Diesen Thread löschen?',
    confirmDeleteMessage:
      '"{name}" wird von der Festplatte gelöscht. Dies kann nicht rückgängig gemacht werden.',
    threadDeleted: 'Thread gelöscht.',
    threadCreated: 'Thread erstellt.',
  },

  threadForm: {
    title: 'Gruppenunterhaltung (Pixly-DM)',
    help: 'Einzel-DMs verwenden die Kontakt-ID direkt als Thread, ohne über threads.js zu gehen — nur Gruppen benötigen hier einen Eintrag.',
    participantsLabel: 'Teilnehmer',
  },

  eventList: {
    paneLabel: 'Ereignisse',
    empty: 'Noch keine Ereignisse.',
    addEvent: 'Ereignis hinzufügen',
    common: 'Allgemein',
    noTrigger: '(kein Auslöser)',
  },

  eventForm: {
    intro:
      'Reagiert auf eine Spieleraktion (nicht auf die Timeline eines Kapitels) — eine App öffnen, einen Beitrag liken... Verwendet dieselben Bedingungen/Effekte wie überall sonst.',
    introHelp:
      'Siehe docs/roadmap-modular-apps-events.md — ein Ereignis ist kein zweites erzählerisches System: Seine Konsequenzen (der Tab „Dann") werden von derselben Engine abgespielt wie die Timeline eines Kapitels.',
    titleLabel: 'Titel (optional — um es in der Liste wiederzufinden)',
    whenLabel: 'Wann',
    optionalExistingOrFuture: ' (optional — bestehend oder zukünftig)',
    optionalAny: ' (optional — leer = beliebig)',
    optionalNoMinimum: ' (optional — leer = kein Minimum)',
    typeFuturePhoto: 'Gib den Pfad eines zukünftigen Fotos ein (z. B.: images/erwan/strand.jpg)',
    typeFuturePost: 'Gib die ID eines zukünftigen Beitrags ein (im eigenen ID-Feld festgelegt)',
    tabThen: 'Dann',
    tabThenHelp:
      'Was abgespielt wird, wenn dieses Ereignis ausgelöst wird — dieselben Eintragstypen wie in der Timeline eines Kapitels.',
    tabRequiresHelp:
      'Wird nur ausgelöst, wenn diese Bedingungen im Moment der Spieleraktion wahr sind.',
  },

  gameForm: {
    titleTitle: 'Titel',
    titleFieldLabel: 'Titel (auf dem Sperrbildschirm angezeigt)',
    creditsTitle: 'Credits',
    creditsHelp:
      'Freitext, gezeigt über einen Button auf dem Endbildschirm ("Credits ansehen") — ein einziger Credits-Block für das ganze Spiel, unabhängig vom erreichten Ende.',
    creditsLabel: 'Credits (Freitext, mehrzeilig)',
    entryChapterTitle: 'Startkapitel',
    entryChapterHelp:
      'Das Kapitel, mit dem das Spiel beginnt. Beim Umbenennen dieses Kapitels wird diese Einstellung automatisch synchron gehalten.',
    entryChapterLabel: 'Startkapitel',
    entryChapterDefault: 'Erstes Kapitel (Standard)',
    buildIconTitle: 'Build-Symbol',
    buildIconHelp:
      'Symbol für die exportierte .exe-Datei. .ico wird für das Windows-Symbol empfohlen (Explorer/Taskleiste) — eine .png funktioniert auch, liefert aber nur das Titelleistensymbol des laufenden Fensters, nicht das eigene Symbol der gepackten .exe-Datei.',
    buildIconLabel: 'Symbol (.ico empfohlen, .png akzeptiert)',
    wallpaperTitle: 'Handy-Hintergrundbild',
    wallpaperLabel: 'Hintergrundbild (Homescreen)',
    lockWallpaperLabel: 'Hintergrundbild (Sperrbildschirm — leer = wie Homescreen)',
    accentColorTitle: 'Akzentfarbe',
    accentColorHelp:
      'Färbt die Akzentelemente des Handys um (Blasen gesendeter Nachrichten/DMs, Equalizer...). Leer lassen, um die Standardfarbe der Engine zu behalten.',
    accentColorDefault: 'Standard (#4c8bf5)',
    caseColorLabel: 'Gehäusefarbe',
    caseColorHelp:
      'Farbe des äußeren Rahmens des Handys (sichtbar auf einem großen Bildschirm — auf einem echten Mobilgerät ausgeblendet, wo das Spiel den Bildschirm ohne Gehäuse ausfüllt).',
    caseColorDefault: 'Standard (#0b0b12)',
    brandingTitle: 'Handy-Branding',
    brandingHelp:
      'Name des fiktiven Betriebssystems des Handys (Startbildschirm, Einstellungen > Info) und der App des sozialen Netzwerks — rein kosmetisch.',
    osNameLabel: 'Name des Betriebssystems',
    osNameDefault: 'PhoneOS',
    socialAppNameLabel: 'Name der Social-App',
    socialAppNameDefault: 'Pixly',
    matureContentTitle: 'Inhalt für Erwachsene',
    matureContentHelp:
      'Zeigt vor der eigentlichen Startanimation des Handys einen 18+-Warnbildschirm an — der Spieler muss sein Alter bestätigen, um fortzufahren. Verwendet die eigenen Übersetzungen des kompilierten Spiels (nicht die des Editors).',
    matureContentLabel: 'Vor dem Start warnen (Inhalt nur für Erwachsene)',
    appsTitle: 'Apps',
    appsHelp:
      'Deaktiviert eine Handy-App für dieses Projekt — sie verschwindet vom Homescreen und aus der Startanimation. Nichts erkennt automatisch Inhalte, die noch auf eine deaktivierte App verweisen (z. B. eine SMS, während Nachrichten deaktiviert ist) — das musst du selbst prüfen.',
    soundsTitle: 'Klänge',
    soundsHelp:
      'Ersetzt einen der Standard-UI-Klänge der Engine durch eine Audiodatei aus dem Projekt. Leer lassen, um den Standardklang zu behalten.',
    soundSmsReceive: 'Nachricht empfangen (SMS)',
    soundSmsSend: 'Nachricht gesendet (SMS)',
    soundDmReceive: 'Pixly-DM empfangen',
    soundDmSend: 'Pixly-DM gesendet',
    soundCallRingtone: 'Klingelton',
    soundCallAccept: 'Anruf angenommen',
    soundCallEnd: 'Anruf beendet',
    soundLike: 'Like (Pixly)',
    soundNewFollower: 'Neuer Follower (Pixly)',
    soundStoryTap: 'Story angesehen (Pixly)',
    soundPostShare: 'Beitrag geteilt (Pixly)',
    soundSystemBoot: 'Handy-Start',
    soundSystemUnlock: 'Entsperren',
    soundSystemNotification: 'Benachrichtigung',
    soundLowBattery: 'Akku schwach',
  },

  cloudSyncPanel: {
    title: 'Cloud',
    help: 'Sichert/stellt dieses Projekt über rclone auf einem Cloud-Konto (Google Drive, OneDrive, Dropbox oder einem anderen Anbieter im erweiterten Modus) wieder her. Standardmäßig manuell, oder automatisch alle 5 Minuten über den Schalter unten.',
    forceSyncTooltip: 'Jetzt eine Cloud-Synchronisierung erzwingen',
    configureInSettings: 'Verbinde zuerst ein Cloud-Konto in den Einstellungen',
    checking: 'rclone wird geprüft…',
    notInstalled: 'rclone ist auf diesem Rechner noch nicht installiert.',
    installBtn: 'rclone installieren',
    installing: 'Wird installiert…',
    installStageDownload: 'rclone wird heruntergeladen…',
    installStageExtract: 'Wird entpackt…',
    connectTitle: 'Konto verbinden',
    connectGdrive: 'Google Drive',
    connectOnedrive: 'OneDrive',
    connectDropbox: 'Dropbox',
    advancedLink: 'Anderer Anbieter (erweitert)',
    advancedDialogTitle: 'Anderen Anbieter verbinden',
    advancedSearchLabel: 'Anbieter suchen',
    advancedNameLabel: 'Verbindungsname',
    advancedMoreOptions: 'Erweiterte Optionen ({count})',
    advancedConnectBtn: 'Verbinden',
    remoteLabel: 'Verbundenes Konto',
    remotePathLabel: 'Remote-Ordner',
    pushBtn: 'In der Cloud sichern',
    pullBtn: 'Aus der Cloud wiederherstellen',
    pullConfirmTitle: 'Aus der Cloud wiederherstellen?',
    pullConfirmBody:
      'Dadurch werden die lokalen Änderungen dieses Projekts mit der in der Cloud gespeicherten Version überschrieben. Fortfahren?',
    disconnectTooltip: 'Dieses Konto trennen',
    disconnectConfirmTitle: '"{name}" trennen?',
    disconnectConfirmBody:
      'Das Projekt kann sich erst wieder mit diesem Konto synchronisieren, wenn es erneut verbunden wird.',
    syncingPush: 'Wird gesichert…',
    syncingPull: 'Wird wiederhergestellt…',
    syncSuccess: 'Synchronisierung abgeschlossen.',
    syncError: 'Synchronisierung fehlgeschlagen.',
    noRemote: 'Verbinde ein Konto, um die Cloud-Sicherung zu aktivieren.',
    filesTransferred: '{done} / {total} Dateien',
    connectError: 'Verbindung fehlgeschlagen.',
    remoteConnected: 'Konto verbunden.',
    remoteDisconnected: 'Konto getrennt.',
    loadFromCloudBtn: 'Aus der Cloud laden',
    loadDialogTitle: 'Ein Projekt aus der Cloud laden',
    pickRemoteHint: 'Wähle ein bereits verbundenes Konto oder verbinde ein neues.',
    loadingRemoteProjects: 'Projekte werden gesucht…',
    noRemoteProjects: 'An diesem Ort wurde kein Projekt gefunden.',
    downloadingProject: 'Projekt wird heruntergeladen…',
    oneAccountLimit: 'Nur ein Konto gleichzeitig — trenne dieses, um zu wechseln.',
    purgeConfirmTitle: 'Auch die Cloud-Daten löschen?',
    purgeConfirmBody:
      'Der Ordner "{path}" wird bei diesem Konto endgültig gelöscht. Diese Aktion ist unwiderruflich.',
    purgeKeep: 'Daten behalten',
    purgeDelete: 'Alles löschen',
    neverSynced: 'Nie synchronisiert.',
    lastSyncedAt: 'Zuletzt synchronisiert: {date} (von {device})',
    autoSyncLabel: 'Automatische Sicherung (Cloud, alle 5 Min.)',
  },

  flagsPanel: {
    intro:
      'Jedes im Projekt irgendwo verwendete Flag (Kapitel, Graph-Pfeile, Auswahlmöglichkeiten, Ereignisse) — gib jedem eine Bezeichnung, um in Bedingungen/Effekten den Überblick zu behalten. Bei einem numerischen Flag zeigt der angegebene Bereich den niedrigsten und höchsten Wert, den es beim Durchspielen der Geschichte tatsächlich erreichen kann (unter Berücksichtigung von Auswahlmöglichkeiten) — nicht nur die rohe Liste der einzeln eingegebenen Änderungen. Optimistisch: Es wird angenommen, dass jeder Verzweigungspfad, der dieses Flag ändert, erreichbar ist, ohne andere Bedingungen zu prüfen, die den Zugang zu einer bestimmten Verzweigung blockieren könnten.',
    empty:
      'Noch keine Flags verwendet — ein Flag erscheint hier, sobald es in einer Bedingung oder einem Effekt referenziert wird (RequiresBuilder/EffectsBuilder, irgendwo im Projekt).',
    deleteUnusedOne: 'Ungenutztes Flag löschen',
    deleteUnusedMany: '{n} ungenutzte Flags löschen',
    boolean: 'boolesch',
    collection: 'Sammlung',
    reachable: 'erreichbar: {min} → {max}',
    neverModified: 'gelesen, nie gesetzt',
    neverModifiedTooltip:
      'Eine Bedingung liest dieses Flag irgendwo, aber kein Effekt im gesamten Projekt setzt es jemals.',
    unused: 'ungenutzt',
    usageOne: '1 Verwendung',
    usageMany: '{n} Verwendungen',
    deleteLabelTooltip: 'Diese Bezeichnung löschen — wird im Projekt nicht mehr referenziert',
    labelPlaceholder: 'Bezeichnung (optional) — z. B.: Vertrauen zu Clara',
    confirmDeleteUnusedTitle: 'Ungenutzte Flags löschen?',
    confirmDeleteUnusedOne:
      'Eine Bezeichnung, die im Projekt nicht mehr referenziert wird, wird gelöscht.',
    confirmDeleteUnusedMany:
      '{n} Bezeichnungen, die im Projekt nicht mehr referenziert werden, werden gelöscht.',
  },

  flagNameField: {
    label: 'Flag-Name',
    noOption: 'Tippen, um ein neues Flag zu erstellen',
    numericHint: 'numerisch, erreichbar zwischen {min} und {max}',
    neverModifiedHint: '⚠ gelesen, nie durch einen Effekt gesetzt',
  },

  assetField: {
    defaultLabel: 'Bild',
    defaultSound: 'Standardklang der Engine',
    noFileSelected: 'Keine Datei ausgewählt',
    importTooltip:
      'Importieren… — eine Datei von irgendwo auf der Festplatte nach assets/ kopieren',
    browseTooltip: 'Durchsuchen… — eine bereits in assets/ vorhandene Datei auswählen',
    removeTooltip: 'Entfernen',
    apiUnavailable: 'window.storieAPI nicht verfügbar — im Electron-Modus ausführen.',
  },

  assetTree: {
    paneLabel: 'Ordner',
    newSubfolderTooltip: 'Neuer Unterordner hier',
    newFolder: 'Neuer Ordner',
    inLabel: 'In:',
    folderNameLabel: 'Ordnername',
    folderCreated: 'Ordner erstellt.',
  },

  assetsPanel: {
    countSummary: '{folders} Ordner, {files} Datei(en), insgesamt {orphans} verwaist',
    importFile: 'Datei importieren',
    refreshTooltip: 'Liste von der Festplatte neu laden',
    empty: 'Keine Dateien oder Ordner in assets/.',
    parentFolder: '.. (übergeordneter Ordner)',
    used: 'Verwendet',
    orphan: 'Verwaist',
    deleteUnusedTooltip: 'Diese ungenutzte Datei löschen',
    confirmDeleteTitle: 'Diese Datei löschen?',
    confirmDeleteMessage:
      '"{path}" wird im Projekt nirgends referenziert. Sie wird von der Festplatte gelöscht. Dies kann nicht rückgängig gemacht werden.',
    fileDeleted: 'Datei gelöscht.',
  },

  localeList: {
    paneLabel: 'Sprachen',
    translatedProgress: '{done}/{total} übersetzt',
    newLocale: 'Neue Sprache',
    allAdded: 'Jede verfügbare Oberflächensprache wurde diesem Projekt bereits hinzugefügt.',
    constraintHint:
      'Beschränkt auf die von der Engine bereits unterstützten Oberflächensprachen — sonst blieben Menüs/Einstellungen für diese Sprache unübersetzt.',
    systemLocaleHidden:
      '"{locale}" ausgeblendet — auf diesem Rechner erkannte Systemsprache, wahrscheinlich die, in der die Kapitel geschrieben wurden.',
    languageLabel: 'Sprache',
    localeCreated: 'Sprache erstellt.',
    deleteTooltip: 'Diese Sprache löschen',
    confirmDeleteTitle: '"{locale}" löschen?',
    confirmDeleteBody:
      'Jede für diese Sprache gespeicherte Übersetzung wird endgültig gelöscht. Diese Aktion ist unwiderruflich.',
    localeDeleted: 'Sprache gelöscht.',
  },

  webPreviewDialog: {
    loading: 'Vorschau wird geladen...',
    readyTitle: 'Vorschau bereit',
    readyHint: 'Öffne diesen Link auf deinem Handy (im selben WLAN):',
    firewallHint:
      'Falls Windows nach Netzwerkzugriff fragt, klicke auf Zulassen (private Netzwerke).',
    errorTitle: 'Vorschau fehlgeschlagen',
    stop: 'Vorschau beenden',
  },

  i18nBucketEditor: {
    translatedInFolder: '{done}/{total} in diesem Ordner übersetzt',
    noStrings: 'In diesem Ordner wurde noch keine übersetzbare Zeichenkette gefunden.',
    searchPlaceholder: 'Nach einer zu übersetzenden Phrase suchen…',
    hideTranslated: 'Übersetzte ausblenden',
    noMatch: 'Keine Phrase entspricht diesem Filter.',
    translated: 'Übersetzt',
    missing: 'Fehlt',
    unusedTranslations: 'Ungenutzte Übersetzungen',
    unusedTranslationsHelp:
      'Diese Schlüssel existieren im Wörterbuch, entsprechen aber keiner Phrase mehr im aktuellen Inhalt — wahrscheinlich Text, der inzwischen geändert oder entfernt wurde.',
    searchOrphansPlaceholder: 'Ungenutzte Übersetzungen suchen…',
    deleteUnusedTooltip: 'Diesen ungenutzten Eintrag löschen',
  },

  seedBucketList: {
    entryCount: '{n} Eintrag/Einträge',
    messages: 'Nachrichten',
    dms: 'Pixly-DMs',
    posts: 'Beiträge',
    reels: 'Reels',
    photos: 'Galerie',
  },

  seedBucketEditor: {
    conversationWith: 'Unterhaltung mit',
    thread: 'Thread',
    chooseConversation: 'Wähle oben eine Unterhaltung.',
    noEntries: 'Noch keine Einträge.',
    fromLabel: 'Von',
    authorLabel: 'Autor',
    daysAgoLabel: 'Vor N Tagen',
    textLabel: 'Text',
    addMessage: 'Nachricht hinzufügen',
    addPost: 'Beitrag hinzufügen',
    addReel: 'Reel hinzufügen',
    addPhoto: 'Foto hinzufügen',
  },

  commentsListField: {
    title: 'Kommentare (optional)',
    empty: 'Keine handgeschriebenen Kommentare.',
    textPlaceholder: 'Kommentartext',
    addComment: 'Kommentar hinzufügen',
    countLabel: 'Angezeigte Kommentaranzahl (optional — sonst die tatsächliche Anzahl oben)',
  },

  triggers: {
    'app.opened': {
      label: 'App geöffnet',
      fields: { app: { label: 'App' } },
    },
    'app.closed': {
      label: 'App geschlossen (verbrachte Zeit darin)',
      fields: {
        app: { label: 'App' },
        seconds: { label: 'Mindestzeit (Sekunden)' },
      },
    },
    'photo.viewed': {
      label: 'Foto angesehen',
      fields: { url: { label: 'Foto' } },
    },
    'post.liked': {
      label: 'Beitrag geliked',
      fields: {
        authorId: { label: 'Autor des Beitrags' },
        postId: { label: 'Beitrag (ID)' },
      },
    },
    'contact.followed': {
      label: 'Kontakt gefolgt',
      fields: { contactId: { label: 'Kontakt' } },
    },
    'profile.opened': {
      label: 'Profil geöffnet',
      fields: { contactId: { label: 'Kontakt' } },
    },
    'conversation.opened': {
      label: 'Unterhaltung geöffnet',
      fields: { contactId: { label: 'Kontakt' } },
    },
    'button.pressed': {
      label: 'Schaltfläche gedrückt (eigene App)',
      fields: { app: { label: 'Anwendung' }, buttonId: { label: 'Schaltfläche (ID)' } },
    },
    'interaction.won': {
      label: 'Interaktion gewonnen',
      fields: { interactionId: { label: 'Interaktion' } },
    },
    'interaction.lost': {
      label: 'Interaktion verloren',
      fields: { interactionId: { label: 'Interaktion' } },
    },
  },

  entryTypes: {
    email: {
      label: 'E-Mail',
      help: 'Eine empfangene E-Mail — erscheint in der E-Mail-App.',
    },
  },

  openProjectPage: {
    reopening: 'Letztes Projekt wird erneut geöffnet…',
    subtitle: 'Editor für die Erzähl-Engine',
    apiWarningBefore: 'window.storieAPI ist nicht verfügbar — führe die App im Electron-Modus aus',
    apiWarningAfter: ', nicht in einem normalen Browser.',
    openBtn: 'Projekt öffnen',
    newBtn: 'Neues Projekt',
    nameLabel: 'Projektname',
    loadError: 'Projekt konnte nicht geladen werden: {error}',
    createError: 'Projekt konnte nicht erstellt werden: {error}',
  },
}
