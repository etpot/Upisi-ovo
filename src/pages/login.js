const { API_BASE, fetchMe } = window.UpisiAuth;

const USERNAME_RE = /^[A-Za-z0-9._-]{3,30}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const form = document.getElementById("auth-form");
const identifierField = document.getElementById("field-identifier");
const usernameField = document.getElementById("field-username");
const emailField = document.getElementById("field-email");
const identifierInput = document.getElementById("auth-identifier");
const usernameInput = document.getElementById("auth-username");
const emailInput = document.getElementById("auth-email");
const passwordInput = document.getElementById("auth-password");
const submitBtn = document.getElementById("auth-submit");
const errorEl = document.getElementById("auth-error");
const registerHint = document.getElementById("register-hint");
const tabs = document.querySelectorAll(".auth-tab");
const socialButtons = document.querySelectorAll(".auth-social-btn");

let mode = "login"; // "login" | "register"

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = !message;
}

function setMode(nextMode) {
  mode = nextMode;
  const isRegister = mode === "register";

  tabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.tab === mode);
  });

  identifierField.hidden = isRegister;
  usernameField.hidden = !isRegister;
  emailField.hidden = !isRegister;
  registerHint.hidden = !isRegister;

  submitBtn.textContent = isRegister ? "Registruj se" : "Prijavi se";
  passwordInput.setAttribute(
    "autocomplete",
    isRegister ? "new-password" : "current-password",
  );
  showError("");
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.tab));
});

async function handleLogin() {
  const identifier = identifierInput.value.trim();
  const password = passwordInput.value;

  if (!identifier || !password) {
    showError("Unesi korisničko ime/email i lozinku.");
    return;
  }

  await submit("/auth/login", { identifier, password });
}

async function handleRegister() {
  const username = usernameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!USERNAME_RE.test(username)) {
    showError(
      "Korisničko ime: 3–30 karaktera (slova, brojevi, . _ -).",
    );
    return;
  }
  if (!EMAIL_RE.test(email)) {
    showError("Unesi ispravnu email adresu.");
    return;
  }
  if (password.length < 8) {
    showError("Lozinka mora imati najmanje 8 karaktera.");
    return;
  }

  await submit("/auth/register", { username, email, password });
}

async function submit(endpoint, body) {
  submitBtn.disabled = true;
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showError(extractError(data) || "Došlo je do greške. Pokušaj ponovo.");
      return;
    }

    window.location.replace("index.html");
  } catch (err) {
    console.error("auth submit failed:", err);
    showError("Server nije dostupan. Provjeri da li backend radi.");
  } finally {
    submitBtn.disabled = false;
  }
}

function extractError(data) {
  if (!data || !data.detail) return "";
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) {
    const first = data.detail[0];
    if (typeof first === "string") return first;
    if (first && typeof first.msg === "string") {
      return first.msg.replace(/^Value error,\s*/, "");
    }
  }
  return "";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showError("");
  if (mode === "register") {
    await handleRegister();
  } else {
    await handleLogin();
  }
});

async function setupSocialButtons() {
  let providers = { google: false, facebook: false };
  try {
    const res = await fetch(`${API_BASE}/auth/providers`);
    if (res.ok) providers = await res.json();
  } catch (err) {
    console.error("providers check failed:", err);
  }

  socialButtons.forEach((btn) => {
    const provider = btn.dataset.provider;
    const enabled = Boolean(providers[provider]);
    btn.classList.toggle("is-disabled", !enabled);

    btn.addEventListener("click", () => {
      if (!enabled) {
        showError(
          `Prijava preko ${provider === "google" ? "Google" : "Facebook"}-a još nije konfigurisana.`,
        );
        return;
      }
      window.location.href = `${API_BASE}/auth/${provider}/login`;
    });
  });
}

// If already logged in, skip the login screen.
(async () => {
  const me = await fetchMe();
  if (me) {
    window.location.replace("index.html");
    return;
  }
  setupSocialButtons();
})();
