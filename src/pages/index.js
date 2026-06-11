// Home dashboard: fills each tile with live data and trims the number of
// visible items to whatever fits the tile at the current screen size.
(() => {
  const API = (window.UpisiAuth && window.UpisiAuth.API_BASE) || "http://127.0.0.1:8000";

  const monthNames = [
    "Januar", "Februar", "Mart", "April", "Maj", "Juni",
    "Juli", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar",
  ];
  const weekdayShort = ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"];
  const obligationOrder = [
    { key: "urgent", label: "Hitno" },
    { key: "important", label: "Važno" },
    { key: "wait", label: "Čeka" },
  ];

  const pad2 = (n) => String(n).padStart(2, "0");

  const todoBody = document.getElementById("home-todo");
  const obligBody = document.getElementById("home-oblig");
  const calBody = document.getElementById("home-cal");

  // ─── Adaptive trimming ────────────────────────────────────────
  // Hide items that would overflow the container so only whole rows show.
  function trimToFit(container) {
    if (!container) return;
    const items = Array.from(container.children);
    items.forEach((el) => {
      el.hidden = false;
    });
    const limit = container.clientHeight;
    if (limit <= 0) return;

    let cut = false;
    items.forEach((el, i) => {
      if (cut) {
        el.hidden = true;
        return;
      }
      // Always keep the first item; hide a later one once it spills over.
      if (i > 0 && el.offsetTop + el.offsetHeight > limit + 1) {
        el.hidden = true;
        cut = true;
      }
    });
  }

  function setEmpty(container, text) {
    container.innerHTML = "";
    const p = document.createElement("p");
    p.className = "home-tile-empty";
    p.textContent = text;
    container.appendChild(p);
  }

  async function getJSON(path) {
    const res = await fetch(`${API}${path}`);
    if (!res.ok) return null;
    return res.json();
  }

  // ─── TODO: most recently added items ──────────────────────────
  async function loadTodos() {
    let pages;
    try {
      pages = await getJSON("/todo/day-pages/");
    } catch (err) {
      console.error("home todos failed:", err);
    }
    if (!pages) {
      setEmpty(todoBody, "—");
      return;
    }

    const items = [];
    pages.forEach((page) => (page.todos || []).forEach((t) => items.push(t)));
    items.sort((a, b) => b.id - a.id); // higher id = added more recently

    if (items.length === 0) {
      setEmpty(todoBody, "Još nema todo stavki.");
      return;
    }

    todoBody.innerHTML = "";
    items.forEach((todo) => {
      const row = document.createElement("div");
      row.className = "home-todo-item" + (todo.done ? " is-done" : "");

      const dot = document.createElement("span");
      dot.className = "home-todo-dot";

      const title = document.createElement("span");
      title.className = "home-todo-title";
      title.textContent = todo.title;

      row.appendChild(dot);
      row.appendChild(title);
      todoBody.appendChild(row);
    });
    trimToFit(todoBody);
  }

  // ─── OBLIGATIONS: all three priority buckets at once ──────────
  async function loadObligations() {
    let list;
    try {
      list = await getJSON("/obligations/");
    } catch (err) {
      console.error("home obligations failed:", err);
    }
    list = list || [];

    const byTitle = {};
    list.forEach((o) => {
      byTitle[o.title] = o.obligation_items || [];
    });

    obligBody.innerHTML = "";
    const cols = document.createElement("div");
    cols.className = "home-oblig";

    const lists = [];
    obligationOrder.forEach(({ key, label }) => {
      const col = document.createElement("div");
      col.className = `home-oblig-col oblig-${key}`;

      const head = document.createElement("div");
      head.className = "home-oblig-head";
      head.textContent = label;

      const ul = document.createElement("ul");
      ul.className = "home-oblig-list";

      const items = (byTitle[key] || []).slice().sort((a, b) => b.id - a.id);
      if (items.length === 0) {
        const li = document.createElement("li");
        li.className = "home-oblig-empty";
        li.textContent = "—";
        ul.appendChild(li);
      } else {
        items.forEach((it) => {
          const li = document.createElement("li");
          li.textContent = it.title;
          ul.appendChild(li);
        });
      }

      col.appendChild(head);
      col.appendChild(ul);
      cols.appendChild(col);
      lists.push(ul);
    });

    obligBody.appendChild(cols);
    lists.forEach(trimToFit);
  }

  // ─── CALENDAR: mini month with today + content dots ───────────
  function buildMiniCalendar(marked) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();

    calBody.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "home-cal";

    const title = document.createElement("div");
    title.className = "home-cal-title";
    title.textContent = `${monthNames[month]} ${year}`;

    const weekdays = document.createElement("div");
    weekdays.className = "home-cal-weekdays";
    weekdayShort.forEach((d) => {
      const span = document.createElement("span");
      span.textContent = d;
      weekdays.appendChild(span);
    });

    const grid = document.createElement("div");
    grid.className = "home-cal-grid";

    const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstOffset; i++) {
      const blank = document.createElement("div");
      blank.className = "home-cal-day is-blank";
      grid.appendChild(blank);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement("div");
      cell.className = "home-cal-day";
      cell.textContent = String(d);
      const iso = `${year}-${pad2(month + 1)}-${pad2(d)}`;
      if (d === today) cell.classList.add("is-today");
      if (marked.has(iso)) cell.classList.add("has-dot");
      grid.appendChild(cell);
    }

    wrap.appendChild(title);
    wrap.appendChild(weekdays);
    wrap.appendChild(grid);
    calBody.appendChild(wrap);
  }

  async function loadCalendar() {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-`;
    const marked = new Set();

    try {
      const [events, pages, obligations] = await Promise.all([
        getJSON("/calendar/events"),
        getJSON("/todo/day-pages/"),
        getJSON("/obligations/"),
      ]);
      (events || []).forEach((e) => {
        if (e.date && e.date.startsWith(prefix)) marked.add(e.date);
      });
      (pages || []).forEach((p) => {
        if (p.todos && p.todos.length && p.date.startsWith(prefix)) {
          marked.add(p.date);
        }
      });
      (obligations || []).forEach((o) =>
        (o.obligation_items || []).forEach((it) => {
          if (it.due_date && it.due_date.startsWith(prefix)) marked.add(it.due_date);
        }),
      );
    } catch (err) {
      console.error("home calendar failed:", err);
    }

    buildMiniCalendar(marked);
  }

  // ─── Re-fit on layout changes ─────────────────────────────────
  function reflow() {
    if (todoBody && todoBody.querySelector(".home-todo-item")) {
      trimToFit(todoBody);
    }
    document.querySelectorAll(".home-oblig-list").forEach(trimToFit);
  }

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(reflow, 150);
  });

  if (window.ResizeObserver) {
    const observer = new ResizeObserver(() => reflow());
    if (todoBody) observer.observe(todoBody);
    if (obligBody) observer.observe(obligBody);
  }

  loadTodos();
  loadObligations();
  loadCalendar();
})();
