# Sprechbrett – Design

Datum: 2026-11-13
Status: Entwurf, zur Freigabe

## Zweck und Hintergrund

Ein digitales Kommunikationsbuch nach dem Vorbild eines analogen PECS-Bretts
(Referenz: PECS Basis-Set, https://pecs-germany.com/shop/pecs-basis-set/).
Ein Kind, das (noch) nicht oder wenig spricht, setzt aus Bildkarten einen Satz
zusammen und lässt ihn vom iPad vorlesen. Die Eltern bereiten das Buch vor.

Das digitale Brett soll sich so anfühlen wie das analoge: gleiche Farben,
gleiche Anordnung, Karten werden wie Klettkarten abgenommen und auf den
Satzstreifen gelegt.

## Nutzer und Rollen

- **Kind** bedient das Brett: blättern, Karten auf den Satzstreifen ziehen,
  sprechen lassen, Karten zurücklegen.
- **Eltern** bereiten vor: Seiten und Karten anlegen, Einstellungen ändern.
  Der Eltern-Bereich ist mit einer einfachen Rechenaufgabe geschützt.

## Gerät

- iPad, Querformat.
- Web-App (HTML/CSS/JS, ohne Build-Schritt, wie das Projekt vocal-race),
  installiert über Safari → „Zum Home-Bildschirm“, läuft im Vollbild.
- Offline-fähig über Service Worker; nur die Piktogramm-Suche braucht Internet.

## Bildschirmaufbau (Kind-Modus)

```
┌───────────────────────────────────────────┬─────┐
│ (orange)                               ⚙  │Essen│ ← aktive Seite
│   ┃🍎┃      ┃🥤┃      ┃🍞┃      ┃  ┃        ├─────┤
│   ┃🍌┃      ┃💧┃      ┃  ┃      ┃  ┃        │Spiel│
│   ┃  ┃      ┃  ┃      ┃  ┃      ┃  ┃        ├─────┤
│                                           │Leute│
├───────────────────────────────────────────┴─────┤
│ (violett) ▭[ich][möchte][Apfel]▭▭▭▭▭▭▭     ↩  👄 │
└─────────────────────────────────────────────────┘
```

- **Oben:** orangefarbener Bereich mit **senkrechten weissen Streifen**
  (Klettstreifen). Auf jedem Streifen liegen Bildkarten untereinander.
  Anzahl der Streifen ist einstellbar.
- **Unten:** **waagrechter violetter Satzstreifen** mit weissem Klettband
  darauf, wie auf dem analogen Brett.
- **Rechts neben dem Satzstreifen:** Sprechen-Taste mit Mund-Piktogramm und
  eine kleinere „alles zurück“-Taste.
- **Rechter Rand:** Register-Reiter wie bei einem Ordner, einer pro Seite.
  Reiter zeigen Name und optional ein kleines Piktogramm. Höchstens 10 Seiten,
  damit alle Reiter ohne Scrollen Platz haben.
- **Zahnrad** (klein, unauffällig) öffnet den Eltern-Bereich.

Farben: Standardwerte orientieren sich am analogen Brett (Orange oben,
Violett unten, weisse Streifen). Die Hintergrundfarbe oben ist einstellbar.

## Bildkarten

- Quadratische Karte, weiss mit Rand: ARASAAC-Piktogramm, darunter ein
  kurzes Wort.
- Das Wort ist zugleich der Text, der gesprochen wird.
- Karten sind gross genug für Kinderfinger.

## Verhalten (Kind)

- **Karte nach unten ziehen** → sie wird oben **entfernt**, an ihrer Stelle
  bleibt eine **Lücke** (wie beim Abnehmen vom Klett; die anderen Karten
  rutschen nicht nach). Jede Karte hat einen festen Platz (Seite, Streifen,
  Platznummer). Im Satzstreifen wird sie an der Ablagestelle eingefügt.
- **Karte oben antippen** → sie wird ebenfalls oben entfernt und **hinten an
  den Satz angehängt** (für Kinder, denen Ziehen schwerfällt). Antippen
  spricht nichts; gesprochen wird nur über die Mund-Taste. Ein kurzer Tipp und
  ein Ziehen werden über eine kleine Bewegungsschwelle unterschieden.
- Im Satzstreifen können Karten **umsortiert** werden.
- **Karte zurück:** Karte nach oben ziehen oder im Satzstreifen antippen →
  sie geht an ihren **ursprünglichen Platz** (Seite, Streifen, Position)
  zurück.
- **„Alles zurück“** legt alle Karten aus dem Satzstreifen an ihre Plätze
  zurück. Die Taste trägt ein Piktogramm statt Text: drei kleine Kärtchen
  nebeneinander, über jedem ein Pfeil nach oben; der linke Pfeil leicht nach
  links geneigt, der rechte leicht nach rechts (Karten „fliegen“ zurück auf
  das Brett). Als eigenes SVG gezeichnet. Einfachere Rückfallvariante, falls
  es zu klein unlesbar wird: ein Kärtchen mit einem Pfeil nach oben.
- **Sprechen:** liest die Wörter der Karten im Satzstreifen von links nach
  rechts vor (Web Speech API, deutsche Stimme). Die gerade gesprochene Karte
  wird kurz hervorgehoben. Die Karten bleiben danach liegen.
- **Blättern:** Antippen eines Reiters wechselt die Seite. Der Satzstreifen
  bleibt beim Blättern erhalten; ein Satz kann Karten aus mehreren Seiten
  enthalten.
- Das Kind kann im Kind-Modus nichts hinzufügen, löschen oder einstellen.

## Eltern-Modus

- Zugang über das Zahnrad → Rechenaufgabe (Plus oder Mal mit kleinen Zahlen,
  z. B. „7 + 5“ oder „4 × 6“) → richtige Antwort öffnet den Modus.
- Im Eltern-Modus erscheinen auf den Streifen **kleine Plus-Felder**.
  Plus → Suchdialog: Suchwort eingeben, ARASAAC-Treffer als Raster, Bild
  wählen, Wort unter dem Bild übernehmen oder anpassen, speichern.
- Beim Wechsel in den Eltern-Modus werden alle Karten aus dem Satzstreifen
  automatisch an ihre Plätze zurückgelegt. So zeigt kein „Heimatplatz“ auf
  eine gelöschte Karte, Seite oder einen entfernten Streifen.
- Karten bearbeiten (Wort ändern, Bild tauschen), löschen, innerhalb der
  Seite verschieben.
- Seiten: hinzufügen, umbenennen, Reiter-Piktogramm wählen, Reihenfolge
  ändern, löschen.
- Einstellungsseite: Hintergrundfarbe (oben), Anzahl weisser Streifen.
  Diese Einstellungen gelten für das ganze Buch.
- Sicherung: Buch als Datei exportieren und wieder importieren (inkl.
  Bilder), z. B. für ein zweites Gerät. Der Eltern-Bereich zeigt „letzte
  Sicherung vor X Tagen“ und erinnert nach 30 Tagen ohne Sicherung. Die App
  bittet den Browser zusätzlich um dauerhaften Speicher
  (`navigator.storage.persist()`).
- Taste „Fertig“ → zurück in den Kind-Modus.

## Piktogramme: ARASAAC

- Quelle: https://arasaac.org, Suche über die öffentliche API
  (`api.arasaac.org`, Sprache Deutsch), Bilder von `static.arasaac.org`.
- Lizenz **CC BY-NC-SA 4.0**: nicht kommerziell, Quellenangabe nötig,
  Weitergabe unter gleicher Lizenz. In der App gibt es einen Hinweis
  „Piktogramme: ARASAAC (Sergio Palao), CC BY-NC-SA“ im Eltern-Bereich.
- Gewählte Bilder werden lokal gespeichert, damit das Brett offline läuft.

## Speicherung

- Alles bleibt auf dem Gerät (keine Konten, kein Server).
- Daten (Seiten, Karten, Einstellungen, Bilder) werden dauerhaft im Browser
  gespeichert; die App öffnet sich so, wie man sie verlassen hat.
- Der Inhalt des Satzstreifens wird ebenfalls gespeichert.

## Ziele

- Kind kann selbstständig Sätze legen und sprechen lassen.
- Eltern können Seiten und Karten ohne Hilfe anlegen.
- Aussehen und Handhabung nahe am analogen Brett.

## Nicht-Ziele

- Keine Konten, keine Cloud-Synchronisation.
- Keine eigenen Fotos als Karten (vorerst; später denkbar).
- Kein App-Store-Vertrieb.
- Keine eigene Sprachaufnahme pro Karte.

## Anti-Ziele (wäre ein Misserfolg)

- Das Kind kann aus Versehen Karten löschen oder Einstellungen verstellen.
- Ziehen auf dem iPad ist hakelig oder löst Scrollen/Zoomen aus.
- Ein Buch geht verloren, ohne dass es eine Sicherung gibt.

## Vorgehen (Approaches)

- **A) Installierbare Web-App** (gewählt): gleiche Technik wie vocal-race,
  schnell anpassbar, kein App Store, offline-fähig. Nachteile: Daten im
  Browser-Speicher (abgefedert durch Export/Import), Stimme von Safari.
