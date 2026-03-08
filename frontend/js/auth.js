async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById("reg-name").value.trim();
  const pass = document.getElementById("reg-pass").value.trim();
  if (!name || !pass) return;

  try {
    const data = await apiPost("/api/register", {
      display_name: name,
      passphrase: pass,
    });
    setAuth(data);
    showLobby();
  } catch (err) {
    document.getElementById("auth-error").textContent = err.message;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const name = document.getElementById("login-name").value.trim();
  const pass = document.getElementById("login-pass").value.trim();
  if (!name || !pass) return;

  try {
    const data = await apiPost("/api/login", {
      display_name: name,
      passphrase: pass,
    });
    setAuth(data);
    showLobby();
  } catch (err) {
    document.getElementById("auth-error").textContent = err.message;
  }
}

function showAuthTab(tab) {
  document.querySelectorAll(".auth-tab").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".auth-form").forEach((f) => f.classList.remove("active"));
  document.querySelector(`.auth-tab[data-tab="${tab}"]`).classList.add("active");
  document.getElementById(`${tab}-form`).classList.add("active");
  document.getElementById("auth-error").textContent = "";
}

function initAuth() {
  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document.getElementById("register-form").addEventListener("submit", handleRegister);
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => showAuthTab(tab.dataset.tab));
  });
}
