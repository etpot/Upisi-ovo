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

const weekdayShort = ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"];

const calNav = document.querySelector(".cal-nav");
const weekdaysEl = document.getElementById("cal-weekdays");
const prevBtn = document.getElementById("cal-prev");
const nextBtn = document.getElementById("cal-next");

const today = new Date();
let viewMonth = today.getMonth();
let viewYear = today.getFullYear();

function pad2(n) {
  return String(n).padStart(2, "0");
}

function isoForDay(dayNum) {
  return `${viewYear}-${pad2(viewMonth + 1)}-${pad2(dayNum)}`;
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
  title.textContent = `${dayNum}. ${monthNames[viewMonth]} ${viewYear}`;

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

  // time pickers (iPhone-clock-style wheels), 24h format
  const now = new Date();
  const startPicker = createTimePicker(now.getHours(), 0);
  const endPicker = createTimePicker((now.getHours() + 1) % 24, 0);

  const timeBlock = document.createElement("div");
  timeBlock.className = "cal-time-block";
  timeBlock.appendChild(buildTimeGroup("Početak", startPicker.element));
  timeBlock.appendChild(buildTimeGroup("Kraj", endPicker.element));

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

      const main = document.createElement("div");
      main.className = "cal-event-main";

      const timeStr = formatEventTime(event);
      if (timeStr) {
        const time = document.createElement("span");
        time.className = "cal-event-time";
        time.textContent = timeStr;
        main.appendChild(time);
      }

      const span = document.createElement("span");
      span.className = "cal-event-title";
      span.textContent = event.title;
      main.appendChild(span);

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

      li.appendChild(main);
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
      body: JSON.stringify({
        date: isoForDay(dayNum),
        title: text,
        description: null,
        start_time: startPicker.getValue(),
        end_time: endPicker.getValue(),
      }),
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
  body.appendChild(timeBlock);
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

  // Wheels need to be in the DOM before we can position them by scrollTop.
  startPicker.sync();
  endPicker.sync();
  input.focus();

  void reload();
}

function formatEventTime(event) {
  if (event.start_time && event.end_time) {
    return `${event.start_time}–${event.end_time}`;
  }
  if (event.start_time) return event.start_time;
  return "";
}

function buildTimeGroup(labelText, pickerEl) {
  const group = document.createElement("div");
  group.className = "cal-time-group";

  const label = document.createElement("span");
  label.className = "cal-time-label";
  label.textContent = labelText;

  group.appendChild(label);
  group.appendChild(pickerEl);
  return group;
}

// ─── iPhone-clock-style time wheel ────────────────────────────────
// Must match the .time-wheel-item height in styles.css.
const TIME_WHEEL_ITEM_H = 34;

