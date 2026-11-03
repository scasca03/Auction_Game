#!/usr/bin/env python3
"""Download the game's openly licensed Wikimedia portraits for offline deployment.

Run from the project root: python tools/fetch-photos.py
Requires: pip install requests pillow
Each source is checked for an open Wikimedia Commons license. Missing images
remain available via the game's online Wikipedia fallback.
"""
from __future__ import annotations
import html
import io
import json
import re
import time
from pathlib import Path
from urllib.parse import quote

import requests
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ROWS = re.search(r"const PLAYER_ROWS = `([\s\S]*?)`;", (ROOT / "players.js").read_text(encoding="utf-8"))
if not ROWS:
    raise SystemExit("Could not read player records from players.js")
PLAYERS = []
for id_, row in enumerate(ROWS.group(1).strip().splitlines()):
    parts = row.split("|")
    PLAYERS.append({"id": id_, "name": parts[0], "wiki": parts[6] if len(parts) > 6 else parts[0]})

session = requests.Session()
session.headers.update({"User-Agent": "BID-XI-photo-loader/2.0 (Wikimedia portrait retrieval for educational football game)"})
PHOTO_DIR = ROOT / "photos"
PHOTO_DIR.mkdir(exist_ok=True)


def query(endpoint: str, params: dict) -> dict:
    r = session.get(endpoint, params={"format": "json", "formatversion": 2, **params}, timeout=30)
    r.raise_for_status()
    body = r.json()
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
    lic = stripped(meta.get("LicenseShortName", {}).get("value", ""))
    allow = lic.lower().startswith(("cc by", "cc0", "public domain", "pd "))
    if not allow or not info.get("descriptionurl"):
        return None
    return {
        "source": info["descriptionurl"],
        "author": stripped(meta.get("Artist", {}).get("value", "")),
        "license": lic,
        "licenseUrl": stripped(meta.get("LicenseUrl", {}).get("value", "")),
    }


def main() -> None:
    manifest = {}
    page_data = {}
    for start in range(0, len(PLAYERS), 30):
        batch = PLAYERS[start:start + 30]
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
    for person in PLAYERS:
        p = page_data.get(person["id"])
        if not p or not p.get("thumbnail", {}).get("source") or not p.get("pageimage"):
            print(f"SKIP {person['name']}: no Wikipedia thumbnail")
            continue
        try:
            meta = wikimedia_image_meta(p["pageimage"])
            if not meta:
                print(f"SKIP {person['name']}: not confirmed open-licensed on Wikimedia Commons")
                continue
            response = session.get(p["thumbnail"]["source"], timeout=35)
            response.raise_for_status()
            img = Image.open(io.BytesIO(response.content))
            img = ImageOps.exif_transpose(img).convert("RGB")
            img.thumbnail((640, 750), Image.Resampling.LANCZOS)
            outfile = PHOTO_DIR / f"{person['id']:03d}.webp"
            img.save(outfile, "WEBP", quality=85, method=5)
            manifest[str(person["id"])] = {"url": f"./photos/{outfile.name}", **meta}
            print(f"OK   {person['name']}: {outfile.name}")
        except Exception as exc:
            print(f"SKIP {person['name']}: {exc}")
        time.sleep(.2)
    (ROOT / "photo-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    with (ROOT / "PHOTO_CREDITS.md").open("w", encoding="utf-8") as f:
        f.write("# Créditos de las fotografías de BID/XI\n\nMiniaturas de Wikimedia Commons; las licencias y autores se especifican por imagen. Los recortes y conversiones a WEBP fueron realizados para el juego.\n\n")
        for person in PLAYERS:
            item = manifest.get(str(person["id"]))
            if not item:
                continue
            f.write(f"- **{person['name']}** — {item['author'] or 'autor indicado en fuente'}, "
                    f"{item['license']} ([archivo y condiciones]({item['source']}))")
            if item.get("licenseUrl"):
                f.write(f" · [Licencia]({item['licenseUrl']})")
            f.write("\n")
    print(f"\nComplete: {len(manifest)} / {len(PLAYERS)} portraits. "
          "Upload photos/, photo-manifest.json and PHOTO_CREDITS.md with the site.")


if __name__ == "__main__":
    main()
