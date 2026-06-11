# UpisiOvo

Full-stack daily planner: TODO lists, prioritized obligations, and a calendar —
with per-user accounts. The UI is in Serbian; this document is in English.

## Technologies

- **Backend:** FastAPI + SQLAlchemy
- **Auth:** bcrypt password hashing, JWT in an HttpOnly cookie, Authlib (Google/Facebook)
- **Frontend:** static HTML/CSS/JS (no build step)
- **Database:** SQLite (via SQLAlchemy)

---

## Features

### Accounts & security
- **Register** with a unique **username + email + password**.
- **Login** with **username _or_ email** + password (case-insensitive). No name
  field on login — only credentials are checked.
- **Sessions** use a signed JWT inside an **HttpOnly, SameSite=Lax cookie**
  (`upisiovo_session`) — JavaScript can't read it, which resists XSS token theft.
- **All pages are gated**: visiting any page while logged out redirects to the
  login screen. **All data is per-user** (`user_id` on every table).
- **Google / Facebook login** is scaffolded and turns on automatically once the
  matching client id/secret are configured (see _Configuration_).
- Passwords are bcrypt-hashed (SHA-256 pre-hash so long passwords aren't truncated).

### TODO
- Per-day pages with items, done-toggle, delete mode, and "clear done" helpers.

### Obligations
- Three priority buckets: **Hitno** (urgent), **Važno** (important), **Čeka** (wait).
- Each item can have an optional **due date** that shows up on the calendar.

### Calendar
- Month grid with a **Pon–Ned weekday header** and weekday-aligned days.
- **Month/year navigation**: `‹`/`›` arrows step by month; clicking the
  **`Mjesec/God`** label opens a picker to jump to any month and year (years too),
  so events far in the future or past are easy to reach.
- Click a day to open its card: add **events** (with optional **start/end time**),
  and see that day's **todos** and **obligations** in one place.
- **Event times** use an iPhone-clock-style **wheel picker** in 24h format.
- Days that have any content (event / todo / obligation) get a dot marker.

### Home dashboard (`index.html`)
- Four live widgets: latest **TODO** items, all three **Obligation** buckets at once,
  a **mini calendar** (today highlighted + content dots), and **Notes** (placeholder).
- **Responsive & adaptive**: 2×2 on desktop, single scrollable column on phones,
  and each widget trims how many items it shows to whatever fits the tile.

---

## Shortcuts & interactions

- **☰ user menu** (top-right, every page): username, **Podešavanja** (placeholder),
  **Odjava** (logout). Closes on outside-click or **Esc**.
- **Time wheel** (event start/end): `Tab` to focus a wheel, **↑/↓** to change,
  **type digits** (e.g. `1` then `4` → 14) for fast entry, **Home/End** for min/max;
  also scroll or click a number. 24-hour format.
- **Calendar:** `‹` / `›` = previous/next month · click **`Mjesec/God`** = month/year
  picker · **Esc** closes the picker.
- **Day card:** click outside the card or the **✕** to close.
- **Login screen:** toggle **Prijava / Registracija** tabs.

---

## Running the Project (Linux)

### 1) Backend
```bash
cd /home/djordje/UpisiOvo
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

Or from anywhere:
```bash
/home/djordje/UpisiOvo/run_backend.sh
```

Verify:
- Health: `http://127.0.0.1:8000/health`
- Swagger docs: `http://127.0.0.1:8000/docs`

### 2) Frontend
```bash
cd /home/djordje/UpisiOvo
python3 -m http.server 5500 --directory src
```

Open: **`http://127.0.0.1:5500/pages/login.html`**

> ⚠️ **Use `127.0.0.1`, not `localhost`, for the frontend.** The API is on
> `127.0.0.1:8000`; `localhost` and `127.0.0.1` are treated as different sites, so a
> SameSite=Lax cookie set for `127.0.0.1` would not be sent from a `localhost` page —
> you'd be stuck in a login loop. Pick one host and use it everywhere.

### 3) Testing from a phone (or any device on the same Wi-Fi)

Find your machine's local IP:
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
# look for something like 192.168.x.x
```

Start backend and frontend exactly as above (both already bind to `0.0.0.0`).  
On the phone, open:
```
http://192.168.x.x:5500/pages/login.html
```
Replace `192.168.x.x` with your actual LAN IP. No other changes needed — `auth.js`
automatically uses the hostname the page was loaded from, so API calls go to
`192.168.x.x:8000` instead of `127.0.0.1:8000`.

---

## Configuration (environment variables)

All optional in dev; set the first two in production.

| Variable | Default | Purpose |
|---|---|---|
| `UPISIOVO_SECRET_KEY` | dev key | Signs the session JWT + OAuth state. **Change in prod.** |
| `UPISIOVO_COOKIE_SECURE` | `0` | Set to `1` over HTTPS so the cookie is `Secure`. |
| `UPISIOVO_COOKIE_SAMESITE` | `lax` | Cookie SameSite policy. |
| `UPISIOVO_FRONTEND_URL` | `…/index.html` | Where to land after social login. |
| `UPISIOVO_LOGIN_URL` | `…/login.html` | Login page URL. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | empty | Enables Google login. |
| `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` | empty | Enables Facebook login. |

OAuth **redirect URI** to register in the Google/Meta console:
`http://127.0.0.1:8000/auth/{provider}/callback` (e.g. `.../auth/google/callback`).

---

## Database & migrations

- SQLite file: `app.db`. Tables are created on startup.
- A lightweight migration in `src/main.py` (`_ensure_schema`) adds new columns/indexes
  to existing DBs (e.g. `user_id`, obligation `due_date`, event `start_time`/`end_time`,
  the unique `username` index). **You usually do not need to delete `app.db`.**
- Pre-account rows have `user_id = NULL` and are invisible to logged-in users.
- Only if you make incompatible model changes, reset with:
  ```bash
  rm /home/djordje/UpisiOvo/app.db
  ```

---

## Useful test calls

Endpoints require the auth cookie, so log in first and reuse a cookie jar:

```bash
# 1) Log in (saves cookie to cj.txt)
curl -s -c cj.txt -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"<username-or-email>","password":"<password>"}'

# 2) Who am I
curl -s -b cj.txt http://127.0.0.1:8000/auth/me

# 3) Create a day page + todo item
curl -s -b cj.txt -X POST http://127.0.0.1:8000/todo/day-pages \
  -H "Content-Type: application/json" -d '{"date":"2026-03-01","note":""}'
curl -s -b cj.txt -X POST http://127.0.0.1:8000/todo/day-pages/1/items \
  -H "Content-Type: application/json" \
  -d '{"title":"Test item","done":false,"position":0}'

# 4) Create a calendar event with a time range
curl -s -b cj.txt -X POST http://127.0.0.1:8000/calendar/events \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-03-01","title":"Sastanak","start_time":"09:30","end_time":"10:45"}'

# 5) Aggregated day view (events + todos + obligations)
curl -s -b cj.txt http://127.0.0.1:8000/calendar/day/2026-03-01
```

Without a valid cookie these return **401**, which is expected.

---

## Troubleshooting

- **Stuck redirecting to login / 401 loop** → you're probably on `localhost`; switch
  to `127.0.0.1` (see warning above), or your session expired (log in again).
- **`409 Conflict`** → resource already exists (e.g. a day page for that date, or a
  taken username/email).
- **`422 Unprocessable Entity`** → invalid input (bad email, username chars, or a time
  not in `HH:MM` 00–23).
- **Frontend changes not showing** → hard-refresh with **Ctrl+Shift+R** (cached JS/CSS).
- **General debugging** → browser DevTools (F12) → **Console** / **Network** tabs.

---

## Project structure

```
src/
  main.py                      FastAPI app, CORS, session middleware, migrations
  store/database.py            SQLAlchemy engine + session
  features/
    auth/                      User model, security (bcrypt/JWT), OAuth, routes
    todo/                      Day pages + todo items
    obligations/               Priority buckets + items (with due_date)
    calendar/                  Events (with start/end time) + day aggregator
  pages/
    login.html / login.js      Auth screen (register/login + social buttons)
    auth.js                    Shared: fetch-cookie patch, route guard, ☰ user menu
    index.html / index.js      Home dashboard widgets
    todo.html / todo.js        TODO section
    obligations.html / .js     Obligations section
    calendar.html / calendar.js Calendar + event time wheels + month picker
    cube-nav.js                3D cube page transitions
  shared/ui/styles.css         All styles
```

---

## Tips

**For users**
- Click the month label (`Juni/26`) to jump years ahead/back fast.
- When adding an event, just **type the hour** on the time wheel — quickest way.
- The home dashboard mirrors your real data; dots on the mini calendar mark busy days.

**For developers**
- Each feature folder is self-contained: `models_* / schemas_* / crud_* / router_*`.
  New protected routes should depend on `get_current_user` and filter by `user.id`.
- `auth.js` patches `window.fetch` to add `credentials:"include"` for API calls, so
  page scripts don't manage cookies themselves.
- Keep `TIME_WHEEL_ITEM_H` in `calendar.js` in sync with `.time-wheel-item` height in CSS.
- After model changes, prefer extending `_ensure_schema` over deleting `app.db`.