function createTimeWheel(max, initialValue) {
  const wheel = document.createElement("div");
  wheel.className = "time-wheel";
  wheel.tabIndex = 0;
  wheel.setAttribute("role", "spinbutton");
  wheel.setAttribute("aria-valuemin", "0");
  wheel.setAttribute("aria-valuemax", String(max));

  const list = document.createElement("ul");
  list.className = "time-wheel-list";

  const topSpacer = document.createElement("li");
  topSpacer.className = "time-wheel-spacer";
  list.appendChild(topSpacer);

  const items = [];
  for (let v = 0; v <= max; v++) {
    const li = document.createElement("li");
    li.className = "time-wheel-item";
    li.textContent = String(v).padStart(2, "0");
    li.dataset.value = String(v);
    li.addEventListener("click", () => setValue(v, true));
    list.appendChild(li);
    items.push(li);
  }

  const bottomSpacer = document.createElement("li");
  bottomSpacer.className = "time-wheel-spacer";
  list.appendChild(bottomSpacer);

  wheel.appendChild(list);

  let value = clamp(initialValue);
  let typeBuffer = "";
  let typeTimer = null;
  let scrollTimer = null;
  let suppressScrollRead = false;

  function clamp(v) {
    return Math.max(0, Math.min(max, v));
  }

  function itemHeight() {
    return items[0]?.offsetHeight || TIME_WHEEL_ITEM_H;
  }

  function highlight() {
    items.forEach((li, idx) => li.classList.toggle("is-active", idx === value));
    wheel.setAttribute("aria-valuenow", String(value));
    wheel.setAttribute("aria-valuetext", String(value).padStart(2, "0"));
  }

  function setValue(next, scroll) {
    value = clamp(next);
    highlight();
    if (scroll) {
      suppressScrollRead = true;
      wheel.scrollTo({ top: value * itemHeight(), behavior: "smooth" });
      clearTimeout(scrollTimer);
      setTimeout(() => {
        suppressScrollRead = false;
      }, 260);
    }
  }

  function readFromScroll() {
    const idx = clamp(Math.round(wheel.scrollTop / itemHeight()));
    if (idx !== value) {
      value = idx;
      highlight();
    }
  }

  wheel.addEventListener("scroll", () => {
    if (suppressScrollRead) return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(readFromScroll, 80);
  });

  wheel.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setValue(value - 1, true);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setValue(value + 1, true);
    } else if (e.key === "Home") {
      e.preventDefault();
      setValue(0, true);
    } else if (e.key === "End") {
      e.preventDefault();
      setValue(max, true);
    } else if (/^\d$/.test(e.key)) {
      e.preventDefault();
      const candidate = parseInt(typeBuffer + e.key, 10);
      if (candidate <= max) {
        typeBuffer += e.key;
        setValue(candidate, true);
      } else {
        typeBuffer = e.key;
        setValue(clamp(parseInt(e.key, 10)), true);
      }
      clearTimeout(typeTimer);
      if (typeBuffer.length >= 2) {
        typeBuffer = "";
      } else {
        typeTimer = setTimeout(() => {
          typeBuffer = "";
        }, 800);
      }
    }
  });

  function sync() {
    wheel.scrollTop = value * itemHeight();
    highlight();
  }

  return {
    element: wheel,
    getValue: () => value,
    setValue: (v) => setValue(v, true),
    sync,
  };
}

