// --- CONFIGURATION ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GAME_TIME = 60; // seconds until boss
const RING_COLORS = {
    'WHITE': '#fff', 
    'BROWN': '#a0522d', 
    'RED': '#ff0000', 
    'BLUE': '#0000ff', 
    'GREEN': '#00ff00', 
    'YELLOW': '#ffff00', 
    'PURPLE': '#800080'
};

// --- GLOBAL GAME STATE ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const powerUpScreen = document.getElementById('powerUpScreen');
const startButton = document.getElementById('startButton');
const ringChoicesContainer = document.getElementById('ringChoices');

let gameState = {
    // 'start', 'playing', 'powerup', 'boss'
    currentScreen: 'start', 
    selectedRingColor: null,
    playerX: CANVAS_WIDTH / 2,
    playerY: CANVAS_HEIGHT - 50,
    playerSpeed: 5,
    keys: {}, // Holds pressed keys
    
    // Firing
    fireRate: 200, // ms between regular shots
    lastShotTime: 0,
    bullets: [],
    
    // Special Attack
    specialCooldown: 10, // seconds
    specialLastUsed: 0,
    specialOnCooldown: false,
    
    // Enemies and Boss
    enemies: [],
    gameTimer: GAME_TIME,
    timerInterval: null,
    bossActive: false,
    
    // Visuals (for the start screen animation)
    stars: []
};

// --- INITIALIZATION ---

// 1. Create Ring Selection Buttons
Object.keys(RING_COLORS).forEach(colorName => {
    const button = document.createElement('div');
    button.className = 'ring-choice';
    button.textContent = colorName;
    button.style.color = RING_COLORS[colorName]; // Use the color for text/style
    button.dataset.color = RING_COLORS[colorName];
    button.onclick = () => selectRing(colorName, button);
    ringChoicesContainer.appendChild(button);
});

// 2. Start Screen Animation (Stars)
function initStars() {
    // Meno frequenti: Inizializziamo solo 20 anelli invece di 100 stelle
    for (let i = 0; i < 20; i++) {
        const randomColor = RING_COLORS[Math.floor(Math.random() * RING_COLORS.length)];
        gameState.stars.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            // Più grossi: dimensione dell'anello (raggio) tra 5 e 15
            radius: Math.random() * 10 + 5,
            color: randomColor
        });
    }
}
initStars();

// --- GAME FUNCTIONS ---

function selectRing(colorName, button) {
    // Visually highlight the selected ring
    document.querySelectorAll('.ring-choice').forEach(btn => {
        btn.style.border = '2px solid #fff';
    });
    button.style.border = '4px solid ' + button.dataset.color;
    
    gameState.selectedRingColor = button.dataset.color;
    startButton.disabled = false;
}

function startGame() {
    if (!gameState.selectedRingColor) return;
    
    startScreen.style.display = 'none';
    gameState.currentScreen = 'playing';
    
    // Start the game timer
    startTimer();
    
    // Start the main game loop
    requestAnimationFrame(gameLoop);
    
    // Start automatic firing interval
    setInterval(autoFire, gameState.fireRate);
    
    // Add initial enemies (simple placeholder)
    spawnEnemies(5);
}

function startTimer() {
    gameState.gameTimer = GAME_TIME;
    gameState.timerInterval = setInterval(() => {
        gameState.gameTimer--;
        if (gameState.gameTimer <= 0) {
            clearInterval(gameState.timerInterval);
            gameState.bossActive = true;
            console.log("BOSS ARRIVED!");
            // In a real game, you'd spawn the Boss entity here
        }
    }, 1000);
}

function spawnEnemies(count) {
    // Placeholder function for simple enemy spawn
    for (let i = 0; i < count; i++) {
        gameState.enemies.push({
            x: Math.random() * (CANVAS_WIDTH - 20) + 10,
            y: 50 + Math.random() * 100,
            size: 20,
            color: '#a00' // Demon color
        });
    }
}

