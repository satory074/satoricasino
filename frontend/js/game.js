let ws = null;
let currentTableId = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;

function joinTable(tableId) {
  currentTableId = tableId;
  if (lobbyInterval) clearInterval(lobbyInterval);
  document.getElementById("lobby-section").style.display = "none";
  document.getElementById("game-section").style.display = "block";
  connectWS(tableId);
}

function connectWS(tableId) {
  if (ws) ws.close();
  const url = wsUrl(tableId);
  ws = new WebSocket(url);

  ws.onopen = () => {
    reconnectAttempts = 0;
    document.getElementById("connection-status").textContent = "Connected";
    document.getElementById("connection-status").className = "status-connected";
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    handleMessage(msg);
  };

  ws.onclose = () => {
    document.getElementById("connection-status").textContent = "Disconnected";
    document.getElementById("connection-status").className = "status-disconnected";
    if (reconnectAttempts < MAX_RECONNECT) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      reconnectAttempts++;
      setTimeout(() => connectWS(tableId), delay);
    }
  };

  ws.onerror = () => {};
}

function sendAction(action, data = {}) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ action, ...data }));
  }
}

function handleMessage(msg) {
  switch (msg.type) {
    case "game_state":
      renderGameState(msg);
      break;
    case "player_joined":
      addLog(`${msg.display_name} joined`);
      break;
    case "player_left":
      addLog(`${msg.display_name} left`);
      break;
    case "bet_placed":
      addLog(`Player bet ${msg.amount}`);
      break;
    case "auto_stand":
      addLog("Auto-stand (timeout)");
      break;
    case "error":
      addLog(`Error: ${msg.message}`);
      break;
  }
}

function renderGameState(state) {
  const myId = getUserId();

  // Phase
  document.getElementById("game-phase").textContent = state.phase.toUpperCase();

  // Dealer
  renderHand("dealer-cards", state.dealer_cards, state.dealer_value);

  // Players
  const playersDiv = document.getElementById("players-area");
  playersDiv.innerHTML = "";
  for (const [pid, p] of Object.entries(state.players)) {
    const isMe = pid === myId;
    const isCurrent = pid === state.current_player_id;
    const div = document.createElement("div");
    div.className = `player-box${isMe ? " is-me" : ""}${isCurrent ? " is-current" : ""}`;

    let resultBadge = "";
    if (state.results && state.results[pid]) {
      const r = state.results[pid];
      const cls = r === "win" || r === "blackjack" ? "result-win" : r === "lose" ? "result-lose" : "result-push";
      resultBadge = `<span class="result-badge ${cls}">${r.toUpperCase()}</span>`;
    }

    div.innerHTML = `
      <div class="player-name">${p.display_name}${isMe ? " (You)" : ""} ${resultBadge}</div>
      <div class="player-bet">Bet: ${p.bet}</div>
      <div class="player-cards" id="cards-${pid}"></div>
      <div class="player-value">${p.is_busted ? "BUST" : p.value}${p.is_blackjack ? " BJ!" : ""}</div>
    `;
    playersDiv.appendChild(div);
    renderHand(`cards-${pid}`, p.cards, null);
  }

  // Actions
  const actionsDiv = document.getElementById("game-actions");
  actionsDiv.innerHTML = "";

  if (state.phase === "waiting") {
    actionsDiv.innerHTML = '<button onclick="sendAction(\'start\')">Start Game</button>';
  } else if (state.phase === "betting") {
    const myPlayer = state.players[myId];
    if (myPlayer && myPlayer.bet === 0) {
      actionsDiv.innerHTML = `
        <input type="number" id="bet-amount" min="10" value="10" class="bet-input">
        <button onclick="sendAction('bet', {amount: parseInt(document.getElementById('bet-amount').value)})">Place Bet</button>
      `;
    } else {
      actionsDiv.innerHTML = "<p>Waiting for other bets...</p>";
    }
  } else if (state.phase === "player_turns" && state.current_player_id === myId) {
    const myPlayer = state.players[myId];
    let btns = `
      <button onclick="sendAction('hit')" class="btn-hit">Hit</button>
      <button onclick="sendAction('stand')" class="btn-stand">Stand</button>
    `;
    if (myPlayer && myPlayer.cards.length === 2) {
      btns += '<button onclick="sendAction(\'double\')" class="btn-double">Double</button>';
    }
    actionsDiv.innerHTML = btns;
  } else if (state.phase === "player_turns") {
    actionsDiv.innerHTML = "<p>Waiting for other players...</p>";
  } else if (state.phase === "resolution") {
    actionsDiv.innerHTML = '<button onclick="sendAction(\'new_round\')">New Round</button>';
  }
}

function renderHand(containerId, cards, value) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = cards
    .map((c) => {
      if (c.rank === "?") {
        return '<div class="card card-hidden">?</div>';
      }
      const color = c.suit === "♥" || c.suit === "♦" ? "red" : "black";
      return `<div class="card card-${color}">${c.rank}<span class="suit">${c.suit}</span></div>`;
    })
    .join("");
  if (value !== null && value !== undefined) {
    el.innerHTML += `<span class="hand-value">${value}</span>`;
  }
}

function addLog(text) {
  const log = document.getElementById("game-log");
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.textContent = `${new Date().toLocaleTimeString()} - ${text}`;
  log.prepend(entry);
  while (log.children.length > 50) log.removeChild(log.lastChild);
}

function leaveTable() {
  if (ws) ws.close();
  ws = null;
  currentTableId = null;
  showLobby();
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  initLobby();
  if (getToken()) {
    showLobby();
  } else {
    showAuth();
  }
});
