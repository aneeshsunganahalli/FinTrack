"""
OG / metadata scraper for wishlist URLs.
"""
import httpx
from bs4 import BeautifulSoup
from typing import Optional, Tuple
import re


async def fetch_og_metadata(url: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Fetch Open Graph image and title from a URL.
    Returns (title, image_url) or (None, None) on failure.
    """
    if not url:
        return None, None
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; FinTrack/1.0)",
            "Accept": "text/html,application/xhtml+xml",
        }
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                return None, None
            content_type = resp.headers.get("content-type", "")
            if "text/html" not in content_type:
                return None, None

        soup = BeautifulSoup(resp.text, "html.parser")

        # OG image
        og_image = None
        og_tag = soup.find("meta", property="og:image") or soup.find("meta", attrs={"name": "og:image"})
        if og_tag:
            og_image = og_tag.get("content")

        # OG / page title
        title = None
        og_title = soup.find("meta", property="og:title")
        if og_title:
            title = og_title.get("content")
        if not title and soup.title:
            title = soup.title.string

        return title, og_image

    except Exception:
        return None, None