function autoFire() {
    if (gameState.currentScreen === 'playing') {
        const now = Date.now();
        // Check if enough time has passed since the last shot (for automatic firing)
        if (now - gameState.lastShotTime >= gameState.fireRate) {
            // Add a regular bullet (simple placeholder: small, fast)
            gameState.bullets.push({ 
                x: gameState.playerX, 
                y: gameState.playerY - 20, 
                speed: 10, 
                size: 5, 
                isSpecial: false 
            });
            gameState.lastShotTime = now;
        }
    }
}

function fireSpecialAttack() {
    const now = Date.now() / 1000; // Convert to seconds
    if (!gameState.specialOnCooldown) {
        // Add a special bullet (placeholder: large, powerful)
        gameState.bullets.push({ 
            x: gameState.playerX, 
            y: gameState.playerY - 30, 
            speed: 7, 
            size: 15, 
            isSpecial: true 
        });
        
        gameState.specialLastUsed = now;
        gameState.specialOnCooldown = true;
        
        // Set up the cooldown timer
        setTimeout(() => {
            gameState.specialOnCooldown = false;
        }, gameState.specialCooldown * 1000);
    }
}

// --- RENDERING FUNCTIONS (PIXEL ART PLACEHOLDERS) ---

function drawStartScreen() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // Disegna lo sfondo
    ctx.fillStyle = '#000033'; // Sfondo blu scuro
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    gameState.stars.forEach(ring => {
        // Imposta il colore e lo spessore della linea per l'anello
        ctx.strokeStyle = ring.color; 
        ctx.lineWidth = 6; 

        // Disegna l'anello (cerchio vuoto)
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.stroke(); 
        
        // Animazione: più veloci (cadono più velocemente)
        ring.y -= 0.5; // Velocità di caduta aumentata
        
        // Wrap around
        if (ring.y < 0) {
            ring.y = CANVAS_HEIGHT; // Riporta l'anello in fondo
            ring.x = Math.random() * CANVAS_WIDTH; // Nuova posizione X casuale
            ring.radius = Math.random() * 10 + 5; // Nuova dimensione
            // Nuovo colore casuale quando riappare
            ring.color = RING_COLORS[Math.floor(Math.random() * RING_COLORS.length)]; 
        }
    });

    // Request the next frame to keep the stars animated
    if (gameState.currentScreen === 'start') {
        requestAnimationFrame(drawStartScreen);
    }
}

function drawPlayer() {
    // Draw the player (Ring) as a simple colored square/circle placeholder
    ctx.fillStyle = gameState.selectedRingColor || '#fff';
    // Simple pixel art player: 20x20 square
    ctx.fillRect(gameState.playerX - 10, gameState.playerY - 10, 20, 20); 
    
    // Draw a small central pixel for detail
    ctx.fillStyle = '#fff';
    ctx.fillRect(gameState.playerX - 2, gameState.playerY - 2, 4, 4);
}

function drawEnemies() {
    gameState.enemies.forEach(enemy => {
        // Draw Demon Placeholder: A red pixel triangle/shape
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.x - enemy.size / 2, enemy.y + enemy.size);
        ctx.lineTo(enemy.x + enemy.size / 2, enemy.y + enemy.size);
        ctx.fill();
    });
}

function drawBullets() {
    gameState.bullets.forEach(bullet => {
        ctx.fillStyle = bullet.isSpecial ? '#ffd700' : '#fff'; // Gold for special
        
        // Simple pixel art for bullets
        if (bullet.isSpecial) {
            ctx.fillRect(bullet.x - bullet.size / 2, bullet.y - bullet.size / 2, bullet.size, bullet.size);
        } else {
            ctx.fillRect(bullet.x - bullet.size / 2, bullet.y - bullet.size / 2, bullet.size, bullet.size * 2);
        }
    });
}

