// heartgame.js
// Heart math speedrun game logic for the Heart Mind Trainer.
// Handles puzzle loading, answer checking, timing, scoring, and backend persistence.
const heartUserScoreEl = document.getElementById("heartScore");
const heartTimeEl = document.getElementById("heartTime");
const heartGameplayImg = document.getElementById("heartGameplayImg");
const heartInput = document.getElementById("heartInput");
const submitAnswerBtn = document.getElementById("submitAnswerBtn");
const feedbackMessage = document.getElementById("feedbackMessage");

// Game State
let heartTimerId = null;
let currentHeartTimeLeft = 60; // seconds
let currentHeartSolution = null;
let heartTotalCorrect = 0;
let heartTotalIncorrect = 0;
let heartTotalScore = 0;
let isFetchingPuzzle = false;

const levelSelection = document.getElementById("levelSelection");
const gameArea = document.getElementById("gameArea");

/**
 * Correct / wrong sounds — external CDN (Mixkit, no API key).
 * Override before this script loads:
 *   window.HEART_GAME_SOUNDS = { correct: "https://...", wrong: "https://..." };
 * Or load URLs from your API (JSON: { "correct": "...", "wrong": "..." }):
 *   window.HEART_SOUND_CONFIG_URL = "https://your-api.com/heart-sounds.json";
 */
// Default correct/wrong sound URLs. These can be overridden by app-level config values.
const HEART_SOUND_DEFAULTS = {
    // Correct: light applause / cheer (not the same as wrong)
    correct: "https://assets.mixkit.co/sfx/preview/mixkit-audience-light-applause-354.wav",
    // Wrong: clear “fail” / error
    wrong: "https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.wav",
};

let heartSoundUrls = { ...HEART_SOUND_DEFAULTS, ...(window.HEART_GAME_SOUNDS || {}) };

// Optionally load sound URL overrides from an external config endpoint.
(function loadHeartSoundConfigFromApi() {
    if (!window.HEART_SOUND_CONFIG_URL) return;
  // API call: fetch sound config JSON for correct/wrong effects.
    fetch(window.HEART_SOUND_CONFIG_URL, { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
            if (data && data.correct) heartSoundUrls.correct = data.correct;
            if (data && data.wrong) heartSoundUrls.wrong = data.wrong;
        })
        .catch(() => {});
})();

let heartAudioContext = null;

/**
 * Create or return the shared AudioContext used for fallback tones.
 */
function getHeartAudioContext() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!heartAudioContext) heartAudioContext = new Ctx();
    return heartAudioContext;
}

/**
 * Built-in sounds (always work after user gesture).
 * Correct = short “cheer” arpeggio; wrong = low buzz (never the same as correct).
 */
function playHeartToneFallback(isCorrect) {
    try {
        const ctx = getHeartAudioContext();
        if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume();

        const now = ctx.currentTime;

        if (isCorrect) {
            const freqs = [523.25, 659.25, 783.99, 1046.5];
            freqs.forEach((f, i) => {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = "sine";
                osc.frequency.value = f;
                const t0 = now + i * 0.07;
                g.gain.setValueAtTime(0, t0);
                g.gain.linearRampToValueAtTime(0.16, t0 + 0.02);
                g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);
                osc.connect(g);
                g.connect(ctx.destination);
                osc.start(t0);
                osc.stop(t0 + 0.15);
            });
        } else {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(90, now + 0.22);
            gain.gain.setValueAtTime(0.14, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.29);
        }
    } catch (_) {}
}

/** Call on difficulty click so AudioContext + HTMLAudio are allowed to play. */
function unlockHeartAudio() {
    try {
        const ctx = getHeartAudioContext();
        if (ctx && ctx.state === "suspended") ctx.resume();
    } catch (_) {}
    try {
        const silent = new Audio(
            "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAAAA=="
        );
        silent.volume = 0.01;
        silent.play().catch(() => {});
    } catch (_) {}
}

// Play both fallback tone and optional remote SFX for answer feedback.
function playHeartAnswerSound(isCorrect) {
    playHeartToneFallback(isCorrect);

    const url = isCorrect ? heartSoundUrls.correct : heartSoundUrls.wrong;
    if (!url) return;
    try {
        const audio = new Audio(url);
        // Cheer / applause a bit louder; wrong SFX slightly quieter so they feel different
        audio.volume = isCorrect ? 0.45 : 0.38;
        audio.preload = "auto";
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {});
        }
    } catch (_) {}
}

let startingTimeLength = 60;
/**
 * Begin the heart game at the selected difficulty/time limit.
 */
function startGameWithLevel(time) {
    unlockHeartAudio();
    if (levelSelection) levelSelection.style.display = "none";
    if (gameArea) gameArea.style.display = "block";
    startingTimeLength = time;
    initHeartGame();
}

// Event Listeners (set up once to avoid duplicates)
if (submitAnswerBtn) {
    submitAnswerBtn.onclick = checkHeartAnswer;
}

if (heartInput) {
    heartInput.addEventListener("input", function() {
        // Validation: no letters, digits only
        this.value = this.value.replace(/[^0-9]/g, '');
    });

    heartInput.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            checkHeartAnswer();
        }
    });
}

/*
Heart Game API
https://marcconrad.com/uob/heart/
Used to generate puzzle images and solutions
*/

