# Kako funkcionise backend u UpisiOvo

Ovaj dokument objasnjava kako je backend slozen, kako se dijelovi povezuju medjusobno i kako frontend komunicira sa API-jem. Fokus je na trenutnom, stvarno aktivnom toku u projektu.

## 1. Kratak pregled arhitekture

Backend je napravljen u slojevima:

1. `main.py` pokrece FastAPI aplikaciju, dodaje CORS i ukljucuje rute.
2. `router.py` prima HTTP zahtjev i odlucuje sta dalje.
3. `schemas.py` provjerava i opisuje podatke koji ulaze i izlaze iz API-ja.
4. `crud.py` sadrzi logiku za rad sa bazom.
5. `models.py` opisuje tabele u bazi preko SQLAlchemy ORM-a.
6. `database.py` kreira konekciju i SQLAlchemy sesiju.
7. Frontend u `src/pages/index.js` koristi `fetch()` da poziva API.

Najvazniji tok izgleda ovako:

`frontend -> router -> schema -> crud -> model -> baza -> response -> frontend`

## 2. Glavna ulazna tacka backend-a

Fajl: `src/main.py`

U ovom fajlu se desava sljedece:

- kreira se FastAPI aplikacija
- dodaje se CORS middleware da frontend sa drugog porta smije zvati API
- pri startupu se kreiraju tabele u bazi
- dodaje se health endpoint
- ukljucuje se TODO router

Bitno je da je trenutno ukljucen samo TODO router:

- `app.include_router(todo_router)`

To znaci da su TODO endpointi aktivni i dostupni, dok drugi feature-i nisu povezani kroz `main.py`.

## 3. Kako se povezuje sa bazom

Fajl: `src/store/database.py`

Ovaj fajl radi dvije stvari:

- pravi SQLAlchemy engine za SQLite bazu `app.db`
- pravi `SessionLocal`, odnosno fabriku sesija

Funkcija `get_db()` je dependency koji FastAPI ubacuje u rute:

- otvori sesiju prije zahtjeva
- preda sesiju ruti
- zatvori sesiju nakon zahtjeva

Zbog toga ruta ne mora sama da brine o otvaranju i zatvaranju konekcije.

## 4. TODO dio: modeli, schemas, crud i router

Ovo je trenutno glavni aktivni backend dio.

### 4.1 Models

Fajl: `src/features/todo/models.py`

Ovde su definisane dvije tabele:

- `DayPage`
- `TodoItem`

`DayPage` predstavlja jedan datum, npr. `2026-03-01`.
`TodoItem` predstavlja jednu stavku koja pripada toj stranici dana.

Veza je ovakva:

- jedan `DayPage` ima vise `TodoItem` zapisa
- svaki `TodoItem` pripada tacno jednom `DayPage`

Ovo je ostvareno preko `relationship()` i stranog kljuca `day_page_id`.

### 4.2 Schemas

Fajl: `src/features/todo/schemas.py`

Schemas su Pydantic modeli i oni kontrolisu format podataka na ulazu i izlazu.

Primjeri:

- `DayPageCreate` -> podatak koji frontend salje kad stvara novu dnevnu stranicu
- `DayPageRead` -> podatak koji API vraca frontend-u
- `TodoItemCreate` -> podatak za dodavanje stavke
- `TodoItemUpdate` -> podatak za parcijalno azuriranje stavke
- `TodoItemRead` -> podatak koji API vraca nakon kreiranja ili izmjene

Za frontend je ovo vazno jer schemas definisu tacno kako JSON izgleda. To smanjuje greske i pruza validaciju prije nego sto podaci dodju do baze.

### 4.3 CRUD

Fajl: `src/features/todo/crud.py`

CRUD funkcije rade direktno sa SQLAlchemy sesijom i modelima.

Glavne funkcije su:

- `create_day_page(db, payload)`
- `get_day_page_by_date(db, target_date)`
- `list_day_pages(db)`
- `add_todo_item(db, day_page_id, payload)`
- `get_todo_by_id(db, todo_id)`
- `update_todo_item(db, todo, payload)`
- `delete_todo_item(db, todo)`

Ukratko:

- router primi zahtjev
- schema validira podatke
- CRUD napravi SQLAlchemy objekat ili SELECT upit
- `commit()` upise izmjenu u bazu
- `refresh()` ucita svjeze vrijednosti iz baze, npr. generisani `id`

### 4.4 Router

Fajl: `src/features/todo/router.py`

Router definise HTTP endpointi i vezu sa CRUD slojem.

Aktivni endpointi su:

- `POST /todo/day-pages`
- `GET /todo/day-pages/{target_date}`
- `GET /todo/day-pages/`
- `POST /todo/day-pages/{day_page_id}/items`
- `PATCH /todo/items/{todo_id}`
- `DELETE /todo/items/{todo_id}`

#### POST /todo/day-pages

Kreira dnevnu stranicu za dati datum.

Primjer JSON-a koji frontend salje:

```json
{
  "date": "2026-03-01",
  "note": ""
}
```

Prvo se provjerava da li stranica za taj datum vec postoji. Ako postoji, vraca se `409 Conflict`.

#### GET /todo/day-pages/{target_date}

Vraca dnevnu stranicu za jedan datum.

Ako stranica ne postoji, vraca se `404 Not Found`.

Ovaj endpoint je bitan za frontend jer se koristi pri ucitavanju dana.

#### GET /todo/day-pages/

Vraca sve sacuvane dnevne stranice.

Frontend ga koristi da prikaze ranije zapamcene stranice.

