#!/usr/bin/env python3
"""
tools/build_stories.py – Einschlafkalender Story-Zuordnung

Zeigt, welche Geschichte an welchem Tag gespielt wird.
Nutzt dieselbe Logik wie app.js:
  story = stories[(dayOfYear - 1) % len(stories)]
  Tageswechsel um 12:00 Uhr Europe/Berlin

Verwendung:
  python3 tools/build_stories.py              # Nächste 30 Tage
  python3 tools/build_stories.py --tage 60    # Nächste 60 Tage
  python3 tools/build_stories.py --datum 2026-12-24   # Bestimmter Tag

Setzt stories.json im Repo-Root voraus.
"""

import json
import sys
import argparse
from datetime import date, datetime, timedelta
from pathlib import Path

# Repo-Root = Verzeichnis oberhalb von tools/
REPO_ROOT = Path(__file__).parent.parent


def day_of_year(d: date) -> int:
    return d.timetuple().tm_yday


def get_effective_date(dt: datetime) -> date:
    """
    Effektives Datum: vor 12:00 Uhr Berlin-Zeit gilt noch der Vortag.
    Nutzt zoneinfo (Python >= 3.9) oder fallback auf UTC+1/+2-Schätzung.
    """
    try:
        from zoneinfo import ZoneInfo
        berlin = ZoneInfo("Europe/Berlin")
        berlin_dt = dt.astimezone(berlin)
    except (ImportError, Exception):
        # Einfacher Fallback: UTC+1 (Winter) / UTC+2 (Sommer)
        month = dt.month
        is_cest = 3 < month < 10 or (month == 3 and dt.day >= 25) or (month == 10 and dt.day < 25)
        offset = timedelta(hours=2 if is_cest else 1)
        berlin_dt = dt + offset

    if berlin_dt.hour < 12:
        return (berlin_dt - timedelta(days=1)).date() if hasattr(berlin_dt, 'date') else (berlin_dt - timedelta(days=1))
    return berlin_dt.date() if hasattr(berlin_dt, 'date') else berlin_dt


def load_stories() -> list:
    path = REPO_ROOT / "stories.json"
    if not path.exists():
        print(f"FEHLER: {path} nicht gefunden.", file=sys.stderr)
        sys.exit(1)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def check_audio_files(stories: list) -> None:
    """Prüft, ob lokale Audio-Dateien vorhanden sind (wenn nicht auf externem Server)."""
    audio_dir = REPO_ROOT / "assets" / "audio"
    if not audio_dir.exists():
        return
    local_files = {f.name for f in audio_dir.rglob("*.mp3")}
    if not local_files:
        return
    print(f"\nLokale MP3s in assets/audio: {len(local_files)}")
    for s in stories:
        filename = s.get("mp3Url", "").split("/")[-1]
        status = "✓" if filename in local_files else "✗ fehlt"
        print(f"  {s['id']:>4}  {status}  {filename}")


def show_schedule(stories: list, start: date, days: int) -> None:
    n = len(stories)
    print(f"\nEinschlafkalender – Story-Zuordnung")
    print(f"Anzahl ruhiger Folgen: {n}")
    print(f"Zeitraum: {start.strftime('%d.%m.%Y')} bis "
          f"{(start + timedelta(days=days-1)).strftime('%d.%m.%Y')}")
    print()

    weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
    header = f"{'Datum':<13} {'Tag':<3} {'KW':<5} {'Nr':<5} {'Titel'}"
    print(header)
    print("─" * 72)

    for i in range(days):
        d = start + timedelta(days=i)
        doy   = day_of_year(d)
        idx   = (doy - 1) % n
        story = stories[idx]
        kw    = d.isocalendar()[1]
        wd    = weekdays[d.weekday()]
        today_marker = " ← HEUTE" if d == start else ""
        title = story["title"][:38]
        print(f"{d.strftime('%d.%m.%Y'):<13} {wd:<3} {kw:<5} {story['id']:<5} {title}{today_marker}")


def show_single(stories: list, target: date) -> None:
    n     = len(stories)
    doy   = day_of_year(target)
    idx   = (doy - 1) % n
    story = stories[idx]
    kw    = target.isocalendar()[1]

    print(f"\nEinschlafkalender – {target.strftime('%d.%m.%Y')}")
    print(f"  Kalenderwoche : KW {kw}")
    print(f"  Tag im Jahr   : {doy}")
    print(f"  Index         : {idx} (= ({doy} - 1) mod {n})")
    print(f"  ID            : {story['id']}")
    print(f"  Titel         : {story['title']}")
    if story.get("ort"):
        print(f"  Ort           : {story['ort']}")
    if story.get("dauer"):
        print(f"  Dauer         : {story['dauer']}")
    print(f"  MP3           : {story['mp3Url']}")
    print(f"  Seite         : {story.get('pageUrl','–')}")


def main():
    parser = argparse.ArgumentParser(
        description="Zeigt die Story-Zuordnung des Einschlafkalenders."
    )
    parser.add_argument("--tage", type=int, default=30,
                        help="Anzahl Tage ab heute (Standard: 30)")
    parser.add_argument("--datum", type=str, default=None,
                        help="Bestimmter Tag anzeigen (Format: YYYY-MM-DD)")
    parser.add_argument("--check-audio", action="store_true",
                        help="Prüfe lokale MP3-Dateien in assets/audio/")
    args = parser.parse_args()

    stories = load_stories()

    if args.datum:
        try:
            target = date.fromisoformat(args.datum)
        except ValueError:
            print(f"FEHLER: Ungültiges Datum '{args.datum}'. Format: YYYY-MM-DD")
            sys.exit(1)
        show_single(stories, target)
    else:
        today = get_effective_date(datetime.now())
        show_schedule(stories, today, args.tage)

    if args.check_audio:
        check_audio_files(stories)

    print()


if __name__ == "__main__":
    main()
