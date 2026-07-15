"""Wishlist CRUD + OG preview routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.models import get_db, WishlistItem
from backend.models.schemas import WishlistCreate, WishlistUpdate, WishlistOut
from backend.services.og_scraper import fetch_og_metadata

router = APIRouter(prefix="/api/wishlist", tags=["wishlist"])


@router.get("", response_model=List[WishlistOut])
def list_wishlist(
    db: Session = Depends(get_db),
    purchased: bool = False,
):
    return (
        db.query(WishlistItem)
        .filter_by(purchased=purchased)
        .order_by(WishlistItem.added_at.desc())
        .all()
    )


@router.post("", response_model=WishlistOut, status_code=201)
async def create_wishlist_item(payload: WishlistCreate, db: Session = Depends(get_db)):
    data = payload.dict()
    # Auto-fetch OG metadata if URL provided but no image
    if data.get("product_url") and not data.get("image_url"):
        og_title, og_image = await fetch_og_metadata(data["product_url"])
        if og_image:
            data["image_url"] = og_image
        if og_title and not data.get("name"):
            data["name"] = og_title
    item = WishlistItem(**data)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{wid}", response_model=WishlistOut)
def get_wishlist_item(wid: int, db: Session = Depends(get_db)):
    item = db.query(WishlistItem).filter_by(id=wid).first()
    if not item:
        raise HTTPException(404, "Item not found")
    return item


@router.patch("/{wid}", response_model=WishlistOut)
def update_wishlist_item(wid: int, payload: WishlistUpdate, db: Session = Depends(get_db)):
    item = db.query(WishlistItem).filter_by(id=wid).first()
    if not item:
        raise HTTPException(404, "Item not found")
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{wid}", status_code=204)
def delete_wishlist_item(wid: int, db: Session = Depends(get_db)):
    item = db.query(WishlistItem).filter_by(id=wid).first()
    if not item:
        raise HTTPException(404, "Item not found")
    db.delete(item)
    db.commit()


@router.post("/preview-url")
async def preview_url(payload: dict):
    """Fetch OG metadata for a URL without creating an item."""
    url = payload.get("url", "")
    title, image = await fetch_og_metadata(url)
    return {"title": title, "image_url": image}