#### POST /todo/day-pages/{day_page_id}/items

Dodaje novu TODO stavku na odredjenu dnevnu stranicu.

Primjer:

```json
{
  "title": "Nauci FastAPI",
  "done": false,
  "position": 0
}
```

#### PATCH /todo/items/{todo_id}

Azurira TODO stavku djelimicno.

Frontend ga koristi kada korisnik cekira checkbox.

Primjer:

```json
{
  "done": true
}
```

#### DELETE /todo/items/{todo_id}

Brise TODO stavku.

### 4.5 Zasto se TODO lista sortira

U `read_day_page()` i `list_day_pages()` stavke se sortiraju po `position`.
To znaci da backend kontrolise redoslijed prikaza, a ne frontend.

## 5. Kako frontend koristi backend

Fajl: `src/pages/index.js`

Frontend koristi konstantu:

- `API_BASE = "http://127.0.0.1:8000"`

To znaci da JS direktno zove backend na tom adresu.

### 5.1 Ucitavanje stranice dana

Funkcija `loadDay(dateIso)` poziva:

- `GET /todo/day-pages/{dateIso}`

Ako dobije `404`, frontend automatski poziva `createDay(dateIso)` i ponovo ucitava isti datum.

To je dobar primjer kako frontend i backend zajedno rade:

- frontend provjerava da li postoji dnevna stranica
- backend je cuva u bazi ili prijavi da ne postoji
- frontend po potrebi napravi novu

### 5.2 Kreiranje nove dnevne stranice

Funkcija `createDay(dateIso)` salje:

- `POST /todo/day-pages`

Tijelo zahtjeva sadrzi datum i praznu biljesku.

### 5.3 Dodavanje TODO stavke

Funkcija `addTodo()` salje:

- `POST /todo/day-pages/{currentDayId}/items`

Poslije uspjesnog dodavanja, frontend ocisti input i ponovo ucita dan da bi prikaz bio svjez.

### 5.4 Oznacavanje stavke kao zavrsene

Kad se checkbox promijeni, frontend salje:

- `PATCH /todo/items/{todoId}`

sa JSON tijelom kao sto je:

```json
{
  "done": true
}
```

Zatim frontend opet ucitava dan da dobije stanje iz baze.

### 5.5 Ucitavanje svih sacuvanih dana

Funkcija `loadAllDayPages()` koristi:

- `GET /todo/day-pages/`

To se koristi za prikaz ranije sacuvanih stranica.

## 6. Kako tok izgleda korak po korak

Primjer: korisnik doda novu TODO stavku.

1. Korisnik unese tekst u input na frontend-u.
2. `index.js` pozove `fetch()` prema backendu.
3. FastAPI router primi zahtjev na `/todo/day-pages/{day_page_id}/items`.
4. Pydantic schema provjeri da li su polja validna.
5. CRUD kreira SQLAlchemy `TodoItem` objekat.
6. SQLAlchemy upisuje zapis u SQLite bazu.
7. CRUD radi `commit()` i `refresh()`.
8. Router vraca JSON odgovor prema frontend-u.
9. Frontend ponovo ucita trenutni dan i prikaze novo stanje.

## 7. Kako komuniciraju router, CRUD, models i schemas

Najkrace receno:

- `router` zna koja je HTTP ruta i koje je status kodove treba vratiti
- `schemas` znaju kako izgledaju ulazni i izlazni podaci
- `crud` zna kako se radi sa bazom
- `models` znaju kako izgleda tabela i veza medju tabelama

Tipican primjer:

1. `router.py` primi `POST /todo/day-pages`
2. `schemas.py` validira `DayPageCreate`
3. `crud.py` napravi `DayPage(...)`
4. `models.py` opisuje kako se taj objekat mapira na tabelu
5. `database.py` daje sesiju preko `get_db()`
6. SQLite cuva podatke

## 8. Vazna napomena za obligations dio

U `src/features/obligations/` trenutno postoje:

- `models_ob.py`
- `crud_ob.py`
- `schemas_ob.py`

Ali u trenutnom source tree-u nema aktivnog `router.py` za obligations koji je ukljucen u `main.py`.

Takođe, `main.py` pri startupu poziva `Base.metadata.create_all(bind=engine)` za TODO Base, pa se u ovom trenutku automatski kreiraju samo TODO tabele koje pripadaju tom `Base` klasi.

To znaci da je obligations dio za sada vise pripremljen nego aktivno povezan.

Frontend u `src/pages/index.html` prikazuje panel za obaveze, ali bez zasebnog JS toka i bez backend rute taj dio je trenutno samo UI placeholder.

## 9. Primjeri testiranja iz terminala

Ako zelis provjeriti backend bez frontend-a, mozes koristiti:

```bash
curl -i http://127.0.0.1:8000/health
curl -i http://127.0.0.1:8000/todo/day-pages/2026-03-01
curl -i -X POST http://127.0.0.1:8000/todo/day-pages \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-03-01","note":""}'
```

## 10. Zakljucak

Najvazniji backend dio trenutno radi po standardnom FastAPI obrascu:

- frontend salje zahtjev preko `fetch()`
- router prima zahtjev
- schema validira podatke
- CRUD radi sa bazom
- models opisuju tabele i veze
- database sloj daje sesiju
- odgovor se vraca frontend-u kao JSON

Ako hoces, sljedeci korak mogu biti dvije stvari:

1. da napravim i drugi MD fajl samo za `obligations` dio, kad se dovrsi router
2. da ti ovaj dokument prosirim sa dijagramom toka i primjerima za svaki endpoint posebno