#!/usr/bin/env python3
"""Download openly licensed Wikimedia portraits for either player collection.

Run from the project root: python tools/fetch-photos.py
Requires: pip install requests pillow
Images without a confirmed open Commons license remain online-only.
"""
from __future__ import annotations
import argparse
import html
import io
import json
import re
import time
from pathlib import Path

import requests
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    "football": (ROOT / "players.js", "PLAYER_ROWS"),
    "basketball": (ROOT / "basketball.js", "BASKETBALL_ROWS"),
}
session = requests.Session()
session.headers.update({"User-Agent": "The-Auction-photo-loader/3.0 (Wikimedia portrait retrieval for an independent sports auction game)"})


def read_players(sport: str) -> list[dict]:
    path, rows_name = SOURCES[sport]
    rows = re.search(rf"const {rows_name} = `([\s\S]*?)`;", path.read_text(encoding="utf-8"))
    if not rows:
        raise SystemExit(f"Could not read {sport} player records from {path.name}")
    players = []
    for id_, row in enumerate(rows.group(1).strip().splitlines()):
        parts = row.split("|")
        players.append({"id": id_, "name": parts[0], "wiki": parts[6] if len(parts) > 6 else parts[0]})
    return players


def query(endpoint: str, params: dict) -> dict:
    response = session.get(endpoint, params={"format": "json", "formatversion": 2, **params}, timeout=30)
    response.raise_for_status()
    body = response.json()
    if body.get("error"):
        raise RuntimeError(body["error"])
    return body.get("query", {})


def stripped(value: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", value or "")).strip()


def wikimedia_image_meta(filename: str) -> dict | None:
    data = query("https://commons.wikimedia.org/w/api.php", {
        "action": "query", "prop": "imageinfo", "iiprop": "url|extmetadata", "titles": "File:" + filename
    })
    page = next(iter(data.get("pages", [])), {})
    info = next(iter(page.get("imageinfo", [])), {})
    meta = info.get("extmetadata", {})
    license_name = stripped(meta.get("LicenseShortName", {}).get("value", ""))
    allow = license_name.lower().startswith(("cc by", "cc0", "public domain", "pd "))
    if not allow or not info.get("descriptionurl"):
        return None
    return {
        "source": info["descriptionurl"],
        "author": stripped(meta.get("Artist", {}).get("value", "")),
        "license": license_name,
        "licenseUrl": stripped(meta.get("LicenseUrl", {}).get("value", "")),
    }


def fetch_collection(sport: str) -> None:
    players = read_players(sport)
    photo_dir = ROOT / "photos" / sport
    photo_dir.mkdir(parents=True, exist_ok=True)
    manifest = {}
    page_data = {}
    for start in range(0, len(players), 30):
        batch = players[start:start + 30]
        try:
            data = query("https://en.wikipedia.org/w/api.php", {
                "action": "query", "prop": "pageimages", "piprop": "thumbnail|name",
                "pithumbsize": "720", "redirects": "1", "titles": "|".join(x["wiki"] for x in batch),
            })
            normalized = {x["from"]: x["to"] for x in data.get("normalized", []) + data.get("redirects", [])}
            pages = {x["title"]: x for x in data.get("pages", [])}
            for person in batch:
                title = person["wiki"]
                for _ in range(4):
                    title = normalized.get(title, title)
                page_data[person["id"]] = pages.get(title)
        except Exception as exc:
            print(f"Wikipedia batch {start+1}-{start+len(batch)} unavailable: {exc}")
        time.sleep(.3)
    for person in players:
        page = page_data.get(person["id"])
        if not page or not page.get("thumbnail", {}).get("source") or not page.get("pageimage"):
            print(f"SKIP {person['name']}: no Wikipedia thumbnail")
            continue
        try:
            meta = wikimedia_image_meta(page["pageimage"])
            if not meta:
                print(f"SKIP {person['name']}: not confirmed open-licensed on Wikimedia Commons")
                continue
            response = session.get(page["thumbnail"]["source"], timeout=35)
            response.raise_for_status()
            image = Image.open(io.BytesIO(response.content))
            image = ImageOps.exif_transpose(image).convert("RGB")
            image.thumbnail((640, 750), Image.Resampling.LANCZOS)
            outfile = photo_dir / f"{person['id']:03d}.webp"
            image.save(outfile, "WEBP", quality=85, method=5)
            manifest[str(person["id"])] = {"url": f"./photos/{sport}/{outfile.name}", **meta}
            print(f"OK   {person['name']}: {outfile.name}")
        except Exception as exc:
            print(f"SKIP {person['name']}: {exc}")
        time.sleep(.2)
    (ROOT / f"photo-manifest-{sport}.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    credits = ROOT / f"PHOTO_CREDITS-{sport}.md"
    with credits.open("w", encoding="utf-8") as file:
        file.write(f"# Créditos de las fotografías de The Auction ({sport})\n\nMiniaturas de Wikimedia Commons; las licencias y autores se especifican por imagen. Los recortes y conversiones a WEBP fueron realizados para el juego.\n\n")
        for person in players:
            item = manifest.get(str(person["id"]))
            if not item:
                continue
            file.write(f"- **{person['name']}** — {item['author'] or 'autor indicado en fuente'}, "
                       f"{item['license']} ([archivo y condiciones]({item['source']}))")
            if item.get("licenseUrl"):
                file.write(f" · [Licencia]({item['licenseUrl']})")
            file.write("\n")
    print(f"\nComplete: {len(manifest)} / {len(players)} {sport} portraits.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Descarga retratos con licencia abierta para The Auction.")
    parser.add_argument("--sport", choices=("football", "basketball", "all"), default="all")
    args = parser.parse_args()
    sports = SOURCES if args.sport == "all" else (args.sport,)
    for sport in sports:
        fetch_collection(sport)


if __name__ == "__main__":
    main()
