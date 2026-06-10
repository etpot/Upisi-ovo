const API_BASE_OBLIGATIONS = "http://127.0.0.1:8000";

const obligationInput = document.getElementById("obligation-item-input");
const obligationDateInput = document.getElementById("obligation-date-input");
const obligationForm = document.getElementById("obligation-actions-form");

function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatDueDate(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.`;
}

if (obligationDateInput && !obligationDateInput.value) {
  obligationDateInput.value = todayISO();
}
const obligationDeleteModeBtn = document.getElementById("obligation-delete-mode-btn");
const obligationsPanel = document.getElementById("obligations-panel");

const obligationConfigs = {
  urgent: {
    title: "urgent",
    label: "Hitno",
    list: document.getElementById("obligations-urgent"),
  },
  important: {
    title: "important",
    label: "Važno",
    list: document.getElementById("obligations-important"),
  },
  wait: {
    title: "wait",
    label: "Može da sačeka",
    list: document.getElementById("obligations-wait"),
  },
};

const obligationState = {
  urgent: { id: null, items: [] },
  important: { id: null, items: [] },
  wait: { id: null, items: [] },
};

const obligationRequests = {
  urgent: null,
  important: null,
  wait: null,
};

let obligationDeleteModeActive = false;
let selectedObligationItemIds = new Set();

function renderObligationItems(key, items) {
  const list = obligationConfigs[key]?.list;
  if (!list) return;

  list.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");

    if (obligationDeleteModeActive) {
      const checkbox = document.createElement("input");
      const label = document.createElement("label");

      checkbox.type = "checkbox";
      checkbox.checked = selectedObligationItemIds.has(item.id);
      checkbox.dataset.selectId = String(item.id);
      checkbox.id = `obligation-item-${item.id}`;
      label.htmlFor = checkbox.id;
      label.textContent = item.title;

      li.appendChild(checkbox);
      li.appendChild(label);
    } else {
      const text = document.createElement("span");
      text.textContent = item.title;
      li.appendChild(text);
    }

    if (item.due_date) {
      const date = document.createElement("span");
      date.className = "obligation-item-date";
      date.textContent = formatDueDate(item.due_date);
      li.appendChild(date);
    }

    list.appendChild(li);
  });
}

function renderAllObligationItems() {
  Object.keys(obligationConfigs).forEach((key) => {
    renderObligationItems(key, obligationState[key].items);
  });
}

function setDeleteMode(active) {
  obligationDeleteModeActive = active;
  selectedObligationItemIds = new Set();

  if (obligationDeleteModeBtn) {
    obligationDeleteModeBtn.classList.toggle("is-active", active);
  }

  obligationsPanel?.classList.toggle("is-delete-mode", active);

  renderAllObligationItems();
}

async function ensureObligation(key) {
  const config = obligationConfigs[key];
  if (!config) return null;

  if (obligationRequests[key]) {
    return obligationRequests[key];
  }

  obligationRequests[key] = (async () => {
    const res = await fetch(
      `${API_BASE_OBLIGATIONS}/obligations?title=${encodeURIComponent(config.title)}`,
    );
    if (!res.ok) {
      console.error(`load ${key} obligation failed:`, res.status, await res.text());
      return null;
    }

    const list = await res.json();
    let obligation = list[0];

    if (!obligation) {
      const createRes = await fetch(`${API_BASE_OBLIGATIONS}/obligations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: config.title,
          description: "",
          position: 0,
        }),
      });

      if (!createRes.ok) {
        console.error(
          `create ${key} obligation failed:`,
          createRes.status,
          await createRes.text(),
        );
        return null;
      }

      obligation = await createRes.json();
    }

    obligationState[key].id = obligation.id;
    return obligation;
  })().finally(() => {
    obligationRequests[key] = null;
  });

  return obligationRequests[key];
}

async function loadObligationItems(key) {
  const obligation = await ensureObligation(key);
  if (!obligation) return;

  obligationState[key].items = obligation.obligation_items || [];
  renderObligationItems(key, obligationState[key].items);
}

async function loadAllObligations() {
  await Promise.all(
    Object.keys(obligationConfigs).map((key) => loadObligationItems(key)),
  );
}

async function addObligationItem(key) {
  const title = obligationInput?.value.trim();
  if (!title) return false;

  if (!obligationState[key].id) {
    const obligation = await ensureObligation(key);
    if (!obligation) return false;
  }

  const dueDate = obligationDateInput?.value || null;

  const res = await fetch(
    `${API_BASE_OBLIGATIONS}/obligations/${obligationState[key].id}/items`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: null, due_date: dueDate }),
    },
  );

  if (!res.ok) {
    console.error(`add ${key} item failed:`, res.status, await res.text());
    return false;
  }

  obligationInput.value = "";
  await loadObligationItems(key);
  return true;
}

async function deleteSelectedObligationItems() {
  const selectedIds = Array.from(selectedObligationItemIds);
  if (selectedIds.length === 0) return false;

  const results = await Promise.all(
    selectedIds.map((itemId) =>
      fetch(`${API_BASE_OBLIGATIONS}/obligations/items/${itemId}`, {
        method: "DELETE",
      }),
    ),
  );

  const failed = results.find((res) => !res.ok);
  if (failed) {
    console.error("delete selected obligation items failed:", failed.status, await failed.text());
    return false;
  }

  setDeleteMode(false);
  await loadAllObligations();
  return true;
}

async function handleDeleteModeButton() {
  if (!obligationDeleteModeActive) {
    await loadAllObligations();
    setDeleteMode(true);
    return;
  }

  if (selectedObligationItemIds.size === 0) {
    setDeleteMode(false);
    return;
  }

  await deleteSelectedObligationItems();
}

async function handleObligationAction(key) {
  if (!obligationConfigs[key]) return;

  await addObligationItem(key);
  obligationInput?.focus();
}

obligationForm?.addEventListener("click", async (e) => {
  if (!(e.target instanceof Element)) return;

  const button = e.target.closest("button");
  if (!button || !obligationForm.contains(button)) return;

  e.preventDefault();

  if (button.dataset.deleteModeToggle) {
    await handleDeleteModeButton();
    return;
  }

  const obligationKey = button.dataset.obligation;
  if (!obligationKey) return;

  await handleObligationAction(obligationKey);
});

obligationForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  await handleObligationAction("urgent");
});

obligationsPanel?.addEventListener("change", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return;
  if (!obligationDeleteModeActive || !target.dataset.selectId) return;

  const itemId = Number(target.dataset.selectId);
  if (target.checked) {
    selectedObligationItemIds.add(itemId);
  } else {
    selectedObligationItemIds.delete(itemId);
  }
});

void loadAllObligations();
