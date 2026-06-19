let cells;
let memorizeTime;
let recallTime;

let grid = document.getElementById("grid");
const heartImageEl = document.getElementById("heartImage");
const heartAnswerEl = document.getElementById("heartAnswer");
const bonusScreenEl = document.getElementById("bonusScreen");
const gameScreenEl = document.getElementById("gameScreen");
let heartSolution = null;
let inBonusRound = false;
let score = 0;
let lives = 3;
let pattern = [];
let timer;

function startMemoryGame(level) {
    if (level === "easy") {
        cells = 6;
        memorizeTime = 3;
        recallTime = 30;
    } else if (level === "medium") {
        cells = 9;
        memorizeTime = 2;
        recallTime = 20;
    } else {
        cells = 12;
        memorizeTime = 1.5;
        recallTime = 10;
    }

    score = 0;
    lives = 3;
    inBonusRound = false;
    heartSolution = null;

    if (grid) {
        const livesEl = document.getElementById("lives");
        const scoreEl = document.getElementById("score");

        if (livesEl) livesEl.innerText = lives;
        if (scoreEl) scoreEl.innerText = score;

        if (gameScreenEl) gameScreenEl.style.display = "block";
        if (bonusScreenEl) bonusScreenEl.style.display = "none";
        if (heartAnswerEl) heartAnswerEl.value = "";

        createGrid();
    }
}

// Create the grid
function createGrid() {
    clearInterval(timer);
    grid.innerHTML = "";

    for (let i = 0; i < cells; i++) {
        let cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.index = i;
        cell.onclick = clickCell;
        grid.appendChild(cell);
    }

    generatePattern();
}

// Generate random pattern
function generatePattern() {
    pattern = [];
    let used = [];

    for (let i = 0; i < Math.floor(cells / 2); i++) {
        let r;
        do {
            r = Math.floor(Math.random() * cells);
        } while (used.includes(r));
        used.push(r);
        pattern.push(r);
    }

    showPattern();
}

// Show pattern briefly
function showPattern() {
    grid.style.pointerEvents = "none";
    pattern.forEach((i) => grid.children[i].classList.add("active"));

    setTimeout(() => {
        pattern.forEach((i) => grid.children[i].classList.remove("active"));
        grid.style.pointerEvents = "auto";
        startTimer();
    }, memorizeTime * 1000);
}

// Handle cell click
function clickCell() {
    let index = Number(this.dataset.index);

    if (this.classList.contains("correct") || this.classList.contains("wrong")) {
        return;
    }

    if (pattern.includes(index)) {
        this.classList.add("correct");
        score++;
        // Heart API fetch on correct cell click removed as requested
    } else {
        this.classList.add("wrong");
        lives--;
    }

    const livesEl = document.getElementById("lives");
    const scoreEl = document.getElementById("score");

    if (scoreEl) scoreEl.innerText = score;
    if (livesEl) livesEl.innerText = lives;

    checkRound();
}

// Check if round finished
function checkRound() {
    if (lives <= 0) {
        clearInterval(timer);
        finishGame();
        return;
    }

    // If all pattern cells have been correctly selected, stop input and wait for submit
    const correctClicked = Array.from(grid.children).filter((cell, idx) =>
        pattern.includes(idx) && cell.classList.contains("correct")
    ).length;

    if (correctClicked === pattern.length) {
        // All correct cells found: wait for user to press Submit Answer.
        clearInterval(timer);
        grid.style.pointerEvents = "none";
    }
}

// Timer function
function startTimer() {
    let time = recallTime;
    const timeEl = document.getElementById("time");
    if (timeEl) timeEl.innerText = time;

    timer = setInterval(() => {
        time--;
        if (timeEl) timeEl.innerText = time;

        if (time < 0) {
            clearInterval(timer);
            finishGame();
        }
    }, 1000);
}

// Finish game and save results
function finishGame() {
    clearInterval(timer);

    // If player solved all required cells, show Heart API bonus round first.
    const correctClicked = Array.from(grid.children).filter((cell, idx) =>
        pattern.includes(idx) && cell.classList.contains("correct")
    ).length;
    const isPerfectRound = correctClicked === pattern.length && lives > 0;

    if (isPerfectRound && !inBonusRound) {
        startBonusRound();
        return;
    }

    let heartBonus = 0;
    if (inBonusRound && heartSolution !== null) {
        const userAnswer = String(heartAnswerEl?.value || "").trim();
        if (userAnswer.length > 0) {
            heartBonus = userAnswer === heartSolution ? 50 : -10;
        }
    }

    let correct = score;
    let incorrect = Math.max(0, 3 - lives);
    let missed = Math.max(0, pattern.length - correct);

    let accuracy = 0;
    if (correct + incorrect > 0) {
        accuracy = Math.round((correct / (correct + incorrect)) * 100);
    }

    let totalScore = score * 10 + heartBonus;
    if (totalScore < 0) totalScore = 0;

    localStorage.setItem("totalScore", totalScore);
    localStorage.setItem("correct", correct);
    localStorage.setItem("incorrect", incorrect);
    localStorage.setItem("missed", missed);
    localStorage.setItem("accuracy", accuracy);

    // API call: save memory game score to backend.
    fetch("../controller/php/save_score.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "score=" + encodeURIComponent(totalScore) + "&game_name=" + encodeURIComponent("Memory Game"),
    }).catch(() => {}).finally(() => {
        // Regardless of success, go to result page
        if (typeof window.__navigate === "function") {
            window.__navigate("result");
        } else {
            window.location.href = "result.html";
        }
    });
}

// Switch UI to the Heart API bonus round after a perfect memory round.
function startBonusRound() {
    inBonusRound = true;
    if (gameScreenEl) gameScreenEl.style.display = "none";
    if (bonusScreenEl) bonusScreenEl.style.display = "block";
    if (heartAnswerEl) heartAnswerEl.value = "";

    loadHeartPuzzle();

    const submitBonusBtn = document.getElementById("submitBonusBtn");
    if (submitBonusBtn) {
        submitBonusBtn.onclick = finishGame;
    }
}

// Fetch and display one bonus puzzle from the external Heart API.
function loadHeartPuzzle() {
    if (!heartImageEl) return;
    heartImageEl.alt = "Loading Heart Bonus Puzzle...";

    // API call: external puzzle provider.
    fetch("https://marcconrad.com/uob/heart/api.php")
        .then((res) => res.json())
        .then((data) => {
            if (data && data.question) {
                heartImageEl.src = data.question;
                heartImageEl.alt = "Heart Bonus Puzzle";
            }
            if (typeof data?.solution !== "undefined") {
                heartSolution = String(data.solution);
            }
        })
        .catch(() => {
            heartSolution = null;
            heartImageEl.alt = "Failed to load Heart Bonus Puzzle";
        });
}

