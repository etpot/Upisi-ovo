const API_BASE = "http://127.0.0.1:8000";

const calendar_div = document.getElementById("calendar");
const month_year = document.getElementById("month-year");
const monthNames = [
  "Januar",
  "Februar",
  "Mart",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "Avgust",
  "Septembar",
  "Oktobar",
  "Novembar",
  "Decembar",
];

const priorityLabels = {
  urgent: "Hitno",
  important: "Važno",
  wait: "Čeka",
};
const priorityClasses = {
  urgent: "p-high",
  important: "p-mid",
  wait: "p-low",
};

const currentDate = new Date();
const month = currentDate.getMonth();
const year = currentDate.getFullYear();

month_year.innerHTML = `${monthNames[month]}/${year % 1000}`;

const number_of_days = new Date(year, month + 1, 0).getDate();

function pad2(n) {
  return String(n).padStart(2, "0");
}

function isoForDay(dayNum) {
  return `${year}-${pad2(month + 1)}-${pad2(dayNum)}`;
}

function dayDivFor(dayNum) {
  return calendar_div.querySelector(`[data-day="${dayNum}"]`);
}

async function fetchDayOverview(dayNum) {
  const res = await fetch(`${API_BASE}/calendar/day/${isoForDay(dayNum)}`);
  if (!res.ok) {
    console.error("fetchDayOverview failed:", res.status, await res.text());
    return { events: [], todos: [], obligations: [] };
  }
  return res.json();
}

function dayHasContent(overview) {
  return (
    overview.events.length > 0 ||
    overview.todos.length > 0 ||
    overview.obligations.length > 0
  );
}

async function refreshDayMarker(dayNum, overview) {
  const div = dayDivFor(dayNum);
  if (!div) return;

  const data = overview || (await fetchDayOverview(dayNum));
  div.classList.toggle("has-events", dayHasContent(data));
}

// ─── Day card ────────────────────────────────────────────────────

