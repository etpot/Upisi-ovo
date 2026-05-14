const API_BASE = "http://127.0.0.1:8000";

const todoList = document.getElementById("todo-list");
const todoInput = document.getElementById("todo-input");
const addTodoBtn = document.getElementById("add-todo-btn");
const dayDateEl = document.getElementById("day-date");
const form = document.getElementById("todo-form");
const loadTodosDiv = document.getElementById("load-todos-div");
const loadTodosList = document.getElementById("load-todos-list");
const clearDoneBtn = document.getElementById("clear-done-todos-btn");
const clearOldBtn = document.getElementById("clear-old-todos-btn");

let currentDayId = null;
let currentDate = null;

function formatDateISO(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(dateStr) {
  const [year, month, day] = dateStr.split("-");
  return `${day}-${month}-${year}`;
}

async function loadDay(dateIso) {
  currentDate = dateIso;

  const res = await fetch(`${API_BASE}/todo/day-pages/${dateIso}`);
  if (res.status === 404) {
    await createDay(dateIso);
    return loadDay(dateIso);
  }
  if (!res.ok) {
    console.error("loadDay failed:", res.status, await res.text());
    return;
  }

  const data = await res.json();
  currentDayId = data.id;
  dayDateEl.textContent = formatDateDisplay(data.date);
  renderTodos(data.todos);
}

async function loadAllDayPages() {
  const res = await fetch(`${API_BASE}/todo/day-pages/`);

  if (!res.ok) {
    console.error("loadAllDayPages failed:", res.status, await res.text());
    return;
  }

  const dayPages = await res.json();
  renderDayPages(dayPages.filter((dayPage) => dayPage.date !== currentDate));
}

async function createDay(dateIso) {
  const res = await fetch(`${API_BASE}/todo/day-pages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: dateIso, note: "" }),
  });

  if (![201, 409].includes(res.status)) {
    console.error("createDay failed:", res.status, await res.text());
  }
}

function renderTodos(todos) {
  todoList.innerHTML = "";
  todos.forEach((todo) => {
    const li = document.createElement("li");
    const checkbox = document.createElement("input");
    const label = document.createElement("label");

    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.dataset.id = String(todo.id);
    label.textContent = todo.title;

    li.appendChild(checkbox);
    li.appendChild(label);
    todoList.appendChild(li);
  });
}

function renderDayPages(dayPages) {
  loadTodosList.innerHTML = "";

  if (dayPages.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = "There's no saved pages.";
    loadTodosList.appendChild(emptyItem);
    return;
  }

  dayPages.forEach((dayPage) => {
    const item = document.createElement("li");
    const title = document.createElement("h3");
    const date = document.createElement("p");
    const todos = document.createElement("ul");

    item.className = "loaded-day-page";
    title.textContent = "Dnevna to-do lista";
    date.className = "date";
    date.textContent = formatDateDisplay(dayPage.date);
    todos.id = `todo-list-${dayPage.id}`;

    dayPage.todos.forEach((todo) => {
      const todoItem = document.createElement("li");
      const checkbox = document.createElement("input");
      const label = document.createElement("label");

      checkbox.type = "checkbox";
      checkbox.checked = todo.done;
      checkbox.disabled = true;
      label.textContent = todo.title;

      todoItem.appendChild(checkbox);
      todoItem.appendChild(label);
      todos.appendChild(todoItem);
    });

    item.appendChild(title);
    item.appendChild(date);
    item.appendChild(todos);
    loadTodosList.appendChild(item);
  });
}

async function addTodo() {
  const title = todoInput.value.trim();
  if (!title || !currentDayId) return;

  const res = await fetch(`${API_BASE}/todo/day-pages/${currentDayId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, done: false, position: 0 }),
  });

  if (!res.ok) {
    console.error("addTodo failed:", res.status, await res.text());
    return;
  }

  todoInput.value = "";
  await loadDay(currentDate);
}
async function clearDoneTodos() {
  console.log("clearDoneTodos called, currentDayId:", currentDayId);
  if (!currentDayId) return;

  const url = `${API_BASE}/todo/day-pages/${currentDayId}/clear-done`;
  console.log("Sending DELETE to:", url);

  const res = await fetch(url, {
    method: "DELETE",
  });

  console.log("Response status:", res.status);

  if (!res.ok) {
    const errorText = await res.text();
    console.error("clearDoneTodos failed:", res.status, errorText);
    return;
  }

  console.log("Delete successful, reloading day...");
  await loadDay(currentDate);
  console.log("Day reloaded");
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  await addTodo();
});

addTodoBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  await addTodo();
});

clearDoneBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  await clearDoneTodos();
});
clearDoneBtn?.addEventListener("submit", async (e) => {
  e.preventDefault();
  await clearDoneTodos();
});

todoList?.addEventListener("change", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return;

  const todoId = target.dataset.id;
  const done = target.checked;

  const res = await fetch(`${API_BASE}/todo/items/${todoId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ done }),
  });

  if (!res.ok) {
    console.error("patch todo failed:", res.status, await res.text());
    return;
  }

  await loadDay(currentDate);
});

document.addEventListener("DOMContentLoaded", () => {
  loadDay(formatDateISO(new Date()));
  loadAllDayPages();
});

// expose for manual testing from DevTools
window.clearDoneTodos = clearDoneTodos;
window.loadDay = loadDay; // opcionalno za ručno testiranje refresh-a
// expose functions only; call them manually from DevTools when needed