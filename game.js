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
    'yellowbird-downflap', 'yellowbird-midflap', 'yellowbird-upflap'
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
const JUMP = -4.5;
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
let bestScore = localStorage.getItem('flappyBest') || 0;

let bird = {
    x: BIRD_X,
    y: 180,
    velocity: 0,
    frame: 0,
    rotation: 0,
    birdType: 'yellow',
    birdColors: ['yellow', 'red', 'blue']
};

let pipes = [];
let bgColor = '#70c5ce';
let isNight = false;
let bgIndex = 0;

let frameCount = 0;

function initGame() {
    resetGame();
    gameLoop();
}

function resetGame() {
    bird.y = 180;
    bird.velocity = 0;
    bird.frame = 0;
    bird.rotation = 0;
    bird.birdType = bird.birdColors[0];
    pipes = [];
    score = 0;
    frameCount = 0;
    isNight = false;
    bgIndex = 0;
    gameState = GameState.GET_READY;
}

function jump() {
    bird.velocity = JUMP;
    if (sounds.wing) {
        sounds.wing.currentTime = 0;
        sounds.wing.play().catch(() => {});
    }
}

function getBirdSprite() {
    const type = bird.birdType;
    const frame = Math.floor(bird.frame / 10) % 3;
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

        if (bird.x + birdW > pipe.x && bird.x < pipe.x + pipeW) {
            if (bird.y < pipe.y + pipeH || bird.y + birdH > pipe.y + PIPE_GAP + pipeH) {
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
        ctx.drawImage(pipeImg, pipe.x, pipe.y);
        ctx.drawImage(pipeImg, pipe.x, pipe.y + PIPE_GAP + 320);
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
    const scoreStr = score.toString();
    const digitW = 24;
    const startX = canvas.width / 2 - (scoreStr.length * digitW) / 2;

    scoreStr.split('').forEach((digit, i) => {
        ctx.drawImage(ASSETS[digit], startX + i * digitW, 30);
    });
}

function drawGetReady() {
    ctx.drawImage(ASSETS['message'], 48, 90);
}

function drawGameOver() {
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
        }

        if (checkCollision()) {
            gameOver();
        }
    }
}

function draw() {
    ctx.fillStyle = bgColor;
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
        drawScore();
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
        if (gameState === GameState.GET_READY) {
            gameState = GameState.PLAYING;
        } else if (gameState === GameState.PLAYING) {
            jump();
        } else if (gameState === GameState.GAME_OVER) {
            resetGame();
            gameState = GameState.GET_READY;
        }
    }
});

canvas.addEventListener('click', () => {
    if (gameState === GameState.GET_READY) {
        gameState = GameState.PLAYING;
    } else if (gameState === GameState.PLAYING) {
        jump();
    } else if (gameState === GameState.GAME_OVER) {
        resetGame();
        gameState = GameState.GET_READY;
    }
});

document.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === GameState.GET_READY) {
        gameState = GameState.PLAYING;
    } else if (gameState === GameState.PLAYING) {
        jump();
    } else if (gameState === GameState.GAME_OVER) {
        resetGame();
        gameState = GameState.GET_READY;
    }
}, { passive: false });