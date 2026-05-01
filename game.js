const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 288;
canvas.height = 512;

const ASSETS = {};
const sounds = {};

const loadImage = (name) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            ASSETS[name] = img;
            resolve();
        };
        img.src = `assets/${name}.png`;
    });
};

const loadSound = (name) => {
    return new Promise((resolve) => {
        const audio = new Audio(`assets/${name}.ogg`);
        audio.addEventListener('canplaythrough', () => {
            sounds[name] = audio;
            resolve();
        });
        audio.load();
    });
};

const sprites = [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'background-day', 'background-night', 'base',
    'bluebird-downflap', 'bluebird-midflap', 'bluebird-upflap',
    'gameover', 'message',
    'pipe-green', 'pipe-red',
    'redbird-downflap', 'redbird-midflap', 'redbird-upflap',
    'yellowbird-downflap', 'yellowbird-midflap', 'yellowbird-upflap',
    'medals'
];

const soundFiles = ['die', 'hit', 'point', 'swoosh', 'wing'];

let assetsLoaded = 0;
const totalAssets = sprites.length + soundFiles.length;

sprites.forEach(s => loadImage(s).then(() => { assetsLoaded++; checkLoad(); }));
soundFiles.forEach(s => loadSound(s).then(() => { assetsLoaded++; checkLoad(); }));

function checkLoad() {
    if (assetsLoaded >= totalAssets) {
        initGame();
    }
}

const GRAVITY = 0.25;
const JUMP = -4.6;
const PIPE_SPEED = 2;
const PIPE_GAP = 100;
const PIPE_SPACING = 200;
const BIRD_X = 50;

const GameState = {
    GET_READY: 0,
    PLAYING: 1,
    GAME_OVER: 2
};

let gameState = GameState.GET_READY;
let score = 0;
let bestScore = parseInt(localStorage.getItem('flappyBest')) || 0;

let bird = {
    x: BIRD_X,
    y: 180,
    velocity: 0,
    frame: 0,
    rotation: 0,
    birdType: 'yellow',
    birdColors: ['yellow', 'red', 'blue'],
    colorIndex: 0
};

let pipes = [];
let isNight = false;
let frameCount = 0;
let showGetReady = true;

function initGame() {
    resetGame();
    gameLoop();
}

function resetGame() {
    bird.y = 180;
    bird.velocity = 0;
    bird.frame = 0;
    bird.rotation = 0;
    bird.colorIndex = 0;
    bird.birdType = bird.birdColors[bird.colorIndex];
    pipes = [];
    score = 0;
    frameCount = 0;
    isNight = false;
    showGetReady = true;
    gameState = GameState.GET_READY;
}

function jump() {
    bird.velocity = JUMP;
    if (sounds.wing) {
        sounds.wing.currentTime = 0;
        sounds.wing.play().catch(() => {});
    }
}

function cycleBirdColor() {
    bird.colorIndex = (bird.colorIndex + 1) % bird.birdColors.length;
    bird.birdType = bird.birdColors[bird.colorIndex];
    if (sounds.swoosh) {
        sounds.swoosh.currentTime = 0;
        sounds.swoosh.play().catch(() => {});
    }
}

function getBirdSprite() {
    const type = bird.birdType;
    const frame = Math.floor(bird.frame / 12) % 3;
    const flapMap = {
        0: 'downflap',
        1: 'midflap',
        2: 'upflap'
    };
    return `${type}bird-${flapMap[frame]}`;
}

function updateBird() {
    bird.velocity += GRAVITY;
    bird.y += bird.velocity;

    if (bird.velocity < 0) {
        bird.rotation = -25;
    } else if (bird.velocity > 0) {
        bird.rotation += 2;
        if (bird.rotation > 90) bird.rotation = 90;
    } else {
        bird.rotation = 0;
    }

    bird.frame++;
}

function updatePipes() {
    if (frameCount % PIPE_SPACING === 0) {
        const minY = -80;
        const maxY = -200;
        const pipeY = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
        pipes.push({ x: canvas.width, y: pipeY, passed: false });
    }

    pipes.forEach((pipe, index) => {
        pipe.x -= PIPE_SPEED;

        if (pipe.x + 52 < 0) {
            pipes.splice(index, 1);
        }

        if (!pipe.passed && pipe.x + 52 < bird.x) {
            pipe.passed = true;
            score++;
            if (sounds.point) {
                sounds.point.currentTime = 0;
                sounds.point.play().catch(() => {});
            }
        }
    });
}

