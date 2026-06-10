const { API_BASE, fetchMe } = window.UpisiAuth;

const form = document.getElementById("auth-form");
const nameField = document.getElementById("field-name");
const nameInput = document.getElementById("auth-name");
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

  nameField.hidden = !isRegister;
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

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showError("");

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const fullName = nameInput.value.trim();

  if (!email || !password) {
    showError("Unesi email i lozinku.");
    return;
  }
  if (mode === "register" && password.length < 8) {
    showError("Lozinka mora imati najmanje 8 karaktera.");
    return;
  }

  const endpoint = mode === "register" ? "/auth/register" : "/auth/login";
  const body =
    mode === "register"
      ? { email, password, full_name: fullName || null }
      : { email, password };

  submitBtn.disabled = true;
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showError(data.detail || "Došlo je do greške. Pokušaj ponovo.");
      return;
    }

    window.location.replace("index.html");
  } catch (err) {
    console.error("auth submit failed:", err);
    showError("Server nije dostupan. Provjeri da li backend radi.");
  } finally {
    submitBtn.disabled = false;
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
