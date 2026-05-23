from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.features.obligations import crud_ob,schemas_ob
from src.features.obligations.models_ob import Obligation
from src.store.database import get_db

router=APIRouter(prefix="/obligations", tags=["obligations"])

@router.post("/obligations", response_model=schemas_ob.ObligationRead,status_code=HTTP_201_CREATED)
def create_obligation(payload:schemas_ob.ObligationCreate, db: Session=Depends(get_db))
    existing_obligation=crud_ob.get_obligation_by_id(db,payload.id)
    if existing_obligation:
        raise HTTPException(status_code=409, detail="This title already exists!")
    obligation=crud_ob.create
    
