// Shared auth helpers. Include this BEFORE any other page script.
// Wrapped in an IIFE so it doesn't collide with `API_BASE` declared in the
// other page scripts (classic scripts all share one global scope).
(() => {
  const API_BASE = "http://127.0.0.1:8000";

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

  window.UpisiAuth = { API_BASE, fetchMe, requireAuth, logout, redirectToLogin };

  // Guard every page except the login screen itself.
  if (!document.body || !document.body.classList.contains("page-login")) {
    requireAuth();
  }
})();