- **B) Native iPad-App (Swift):** natürlichstes Drag & Drop, fester Speicher,
  mehr Stimmen; aber Xcode, Apple-Entwicklerkonto, deutlich mehr Aufwand.
- **Hybrid (Web-App in App-Hülle):** verworfen, Nachteile von B ohne dessen
  Vorteile.

Entscheidung der Auftraggeberin: **A**.

## Entscheidungen von Claude (zum Prüfen)

- Projektname „Sprechbrett“ und Ordner `~/checkouts/sprechbrett`. „PECS“ ist
  eine geschützte Marke, deshalb nicht im App-Namen.
- Plus-Felder nur im Eltern-Modus sichtbar.
- „Alles zurück“-Taste neben der Sprechen-Taste.
- Antippen einer Karte im Satzstreifen legt sie zurück.
- Antippen einer Karte oben hängt sie an den Satz an (Wunsch: Ziehen und
  Tippen), ohne sie vorzulesen.
- Reiter am rechten Rand, mit Name und optionalem Piktogramm.
- Einstellungen gelten für das ganze Buch, nicht pro Seite.
- Export/Import als Sicherung, mit Erinnerung nach 30 Tagen.
- Lücke bleibt beim Abnehmen einer Karte; feste Plätze pro Streifen.
- Satzstreifen wird beim Öffnen des Eltern-Modus automatisch geleert
  (Karten zurück an ihre Plätze).
- Kein Scrollen: feste Anzahl Plätze pro Streifen, höchstens 10 Seiten.

## Dem Umsetzer überlassen

- Genaue Farbwerte (an Fotos des analogen Bretts angleichen).
- Kartengrösse und Anzahl Karten pro Streifen je nach Bildschirmhöhe.
- Technische Umsetzung von Drag & Drop (Pointer Events) und Speicherung
  (z. B. IndexedDB).
- Startinhalt beim ersten Öffnen (z. B. eine Beispielseite).
