# Sprechbrett

Ein digitales Kommunikationsbrett mit Bildkarten für das iPad, nach dem Vorbild
eines analogen Bildkarten-Kommunikationsbuchs.

- **Oben (orange):** schmale senkrechte Klettstreifen (weiss oder schwarz) mit Bildkarten. Rechts am Rand
  sind Register-Reiter, über die man zwischen den Seiten blättert.
- **Unten (violett):** der Satzstreifen. Das Kind zieht Karten hierher oder
  tippt sie an. Die Taste links (Mund mit Sprechblase) liest den Satz von
  links nach rechts vor. Die Taste rechts mit den drei Kärtchen legt alle
  Karten zurück.
- **Eltern-Bereich:** über das kleine Zahnrad oben links, geschützt mit einer
  Rechenaufgabe. Dort legt man Karten an (Plus-Felder), bearbeitet Seiten und
  Reiter, ändert Hintergrundfarbe, Streifenzahl und Streifenfarbe und macht Sicherungen.

## Online stellen (HTTPS)

Das iPad braucht die App unter einer **https://**-Adresse. Nur dann
funktionieren Offline-Betrieb, Installation und Sicherung. Eine einfache und
kostenlose Möglichkeit ist **GitHub Pages**: Den Ordner als Repository auf
GitHub hochladen, dann unter *Settings → Pages* den Branch `main` als Quelle
wählen. Die App ist danach unter `https://<name>.github.io/<repo>/` erreichbar.
Eine Adresse wie `http://192.168.…:8642` vom Mac reicht nicht.

## Auf dem iPad installieren

1. Die https-Adresse der App in **Safari** öffnen.
2. **Teilen** → **Zum Home-Bildschirm**.
3. Die App über das neue Symbol starten. Sie läuft dann im Vollbild und auch
   ohne Internet. Nur die Bildsuche braucht Internet.

Tipp: Mit **Geführter Zugriff** (Einstellungen → Bedienungshilfen) bleibt das
Kind in der App.

## Eigene Bilder

Im Karten-Fenster und im Seiten-Fenster gibt es den Knopf **„Eigenes Bild …“**.
Auf dem iPad wählt man ein Foto aus der Fotomediathek, macht eines mit der
Kamera oder holt eines aus „Dateien“; am Mac öffnet sich der Finder. Danach
wählt man den quadratischen Ausschnitt: mit einem Finger verschieben, mit zwei
Fingern (oder dem Regler) vergrössern. Das Wort tippt man selbst ein.

Eigene Bilder liegen nur auf dem Gerät und in der Sicherungsdatei. Anders als
die Piktogramme lassen sie sich nicht aus dem Internet nachladen.
HEIC-Fotos öffnen am Mac nur in Safari; sonst JPG oder PNG verwenden.

## Sicherung

Alle Karten und Bilder sind nur auf diesem iPad gespeichert. Im Eltern-Bereich
unter **Einstellungen → Sicherung speichern** entsteht eine Datei
(`sprechbrett-JJJJ-MM-TT.json`), die man z. B. in „Dateien“ ablegt. Mit
**Sicherung laden** holt man sie zurück oder überträgt das Buch auf ein anderes
Gerät. Nach 30 Tagen ohne Sicherung erinnert die App daran.

## Piktogramme

Die Piktogramme stammen von [ARASAAC](https://arasaac.org).
Autor: Sergio Palao. Herkunft: ARASAAC (http://www.arasaac.org).
Lizenz: [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.de).
Eigentum: Regierung von Aragón (Spanien).
Die App darf deshalb nicht kommerziell genutzt werden.

## Entwicklung

Reines HTML/CSS/JavaScript ohne Build-Schritt.

- Tests (Node 20 oder neuer): `node --test`
- Lokal starten: `python3 -m http.server 8642`, dann http://localhost:8642 öffnen.
- Nach jeder Änderung an App-Dateien `VERSION` in `sw.js` erhöhen, damit
  installierte Geräte die neue Version laden.
