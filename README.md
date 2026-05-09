# UpisiOvo

Simple full-stack application for daily planning, TODO items, and task management.

## Technologies

- **Backend:** FastAPI + SQLAlchemy
- **Frontend:** HTML/CSS/JS (static files)
- **Database:** SQLite (via SQLAlchemy)

---

## Running the Project (Linux)

### 1) Backend
```bash
cd /home/djordje/UpisiOvo
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
```

Verify backend is running:

- Health: `http://127.0.0.1:8000/health`
- Swagger docs: `http://127.0.0.1:8000/docs`

---

### 2) Frontend

Start a static server from the root directory:

```bash
cd /home/djordje/UpisiOvo
python3 -m http.server 5500 --directory src
```

Open in browser:

- `http://127.0.0.1:5500/pages/index.html`

---

## Important Notes

- Backend runs on `127.0.0.1:8000`
- Frontend runs on `127.0.0.1:5500` (or another port allowed in CORS)

4. **`409 Conflict` on `POST /todo/day-pages` is expected**
   - This means a page for that date already exists.

5. **Debugging errors**
   - Open browser DevTools (F12) -> **Console** and **Network** tabs.
   - You can quickly see if it's a CORS, 404, 500, or connection issue.

---

## Useful Test Calls

```bash
# Get page for a date
curl -i http://127.0.0.1:8000/todo/day-pages/2026-03-01

# Create a day page
curl -i -X POST http://127.0.0.1:8000/todo/day-pages \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-03-01","note":""}'

# Add a TODO item (example day_page_id=5)
curl -i -X POST http://127.0.0.1:8000/todo/day-pages/5/items \
  -H "Content-Type: application/json" \
  -d '{"title":"Test item","done":false,"position":0}'
```

---

## Project Structure (abbreviated)

- `src/main.py` – FastAPI app, CORS, startup
- `src/features/todo/` – todo models, CRUD, schemas, routes
- `src/features/obligations/` – obligations models, CRUD, schemas, routes
- `src/pages/index.html` – frontend
- `src/pages/index.js` – TODO logic
- `src/pages/obligations.js` – Obligations logic
- `src/shared/ui/styles.css` – styles