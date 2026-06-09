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

const currentDate = new Date();
const month = currentDate.getMonth();
const year__cur = currentDate.getFullYear();
const year = year__cur % 1000;

month_year.innerHTML = `${monthNames[month]}/${year}`;

const number_of_days = new Date(year, month + 1, 0).getDate();

function storageKey(day) {
  return `cal-events-${year}-${month}-${day}`;
}

function loadEvents(day) {
  return JSON.parse(localStorage.getItem(storageKey(day)) || "[]");
}

function saveEvents(day, events) {
  localStorage.setItem(storageKey(day), JSON.stringify(events));
}

function refreshDayMarker(dayNum) {
  const divs = calendar_div.querySelectorAll("div");
  const div = divs[dayNum - 1];
  if (!div) return;
  div.classList.toggle("has-events", loadEvents(dayNum).length > 0);
}

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

  const eventList = document.createElement("ul");
  eventList.className = "cal-event-list";

  function renderEvents() {
    eventList.innerHTML = "";
    const events = loadEvents(dayNum);
    if (events.length === 0) {
      const hint = document.createElement("p");
      hint.className = "cal-empty-hint";
      hint.textContent = "Nema eventa za ovaj dan.";
      eventList.appendChild(hint);
      return;
    }
    events.forEach((text, idx) => {
      const li = document.createElement("li");
      li.className = "cal-event-item";

      const span = document.createElement("span");
      span.textContent = text;

      const del = document.createElement("button");
      del.className = "cal-event-delete";
      del.textContent = "✕";
      del.addEventListener("click", () => {
        const updated = loadEvents(dayNum);
        updated.splice(idx, 1);
        saveEvents(dayNum, updated);
        refreshDayMarker(dayNum);
        renderEvents();
      });

      li.appendChild(span);
      li.appendChild(del);
      eventList.appendChild(li);
    });
  }

  function addEvent() {
    const text = input.value.trim();
    if (!text) return;
    const events = loadEvents(dayNum);
    events.push(text);
    saveEvents(dayNum, events);
    refreshDayMarker(dayNum);
    input.value = "";
    renderEvents();
  }

  addBtn.addEventListener("click", addEvent);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addEvent();
  });

  renderEvents();

  body.appendChild(inputRow);
  body.appendChild(eventList);
  card.appendChild(header);
  card.appendChild(body);
  overlay.appendChild(card);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
  input.focus();
}

for (let i = 1; i <= number_of_days; i++) {
  const day = document.createElement("div");
  day.textContent = i;
  day.style.position = "relative";
  calendar_div.appendChild(day);

  if (loadEvents(i).length > 0) day.classList.add("has-events");

  day.addEventListener("click", () => openCard(i));
}
