
const $ = (id) => document.getElementById(id);

const arena = $("arena");
const input = $("wordInput");

const SETTINGS = {
    easy: {
        duration: 60,
        spawn: 1500,
        speed: 23,
        max: 6
    },
    medium: {
        duration: 45,
        spawn: 1100,
        speed: 31,
        max: 8
    },
    hard: {
        duration: 30,
        spawn: 850,
        speed: 40,
        max: 10
    }
};

const WORDS = [
    "code", "apple", "speed", "game", "hello",
    "world", "keyboard", "mouse", "typing",
    "bubble", "javascript", "website", "design",
    "developer", "computer", "program", "screen",
    "function", "variable", "project", "learning",
    "challenge", "creative", "digital", "internet",
    "frontend", "backend", "browser", "element",
    "style", "script", "button", "future"
];

const COLORS = [
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#6366f1",
    "#f59e0b",
    "#10b981"
];

let bubbles = [];

let score = 0;
let timeLeft = 45;
let lives = 3;
let combo = 0;

let correctWords = 0;
let wrongWords = 0;
let totalCharacters = 0;

let elapsedTime = 0;
let spawnClock = 0;
let lastFrame = 0;

let gameRunning = false;
let gamePaused = false;
let gameStarted = false;

let animationId = null;
let timerInterval = null;
let startedAt = 0;

function randomWord() {
    return WORDS[Math.floor(Math.random() * WORDS.length)];
}

function randomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function updateStats() {
    $("score").textContent = score;
    $("timer").textContent = timeLeft;
    $("combo").textContent = combo + "x";

    const minutes = Math.max(elapsedTime / 60, 1 / 60);

    const wpm = Math.round(correctWords / minutes);
    $("wpm").textContent = wpm;

    const total = correctWords + wrongWords;

    const accuracy = total === 0
        ? 100
        : Math.round((correctWords / total) * 100);

    $("accuracy").textContent = accuracy + "%";

    $("lives").textContent =
        "❤️ ".repeat(lives) + "🖤 ".repeat(3 - lives);

    $("progressBar").style.width =
        (timeLeft / SETTINGS[$("difficulty").value].duration * 100) + "%";
}

// Performance-based speed:
// Higher WPM and a longer combo increase the game speed.
function getPerformanceMultiplier() {
    const minutes = Math.max(elapsedTime / 60, 0.25);
    const wpm = correctWords / minutes;

    const wpmBoost = Math.min(
        0.75,
        Math.max(0, (wpm - 12) / 80)
    );

    const comboBoost = Math.min(0.25, combo * 0.012);

    return 1 + wpmBoost + comboBoost;
}

function createBubble() {
    const settings = SETTINGS[$("difficulty").value];

    if (bubbles.length >= settings.max) return;

    const word = randomWord();

    const size = Math.max(
        82,
        Math.min(120, 65 + word.length * 5)
    );

    const bubble = document.createElement("div");

    bubble.className = "bubble";
    bubble.textContent = word;

    bubble.style.width = size + "px";
    bubble.style.height = size + "px";
    bubble.style.background = `linear-gradient(135deg, ${randomColor()}, ${randomColor()})`;

    const maxX = Math.max(0, arena.clientWidth - size);

    const x = Math.random() * maxX;

    bubble.style.left = x + "px";
    bubble.style.top = (arena.clientHeight + 10) + "px";

    arena.appendChild(bubble);

    bubbles.push({
        element: bubble,
        word: word,
        x: x,
        y: arena.clientHeight + 10,
        size: size,
        speed: settings.speed * (0.8 + Math.random() * 0.5)
    });
}

function removeBubble(bubble) {
    bubble.element.remove();

    bubbles = bubbles.filter(
        item => item !== bubble
    );
}

function popBubble() {
    const typedWord = input.value.trim().toLowerCase();

    if (!typedWord || !gameRunning || gamePaused) return;

    const target = bubbles.find(
        bubble => bubble.word.toLowerCase() === typedWord
    );

    totalCharacters += typedWord.length;

    if (target) {
        target.element.classList.add("pop");

        setTimeout(() => {
            removeBubble(target);
        }, 180);

        combo++;
        correctWords++;

        score += 10 + Math.min(combo * 2, 30);

    } else {
        wrongWords++;
        combo = 0;
        score = Math.max(0, score - 2);
    }

    input.value = "";
    updateStats();
}

