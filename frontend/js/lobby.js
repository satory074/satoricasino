let lobbyInterval = null;

function showLobby() {
  document.getElementById("auth-section").style.display = "none";
  document.getElementById("lobby-section").style.display = "block";
  document.getElementById("game-section").style.display = "none";
  document.getElementById("user-name").textContent = getDisplayName();
  loadProfile();
  loadTables();
  lobbyInterval = setInterval(loadTables, 3000);
}

function showAuth() {
  document.getElementById("auth-section").style.display = "flex";
  document.getElementById("lobby-section").style.display = "none";
  document.getElementById("game-section").style.display = "none";
  if (lobbyInterval) clearInterval(lobbyInterval);
}

async function loadProfile() {
  try {
    const user = await apiGet("/api/me");
    document.getElementById("user-coins").textContent = user.coins;
    document.getElementById("user-stats").textContent =
      `${user.wins}W / ${user.losses}L / ${user.draws}D`;
  } catch {
    clearAuth();
    showAuth();
  }
}

async function loadTables() {
  try {
    const tables = await apiGet("/api/tables");
    const list = document.getElementById("table-list");
    if (tables.length === 0) {
      list.innerHTML = '<div class="empty-msg">No tables yet. Create one!</div>';
      return;
    }
    list.innerHTML = tables
      .map(
        (t) => `
      <div class="table-card" onclick="joinTable('${t.table_id}')">
        <div class="table-name">${t.name}</div>
        <div class="table-info">
          <span>${t.player_count}/${t.max_players} players</span>
          <span>Min: ${t.min_bet}</span>
          <span>${t.status}</span>
        </div>
      </div>`
      )
      .join("");
  } catch (err) {
    console.error("Failed to load tables:", err);
  }
}

async function createTable() {
  const name = document.getElementById("new-table-name").value.trim();
  const minBet = parseInt(document.getElementById("new-table-bet").value) || 10;
  if (!name) return;

  try {
    const table = await apiPost("/api/tables", { name, min_bet: minBet });
    document.getElementById("new-table-name").value = "";
    joinTable(table.table_id);
  } catch (err) {
    alert(err.message);
  }
}

async function claimDailyBonus() {
  try {
    const result = await apiPost("/api/daily-bonus", {});
    document.getElementById("user-coins").textContent = result.coins;
    alert(`+${result.bonus} coins!`);
  } catch (err) {
    alert(err.message);
  }
}

async function claimBailout() {
  try {
    const result = await apiPost("/api/bailout", {});
    document.getElementById("user-coins").textContent = result.coins;
    alert(`+${result.bailout} coins rescue!`);
  } catch (err) {
    alert(err.message);
  }
}

function logout() {
  clearAuth();
  showAuth();
}

function initLobby() {
  document.getElementById("create-table-btn").addEventListener("click", createTable);
  document.getElementById("daily-bonus-btn").addEventListener("click", claimDailyBonus);
  document.getElementById("bailout-btn").addEventListener("click", claimBailout);
  document.getElementById("logout-btn").addEventListener("click", logout);
}
