const API_BASE = "http://127.0.0.1:8000";

const todoList = document.getElementById("todo-list");
const todoInput = document.getElementById("todo-input");
const dayDateEl = document.getElementById("day-date");
const form = document.getElementById("todo-form");
const loadTodosDiv = document.getElementById("load-todos-div");
const loadTodosList = document.getElementById("load-todos-list");
const todoDeleteModeBtn = document.getElementById("todo-delete-mode-btn");

let currentDayId = null;
let currentDate = null;
let currentTodos = [];
let loadedDayPages = [];
let isDeleteMode = false;
let selectedTodoIds = new Set();

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

function renderTodoList(listElement, todos, { deleteMode, readOnly }) {
  listElement.innerHTML = "";

  todos.forEach((todo) => {
    const li = document.createElement("li");
    const doneCheckbox = document.createElement("input");
    const label = document.createElement("label");

    if (deleteMode) {
      const deleteCheckbox = document.createElement("input");

      deleteCheckbox.type = "checkbox";
      deleteCheckbox.className = "todo-delete-checkbox";
      deleteCheckbox.checked = selectedTodoIds.has(todo.id);
      deleteCheckbox.dataset.selectId = String(todo.id);

      doneCheckbox.type = "checkbox";
      doneCheckbox.checked = todo.done;
      doneCheckbox.dataset.id = String(todo.id);
      doneCheckbox.disabled = Boolean(readOnly);

      li.appendChild(deleteCheckbox);
      li.appendChild(doneCheckbox);
    } else {
      doneCheckbox.type = "checkbox";
      doneCheckbox.checked = todo.done;
      doneCheckbox.dataset.id = String(todo.id);
      doneCheckbox.disabled = Boolean(readOnly);

      li.appendChild(doneCheckbox);
    }

    label.className = todo.done ? "todo-done" : "";
    label.textContent = todo.title;

    li.appendChild(label);
    listElement.appendChild(li);
  });
}

function renderTodos(todos) {
  renderTodoList(todoList, todos, { deleteMode: isDeleteMode, readOnly: false });
}

function renderDayPages(dayPages) {
  loadTodosList.innerHTML = "";

  if (dayPages.length === 0) {
    return;
  }

  dayPages.forEach((dayPage) => {
    const item = document.createElement("li");
    const date = document.createElement("p");
    const todos = document.createElement("ul");

    item.className = "loaded-day-page";
    date.className = "date";
    date.textContent = formatDateDisplay(dayPage.date);
    todos.id = `todo-list-${dayPage.id}`;

    renderTodoList(todos, dayPage.todos, {
      deleteMode: isDeleteMode,
      readOnly: true,
    });

    item.appendChild(date);
    item.appendChild(todos);
    loadTodosList.appendChild(item);
  });
}

function setDeleteMode(active) {
  isDeleteMode = active;
  selectedTodoIds = new Set();

  if (todoDeleteModeBtn) {
    todoDeleteModeBtn.classList.toggle("is-active", active);
  }

  todoList?.classList.toggle("is-delete-mode", active);
  loadTodosList?.classList.toggle("is-delete-mode", active);
  loadTodosDiv?.classList.toggle("is-delete-mode", active);

  renderTodos(currentTodos);
  renderDayPages(loadedDayPages);
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
  currentTodos = data.todos;
  dayDateEl.textContent = formatDateDisplay(data.date);
  renderTodos(currentTodos);
}

async function loadAllDayPages() {
  const res = await fetch(`${API_BASE}/todo/day-pages/`);

  if (!res.ok) {
    console.error("loadAllDayPages failed:", res.status, await res.text());
    return;
  }

  const dayPages = await res.json();
  loadedDayPages = dayPages.filter(
    (dayPage) => dayPage.date !== currentDate && dayPage.todos.length > 0,
  );
  renderDayPages(loadedDayPages);
}

async function refreshTodoViews() {
  await loadDay(currentDate);
  await loadAllDayPages();
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
  await refreshTodoViews();
}

async function deleteSelectedTodos() {
  if (!isDeleteMode || selectedTodoIds.size === 0) return false;

  const deleteRequests = Array.from(selectedTodoIds).map((todoId) =>
    fetch(`${API_BASE}/todo/items/${todoId}`, { method: "DELETE" }),
  );

  const results = await Promise.all(deleteRequests);
  const failed = results.find((res) => !res.ok);

  if (failed) {
    console.error("deleteSelectedTodos failed:", failed.status, await failed.text());
    return false;
  }

  setDeleteMode(false);
  await refreshTodoViews();
  return true;
}

async function handleDeleteModeButton() {
  if (!isDeleteMode) {
    setDeleteMode(true);
    void loadAllDayPages();
    return;
  }

  if (selectedTodoIds.size === 0) {
    setDeleteMode(false);
    return;
  }

  await deleteSelectedTodos();
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  await addTodo();
});

todoDeleteModeBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  await handleDeleteModeButton();
});

function handleTodoCheckboxChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return;

  if (isDeleteMode && target.dataset.selectId) {
    const todoId = Number(target.dataset.selectId);
    if (target.checked) {
      selectedTodoIds.add(todoId);
    } else {
      selectedTodoIds.delete(todoId);
    }
    return;
  }

  const todoId = target.dataset.id;
  if (!todoId) return;

  const done = target.checked;

  fetch(`${API_BASE}/todo/items/${todoId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ done }),
  })
    .then(async (res) => {
      if (!res.ok) {
        console.error("patch todo failed:", res.status, await res.text());
        return;
      }

      await refreshTodoViews();
    })
    .catch((error) => {
      console.error("patch todo failed:", error);
    });
}

todoList?.addEventListener("change", handleTodoCheckboxChange);
loadTodosList?.addEventListener("change", handleTodoCheckboxChange);

document.addEventListener("DOMContentLoaded", async () => {
  await loadDay(formatDateISO(new Date()));
  await loadAllDayPages();
});

window.deleteSelectedTodos = deleteSelectedTodos;
window.loadDay = loadDay;
