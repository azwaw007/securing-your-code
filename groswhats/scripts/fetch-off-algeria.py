#!/usr/bin/env python3
"""
Récupère les produits Open Food Facts (Algérie) + images face avant
pour usage dans AZ POS (chemins catalog/off/{ean}.jpg).

Exemples :
  # test rapide : 1 page + images
  python3 scripts/fetch-off-algeria.py --max-pages 1 --download-images \\
    --images-dir public/catalog/off --az-pos-out off-az-pos-import.json

  # export complet (long : milliers d'images)
  python3 scripts/fetch-off-algeria.py --download-images \\
    --images-dir public/catalog/off --az-pos-out off-az-pos-import.json
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import re
import sys
import time
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests

BASE_URL = "https://world.openfoodfacts.org/cgi/search.pl"
USER_AGENT = "AZPOS/1.0 (https://az-pos-dz.vercel.app; contact@azpos.local)"
DEFAULT_PAGE_SIZE = 100
REQUEST_TIMEOUT = 60
PAUSE_BETWEEN_PAGES = 0.8
PAUSE_BETWEEN_IMAGES = 0.25

# Champs utiles seulement (réduit la charge API)
FIELDS = ",".join(
    [
        "code",
        "product_name",
        "product_name_fr",
        "product_name_ar",
        "generic_name",
        "brands",
        "quantity",
        "categories_tags",
        "image_front_url",
        "image_front_small_url",
        "image_url",
        "image_small_url",
    ]
)

SAFE_CODE_RE = re.compile(r"^[0-9A-Za-z_-]{4,32}$")


def fetch_page(
    session: requests.Session,
    page: int,
    page_size: int,
) -> dict[str, Any]:
    params = {
        "action": "process",
        "tagtype_0": "countries",
        "tag_contains_0": "contains",
        "tag_0": "algeria",
        "page_size": page_size,
        "page": page,
        "json": 1,
        "fields": FIELDS,
    }
    response = session.get(BASE_URL, params=params, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    return response.json()


def fetch_all_products(
    session: requests.Session,
    page_size: int = DEFAULT_PAGE_SIZE,
    max_pages: int | None = None,
) -> tuple[list[dict[str, Any]], int]:
    products: list[dict[str, Any]] = []
    total_count = 0
    page = 1

    while True:
        if max_pages is not None and page > max_pages:
            break

        print(f"Page {page}…", file=sys.stderr)
        data = fetch_page(session, page=page, page_size=page_size)

        batch = data.get("products") or []
        total_count = int(data.get("count") or total_count)
        page_count = int(data.get("page_count") or 0)

        if not batch:
            break

        products.extend(batch)
        print(
            f"  +{len(batch)} (cumul={len(products)} / total≈{total_count})",
            file=sys.stderr,
        )

        if page_count and page >= page_count:
            break
        if len(products) >= total_count > 0:
            break

        page += 1
        time.sleep(PAUSE_BETWEEN_PAGES)

    return products, total_count


def product_name(p: dict[str, Any]) -> str:
    for key in ("product_name_fr", "product_name", "product_name_ar", "generic_name"):
        value = (p.get(key) or "").strip()
        if value:
            return value
    brands = (p.get("brands") or "").strip()
    return brands or "Produit sans nom"


def pick_image_url(p: dict[str, Any], prefer_small: bool) -> str | None:
    if prefer_small:
        order = (
            "image_front_small_url",
            "image_small_url",
            "image_front_url",
            "image_url",
        )
    else:
        order = (
            "image_front_url",
            "image_url",
            "image_front_small_url",
            "image_small_url",
        )
    for key in order:
        url = (p.get(key) or "").strip()
        if url.startswith("http"):
            return url
    return None


def extension_from_url(url: str, content_type: str | None) -> str:
    path = urlparse(url).path.lower()
    for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        if path.endswith(ext):
            return ".jpg" if ext == ".jpeg" else ext
    if content_type:
        guessed = mimetypes.guess_extension(content_type.split(";")[0].strip())
        if guessed == ".jpe":
            return ".jpg"
        if guessed in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            return ".jpg" if guessed == ".jpeg" else guessed
    return ".jpg"


def download_image(
    session: requests.Session,
    url: str,
    dest: Path,
) -> Path | None:
    """Télécharge l'image ; retourne le chemin écrit ou None."""
    try:
        response = session.get(url, timeout=REQUEST_TIMEOUT, stream=True)
        response.raise_for_status()
        ext = extension_from_url(url, response.headers.get("Content-Type"))
        if dest.suffix.lower() != ext:
            dest = dest.with_suffix(ext)
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, "wb") as fh:
            for chunk in response.iter_content(chunk_size=64 * 1024):
                if chunk:
                    fh.write(chunk)
        return dest
    except requests.RequestException as exc:
        print(f"  image KO {dest.name}: {exc}", file=sys.stderr)
        return None


