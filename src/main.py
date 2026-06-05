from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.features.todo.models import Base as TodoBase
from src.features.todo.router import router as todo_router
from src.store.database import engine

from src.features.obligations.models_ob import Base as ObligationsBase
from src.features.obligations.router_ob import router as obligations_router

app = FastAPI(title="UpisiOvo API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5500",
        "http://localhost:5501",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    TodoBase.metadata.create_all(bind=engine)
    ObligationsBase.metadata.create_all(bind=engine)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(todo_router)
app.include_router(obligations_router)
