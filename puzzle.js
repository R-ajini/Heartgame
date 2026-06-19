// Heart Matching Puzzle Game

const puzzleGrid = document.getElementById("puzzleGrid");
const scoreEl = document.getElementById("puzzleScore");
const movesEl = document.getElementById("puzzleMoves");
const timeEl = document.getElementById("puzzleTime");
const restartBtn = document.getElementById("restartBtn");

// Game state
let symbols = ["💗", "💖", "💘", "💝", "💓", "💞", "💟", "❤️"];
let deck = [];
let firstCard = null;
let secondCard = null;
let lockBoard = false;
let moves = 0;
let matchedPairs = 0;
let wrongMoves = 0;
let timerId = null;
let timeLeft = 60; // seconds

// In SPA mode, we start only when entering the puzzle screen.
// Exposed function called by the router.
window.startPuzzleGame = function startPuzzleGame() {
    if (!puzzleGrid) return;
    puzzleGrid.style.pointerEvents = "auto";
    initPuzzleGame();
};

function initPuzzleGame() {
    // Reset state
    clearInterval(timerId);
    firstCard = null;
    secondCard = null;
    lockBoard = false;
    moves = 0;
    matchedPairs = 0;
    wrongMoves = 0;
    timeLeft = 60;

    if (scoreEl) scoreEl.innerText = "0";
    if (movesEl) movesEl.innerText = "0";
    if (timeEl) timeEl.innerText = String(timeLeft);

    // Build and shuffle deck (pairs)
    deck = shuffle([...symbols, ...symbols]); // 16 cards = 8 pairs

    // Render cards
    puzzleGrid.innerHTML = "";
    deck.forEach((symbol, index) => {
        const card = document.createElement("div");
        card.className = "puzzle-box puzzle-card";
        card.dataset.index = index;
        card.dataset.symbol = symbol;
        card.innerText = ""; // face down
        card.addEventListener("click", onCardClick);
        puzzleGrid.appendChild(card);
    });
    // Start timer
    startPuzzleTimer();

    // Restart button
    if (restartBtn) {
        restartBtn.onclick = () => initPuzzleGame();
    }
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function onCardClick() {
    if (lockBoard) return;
    if (this.classList.contains("matched")) return;

    // Prevent double-clicking the same card
    if (firstCard && this === firstCard) return;

    // Flip card
    this.classList.add("flipped");
    this.innerText = this.dataset.symbol;

    if (!firstCard) {
        firstCard = this;
        return;
    }

    secondCard = this;
    moves++;
    if (movesEl) movesEl.innerText = String(moves);

    checkForMatch();
}

function checkForMatch() {
    const isMatch = firstCard.dataset.symbol === secondCard.dataset.symbol;
    if (isMatch) {
        handleMatch();
    } else {
        handleNoMatch();
    }
}

function handleMatch() {
    firstCard.classList.add("matched");
    secondCard.classList.add("matched");

    matchedPairs++;
    updateScore();

    resetSelection();

    // If all pairs are found, end game as success
    if (matchedPairs === symbols.length) {
        endPuzzleGame();
    }
}

function handleNoMatch() {
    lockBoard = true;
    wrongMoves++;

    setTimeout(() => {
        firstCard.classList.remove("flipped");
        secondCard.classList.remove("flipped");
        firstCard.innerText = "";
        secondCard.innerText = "";

        resetSelection();
    }, 800);
}

function resetSelection() {
    [firstCard, secondCard] = [null, null];
    lockBoard = false;
}

function updateScore() {
    // Simple scoring: 20 points per matched pair
    const score = matchedPairs * 20;
    if (scoreEl) scoreEl.innerText = String(score);
}

function startPuzzleTimer() {
    clearInterval(timerId);
    timerId = setInterval(() => {
        timeLeft--;
        if (timeEl) timeEl.innerText = String(Math.max(0, timeLeft));

        if (timeLeft <= 0) {
            clearInterval(timerId);
            endPuzzleGame();
        }
    }, 1000);
}
// Called from HTML "Finish Game" button
function finishPuzzleGame() {
    endPuzzleGame();
}

function endPuzzleGame() {
    clearInterval(timerId);
    puzzleGrid.style.pointerEvents = "none";



    const totalPairs = symbols.length;
    const correct = matchedPairs;
    const incorrect = wrongMoves;
    const missed = Math.max(0, totalPairs - matchedPairs);

    let accuracy = 0;
    if (correct + incorrect > 0) {
        accuracy = Math.round((correct / (correct + incorrect)) * 100);
    }

    // Score combines pairs, remaining time, and penalties for wrong moves.
    let totalScore = correct * 20 + Math.max(0, timeLeft) * 2 - wrongMoves * 5;
    if (totalScore < 0) totalScore = 0;

    // Store for shared result.html page
    localStorage.setItem("totalScore", String(totalScore));
    localStorage.setItem("correct", String(correct));
    localStorage.setItem("incorrect", String(incorrect));
    localStorage.setItem("missed", String(missed));
    localStorage.setItem("accuracy", String(accuracy));

    // Send score to backend if logged in, then go to result page
    // API call: persist puzzle score to backend.
    fetch("../controller/php/save_score.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "score=" + encodeURIComponent(totalScore) + "&game_name=" + encodeURIComponent("Puzzle Game"),
    }).catch(() => {}).finally(() => {
        if (typeof window.__navigate === "function") {
            window.__navigate("result");
        } else {
            window.location.href = "result.html";
        }
    });
}