function drawUI() {
    // Timer
    ctx.fillStyle = '#fff';
    ctx.font = '20px Courier New, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`TIME: ${gameState.gameTimer}`, 10, 30);
    
    // Special Cooldown
    const now = Date.now() / 1000;
    let remainingCooldown = Math.max(0, (gameState.specialLastUsed + gameState.specialCooldown) - now);
    
    ctx.textAlign = 'right';
    ctx.fillText(`SPECIAL (SPACE): ${remainingCooldown > 0 ? remainingCooldown.toFixed(1) + 's' : 'READY'}`, 
                 CANVAS_WIDTH - 10, 30);
}

// --- UPDATE FUNCTIONS ---

function updatePlayer() {
    // Handle movement based on pressed keys
    if (gameState.keys['ArrowLeft'] && gameState.playerX > 10) {
        gameState.playerX -= gameState.playerSpeed;
    }
    if (gameState.keys['ArrowRight'] && gameState.playerX < CANVAS_WIDTH - 10) {
        gameState.playerX += gameState.playerSpeed;
    }
    if (gameState.keys['ArrowUp'] && gameState.playerY > CANVAS_HEIGHT / 2) {
        gameState.playerY -= gameState.playerSpeed;
    }
    if (gameState.keys['ArrowDown'] && gameState.playerY < CANVAS_HEIGHT - 10) {
        gameState.playerY += gameState.playerSpeed;
    }
}

function updateBullets() {
    // Move bullets and filter out ones that go off-screen
    gameState.bullets = gameState.bullets.filter(bullet => {
        bullet.y -= bullet.speed;
        return bullet.y > 0;
    });
    
    // Collision detection (simplified: check if any bullet hits any enemy)
    // NOTE: In a real game, this section would handle collision, damage, and enemy removal.
}

// --- MAIN GAME LOOP ---

function gameLoop() {
    if (gameState.currentScreen === 'playing') {
        // 1. CLEAR CANVAS
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#000033'; 
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        // 2. UPDATE GAME STATE
        updatePlayer();
        updateBullets();
        
        // 3. DRAW GAME OBJECTS
        drawPlayer();
        drawEnemies(); // Draw enemies and boss if active
        drawBullets();
        drawUI();
        
        // Check for Boss Phase Completion (Placeholder)
        if (gameState.bossActive && gameState.enemies.length === 0) {
             clearInterval(gameState.timerInterval);
             showPowerUpScreen();
        }

        // Request next frame
        requestAnimationFrame(gameLoop);
    }
}

// --- POWER-UP SCREEN LOGIC ---

function showPowerUpScreen() {
    gameState.currentScreen = 'powerup';
    powerUpScreen.style.display = 'flex';
}

function applyPowerUp(type) {
    powerUpScreen.style.display = 'none';
    
    if (type === 'fireRate') {
        // Improves fire rate (e.g., cut the interval time by 20%)
        gameState.fireRate = Math.max(50, gameState.fireRate * 0.8);
    } else if (type === 'special') {
        // Improves special attack (e.g., halve the cooldown)
        gameState.specialCooldown = Math.max(5, gameState.specialCooldown / 2);
    }
    
    // Resume game state
    gameState.bossActive = false;
    spawnEnemies(8); // More enemies for the next phase
    startTimer();
    gameState.currentScreen = 'playing';
    requestAnimationFrame(gameLoop);
}

// --- EVENT LISTENERS ---

// Start Button
startButton.addEventListener('click', startGame);

// Power-up Buttons
document.getElementById('pu-fireRate').addEventListener('click', () => applyPowerUp('fireRate'));
document.getElementById('pu-special').addEventListener('click', () => applyPowerUp('special'));

// Keyboard Input (Movement and Special)
window.addEventListener('keydown', (e) => {
    gameState.keys[e.key] = true;
    
    if (e.key === ' ' && gameState.currentScreen === 'playing') {
        e.preventDefault(); // Prevent spacebar from scrolling
        fireSpecialAttack();
    }
});

window.addEventListener('keyup', (e) => {
    gameState.keys[e.key] = false;
});

// --- START DRAWING THE START SCREEN ANIMATION ---
drawStartScreen();
