const API_BASE = "http://127.0.0.1:8000";

const todoList = document.getElementById("todo-list");
const todoInput = document.getElementById("todo-input");
const addTodoBtn = document.getElementById("add-todo");
const dayDateEl = document.getElementById("day-date");

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

  const data = await res.json();
  currentDayId = data.id;
  dayDateEl.textContent = formatDateHuman(data.date);
  renderTodos(data.todos);
}

async function createDay(dateIso) {
  await fetch(`${API_BASE}/todo/day-pages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: dateIso, note: "" })
  });
}

function renderTodos(todos) {
  todoList.innerHTML = "";
  todos.forEach((todo) => {
    const li = document.createElement("li");
    const checkbox = document.createElement("input");
    const label = document.createElement("label");

    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.dataset.id = todo.id;

    label.textContent = todo.title;

    li.appendChild(checkbox);
    li.appendChild(label);
    todoList.appendChild(li);
  });
}

todoList.addEventListener("change", async (event) => {
  if (event.target.tagName !== "INPUT") return;

  const todoId = event.target.dataset.id;
  const done = event.target.checked;

  await fetch(`${API_BASE}/todo/items/${todoId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ done })
  });
});

addTodoBtn.addEventListener("click", async () => {
  const title = todoInput.value.trim();
  if (!title || !currentDayId) return;

  const res = await fetch(`${API_BASE}/todo/day-pages/${currentDayId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, done: false, position: 0 })
  });

  const newItem = await res.json();
  todoInput.value = "";

  // Dodaj novu stavku odmah u UI bez reload-a
  renderTodos([...document.querySelectorAll("#todo-list li")].map(li => ({
    id: li.querySelector("input").dataset.id,
    title: li.querySelector("label").textContent,
    done: li.querySelector("input").checked,
    position: 0
  })).concat([newItem]));
});

document.addEventListener("DOMContentLoaded", () => {
  const today = formatDateISO(new Date());
  loadDay(today);
});