function loseLife(bubble) {
    removeBubble(bubble);

    lives--;
    combo = 0;

    updateStats();

    if (lives <= 0) {
        endGame("No lives left!");
    }
}

function gameLoop(timestamp) {
    if (!gameRunning || gamePaused) return;

    const delta = Math.min(
        (timestamp - lastFrame) / 1000,
        0.05
    );

    lastFrame = timestamp;

    const settings = SETTINGS[$("difficulty").value];
    const multiplier = getPerformanceMultiplier();

    spawnClock += delta * 1000;

    // Faster spawning as performance improves.
    if (spawnClock >= settings.spawn / multiplier) {
        spawnClock = 0;
        createBubble();
    }

    // Move bubbles upward.
    for (const bubble of [...bubbles]) {
        bubble.y -= bubble.speed * multiplier * delta;

        bubble.element.style.top = bubble.y + "px";

        if (bubble.y + bubble.size < 0) {
            loseLife(bubble);
        }
    }

    animationId = requestAnimationFrame(gameLoop);
}

function startTimer() {
    timerInterval = setInterval(() => {
        if (!gameRunning || gamePaused) return;

        timeLeft--;
        elapsedTime++;

        updateStats();

        if (timeLeft <= 0) {
            endGame("Time is up!");
        }
    }, 1000);
}

function startGame() {
    clearInterval(timerInterval);
    cancelAnimationFrame(animationId);

    bubbles.forEach(bubble => bubble.element.remove());
    bubbles = [];

    score = 0;
    lives = 3;
    combo = 0;
    correctWords = 0;
    wrongWords = 0;
    totalCharacters = 0;

    elapsedTime = 0;
    spawnClock = 0;
    lastFrame = 0;

    timeLeft = SETTINGS[$("difficulty").value].duration;

    gameRunning = true;
    gamePaused = false;
    gameStarted = true;

    $("startOverlay").classList.add("hidden");
    $("gameOverOverlay").classList.add("hidden");
    $("pauseOverlay").classList.add("hidden");

    input.disabled = false;
    $("popBtn").disabled = false;

    input.value = "";
    input.focus();

    updateStats();

    startedAt = Date.now();

    startTimer();

    animationId = requestAnimationFrame(gameLoop);
}

function endGame(message) {
    gameRunning = false;
    gamePaused = false;

    clearInterval(timerInterval);
    cancelAnimationFrame(animationId);

    input.disabled = true;
    $("popBtn").disabled = true;

    const minutes = Math.max(elapsedTime / 60, 1 / 60);
    const finalWpm = Math.round(correctWords / minutes);

    $("resultTitle").textContent = message;

    $("resultMessage").textContent =
        `Score: ${score} | WPM: ${finalWpm} | Accuracy: ${$("accuracy").textContent}`;

    $("gameOverOverlay").classList.remove("hidden");
}

function pauseGame() {
    if (!gameRunning || gamePaused) return;

    gamePaused = true;

    cancelAnimationFrame(animationId);

    $("pauseOverlay").classList.remove("hidden");
    input.disabled = true;
}

function resumeGame() {
    if (!gameRunning || !gamePaused) return;

    gamePaused = false;

    $("pauseOverlay").classList.add("hidden");

    input.disabled = false;
    input.focus();

    lastFrame = performance.now();

    animationId = requestAnimationFrame(gameLoop);
}

// Event listeners

$("startBtn").addEventListener("click", startGame);

$("playAgainBtn").addEventListener("click", startGame);

$("restartBtn").addEventListener("click", startGame);

$("resumeBtn").addEventListener("click", resumeGame);

$("popBtn").addEventListener("click", popBubble);

input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        popBubble();
    }
});

$("difficulty").addEventListener("change", () => {
    if (gameStarted) {
        startGame();
    } else {
        timeLeft = SETTINGS[$("difficulty").value].duration;
        updateStats();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        if (gamePaused) {
            resumeGame();
        } else {
            pauseGame();
        }
    }
});

// Initial display
updateStats();
