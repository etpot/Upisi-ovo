from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.features.obligations import crud, schemas
from src.features.obligations.models import PriorityLevel
from src.store.database import get_db

router = APIRouter(prefix="/obligations", tags=["obligations"])


@router.post("", response_model=schemas.ObligationRead, status_code=status.HTTP_201_CREATED)
def create_obligation(
    payload: schemas.ObligationCreate, db: Session = Depends(get_db)
):
    """Kreiraj novu obavezu."""
    obligation = crud.create_obligation(db, payload)
    return obligation


@router.get("", response_model=list[schemas.ObligationRead])
def read_all_obligations(db: Session = Depends(get_db)):
    """Preuzmi sve obaveze sortirane po prioritetu."""
    obligations = crud.get_all_obligations(db)
    return obligations


@router.get("/{obligation_id}", response_model=schemas.ObligationRead)
def read_obligation(obligation_id: int, db: Session = Depends(get_db)):
    """Preuzmi specifičnu obavezu."""
    obligation = crud.get_obligation_by_id(db, obligation_id)
    if not obligation:
        raise HTTPException(status_code=404, detail="Obligation not found.")
    return obligation


@router.get("/priority/{priority}", response_model=list[schemas.ObligationRead])
def read_obligations_by_priority(
    priority: PriorityLevel, db: Session = Depends(get_db)
):
    """Preuzmi obaveze po prioritetu (high, mid, low)."""
    obligations = crud.get_obligations_by_priority(db, priority)
    return obligations


@router.patch("/{obligation_id}", response_model=schemas.ObligationRead)
def update_obligation(
    obligation_id: int,
    payload: schemas.ObligationUpdate,
    db: Session = Depends(get_db),
):
    """Ažuriraj obavezu."""
    obligation = crud.get_obligation_by_id(db, obligation_id)
    if not obligation:
        raise HTTPException(status_code=404, detail="Obligation not found.")

    updated = crud.update_obligation(db, obligation, payload)
    return updated


@router.delete("/{obligation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_obligation(obligation_id: int, db: Session = Depends(get_db)):
    """Obriši obavezu."""
    success = crud.delete_obligation(db, obligation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Obligation not found.")
