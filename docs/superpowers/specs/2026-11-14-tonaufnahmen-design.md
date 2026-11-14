# Eigene Tonaufnahmen pro Karte – Design (kurz)

## Absicht

iOS gibt Web-Apps für Deutsch nur die Stimme „Anna“. Damit das Kind trotzdem
vertraute Stimmen hört (Mama, Papa, Geschwister, Schweizerdeutsch), nehmen die
Eltern zu einer Karte das Wort selbst auf.

## Verhalten (von Martina freigegeben)

- Im Karten-Fenster: **„Wort aufnehmen“**, danach anhören, neu aufnehmen oder
  löschen.
- Die Sprechen-Taste spielt die Karten der Reihe nach: Aufnahme, falls
  vorhanden, sonst die gewählte iPad-Stimme.
- Aufnahmen liegen nur auf dem Gerät und kommen in die Sicherungsdatei.

## Entscheidungen des Builders (Claude)

- Aufnahme mit `getUserMedia` + `MediaRecorder` (Safari liefert AAC/MP4).
  Höchstens 10 Sekunden, dann stoppt die Aufnahme selbst.
- Gespeichert wie Fotos im IndexedDB-Bildspeicher unter der Id `rec-<uuid>`;
  die Karte bekommt das Feld `audioId` (fehlt bei alten Karten = keine Aufnahme).
- Abgespielt mit Web Audio (`AudioContext`, im Tippen entsperrt), weil iOS
  sonst nach dem ersten Wort weitere Töne blockieren kann. Vor dem ersten Wort
  wird die Sprachausgabe im Tippen mit einer leisen, leeren Äusserung entsperrt.
- Die Aufnahme wird erst beim „Speichern“ der Karte abgelegt („Abbrechen“ lässt
  nichts zurück). Alte Aufnahmen bleiben wie alte Bilder im Speicher (bekannte
  Lücke).
- Antippen einer Karte oben spricht weiterhin nicht (wie bisher).
