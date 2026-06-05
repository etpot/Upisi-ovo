from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.features.obligations import crud_ob,schemas_ob
from src.features.obligations.models_ob import Obligation
from src.store.database import get_db

router = APIRouter(prefix="/obligations", tags=["obligations"])

@router.post("/", response_model=schemas_ob.ObligationRead, status_code=status.HTTP_201_CREATED)
def create_obligation(payload: schemas_ob.ObligationCreate, db: Session = Depends(get_db)):
    new_obligation = crud_ob.create_obligation(db, payload)
    return new_obligation

@router.get("/",response_model=list[schemas_ob.ObligationRead])
def list_obligations(title:str | None=None, db: Session=Depends(get_db)):
    return crud_ob.list_obligations(db, title)
    
@router.get("/{id}", response_model=schemas_ob.ObligationRead)
def read_obligation(id: int, db: Session = Depends(get_db)):
    obligation = crud_ob.get_obligation_by_id(db, id)
    if not obligation:
        raise HTTPException(status_code=404, detail="Obligation not found.")
    return obligation

 @router.post("/{obligation_id}/items", response_model= schemas_ob.ObligationItemRead, status_code=status.HTTP_201_CREATED)
 def create_obligation_item(obligation_id:int, payload:shcemas_ob.ObligationItemCreate, db: Session=Depends(get_db)):
     if not obligation_exists:
         raise HTTPException(status_code=404, detail="Obligation not found.")
     return crud_ob.add_obligation_item(db,obligation_id, payload)
