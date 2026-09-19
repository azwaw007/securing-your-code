#!/usr/bin/env python3
"""Récupère tous les produits Open Food Facts tagués Algérie (pagination)."""

from __future__ import annotations

import argparse
import json
import sys
import time
from typing import Any

import requests

BASE_URL = "https://world.openfoodfacts.org/cgi/search.pl"
USER_AGENT = "GrosWhats/1.0 (https://github.com/groswhats; contact@example.com)"
DEFAULT_PAGE_SIZE = 100  # plafond réel de l'API search
REQUEST_TIMEOUT = 60
PAUSE_BETWEEN_PAGES = 0.8  # politesse / rate limit


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
    }
    response = session.get(BASE_URL, params=params, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    return response.json()


def fetch_all_products(
    page_size: int = DEFAULT_PAGE_SIZE,
    max_pages: int | None = None,
) -> tuple[list[dict[str, Any]], int]:
    """Retourne (produits, total annoncé par l'API)."""
    products: list[dict[str, Any]] = []
    total_count = 0

    with requests.Session() as session:
        session.headers.update({"User-Agent": USER_AGENT})

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


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Télécharge les produits Open Food Facts pour l'Algérie."
    )
    parser.add_argument(
        "-o",
        "--output",
        default="off-algeria-products.json",
        help="Fichier JSON de sortie (défaut: off-algeria-products.json)",
    )
    parser.add_argument(
        "--page-size",
        type=int,
        default=DEFAULT_PAGE_SIZE,
        help=f"Taille de page (défaut: {DEFAULT_PAGE_SIZE}, max utile API ≈ 100)",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=None,
        help="Limite le nombre de pages (utile pour un test rapide)",
    )
    args = parser.parse_args()

    try:
        products, total_count = fetch_all_products(
            page_size=args.page_size,
            max_pages=args.max_pages,
        )
    except requests.RequestException as exc:
        print(f"Erreur API : {exc}", file=sys.stderr)
        return 1

    payload = {
        "source": "openfoodfacts",
        "country": "algeria",
        "count_api": total_count,
        "count_fetched": len(products),
        "products": products,
    }

    with open(args.output, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)

    print(f"Nombre de produits récupérés : {len(products)}")
    print(f"Total annoncé par l'API : {total_count}")
    print(f"Écrit dans : {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
