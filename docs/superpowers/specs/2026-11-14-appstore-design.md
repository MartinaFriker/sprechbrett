# App-Store-Version – Design (kurz)

## Absicht

iOS gibt Web-Apps für Deutsch nur die Stimme „Anna“. Eine native iPad-App kann
alle auf dem Gerät geladenen Stimmen nutzen (auch Premium und Männerstimmen).
Ziel: dieselbe App als native Hülle, später im App Store bzw. über Apple School
Manager auf verwalteten Schul-iPads. Von Martina freigegeben.

## Ziele

- Native Hülle mit **Capacitor** um den bestehenden Code; die Web-Version auf
  GitHub Pages läuft unverändert weiter.
- In der App spricht das Sprechbrett über Apples Sprachausgabe
  (`@capacitor-community/text-to-speech`, AVSpeechSynthesizer); die
  Stimmenliste zeigt alle deutschen Stimmen. Tonlage, Tempo, eigene Aufnahmen
  bleiben.
- Deutsche Erklärtexte für Kamera, Fotos und Mikrofon.
- Erst Simulator, dann Martinas iPad per Kabel, dann App Store.

## Nicht-Ziele

- Android.
- Daten zwischen Web-Version und App synchronisieren (Übertrag per Sicherung).
- App-Store-Eintrag, Konto, Screenshots (macht Martina mit Anleitung).

## Entscheidungen des Builders (Claude)

- Versionen: Capacitor 8.6.0, TTS-Plugin 8.0.2 (beide älter als zwei Wochen).
- `www/` wird per Skript (`npm run build`) aus den App-Dateien erzeugt und ist
  nicht im Git; nur dort wird `capacitor.js` eingebunden (Web-Version bleibt
  ohne). Der Service Worker scheitert in der App leise (nicht nötig).
- Audio-Kategorie „playback“: die Sprachausgabe ist auch im Stumm-Modus hörbar.
- Bundle-Id `ch.friker.sprechbrett` (Vorschlag; vor dem App-Store-Eintrag
  änderbar).
- Voraussetzung, die nur Martina erfüllen kann: Xcode installieren; später das
  Apple-Entwicklerkonto.