// Reset game state and start a fresh speedrun session.
function initHeartGame() {
    unlockHeartAudio();
    // Reset State
    clearInterval(heartTimerId);
    currentHeartTimeLeft = startingTimeLength;
    currentHeartSolution = null;
    heartTotalCorrect = 0;
    heartTotalIncorrect = 0;
    heartTotalScore = 0;
    isFetchingPuzzle = false;

    if (heartUserScoreEl) heartUserScoreEl.innerText = "0";
    if (heartTimeEl) heartTimeEl.innerText = String(currentHeartTimeLeft);
    if (heartInput) {
        heartInput.value = "";
        heartInput.disabled = false;
        heartInput.focus();
    }
    
    if (feedbackMessage) {
        feedbackMessage.innerText = "Solve as many as you can before time runs out!";
        feedbackMessage.style.color = "inherit";
    }

    // Load first puzzle
    loadNextHeartPuzzle();

    // Start Timer
    startHeartTimer();
}

// Countdown timer for the active heart speedrun round.
function startHeartTimer() {
    clearInterval(heartTimerId);
    heartTimerId = setInterval(() => {
        currentHeartTimeLeft--;
        if (heartTimeEl) heartTimeEl.innerText = String(Math.max(0, currentHeartTimeLeft));

        if (currentHeartTimeLeft <= 0) {
            clearInterval(heartTimerId);
            finishHeartGame();
        }
    }, 1000);
}

/**
 * Load the next Heart API puzzle image and solution from the external service.
 * API endpoint: https://marcconrad.com/uob/heart/api.php
 */
function loadNextHeartPuzzle() {
    if (!heartGameplayImg || isFetchingPuzzle) return;
    
    isFetchingPuzzle = true;
    heartInput.disabled = true; // Disable input while loading
    heartGameplayImg.style.opacity = "0.5";

    // API call: request next puzzle image + answer from Heart API.
    fetch("https://marcconrad.com/uob/heart/api.php")
        .then((res) => res.json())
        .then((data) => {
            if (data && data.question) {
                heartGameplayImg.src = data.question;
                if (typeof data.solution !== "undefined") {
                    currentHeartSolution = String(data.solution);
                }
            }
        })
        .catch((err) => {
            console.error("Failed to load Heart Game puzzle :", err);
            if (feedbackMessage) {
                feedbackMessage.innerText = "Error loading puzzle. Retrying...";
                feedbackMessage.style.color = "orange";
            }
            // Retry after brief delay
            setTimeout(() => {
                isFetchingPuzzle = false;
                loadNextHeartPuzzle();
            }, 2000);
            return;
        })
        .finally(() => {
            if (currentHeartTimeLeft > 0) {
                isFetchingPuzzle = false;
                heartGameplayImg.style.opacity = "1";
                heartInput.disabled = false;
                heartInput.value = "";
                heartInput.focus();
            }
        });
}

// Validate and score the current user answer, then load next puzzle.
function checkHeartAnswer() {
    if (currentHeartTimeLeft <= 0 || isFetchingPuzzle) return;
    if (currentHeartSolution === null) return;

    const userAnswer = String(heartInput.value || "").trim();
    if (userAnswer === "") return;

    unlockHeartAudio();

    if (userAnswer === currentHeartSolution) {
        // Correct!
        heartTotalCorrect++;
        heartTotalScore += 50;
        playHeartAnswerSound(true);
        showFeedback("Correct! +50", "green");
    } else {
        // Incorrect!
        heartTotalIncorrect++;
        heartTotalScore -= 10;
        playHeartAnswerSound(false);
        showFeedback("Wrong! -10", "red");
    }

    if (heartTotalScore < 0) heartTotalScore = 0;
    if (heartUserScoreEl) heartUserScoreEl.innerText = String(heartTotalScore);

    // Clear input and load next puzzle immediately
    currentHeartSolution = null; 
    loadNextHeartPuzzle();
}

// Show temporary status text (correct/wrong/loading) below the puzzle.
function showFeedback(msg, color) {
    if (feedbackMessage) {
        feedbackMessage.innerText = msg;
        feedbackMessage.style.color = color;
        
        // Reset feedback color after a moment
        setTimeout(() => {
            if(feedbackMessage.innerText === msg) {
                 feedbackMessage.style.color = "inherit";
                 feedbackMessage.innerText = "Keep going!";
            }
        }, 1500);
    }
}

// End the game and store final results.
function finishHeartGame() {
    clearInterval(heartTimerId);
    if (heartInput) heartInput.disabled = true;
    if (submitAnswerBtn) submitAnswerBtn.disabled = true;

    const correct = heartTotalCorrect;
    const incorrect = heartTotalIncorrect;
    const missed = 0; // Not perfectly applicable to endless speedrun
    
    let accuracy = 0;
    if (correct + incorrect > 0) {
        accuracy = Math.round((correct / (correct + incorrect)) * 100);
    }

    localStorage.setItem("totalScore", String(heartTotalScore));
    localStorage.setItem("correct", String(correct));
    localStorage.setItem("incorrect", String(incorrect));
    localStorage.setItem("missed", String(missed));
    localStorage.setItem("accuracy", String(accuracy));

    if (feedbackMessage) {
         feedbackMessage.innerText = "Game Over! Saving score...";
         feedbackMessage.style.color = "blue";
    }

    // Persist score to backend save_score.php.
    fetch("../controller/php/save_score.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "score=" + encodeURIComponent(heartTotalScore) + "&game_name=" + encodeURIComponent("Heart Game"),
    }).catch(error => console.log("API error", error)).finally(() => {
        if (typeof window.__navigate === "function") {
            window.__navigate("result");
        } else {
            window.location.href = "result.html";
        }
    });
}
