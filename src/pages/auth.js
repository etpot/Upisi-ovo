// Shared auth helpers. Include this BEFORE any other page script.
// Wrapped in an IIFE so it doesn't collide with `API_BASE` declared in the
// other page scripts (classic scripts all share one global scope).
(() => {
  const API_BASE = `http://${window.location.hostname}:8000`;

  // ─── Dark mode ──────────────────────────────────────────────────
  const DARK_KEY = "upisiovo-dark";
  function applyDarkMode(on) {
    document.body.classList.toggle("dark", on);
  }
  applyDarkMode(localStorage.getItem(DARK_KEY) === "1");

  // Make sure the HttpOnly session cookie is sent on every cross-origin API
  // call. Patching fetch here means the existing page scripts need no changes.
  const origFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    if (url.startsWith(API_BASE)) {
      return origFetch(input, { credentials: "include", ...init });
    }
    return origFetch(input, init);
  };

  async function fetchMe() {
    try {
      const res = await fetch(`${API_BASE}/auth/me`);
      return res.ok ? await res.json() : null;
    } catch (err) {
      console.error("auth check failed:", err);
      return null;
    }
  }

  function redirectToLogin() {
    window.location.replace("login.html");
  }

  async function requireAuth() {
    const me = await fetchMe();
    if (!me) {
      redirectToLogin();
      return null;
    }
    return me;
  }

  async function logout() {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: "POST" });
    } catch (err) {
      console.error("logout failed:", err);
    }
    redirectToLogin();
  }

  // ─── Shared user menu (☰ → username, settings, logout) ──────────
  function injectUserMenu(user) {
    if (document.getElementById("user-menu")) return;

    const menu = document.createElement("div");
    menu.className = "user-menu";
    menu.id = "user-menu";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "user-menu-toggle";
    toggle.setAttribute("aria-label", "Meni");
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = "<span></span><span></span><span></span>";

    const panel = document.createElement("div");
    panel.className = "user-menu-panel";
    panel.hidden = true;

    const head = document.createElement("div");
    head.className = "user-menu-head";
    const name = document.createElement("span");
    name.className = "user-menu-name";
    name.textContent = `@${user.username}`;
    const email = document.createElement("span");
    email.className = "user-menu-email";
    email.textContent = user.email || "";
    head.appendChild(name);
    head.appendChild(email);

    const settingsItem = document.createElement("button");
    settingsItem.type = "button";
    settingsItem.className = "user-menu-item";
    settingsItem.textContent = "Podešavanja";

    const darkItem = document.createElement("button");
    darkItem.type = "button";
    darkItem.className = "user-menu-item user-menu-dark";
    darkItem.setAttribute("role", "switch");

    const darkLabel = document.createElement("span");
    darkLabel.className = "dark-toggle-label";
    darkLabel.textContent = "Tamni mod";

    const darkTrack = document.createElement("span");
    darkTrack.className = "dark-toggle-track";
    const darkThumb = document.createElement("span");
    darkThumb.className = "dark-toggle-thumb";
    darkTrack.appendChild(darkThumb);

    darkItem.appendChild(darkLabel);
    darkItem.appendChild(darkTrack);

    function syncDarkToggle() {
      const on = document.body.classList.contains("dark");
      darkItem.setAttribute("aria-checked", String(on));
      darkTrack.classList.toggle("is-on", on);
    }
    syncDarkToggle();

    darkItem.addEventListener("click", () => {
      const next = !document.body.classList.contains("dark");
      applyDarkMode(next);
      localStorage.setItem(DARK_KEY, next ? "1" : "0");
      syncDarkToggle();
    });

    const logoutItem = document.createElement("button");
    logoutItem.type = "button";
    logoutItem.className = "user-menu-item user-menu-logout";
    logoutItem.textContent = "Odjava";

    panel.appendChild(head);
    panel.appendChild(settingsItem);
    panel.appendChild(darkItem);
    panel.appendChild(logoutItem);
    menu.appendChild(toggle);
    menu.appendChild(panel);
    document.body.appendChild(menu);

    function setOpen(open) {
      panel.hidden = !open;
      menu.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    }

    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      setOpen(panel.hidden);
    });
    settingsItem.addEventListener("click", () => {
      setOpen(false);
      // Placeholder until the settings page is built.
      alert("Podešavanja stižu uskoro.");
    });
    logoutItem.addEventListener("click", () => logout());

    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
  }

  window.UpisiAuth = { API_BASE, fetchMe, requireAuth, logout, redirectToLogin };

  // Guard every page except the login screen itself, then mount the menu.
  if (!document.body || !document.body.classList.contains("page-login")) {
    requireAuth().then((user) => {
      if (user) injectUserMenu(user);
    });
  }
})();
