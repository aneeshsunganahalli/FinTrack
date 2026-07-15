"""Category CRUD routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.models import get_db, Category
from backend.models.schemas import CategoryCreate, CategoryUpdate, CategoryOut

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=List[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.name).all()


@router.post("", response_model=CategoryOut, status_code=201)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    cat = Category(**payload.dict())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.patch("/{cid}", response_model=CategoryOut)
def update_category(cid: int, payload: CategoryUpdate, db: Session = Depends(get_db)):
    cat = db.query(Category).filter_by(id=cid).first()
    if not cat:
        raise HTTPException(404, "Category not found")
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(cat, k, v)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{cid}", status_code=204)
def delete_category(cid: int, db: Session = Depends(get_db)):
    cat = db.query(Category).filter_by(id=cid).first()
    if not cat:
        raise HTTPException(404, "Category not found")
    db.delete(cat)
    db.commit()
