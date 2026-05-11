from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.features.obligations import crud_ob, schemas_ob
from src.features.obligations.models_ob import Obligation
from src.features.todo.models import DayPage
from src.store.database import get_db

router = APIRouter(prefix="/obligations", tags=["obligations"])

@router.post("/", response_model=schemas_ob.Obligation, status_code=status.HTTP_201_CREATED)
def create_obligation(payload: schemas_ob.ObligationCreate, db: Session = Depends(get_db)):
    obligation = crud_ob.create_obligation(db, payload)
    if obligation is None:
        raise HTTPException(status_code=400, detail="Failed to create obligation.")
    return obligation

