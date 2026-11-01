# Einschlafkalender

Statische Website für [einschlafkalender.de](https://einschlafkalender.de) –
jeden Abend eine Hörgeschichte zum Einschlafen, präsentiert als Abreißkalender.

## Dateien

```
index.html          Hauptseite (Abreißkalender)
style.css           Styling
app.js              Kalender-Logik, Audio-Player, Sleep-Timer
stories.json        Liste der ruhigen Folgen (manuell pflegen)
sprueche.json       Gute-Nacht-Sprüche (manuell ergänzen)
impressum.html      Entwurf – bitte vor Veröffentlichung prüfen
datenschutz.html    Entwurf – bitte vor Veröffentlichung prüfen
robots.txt
sitemap.xml
CNAME               einschlafkalender.de

assets/
  audio/            MP3s hier ablegen (lokal, falls nicht von stadtvampir.de)
  cover/            Coverbilder (lokal, falls nicht von stadtvampir.de)
  fonts/            Selbst gehostete Webfonts (optional)

tools/
  build_stories.py  Zeigt die Story-Zuordnung pro Tag
```

## stories.json pflegen

Felder je Eintrag:

| Feld       | Pflicht | Beschreibung                                  |
|------------|---------|-----------------------------------------------|
| `id`       | ja      | Folgen-Nummer (z. B. `"047"`)                 |
| `title`    | ja      | Titel ohne Folgen-Nr.                         |
| `ort`      | nein    | Handlungsort, erscheint unter dem Titel       |
| `dauer`    | nein    | z. B. `"ca. 18 Min."`                         |
| `mp3Url`   | ja      | Absolute URL zur MP3                          |
| `coverUrl` | nein    | Absolute URL zum Coverbild (WebP)             |
| `pageUrl`  | nein    | Absolute URL zur Folgen-Seite auf stadtvampir |

Die Geschichte des Tages wird berechnet als:
`stories[(dayOfYear - 1) % stories.length]`
– Tageswechsel um **12:00 Uhr Europe/Berlin**.

## sprueche.json pflegen

Einfaches JSON-Array mit Strings. Wächst bis 365.
Der Spruch des Tages: `sprueche[(dayOfYear - 1) % sprueche.length]`.

## Story-Zuordnung prüfen

```bash
python3 tools/build_stories.py              # Nächste 30 Tage
python3 tools/build_stories.py --tage 90    # Nächste 90 Tage
python3 tools/build_stories.py --datum 2026-12-24  # Heiligabend
python3 tools/build_stories.py --check-audio       # Lokale MP3s prüfen
```

## DNS bei netcup → GitHub Pages

| Typ   | Name  | Wert                                    |
|-------|-------|-----------------------------------------|
| A     | @     | 185.199.108.153                         |
| A     | @     | 185.199.109.153                         |
| A     | @     | 185.199.110.153                         |
| A     | @     | 185.199.111.153                         |
| CNAME | www   | `<dein-github-name>.github.io`          |

## GitHub Pages einrichten

1. Repository → **Settings → Pages**
2. Source: `Deploy from branch`, Branch: `main`, Ordner: `/ (root)`
3. Custom domain: `einschlafkalender.de`
4. **Enforce HTTPS** aktivieren (nach Zertifikatsausstellung)
5. Settings → Pages → **Verified domains**: Domain verifizieren

## Vor dem ersten Push checken

- [ ] `impressum.html`: Name, Adresse, E-Mail eintragen
- [ ] `datenschutz.html`: Name, Adresse eintragen; Entwurf juristisch prüfen
- [ ] `stories.json`: `ort` und `dauer` ergänzen
- [ ] `assets/favicon.ico` und `assets/og-image.jpg` erstellen/ablegen
- [ ] GitHub-Repository auf **öffentlich** setzen (GitHub Pages kostenlos)
