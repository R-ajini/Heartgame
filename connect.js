(() => {
  const page = document.body.dataset.connectPage || "app";

  // Ensure the app runs over HTTP (not file://) for fetch/session support.
  function requireHttp() {
    if (window.location.protocol !== "file:") return true;

    const msg =
      "Opened as a local file (file:///...). Please open via XAMPP: http://localhost/ui%20game/UI%20game/ (or .../view/index.html).";

    const signupMsg = document.getElementById("signupMessage");
    const loginMsg = document.getElementById("loginMessage");
    if (signupMsg) signupMsg.innerText = msg;
    if (loginMsg) loginMsg.innerText = msg;

    if (!window.__didWarnFileMode) {
      window.__didWarnFileMode = true;
      alert(msg);
    }
    return false;
  }

  requireHttp();

  const protectedScreens = new Set([
    "mainmenu",
    "profile",
    "leaderboard",
    "score_history",
    "result",
  ]);

  const gameScreens = new Set(["memory", "puzzle", "heartgame"]);

  const bodyBaseClasses = new Set(["profile-page", "result-page", "memmorymode-page"]);

  // Switch body classes based on the active screen for page-specific styling.
  function setBodyMode(screen) {
    for (const c of bodyBaseClasses) document.body.classList.remove(c);
    if (screen === "profile") document.body.classList.add("profile-page");
    if (screen === "result") document.body.classList.add("result-page");
  }

  // Check current login status by calling the profile endpoint.
  async function isLoggedIn() {
    try {
      // API call: session-aware profile lookup.
      const res = await fetch("../controller/php/profile.php", { cache: "no-store" });
      if (!res.ok) return false;
      const data = await res.json();
      return !(data && data.error === "not logged in");
    } catch {
      return false;
    }
  }

  // Show exactly one screen section and hide all others.
  function showScreen(screen) {
    document.querySelectorAll(".connect-screen").forEach((el) => {
      el.hidden = el.dataset.screen !== screen;
    });
    setBodyMode(screen);
  }

  // Load and render data when entering specific screens.
  async function onEnterScreen(screen) {
    if (screen === "profile") {
      try {
        // API call: load current user's profile stats.
        const res = await fetch("../controller/php/profile.php", { cache: "no-store" });
        const data = await res.json();
        if (data && data.error) return;

        const gamesEl = document.getElementById("games");
        const bestEl = document.getElementById("best");
        if (gamesEl) gamesEl.innerText = data.games_played || 0;
        if (bestEl) bestEl.innerText = data.best_score || 0;
        const userEl = document.getElementById("username");
        const emailEl = document.getElementById("email");
        if (userEl) userEl.innerText = data.username || "Guest";
        if (emailEl) emailEl.innerText = data.email || "";

        const memberEl = document.getElementById("memberSince");
        if (memberEl) {
          const raw = data.created_at;
          if (!raw) {
            memberEl.innerText = "—";
          } else {
            const iso = String(raw).trim().replace(" ", "T");
            const d = new Date(iso);
            memberEl.innerText = Number.isNaN(d.getTime())
              ? String(raw)
              : d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
          }
        }
      } catch {}
    }

    if (screen === "leaderboard") {
      const tbody = document.getElementById("leaderboardBody");
      if (!tbody) return;
      tbody.innerHTML = `<tr><td colspan="3" class="table-message">Loading ranks...</td></tr>`;
      try {
        // API call: fetch top leaderboard players.
        const res = await fetch("../controller/php/leaderboard.php", { cache: "no-store" });
        const data = await res.json();
        tbody.innerHTML = "";

        if (!data || data.length === 0) {
          tbody.innerHTML = `<tr><td colspan="3" class="table-message">No players yet.</td></tr>`;
          return;
        }

        data.forEach((player, index) => {
          const tr = document.createElement("tr");
          tr.className = "leaderboard-row";

          const rankTd = document.createElement("td");
          rankTd.className = "rank-cell";
          // Render rank with ordinal labels for top three.
          rankTd.innerText =
            index === 0 ? "1st" : index === 1 ? "2nd" : index === 2 ? "3rd" : `#${index + 1}`;

          const nameTd = document.createElement("td");
          nameTd.className = "player-cell";
          nameTd.innerText = player.username || "Unknown";

          const scoreTd = document.createElement("td");
          scoreTd.className = "score-cell";
          scoreTd.innerText = player.best_score || 0;

          tr.appendChild(rankTd);
          tr.appendChild(nameTd);
          tr.appendChild(scoreTd);
          tbody.appendChild(tr);
        });
      } catch {
        tbody.innerHTML = `<tr><td colspan="3" class="table-message">Failed to load leaderboard.</td></tr>`;
      }
    }

    if (screen === "score_history") {
      const tbody = document.getElementById("historyTableBody");
      if (!tbody) return;
      tbody.innerHTML = `<tr><td colspan="3" class="table-message">Loading history...</td></tr>`;
      try {
        // API call: fetch recent score history for logged-in user.
        const res = await fetch("../controller/php/get_score_history.php", { cache: "no-store" });
        const data = await res.json();
        tbody.innerHTML = "";

        if (data.error) {
          tbody.innerHTML = `<tr><td colspan="3" class="table-message">Error: ${data.error}</td></tr>`;
          return;
        }
        if (data.length === 0) {
          tbody.innerHTML = `<tr><td colspan="3" class="table-message">No games played yet.</td></tr>`;
          return;
        }

        data.forEach((item) => {
          const row = document.createElement("tr");
          row.className = "history-row";

          const dateCell = document.createElement("td");
          dateCell.className = "date-cell";
          const dateObj = new Date(item.played_at);
          dateCell.innerText = dateObj.toLocaleString();

          const gameCell = document.createElement("td");
          gameCell.className = "game-cell";
          gameCell.innerText = item.game_name || "Unknown";

          const scoreCell = document.createElement("td");
          scoreCell.className = "score-cell";
          scoreCell.innerText = item.score;

          row.appendChild(dateCell);
          row.appendChild(gameCell);
          row.appendChild(scoreCell);
          tbody.appendChild(row);
        });
      } catch {
        tbody.innerHTML = `<tr><td colspan="3" class="table-message">Failed to load history.</td></tr>`;
      }
    }

    if (screen === "result") {
      const totalScoreEl = document.getElementById("totalScore");
      if (!totalScoreEl) return;

      const totalScore = localStorage.getItem("totalScore") || 0;
      const correct = localStorage.getItem("correct") || 0;
      const incorrect = localStorage.getItem("incorrect") || 0;
      const missed = localStorage.getItem("missed") || 0;
      let accuracy = localStorage.getItem("accuracy");

      // Recompute accuracy fallback when not stored.
      if (!accuracy) {
        const total = Number(correct) + Number(incorrect);
        accuracy = total > 0 ? Math.round((Number(correct) / total) * 100) : 0;
      }

      totalScoreEl.innerText = totalScore;
      const cEl = document.getElementById("correct");
      const iEl = document.getElementById("incorrect");
      const mEl = document.getElementById("missed");
      const aEl = document.getElementById("accuracy");
      if (cEl) cEl.innerText = correct;
      if (iEl) iEl.innerText = incorrect;
      if (mEl) mEl.innerText = missed;
      if (aEl) aEl.innerText = accuracy;
    }

    if (screen === "puzzle") {
      if (typeof window.startPuzzleGame === "function") window.startPuzzleGame();
    }
  }

  // Central route handler across login, main app, and game-select pages.
  async function navigate(screen) {
    if (!screen) screen = page === "login" ? "login" : "welcome";

    if (page === "login") {
      if (screen === "login" || screen === "signup") {
        window.location.hash = "#" + screen;
        showScreen(screen);
        await onEnterScreen(screen);
        return;
      }
      window.location.href = "index.html#" + screen;
      return;
    }

    if (page === "gameselect") {
      if (screen === "mainmenu") {
        window.location.href = "index.html#mainmenu";
        return;
      }
      if (screen === "gameselect" || gameScreens.has(screen)) {
        const ok = await isLoggedIn();
        if (!ok) {
          window.location.href = "login.html#login";
          return;
        }
        history.replaceState(null, "", "#" + screen);
        showScreen(screen);
        await onEnterScreen(screen);
        return;
      }
      if (protectedScreens.has(screen)) {
        const ok = await isLoggedIn();
        if (!ok) {
          window.location.href = "login.html#login";
          return;
        }
        window.location.href = "index.html#" + screen;
        return;
      }
      window.location.href = "index.html#" + screen;
      return;
    }

    if (screen === "login" || screen === "signup") {
      window.location.href = "login.html#" + screen;
      return;
    }
    if (screen === "gameselect") {
      window.location.href = "gameselect.html";
      return;
    }

    if (gameScreens.has(screen)) {
      const ok = await isLoggedIn();
      if (!ok) {
        window.location.href = "login.html#login";
        return;
      }
      window.location.href = "gameselect.html#" + screen;
      return;
    }

    if (protectedScreens.has(screen)) {
      const ok = await isLoggedIn();
      if (!ok) {
        window.location.href = "login.html#login";
        return;
      }
    }

    window.location.hash = "#" + screen;
    showScreen(screen);
    await onEnterScreen(screen);
  }

  window.__navigate = navigate;

  // Delegate click navigation for all elements with data-nav.
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-nav]");
    if (!el) return;
    e.preventDefault();
    const target = el.getAttribute("data-nav");
    navigate(target);
  });

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    // Submit login credentials and navigate on success.
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!requireHttp()) return;
      const msg = document.getElementById("loginMessage");
      if (msg) msg.innerText = "";

      try {
        // API call: authenticate user.
        const res = await fetch("../controller/php/login.php", { method: "POST", body: new FormData(loginForm) });
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${text || "Request failed"}`);
        if (text.includes("success")) {
          window.location.href = "index.html#mainmenu";
        } else if (msg) {
          msg.innerText = text;
        }
      } catch (err) {
        if (msg) msg.innerText = err?.message ? String(err.message) : "Login failed!";
      }
    });
  }

  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    // Submit registration data and auto-enter app on success.
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!requireHttp()) return;
      const msg = document.getElementById("signupMessage");
      if (msg) msg.innerText = "";

      try {
        // API call: create user account.
        const res = await fetch("../controller/php/signup.php", { method: "POST", body: new FormData(signupForm) });
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${text || "Request failed"}`);
        if (msg) msg.innerText = text;
        if (text.includes("Registration successful")) {
          window.location.href = "index.html#mainmenu";
        }
      } catch (err) {
        if (msg) msg.innerText = err?.message ? String(err.message) : "Something went wrong!";
      }
    });
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    // Logout the user and return to login page.
    logoutBtn.addEventListener("click", () => {
      if (!confirm("Are you sure you want to logout?")) return;
      // API call: clear backend session.
      fetch("../controller/php/logout.php").finally(() => {
        window.location.href = "login.html#login";
      });
    });
  }

  let selectedLevel = null;
  const levelButtons = document.querySelectorAll(".level-btn");
  // Save the currently selected memory difficulty.
  levelButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      levelButtons.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedLevel = btn.dataset.level;
    });
  });

  const playBtn = document.getElementById("playBtn");
  if (playBtn) {
    // Start memory game with selected difficulty.
    playBtn.addEventListener("click", () => {
      if (!selectedLevel) {
        alert("Please select a level first!");
        return;
      }
      const levelSelectScreen = document.getElementById("levelSelectScreen");
      const gameScreen = document.getElementById("gameScreen");
      if (levelSelectScreen) levelSelectScreen.style.display = "none";
      if (gameScreen) gameScreen.style.display = "block";
      document.body.classList.add("memmorymode-page");
      if (typeof window.startMemoryGame === "function") {
        window.startMemoryGame(selectedLevel);
      }
    });
  }

  if (page === "login") {
    const initial = (window.location.hash || "#login").slice(1);
    navigate(initial === "signup" ? "signup" : "login");
    window.addEventListener("hashchange", () => {
      const h = (window.location.hash || "#login").slice(1);
      if (h === "login" || h === "signup") navigate(h);
    });
    return;
  }

  if (page === "gameselect") {
    // Guard game pages so only logged-in users can access them.
    isLoggedIn().then(async (ok) => {
      if (!ok) {
        window.location.href = "login.html#login";
        return;
      }
      let initial = (window.location.hash || "#gameselect").slice(1);
      const allowed = ["gameselect", "memory", "puzzle", "heartgame"];
      if (!allowed.includes(initial)) initial = "gameselect";
      history.replaceState(null, "", "#" + initial);
      showScreen(initial);
      await onEnterScreen(initial);
    });
    return;
  }

  // Keep hash routing in sync when URL hash changes.
  window.addEventListener("hashchange", () => {
    const screen = (window.location.hash || "#welcome").slice(1);
    if (screen === "login" || screen === "signup") {
      window.location.href = "login.html#" + screen;
      return;
    }
    if (screen === "gameselect") {
      window.location.href = "gameselect.html";
      return;
    }
    if (gameScreens.has(screen)) {
      window.location.href = "gameselect.html#" + screen;
      return;
    }
    navigate(screen);
  });

  // Resolve initial route when page loads.
  let initial = (window.location.hash || "#welcome").slice(1);
  if (initial === "login" || initial === "signup") {
    window.location.replace("login.html#" + initial);
    return;
  }
  if (initial === "gameselect") {
    window.location.replace("gameselect.html");
    return;
  }
  if (gameScreens.has(initial)) {
    window.location.replace("gameselect.html#" + initial);
    return;
  }
  navigate(initial);
})();