def guess_category(p: dict[str, Any]) -> str:
    tags = " ".join(p.get("categories_tags") or []).lower()
    if any(x in tags for x in ("cosmetic", "hygiene", "shampoo", "soap")):
        return "cosmetique"
    if any(x in tags for x in ("beverage", "drink", "food", "dairy", "snack", "en:")):
        return "alimentaire"
    return "alimentaire"


def to_az_pos_row(
    p: dict[str, Any],
    image_rel: str | None,
) -> dict[str, Any] | None:
    code = str(p.get("code") or "").strip()
    if not code or not SAFE_CODE_RE.match(code):
        return None
    name = product_name(p)
    row: dict[str, Any] = {
        "name": name,
        "barcode": code,
        "category": guess_category(p),
        "unit": "piece",
        "priceDa": 0,
        "costDa": 0,
        "brands": (p.get("brands") or "").strip() or None,
        "quantity": (p.get("quantity") or "").strip() or None,
        "source": "openfoodfacts",
    }
    if image_rel:
        row["imageDataUrl"] = image_rel
    # drop nulls
    return {k: v for k, v in row.items() if v is not None}


def download_product_images(
    session: requests.Session,
    products: list[dict[str, Any]],
    images_dir: Path,
    catalog_prefix: str,
    prefer_small: bool,
    skip_existing: bool,
) -> tuple[list[dict[str, Any]], int, int]:
    """Retourne (lignes AZ POS, images OK, images manquantes)."""
    rows: list[dict[str, Any]] = []
    ok = 0
    missing = 0
    images_dir.mkdir(parents=True, exist_ok=True)

    for i, p in enumerate(products, start=1):
        code = str(p.get("code") or "").strip()
        if not code or not SAFE_CODE_RE.match(code):
            missing += 1
            continue

        url = pick_image_url(p, prefer_small=prefer_small)
        image_rel: str | None = None

        if not url:
            missing += 1
            row = to_az_pos_row(p, None)
            if row:
                rows.append(row)
            continue

        # extension provisoire ; download_image peut ajuster
        dest = images_dir / f"{code}.jpg"
        existing = None
        if skip_existing:
            for cand in images_dir.glob(f"{code}.*"):
                if cand.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
                    existing = cand
                    break

        if existing is not None:
            image_rel = f"{catalog_prefix}/{existing.name}"
            ok += 1
        else:
            if i == 1 or i % 25 == 0:
                print(f"Images {i}/{len(products)}…", file=sys.stderr)
            written = download_image(session, url, dest)
            if written is not None:
                image_rel = f"{catalog_prefix}/{written.name}"
                ok += 1
            else:
                missing += 1
            time.sleep(PAUSE_BETWEEN_IMAGES)

        row = to_az_pos_row(p, image_rel)
        if row:
            rows.append(row)

    return rows, ok, missing


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Télécharge produits Open Food Facts (Algérie) "
            "et images face avant pour AZ POS."
        )
    )
    parser.add_argument(
        "-o",
        "--output",
        default="off-algeria-products.json",
        help="JSON brut OFF (défaut: off-algeria-products.json)",
    )
    parser.add_argument(
        "--az-pos-out",
        default="off-az-pos-import.json",
        help="JSON lean prêt AZ POS (name, barcode, imageDataUrl…)",
    )
    parser.add_argument(
        "--download-images",
        action="store_true",
        help="Télécharge les images face avant sur disque",
    )
    parser.add_argument(
        "--images-dir",
        default="public/catalog/off",
        help="Dossier images (défaut: public/catalog/off)",
    )
    parser.add_argument(
        "--catalog-prefix",
        default="catalog/off",
        help="Préfixe imageDataUrl AZ POS (défaut: catalog/off)",
    )
    parser.add_argument(
        "--full-size",
        action="store_true",
        help="Préférer image_front_url (~400px) au lieu du small (~200px)",
    )
    parser.add_argument(
        "--no-skip-existing",
        action="store_true",
        help="Retélécharger même si le fichier existe déjà",
    )
    parser.add_argument(
        "--page-size",
        type=int,
        default=DEFAULT_PAGE_SIZE,
        help=f"Taille de page (défaut: {DEFAULT_PAGE_SIZE})",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=None,
        help="Limite le nombre de pages (test rapide)",
    )
    parser.add_argument(
        "--only-with-images",
        action="store_true",
        help="N'écrire dans le JSON AZ POS que les produits avec image locale",
    )
    args = parser.parse_args()

    images_dir = Path(args.images_dir)

    with requests.Session() as session:
        session.headers.update({"User-Agent": USER_AGENT})

        try:
            products, total_count = fetch_all_products(
                session,
                page_size=args.page_size,
                max_pages=args.max_pages,
            )
        except requests.RequestException as exc:
            print(f"Erreur API : {exc}", file=sys.stderr)
            return 1

        raw_payload = {
            "source": "openfoodfacts",
            "country": "algeria",
            "count_api": total_count,
            "count_fetched": len(products),
            "products": products,
        }
        with open(args.output, "w", encoding="utf-8") as fh:
            json.dump(raw_payload, fh, ensure_ascii=False, indent=2)

        az_rows: list[dict[str, Any]]
        images_ok = 0
        images_missing = 0

        if args.download_images:
            az_rows, images_ok, images_missing = download_product_images(
                session,
                products,
                images_dir=images_dir,
                catalog_prefix=args.catalog_prefix.rstrip("/"),
                prefer_small=not args.full_size,
                skip_existing=not args.no_skip_existing,
            )
        else:
            # Sans téléchargement : garder les URLs distantes (online only)
            az_rows = []
            for p in products:
                url = pick_image_url(p, prefer_small=not args.full_size)
                row = to_az_pos_row(p, url)
                if row:
                    if url:
                        images_ok += 1
                    else:
                        images_missing += 1
                    az_rows.append(row)

        if args.only_with_images:
            az_rows = [r for r in az_rows if r.get("imageDataUrl")]

    az_payload = {
        "source": "openfoodfacts",
        "country": "algeria",
        "app": "AZ POS",
        "count": len(az_rows),
        "images_ok": images_ok,
        "images_missing": images_missing,
        "note": (
            "imageDataUrl = chemin relatif public/ (ex. catalog/off/EAN.jpg) "
            "ou URL https. Licences images : Open Food Facts / contributeurs."
        ),
        "products": az_rows,
    }
    with open(args.az_pos_out, "w", encoding="utf-8") as fh:
        json.dump(az_payload, fh, ensure_ascii=False, indent=2)

    print(f"Produits récupérés : {len(products)} (total API ≈ {total_count})")
    print(f"Lignes AZ POS : {len(az_rows)}")
    print(f"Images OK : {images_ok} · sans image : {images_missing}")
    print(f"Brut OFF : {args.output}")
    print(f"Import AZ POS : {args.az_pos_out}")
    if args.download_images:
        print(f"Images : {images_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
