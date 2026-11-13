# Eigene Bilder für Bildkarten – Design (kurz)

## Absicht

Eltern sollen Karten auch mit eigenen Fotos anlegen können (Kuscheltier, Oma,
Schule – was es bei ARASAAC nicht gibt). Auf dem iPad kommt das Bild aus der
Fotomediathek, der Kamera oder „Dateien“, im Browser am Mac aus einem Ordner
oder vom Schreibtisch. Das Wort tippt man selbst ein.

## Ziele

- Im Karten-Fenster ein Knopf **„Eigenes Bild“** neben der Piktogramm-Suche
  (`<input type="file" accept="image/*">`).
- Nach der Auswahl ein **Zuschneide-Fenster**: quadratischer Rahmen, das Foto
  dahinter mit einem Finger verschieben, mit zwei Fingern zoomen; zusätzlich ein
  Zoom-Regler (Maus am Mac). Knöpfe „Übernehmen“ und „Zurück“.
- Der Ausschnitt wird als JPEG 600 × 600 gespeichert (weisser Grund), nur auf
  dem Gerät und in der Sicherungsdatei.
- Bei eigenen Bildern bleibt das Wortfeld leer; ohne Wort kein Speichern.
- Bei bestehenden Karten kann man das Bild tauschen (Piktogramm ↔ Foto).
- Auch das Symbol eines Seiten-Reiters kann ein eigenes Foto sein (gleicher
  Knopf und gleiches Zuschneiden im Seiten-Fenster). Nachträglich gewünscht.

## Nicht-Ziele

- Drehen, Filter, Ränder.
- Aufräumen von Bildern gelöschter Karten (bestehende, bekannte Lücke).

## Wissenswert

- HEIC: Safari auf dem iPad wandelt beim Auswählen in JPEG um. Chrome/Firefox
  am Mac können HEIC nicht öffnen → verständliche Meldung.
- Eigene Bilder lassen sich nicht aus dem Internet nachladen; nur die Sicherung
  schützt vor Verlust.

## Ansätze

- **Eigener kleiner Zuschneider (gewählt):** Pointer-Events + Canvas, passt zur
  App ohne Build-Schritt und ohne Fremdcode; offline sofort verfügbar.
- Fertige Bibliothek (z. B. Cropper.js): mehr Funktionen, aber Fremdcode, der für
  den Offline-Betrieb mitgeliefert werden müsste – zu viel für Verschieben+Zoom.
- Ganzes Foto ohne Zuschneiden: einfacher, aber Motiv oft zu klein. Abgelehnt
  von Martina zugunsten „Ausschnitt wählen“.

## Entscheidungen des Builders (Claude)

- Das Kartenfeld heisst weiter `pictoId`; eigene Bilder haben eine Text-Id
  `own-<uuid>`, ARASAAC-Piktogramme bleiben Zahlen. Keine Daten-Migration nötig.
- Beim Laden einer Sicherung werden Bild-Schlüssel aus Ziffern wieder zu Zahlen,
  alle anderen bleiben Text (bisher wurde alles zu Zahlen → eigene Bilder gingen
  verloren).
- Das Foto wird erst beim „Speichern“ der Karte abgelegt, damit „Abbrechen“
  nichts zurücklässt.
- Höchster Zoom: 4-fach der kleinsten (das Quadrat gerade füllenden) Grösse.
