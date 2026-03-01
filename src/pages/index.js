const API_BASE = "http://127.0.0.1:8000";

const todoList = document.getElementById("todo-list");
const todoInput = document.getElementById("todo-input");
const addTodoBtn = document.getElementById("add-todo-btn");
const dayDateEl = document.getElementById("day-date");
const form = document.getElementById("todo-form");

let currentDayId = null;
let currentDate = null;

function formatDateISO(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateHuman(isoDate) {
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
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
  dayDateEl.textContent = formatDateHuman(data.date);
  renderTodos(data.todos);
}

async function createDay(dateIso) {
  const res = await fetch(`${API_BASE}/todo/day-pages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: dateIso, note: "" }),
  });

  // 201 = kreiran, 409 = već postoji (oba su OK za naš flow)
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

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  await addTodo();
});

addTodoBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  await addTodo();
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
});