from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from starlette.middleware.sessions import SessionMiddleware

from src.features.todo.models import Base as TodoBase
from src.features.todo.router import router as todo_router
from src.store.database import engine

from src.features.obligations.models_ob import Base as ObligationsBase
from src.features.obligations.router_ob import router as obligations_router

from src.features.calendar.models_cal import Base as CalendarBase
from src.features.calendar.router_cal import router as calendar_router

from src.features.auth import config
from src.features.auth.models_auth import Base as AuthBase
from src.features.auth.router_auth import router as auth_router

app = FastAPI(title="UpisiOvo API", version="0.1.0")

# Signs the short-lived session used to carry OAuth state across the redirect.
app.add_middleware(SessionMiddleware, secret_key=config.SECRET_KEY, same_site="lax")

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


def _ensure_schema() -> None:
    """Lightweight migrations for schema added after a table already exists.

    SQLAlchemy's create_all() only creates missing tables, never alters
    existing ones, so we add new columns / indexes by hand for older DBs.
    """
    inspector = inspect(engine)

    def column_names(table: str) -> set[str]:
        if not inspector.has_table(table):
            return set()
        return {col["name"] for col in inspector.get_columns(table)}

    def index_names(table: str) -> set[str]:
        if not inspector.has_table(table):
            return set()
        return {ix["name"] for ix in inspector.get_indexes(table)}

    with engine.begin() as conn:
        # Obligation items gained a due_date.
        if inspector.has_table("obligation_items") and "due_date" not in column_names(
            "obligation_items"
        ):
            conn.execute(text("ALTER TABLE obligation_items ADD COLUMN due_date DATE"))

        # Per-user ownership columns (existing rows stay unowned / NULL).
        for table in ("day_pages", "obligations", "calendar_events"):
            if inspector.has_table(table) and "user_id" not in column_names(table):
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN user_id INTEGER"))

        # day_pages used to be unique on date globally; make it per-user instead.
        if inspector.has_table("day_pages"):
            if "ix_day_pages_date" in index_names("day_pages"):
                conn.execute(text("DROP INDEX ix_day_pages_date"))
            conn.execute(
                text("CREATE INDEX IF NOT EXISTS ix_day_pages_date ON day_pages(date)")
            )
            conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_day_pages_user_date "
                    "ON day_pages(user_id, date)"
                )
            )

        for table in ("day_pages", "obligations", "calendar_events"):
            if inspector.has_table(table):
                conn.execute(
                    text(
                        f"CREATE INDEX IF NOT EXISTS ix_{table}_user_id "
                        f"ON {table}(user_id)"
                    )
                )


@app.on_event("startup")
def on_startup() -> None:
    AuthBase.metadata.create_all(bind=engine)
    TodoBase.metadata.create_all(bind=engine)
    ObligationsBase.metadata.create_all(bind=engine)
    CalendarBase.metadata.create_all(bind=engine)
    _ensure_schema()


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(todo_router)
app.include_router(obligations_router)
app.include_router(calendar_router)