function openCard(dayNum) {
  const overlay = document.createElement("div");
  overlay.className = "cal-overlay";

  const card = document.createElement("div");
  card.className = "cal-card";

  const header = document.createElement("div");
  header.className = "cal-card-header";

  const title = document.createElement("span");
  title.className = "cal-card-title";
  title.textContent = `${dayNum}. ${monthNames[month]} ${year}`;

  const closeBtn = document.createElement("button");
  closeBtn.className = "cal-card-close";
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", () => overlay.remove());

  header.appendChild(title);
  header.appendChild(closeBtn);

  const body = document.createElement("div");
  body.className = "cal-card-body";

  // event input row
  const inputRow = document.createElement("div");
  inputRow.className = "cal-input-row";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Dodaj event…";

  const addBtn = document.createElement("button");
  addBtn.className = "cal-add-btn";
  addBtn.textContent = "+";

  inputRow.appendChild(input);
  inputRow.appendChild(addBtn);

  // events list
  const eventList = document.createElement("ul");
  eventList.className = "cal-event-list";

  // read-only sections (todos + obligations)
  const todoSection = buildReadonlySection("To-do");
  const obligationSection = buildReadonlySection("Obaveze");

  function renderEvents(events) {
    eventList.innerHTML = "";
    if (events.length === 0) {
      const hint = document.createElement("p");
      hint.className = "cal-empty-hint";
      hint.textContent = "Nema eventa za ovaj dan.";
      eventList.appendChild(hint);
      return;
    }

    events.forEach((event) => {
      const li = document.createElement("li");
      li.className = "cal-event-item";

      const span = document.createElement("span");
      span.textContent = event.title;

      const del = document.createElement("button");
      del.className = "cal-event-delete";
      del.textContent = "✕";
      del.addEventListener("click", async () => {
        const res = await fetch(`${API_BASE}/calendar/events/${event.id}`, {
          method: "DELETE",
        });
        if (!res.ok && res.status !== 204) {
          console.error("delete event failed:", res.status, await res.text());
          return;
        }
        await reload();
      });

      li.appendChild(span);
      li.appendChild(del);
      eventList.appendChild(li);
    });
  }

  function renderTodos(todos) {
    fillReadonlyList(todoSection, todos, "Nema to-do obaveza.", (todo) => {
      const span = document.createElement("span");
      span.textContent = todo.title;
      if (todo.done) span.classList.add("cal-ro-done");
      return [span];
    });
  }

  function renderObligations(obligations) {
    fillReadonlyList(
      obligationSection,
      obligations,
      "Nema obaveza za ovaj dan.",
      (obligation) => {
        const span = document.createElement("span");
        span.textContent = obligation.title;

        const tag = document.createElement("span");
        tag.className = `cal-ro-tag ${priorityClasses[obligation.priority] || ""}`;
        tag.textContent = priorityLabels[obligation.priority] || obligation.priority;

        return [span, tag];
      },
    );
  }

  async function reload() {
    const overview = await fetchDayOverview(dayNum);
    renderEvents(overview.events);
    renderTodos(overview.todos);
    renderObligations(overview.obligations);
    await refreshDayMarker(dayNum, overview);
  }

  async function addEvent() {
    const text = input.value.trim();
    if (!text) return;

    const res = await fetch(`${API_BASE}/calendar/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: isoForDay(dayNum), title: text, description: null }),
    });
    if (!res.ok) {
      console.error("add event failed:", res.status, await res.text());
      return;
    }

    input.value = "";
    input.focus();
    await reload();
  }

  addBtn.addEventListener("click", addEvent);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addEvent();
  });

  body.appendChild(inputRow);
  body.appendChild(eventList);
  body.appendChild(todoSection.wrapper);
  body.appendChild(obligationSection.wrapper);

  card.appendChild(header);
  card.appendChild(body);
  overlay.appendChild(card);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
  input.focus();

  void reload();
}

function buildReadonlySection(titleText) {
  const wrapper = document.createElement("div");
  wrapper.className = "cal-ro-section";

  const heading = document.createElement("h4");
  heading.className = "cal-ro-head";
  heading.textContent = titleText;

  const list = document.createElement("ul");
  list.className = "cal-ro-list";

  wrapper.appendChild(heading);
  wrapper.appendChild(list);

  return { wrapper, list };
}

function fillReadonlyList(section, items, emptyText, buildContent) {
  const { list } = section;
  list.innerHTML = "";

  if (items.length === 0) {
    const hint = document.createElement("li");
    hint.className = "cal-empty-hint";
    hint.textContent = emptyText;
    list.appendChild(hint);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "cal-ro-item";
    buildContent(item).forEach((node) => li.appendChild(node));
    list.appendChild(li);
  });
}

// ─── Build grid ──────────────────────────────────────────────────

for (let i = 1; i <= number_of_days; i++) {
  const day = document.createElement("div");
  day.textContent = i;
  day.style.position = "relative";
  day.dataset.day = String(i);
  calendar_div.appendChild(day);

  day.addEventListener("click", () => openCard(i));
}

// Initial markers for the whole visible month.
async function loadMonthMarkers() {
  try {
    const [eventsRes, dayPagesRes, obligationsRes] = await Promise.all([
      fetch(`${API_BASE}/calendar/events`),
      fetch(`${API_BASE}/todo/day-pages/`),
      fetch(`${API_BASE}/obligations/`),
    ]);

    const marked = new Set();
    const monthPrefix = `${year}-${pad2(month + 1)}-`;

    if (eventsRes.ok) {
      for (const event of await eventsRes.json()) {
        if (event.date.startsWith(monthPrefix)) marked.add(event.date);
      }
    }
    if (dayPagesRes.ok) {
      for (const page of await dayPagesRes.json()) {
        if (page.todos.length > 0 && page.date.startsWith(monthPrefix)) {
          marked.add(page.date);
        }
      }
    }
    if (obligationsRes.ok) {
      for (const obligation of await obligationsRes.json()) {
        for (const item of obligation.obligation_items || []) {
          if (item.due_date && item.due_date.startsWith(monthPrefix)) {
            marked.add(item.due_date);
          }
        }
      }
    }

    for (let i = 1; i <= number_of_days; i++) {
      dayDivFor(i)?.classList.toggle("has-events", marked.has(isoForDay(i)));
    }
  } catch (err) {
    console.error("loadMonthMarkers failed:", err);
  }
}

void loadMonthMarkers();
