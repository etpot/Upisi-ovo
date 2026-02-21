from fastapi import FastAPI

from src.features.todo.models import Base
from src.features.todo.router import router as todo_router
from src.store.database import engine

app = FastAPI(title="UpisiOvo API", version="0.1.0")


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(todo_router)