function checkCollision() {
    const birdW = 34;
    const birdH = 24;

    if (bird.y + birdH >= canvas.height - 112) {
        return true;
    }
    if (bird.y < 0) {
        return true;
    }

    for (let pipe of pipes) {
        const pipeW = 52;
        const pipeH = 320;

        if (bird.x + birdW - 4 > pipe.x + 4 && bird.x + 4 < pipe.x + pipeW - 4) {
            if (bird.y + 4 < pipe.y + pipeH - 10 || bird.y + birdH - 4 > pipe.y + PIPE_GAP + 10) {
                return true;
            }
        }
    }
    return false;
}

function drawBackground() {
    const bgName = isNight ? 'background-night' : 'background-day';
    ctx.drawImage(ASSETS[bgName], 0, 0);
}

function drawPipes() {
    const pipeName = isNight ? 'pipe-red' : 'pipe-green';
    const pipeImg = ASSETS[pipeName];

    pipes.forEach(pipe => {
        ctx.save();
        ctx.translate(pipe.x + 26, pipe.y + 320);
        ctx.scale(1, -1);
        ctx.drawImage(pipeImg, -26, -320);
        ctx.restore();

        ctx.drawImage(pipeImg, pipe.x, pipe.y + PIPE_GAP);
    });
}

function drawBird() {
    ctx.save();
    ctx.translate(bird.x + 17, bird.y + 12);
    ctx.rotate(bird.rotation * Math.PI / 180);
    ctx.drawImage(ASSETS[getBirdSprite()], -17, -12);
    ctx.restore();
}

function drawBase() {
    ctx.drawImage(ASSETS['base'], 0, canvas.height - 112);
    ctx.drawImage(ASSETS['base'], 224, canvas.height - 112);
}

function drawScore() {
    if (gameState !== GameState.GET_READY) {
        const scoreStr = score.toString();
        const digitW = 24;
        const startX = canvas.width / 2 - (scoreStr.length * digitW) / 2;

        scoreStr.split('').forEach((digit, i) => {
            ctx.drawImage(ASSETS[digit], startX + i * digitW, 30);
        });
    }
}

function drawGetReady() {
    if (gameState === GameState.GET_READY) {
        ctx.drawImage(ASSETS['message'], 48, 90);
    }
}

function getMedal() {
    if (score >= 40) return 3;
    if (score >= 30) return 2;
    if (score >= 20) return 1;
    if (score >= 10) return 0;
    return -1;
}

function drawGameOver() {
    if (gameState === GameState.GAME_OVER) {
        ctx.drawImage(ASSETS['gameover'], 42, 120);

        const scoreStr = score.toString();
        const bestStr = bestScore.toString();

        const scoreX = 160;
        const bestX = 160;

        scoreStr.split('').forEach((digit, i) => {
            ctx.drawImage(ASSETS[digit], scoreX + i * 24, 185);
        });

        bestStr.split('').forEach((digit, i) => {
            ctx.drawImage(ASSETS[digit], bestX + i * 24, 225);
        });

        const medal = getMedal();
        if (medal >= 0 && ASSETS['medals']) {
            ctx.drawImage(ASSETS['medals'], 62, 155, 22 * medal, 22, 0, 0, 22, 22);
        }
    }
}

function gameOver() {
    gameState = GameState.GAME_OVER;
    if (sounds.hit) {
        sounds.hit.currentTime = 0;
        sounds.hit.play().catch(() => {});
    }
    setTimeout(() => {
        if (sounds.die) {
            sounds.die.currentTime = 0;
            sounds.die.play().catch(() => {});
        }
    }, 200);

    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('flappyBest', bestScore);
    }
}

function update() {
    if (gameState === GameState.PLAYING) {
        updateBird();
        updatePipes();
        frameCount++;

        if (frameCount % 1000 === 0) {
            isNight = !isNight;
            if (sounds.swoosh) {
                sounds.swoosh.currentTime = 0;
                sounds.swoosh.play().catch(() => {});
            }
        }

        if (checkCollision()) {
            gameOver();
        }
    } else if (gameState === GameState.GET_READY) {
        bird.frame++;
    }
}

function draw() {
    ctx.fillStyle = '#70c5ce';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawBackground();
    drawPipes();
    drawBase();
    drawBird();

    if (gameState === GameState.GET_READY) {
        drawGetReady();
    } else if (gameState === GameState.PLAYING) {
        drawScore();
    } else if (gameState === GameState.GAME_OVER) {
        drawGameOver();
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        handleInput();
    }
});

function handleInput() {
    if (gameState === GameState.GET_READY) {
        gameState = GameState.PLAYING;
    } else if (gameState === GameState.PLAYING) {
        jump();
    } else if (gameState === GameState.GAME_OVER) {
        resetGame();
    }
}

canvas.addEventListener('click', (e) => {
    handleInput();
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (gameState === GameState.GET_READY) {
        cycleBirdColor();
    }
});

document.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInput();
}, { passive: false });