function createTimePicker(defaultHour, defaultMinute) {
  const wrap = document.createElement("div");
  wrap.className = "time-picker";

  const hour = createTimeWheel(23, defaultHour);
  const minute = createTimeWheel(59, defaultMinute);

  const colon = document.createElement("span");
  colon.className = "time-colon";
  colon.textContent = ":";

  wrap.appendChild(hour.element);
  wrap.appendChild(colon);
  wrap.appendChild(minute.element);

  return {
    element: wrap,
    getValue: () => `${pad2(hour.getValue())}:${pad2(minute.getValue())}`,
    sync: () => {
      hour.sync();
      minute.sync();
    },
  };
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

// ─── Render & navigation ─────────────────────────────────────────

function renderWeekdays() {
  weekdaysEl.innerHTML = "";
  weekdayShort.forEach((label) => {
    const span = document.createElement("span");
    span.textContent = label;
    weekdaysEl.appendChild(span);
  });
}

function renderCalendar() {
  month_year.textContent = `${monthNames[viewMonth]}/${pad2(viewYear % 100)}`;

  calendar_div.innerHTML = "";

  // Leading blanks so day 1 lands under the correct weekday (Mon-first).
  const firstOffset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  for (let i = 0; i < firstOffset; i++) {
    const blank = document.createElement("div");
    blank.className = "cal-blank";
    calendar_div.appendChild(blank);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const day = document.createElement("div");
    day.textContent = d;
    day.style.position = "relative";
    day.dataset.day = String(d);
    day.addEventListener("click", () => openCard(d));
    calendar_div.appendChild(day);
  }

  void loadMonthMarkers();
}

function changeMonth(delta) {
  viewMonth += delta;
  while (viewMonth < 0) {
    viewMonth += 12;
    viewYear -= 1;
  }
  while (viewMonth > 11) {
    viewMonth -= 12;
    viewYear += 1;
  }
  renderCalendar();
}

function goToMonth(targetMonth, targetYear) {
  viewMonth = targetMonth;
  viewYear = targetYear;
  renderCalendar();
}

// Markers for the currently displayed month.
async function loadMonthMarkers() {
  const reqMonth = viewMonth;
  const reqYear = viewYear;
  try {
    const [eventsRes, dayPagesRes, obligationsRes] = await Promise.all([
      fetch(`${API_BASE}/calendar/events`),
      fetch(`${API_BASE}/todo/day-pages/`),
      fetch(`${API_BASE}/obligations/`),
    ]);

    const marked = new Set();
    const monthPrefix = `${reqYear}-${pad2(reqMonth + 1)}-`;

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

    // Ignore if the user already navigated to another month meanwhile.
    if (reqMonth !== viewMonth || reqYear !== viewYear) return;

    calendar_div.querySelectorAll("[data-day]").forEach((cell) => {
      const iso = isoForDay(Number(cell.dataset.day));
      cell.classList.toggle("has-events", marked.has(iso));
    });
  } catch (err) {
    console.error("loadMonthMarkers failed:", err);
  }
}

// ─── Month / year picker ─────────────────────────────────────────

let pickerEl = null;

function buildMonthPicker() {
  const pop = document.createElement("div");
  pop.className = "cal-month-picker";
  pop.hidden = true;

  const yearRow = document.createElement("div");
  yearRow.className = "cal-picker-year";

  const yPrev = document.createElement("button");
  yPrev.type = "button";
  yPrev.className = "cal-picker-yarrow";
  yPrev.textContent = "‹";

  const yLabel = document.createElement("span");
  yLabel.className = "cal-picker-ylabel";

  const yNext = document.createElement("button");
  yNext.type = "button";
  yNext.className = "cal-picker-yarrow";
  yNext.textContent = "›";

  yearRow.append(yPrev, yLabel, yNext);

  const monthsGrid = document.createElement("div");
  monthsGrid.className = "cal-picker-months";

  let pickerYear = viewYear;

  function refresh() {
    yLabel.textContent = String(pickerYear);
    Array.from(monthsGrid.children).forEach((btn, idx) => {
      btn.classList.toggle(
        "is-current",
        idx === viewMonth && pickerYear === viewYear,
      );
    });
  }

  monthNames.forEach((name, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cal-picker-month";
    btn.textContent = name.slice(0, 3);
    btn.title = name;
    btn.addEventListener("click", () => {
      goToMonth(idx, pickerYear);
      closePicker();
    });
    monthsGrid.appendChild(btn);
  });

  yPrev.addEventListener("click", () => {
    pickerYear -= 1;
    refresh();
  });
  yNext.addEventListener("click", () => {
    pickerYear += 1;
    refresh();
  });

  pop.append(yearRow, monthsGrid);
  calNav.appendChild(pop);

  pop.openAtCurrent = () => {
    pickerYear = viewYear;
    refresh();
    pop.hidden = false;
  };
  return pop;
}

function openPicker() {
  if (!pickerEl) pickerEl = buildMonthPicker();
  pickerEl.openAtCurrent();
}

function closePicker() {
  if (pickerEl) pickerEl.hidden = true;
}

month_year.addEventListener("click", (e) => {
  e.stopPropagation();
  if (pickerEl && !pickerEl.hidden) {
    closePicker();
  } else {
    openPicker();
  }
});

document.addEventListener("click", (e) => {
  if (pickerEl && !pickerEl.hidden && !calNav.contains(e.target)) {
    closePicker();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePicker();
});

prevBtn.addEventListener("click", () => changeMonth(-1));
nextBtn.addEventListener("click", () => changeMonth(1));

renderWeekdays();
renderCalendar();
