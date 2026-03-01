# UpisiOvo

Jednostavna full-stack aplikacija za dnevni plan i TODO stavke.

## Tehnologije

- **Backend:** FastAPI + SQLAlchemy
- **Frontend:** HTML/CSS/JS (static files)
- **Baza:** SQLite (preko SQLAlchemy engine-a)

---

## Pokretanje projekta (Linux)

## 1) Backend

Iz root foldera projekta:

```bash
cd /home/djordje/UpisiOvo
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
```

Provera da backend radi:

- Health: `http://127.0.0.1:8000/health`
- Swagger docs: `http://127.0.0.1:8000/docs`

---

## 2) Frontend

Pokreni static server iz root-a:

```bash
cd /home/djordje/UpisiOvo
python3 -m http.server 5500 --directory src
```

Otvori u browseru:

- `http://127.0.0.1:5500/pages/index.html`

---

## Na šta obratiti pažnju (najčešće greške)

1. **Ne otvarati `index.html` dvoklikom (`file://...`)**
   - Mora preko HTTP servera (npr. `python -m http.server` ili Live Server).

2. **CORS port mora da se poklapa**
   - Ako frontend radi na `5501`, backend mora dozvoliti i `http://127.0.0.1:5501`.
   - CORS podešavanja su u `src/main.py`.

3. **Backend i frontend moraju oba biti pokrenuti**
   - Backend na `127.0.0.1:8000`
   - Frontend na `127.0.0.1:5500` (ili drugi port koji je dozvoljen u CORS-u)

4. **`409 Conflict` na `POST /todo/day-pages` je očekivano**
   - Znači da za taj datum stranica već postoji.

5. **Provera grešaka**
   - Otvori browser DevTools (F12) -> **Console** i **Network**.
   - Tu se odmah vidi da li je CORS, 404, 500 ili connection problem.

---

## Korisni test pozivi

```bash
# Dohvati stranicu za datum
curl -i http://127.0.0.1:8000/todo/day-pages/2026-03-01

# Kreiraj day page
curl -i -X POST http://127.0.0.1:8000/todo/day-pages \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-03-01","note":""}'

# Dodaj todo stavku (primer day_page_id=5)
curl -i -X POST http://127.0.0.1:8000/todo/day-pages/5/items \
  -H "Content-Type: application/json" \
  -d '{"title":"Test stavka","done":false,"position":0}'
```

---

## Struktura (skraćeno)

- `src/main.py` – FastAPI app, CORS, startup
- `src/features/todo/` – todo modeli, CRUD, šeme, rute
- `src/pages/index.html` – frontend
- `src/pages/index.js` – frontend logika
- `src/shared/ui/styles.css` – stilovi