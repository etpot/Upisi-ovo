from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.features.auth.deps import get_current_user
from src.features.auth.models_auth import User
from src.features.obligations import crud_ob, schemas_ob
from src.store.database import get_db

router = APIRouter(prefix="/obligations", tags=["obligations"])


@router.post("/", response_model=schemas_ob.ObligationRead, status_code=status.HTTP_201_CREATED)
def create_obligation(
    payload: schemas_ob.ObligationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_ob.create_obligation(db, payload, current_user.id)


@router.get("/", response_model=list[schemas_ob.ObligationRead])
def list_obligations(
    title: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_ob.list_obligations(db, current_user.id, title)


@router.get("/{id}", response_model=schemas_ob.ObligationRead)
def read_obligation(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obligation = crud_ob.get_obligation_by_id(db, id, current_user.id)
    if not obligation:
        raise HTTPException(status_code=404, detail="Obligation not found.")
    return obligation


@router.post(
    "/{obligation_id}/items",
    response_model=schemas_ob.ObligationItemRead,
    status_code=status.HTTP_201_CREATED,
)
def create_obligation_item(
    obligation_id: int,
    payload: schemas_ob.ObligationItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obligation = crud_ob.get_obligation_by_id(db, obligation_id, current_user.id)
    if not obligation:
        raise HTTPException(status_code=404, detail="Obligation not found.")

    return crud_ob.add_obligation_item(db, obligation_id, payload)


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_obligation_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    obligation_item = crud_ob.get_obligation_item_by_id(db, item_id)
    if not obligation_item:
        raise HTTPException(status_code=404, detail="Obligation item not found.")

    # Make sure the item belongs to one of the caller's obligations.
    owner = crud_ob.get_obligation_by_id(
        db, obligation_item.obligation_id, current_user.id
    )
    if not owner:
        raise HTTPException(status_code=404, detail="Obligation item not found.")

    crud_ob.delete_obligation_item(db, obligation_item)
