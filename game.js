// Write JavaScript here// --- CONFIGURATION ---
const CANVAS_WIDTH = 393;
const CANVAS_HEIGHT = 852;
const GAME_TIME = 60; // seconds until boss
const RING_COLORS = {
    'WHITE': '#fff',
    'BROWN': '#5d4037', // Marrone scuro
    'RED': '#af0000',
    'BLUE': '#0000ff',
    'GREEN': '#388e3c', // Verde meno brillante
    'YELLOW': '#ffeb3b', // Giallo meno intenso (es. 'Yellow' 400/500)
    'PURPLE': '#800080'
};

// --- GLOBAL GAME STATE ---
let backgroundPositionY = 0; // Traccia la posizione Y dello sfondo (inizia da 0)
const SCROLL_SPEED = 1; // Velocità di scorrimento in pixel per frame
const gameContainer = document.getElementById('game-container');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const powerUpScreen = document.getElementById('powerUpScreen');
const startButton = document.getElementById('startButton');
const ringChoicesContainer = document.getElementById('ringChoices');

const FIRE_RATE_LEVELS = {
    1: 200, // Base: 200 ms
    2: 120, // Livello 2: Più veloce
    3: 70   // Livello 3: Molto veloce
};


let gameState = {

    // ? NUOVO: Stato per il Touch Controllo ?
    touchIdentifier: null, // Traccia un ID di tocco specifico (per multitouch)
    touchX: null,
    touchY: null,
    // ... (stato esistente)

    // 'start', 'playing', 'powerup', 'boss'
    currentScreen: 'start',
    selectedRingColor: null,
    playerX: CANVAS_WIDTH / 2,
    playerY: CANVAS_HEIGHT - 50,
    playerSpeed: 5,
    keys: {}, // Holds pressed keys

    // Firing
    fireRateLevel: 1, // Nuovo: Livello 1 a 3 (Velocità di sparo)
    bulletLevel: 3,   // Nuovo: Livello 1 a 3 (Numero di missili: 1, 3, o 5)
    fireRate: 200,    // Base rate (inizializzato, ma userà FIRE_RATE_LEVELS)
    lastShotTime: 0,
    bullets: [],

    // Special Attack
    specialCooldown: 10, // seconds
    specialLastUsed: 0,
    specialOnCooldown: false,
    specialRay: { active: false }, // Initialize as inactive
    isCharging: false,

    // Enemies and Boss
    enemies: [],
    gameTimer: GAME_TIME,
    timerInterval: null,
    bossActive: false,

    // Visuals (for the start screen animation)
    rings: [] // *** CAMBIATO: da stars a rings ***
};

// --- INITIALIZATION ---

// 1. Create Ring Selection Buttons
Object.keys(RING_COLORS).forEach(colorName => {
    const button = document.createElement('div');
    button.className = 'ring-choice';
    button.textContent = colorName;
    button.style.color = RING_COLORS[colorName]; // Use the color for text/style
    button.dataset.color = RING_COLORS[colorName];
    button.style.border = '4px solid transparent'

    button.onclick = () => selectRing(colorName, button);
    ringChoicesContainer.appendChild(button);
});

function selectRing(colorName, button) {
    // Visually highlight the selected ring
    document.querySelectorAll('.ring-choice').forEach(btn => {
        btn.style.border = '4px solid transparent';
    });


    button.style.border = '4px solid ' + button.dataset.color;
    gameState.selectedRingColor = button.dataset.color;


    startButton.disabled = false;
}

// 2. Start Screen Animation (Rings)
function initRings() {
    // Genera meno anelli (ad esempio 20 anziché 100 stelle)
    const NUM_RINGS = 14;

    for (let i = 0; i < NUM_RINGS; i++) {
        const size = Math.random() * 25 + 8; // Più grandi: raggio tra 8 e 13
        const speed = Math.random() * 1.5 + 2.5; // Più veloci: velocità tra 2.5 e 4.0
        const colors = Object.values(RING_COLORS);
        const randomIndex = Math.floor(Math.random() * (7));
        gameState.rings.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: size,
            speed: speed, // Velocità random diversa
            color: colors[randomIndex], // Colore casuale da RING_COLORS
            trail: [] // Array per le scie
        });
    }
}
initRings(); // Chiamata aggiornata

// --- GAME FUNCTIONS ---

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
    if (gameState.currentScreen === 'playing' && gameState.isCharging === false) {
        const now = Date.now();
        
        const currentFireRate = FIRE_RATE_LEVELS[gameState.fireRateLevel] || FIRE_RATE_LEVELS[1];

        if (now - gameState.lastShotTime >= currentFireRate) {
            
            const missileCount = gameState.bulletLevel === 1 ? 1 : (gameState.bulletLevel === 2 ? 3 : 5);
            const spacing = 18; // Leggermente aumentata per non sovrapporli troppo
            const verticalStagger = 12; // Quanto ogni missile "rientra" rispetto a quello centrale
            
            const totalWidth = (missileCount - 1) * spacing;
            let startX = gameState.playerX - (totalWidth / 2);

            // Troviamo l'indice del missile centrale
            const centerIndex = Math.floor(missileCount / 2);

            for (let i = 0; i < missileCount; i++) {
                const missileX = startX + i * spacing;
                
                // Calcoliamo la distanza dall'indice centrale (es: 0, 1, 0 per 3 missili)
                const distFromCenter = Math.abs(i - centerIndex);
                
                // Più è lontano dal centro, più il valore Y aumenta (quindi scende nel canvas)
                const yOffset = distFromCenter * verticalStagger;

                gameState.bullets.push({
                    x: missileX,
                    y: (gameState.playerY - 20) + yOffset, // Aggiungiamo l'offset
                    speed: 10,
                    size: 12,
                    color: gameState.selectedRingColor,
                    isSpecial: false
                });
            }

            gameState.lastShotTime = now;
        }
    }
}

function fireSpecialAttack() {
    const now = Date.now() / 1000;

    // Don't fire if on cooldown OR already charging
    if (gameState.specialOnCooldown || gameState.isCharging) return;

    // Phase 1: Start Charging
    gameState.isCharging = true;

    // Wait for the charge time (e.g., 1 second)
    setTimeout(() => {
        gameState.isCharging = false;
        
        // Phase 2: Create the Ray
        gameState.specialRay = {
            x: gameState.playerX, // Initial center
            maxWidth: 250,        // How wide the beam starts
            currentWidth: 200,    // This will decrease over time
            duration: 0.8,        // How long the beam stays (seconds)
            startTime: Date.now() / 1000,
            active: true
        };

        // Set Cooldown
        gameState.specialOnCooldown = true;
        gameState.specialLastUsed = now;

        setTimeout(() => {
            gameState.specialOnCooldown = false;
        }, gameState.specialCooldown * 1000);

    }, 1000); // 1 second charge time
}

function updateSpecialRay() {
    if (!gameState.specialRay || !gameState.specialRay.active) return;

    const ray = gameState.specialRay;
    const now = Date.now() / 1000;
    const elapsed = now - ray.startTime;

    if (elapsed < ray.duration) {
        // Calculate percentage of life remaining (1.0 down to 0.0)
        const lifeLeft = 1 - (elapsed / ray.duration);
        
        // Shrink width based on time remaining
        ray.currentWidth = ray.maxWidth * lifeLeft;
        
        // Keep the ray attached to the player's current X position
        ray.x = gameState.playerX; 
    } else {
        ray.active = false; // Turn off once time is up
    }
}

function drawSpecialRay(ctx) {
    const ray = gameState.specialRay;
    if (!ray || !ray.active) return;

    const drawX = ray.x - (ray.currentWidth / 2);
    const rayHeight = gameState.playerY; // Extends from player to top of screen

    // 1. Create the Inferno Gradient (Left to Right)
    // This makes the edges dark red and the center bright yellow/white
    let gradient = ctx.createLinearGradient(drawX, 0, drawX + ray.currentWidth, 0);
    
    gradient.addColorStop(0, 'rgba(139, 0, 0, 0)');    // Transparent Dark Red edge
    gradient.addColorStop(0.2, 'rgba(255, 0, 0, 0.8)'); // Solid Red
    gradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.9)'); // Bright Yellow center
    gradient.addColorStop(0.8, 'rgba(255, 0, 0, 0.8)'); // Solid Red
    gradient.addColorStop(1, 'rgba(139, 0, 0, 0)');    // Transparent Dark Red edge

    // 2. Add a Glow Effect (Shadows)
    ctx.shadowBlur = 20;
    ctx.shadowColor = "red";

    // 3. Draw the Main Beam
    ctx.fillStyle = gradient;
    ctx.fillRect(drawX, 0, ray.currentWidth, rayHeight);

    // 4. Draw the "White Hot" Lava Core
    // We add a tiny bit of random wobble to make it look like flowing fire
    const coreWobble = (Math.random() - 0.5) * 4;
    const coreWidth = ray.currentWidth * 0.2; // Core is 20% of the beam width

    ctx.fillStyle = "white";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "yellow";
    ctx.fillRect(ray.x - (coreWidth / 2) + coreWobble, 0, coreWidth, rayHeight);

    // Reset shadow so it doesn't affect other game drawings
    ctx.shadowBlur = 0;
}
 
function drawChargeEffect(ctx) {
    ctx.beginPath();
    ctx.arc(gameState.playerX, gameState.playerY, 30, 0, Math.PI * 2);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 3;
    ctx.stroke();
    // Hint: Use a pulsing alpha or a rotating line here for extra flair
}



// --- RENDERING FUNCTIONS (PIXEL ART PLACEHOLDERS) ---

function drawStartScreen() {
    //ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // Disegna lo sfondo blu scuro
    //ctx.fillStyle = '#000033';
   ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Disegna gli anelli e le scie
    gameState.rings.forEach(ring => {

        // 1. Aggiorna la scia
        const maxTrailLength = 25;
        // Aggiungi la posizione attuale alla scia
        ring.trail.push({ x: ring.x, y: ring.y, alpha: 1 });
        // Mantieni solo gli ultimi elementi della scia
        if (ring.trail.length > maxTrailLength) {
            ring.trail.shift();
        }

        // 2. Disegna la scia (Tail)
        // La scia ha un aspetto sfumato (alpha)
        ring.trail.forEach((pos, index) => {
            const alpha = index / maxTrailLength; // Più invecchia, più sbiadisce
            const trailSize = ring.size * (1 + alpha); // Rimpicciolire leggermente
            const colors = Object.values(RING_COLORS);
            const randomIndex = Math.floor(Math.random() * colors.length);
            // Imposta il colore con trasparenza
            ctx.strokeStyle = ring.color;
            ctx.globalAlpha = alpha * 0.5; // Scia semitrasparente
            ctx.lineWidth = 2; // Spessore della scia

            ctx.beginPath();
            ctx.arc(pos.x, pos.y, trailSize / 2, 0, Math.PI * 2);
            ctx.stroke();
        });

        // Ripristina l'opacità globale per l'anello principale
        ctx.globalAlpha = 1.0;

        // =================================================================
        // ? EFFETTO BAGLIORE (GLOW) ?
        // 1. Imposta l'effetto Bagliore
        ctx.shadowColor = ring.color;
        ctx.shadowBlur = 20; // Intensità del bagliore
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 10;

        // 2. Disegna l'anello con il suo colore originale (il "riempimento")
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 8; // Spessore dell'anello/riempimento

        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.size, 0, Math.PI * 2);
        //ctx.fill()
        ctx.stroke();

        // 3. Ripristina gli effetti di ombra/bagliore
        // IMPORTANTE: Azzerare gli shadow prima di disegnare il bordo o altro.
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        // =================================================================

        // 4. Disegna il bordo esterno nero
        // Imposta il colore a nero
        ctx.strokeStyle = 'black';
        // Scegli uno spessore per il bordo (ad esempio 2 pixel)
        ctx.lineWidth = 1;

        // Disegna l'arco di nuovo, ma con il nuovo stile (disegnando così il bordo)
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.size + 4, 0, Math.PI * 2);
        ctx.stroke();

        // 5. Animazione e Wrap Around (dal basso verso l'alto, più veloce)
        ring.y -= ring.speed; // Usa la velocità random definita in initRings
        if (ring.y < 0) {
            ring.y = CANVAS_HEIGHT; // Torna in fondo
            ring.x = Math.random() * CANVAS_WIDTH; // Posizione X casuale
            // Pulisci la scia quando si avvolge, per evitare linee lunghe
            ring.trail = [];
        }
    });

    // Request the next frame to keep the rings animated
    if (gameState.currentScreen === 'start') {
        requestAnimationFrame(drawStartScreen);
    }
}
function drawPlayer() {
    const playerSize = 12; // Raggio dell'anello del giocatore
    const maxTrailLength = 25; // Lunghezza della scia per il giocatore
    const ringColor = gameState.selectedRingColor || '#fff';

    // *** 1. AGGIORNA E MANTIENI LA SCIA (TRAIL) ***
    
    // Assicurati che il giocatore abbia un array 'trail' (lo aggiungiamo se manca)
    if (!gameState.playerTrail) {
        gameState.playerTrail = [];
    }

    // Aggiungi la posizione attuale alla scia
    gameState.playerTrail.push({ x: gameState.playerX, y: gameState.playerY, alpha: 1 });
    
    // Mantieni solo gli ultimi elementi della scia
    if (gameState.playerTrail.length > maxTrailLength) {
        gameState.playerTrail.shift();
    }

    // *** 2. DISEGNA LA SCIA (TAIL) ***
    gameState.playerTrail.forEach((pos, index) => {
        const alpha = index / maxTrailLength; // Sbiadisce man mano che si allontana
        const trailSize = playerSize * (1 + alpha * 0.5); // Leggermente più grande verso la testa
        
        ctx.strokeStyle = ringColor;
        ctx.fillStyle = ringColor;
        ctx.globalAlpha = alpha * 0.2; // Scia più visibile
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, trailSize, 0, Math.PI * 2); 
        // Disegna la scia leggermente sotto il centro del player
        //ctx.fill();
        ctx.stroke();
    });

    // Ripristina l'opacità globale per l'anello principale
    ctx.globalAlpha = 1.0;

    // *** 3. EFFETTO BAGLIORE (GLOW) ***
    // Imposta il bagliore per l'anello del giocatore
    ctx.shadowColor = ringColor;
    ctx.shadowBlur = 22; // Intensità del bagliore
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // *** 4. DISEGNA L'ANELLO PRINCIPALE ***
    
    // Disegna l'anello con il suo colore originale (il "riempimento")
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 8; // Spessore dell'anello

    ctx.beginPath();
    ctx.arc(gameState.playerX, gameState.playerY, playerSize, 0, Math.PI * 2);
    ctx.stroke();

    // Ripristina gli effetti di ombra/bagliore
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // *** 5. BORDO ESTERNO NERO (per visibilità) ***
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(gameState.playerX, gameState.playerY, playerSize + 8, 0, Math.PI * 2);
    ctx.stroke();
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
        ctx.save(); // Salviamo lo stato per non influenzare altri disegni

        if (bullet.isSpecial) {
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(bullet.x - bullet.size / 2, bullet.y - bullet.size / 2, bullet.size, bullet.size);
        } else {
            const width = bullet.size; // Es. 8
            const height = bullet.size * 4; // Più allungata per l'effetto scia

            // 1. Creiamo un gradiente radiale per l'effetto "nucleo caldo"
            // Il gradiente va dal centro verso l'esterno
            let gradient = ctx.createRadialGradient(
                bullet.x, bullet.y, 0,           // Centro (punto caldissimo)
                bullet.x, bullet.y, height / 2  // Raggio esterno
            );
            
            gradient.addColorStop(0, '#fff');    // Bianco al centro
            gradient.addColorStop(0.2, '#ff0');  // Giallo
            gradient.addColorStop(0.5, 'red');  // Arancione
            gradient.addColorStop(1, 'transparent'); // Dissolvenza verso la coda

            // 2. Aggiungiamo un bagliore (Glow)
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#f40';

            // 3. Disegniamo la forma a goccia/palla allungata
            ctx.beginPath();
            ctx.fillStyle = gradient;
            
            // Disegniamo un'ellisse ma la deformiamo leggermente verso l'alto (scia)
            ctx.ellipse(
                bullet.x, 
                bullet.y, 
                width / 2, 
                height / 2, 
                0, 0, Math.PI * 2
            );
            
            ctx.fill();

            // Opzionale: un piccolo bordo scuro molto sottile se vuoi mantenere definizione
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        ctx.restore(); // Ripristiniamo lo stato originale (rimuove ombre e stili)
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
    // ? NUOVO: Logica di Movimento Basata sul Touch ?
    if (gameState.touchIdentifier !== null) {
        // Se c'è un tocco attivo, muovi il giocatore verso la posizione del tocco.
        // Puoi anche muoverlo direttamente alla posizione del tocco.
        
        // Movimento Diretto alla Posizione del Tocco (più immediato per i giochi shmup)
        // Aggiorna la posizione X e Y, limitandola ai bordi della Canvas.
        if (gameState.touchX !== null && gameState.touchY !== null) {
            gameState.playerX = Math.max(
                10, 
                Math.min(CANVAS_WIDTH - 10, gameState.touchX)
            );
            // Si limita il movimento Y solo nella metà inferiore dello schermo
            gameState.playerY = Math.max(
                CANVAS_HEIGHT / 2, 
                Math.min(CANVAS_HEIGHT - 10, gameState.touchY)
            );
        }
        
    } else {
        // Logica di Movimento Basata su Keyboard (fall-back per desktop)
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

// VARIABILI (Assumi che siano già definite all'inizio del file)
// let backgroundPositionY = 0; 
// const SCROLL_SPEED = 1; 
// const gameContainer = document.getElementById('game-container');

function gameLoop() {
    if (gameState.currentScreen === 'playing') {
        // 1. CLEAR CANVAS
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = 'transparent'; 
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);


        // 2. UPDATE GAME STATE (e Sfondo CSS)
        
        // --- LOGICA INFINITE SCROLLING VERTICALE (VERSO IL BASSO) ---
        // INCREMENTA la posizione Y per spostare lo sfondo in GIÙ
        backgroundPositionY += SCROLL_SPEED; 
        
        // Applica la nuova posizione: background-position: X Y;
        // La X resta 0, la Y è dinamica.
        gameContainer.style.backgroundPosition = `0px ${backgroundPositionY}px`;
        // -----------------------------------------------------------

        updatePlayer();
        updateBullets();

        // 3. DRAW GAME OBJECTS
        drawPlayer();
        // 2. Update logic
        updateSpecialRay(); 
        // ... update other bullets/enemies ...

        // 3. Draw logic
        drawSpecialRay(ctx); // Call the draw function here!
    
        if (gameState.isCharging) {
        drawChargeEffect(ctx); // Visual feedback that charging is happening
    }

        //drawEnemies(); 
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

// --- EVENT LISTENERS (AGGIUNTA CONTROLLO TOUCH) ---

// ... (existing event listeners)

// ? NUOVO: Touch Input per Dispositivi Mobili ?

// Funzione di utilità per ottenere le coordinate relative del tocco
function getTouchPos(touchEvent) {
    // Assicurati che l'evento e i suoi target siano validi
    if (!touchEvent || !touchEvent.target) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const touch = touchEvent.touches[0];
    
    // Calcola la posizione del tocco relativa al canvas, scalata correttamente
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;
    
    return { x: x, y: y };
}

// 1. TOUCH START (Primo tocco)
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Impedisce lo zoom/scroll di default
    
    if (gameState.currentScreen === 'playing' && e.touches.length > 0) {
        const pos = getTouchPos(e);
        
        // Usa il primo tocco per il movimento
        gameState.touchIdentifier = e.touches[0].identifier;
        gameState.touchX = pos.x;
        gameState.touchY = pos.y;
    }
}, { passive: false });


// 2. TOUCH MOVE (Il dito si muove)
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Impedisce lo scroll durante il movimento
    
    if (gameState.currentScreen === 'playing' && gameState.touchIdentifier !== null) {
        // Cerca il tocco che stiamo tracciando
        const touch = Array.from(e.changedTouches).find(t => t.identifier === gameState.touchIdentifier);

        if (touch) {
            const pos = getTouchPos({ touches: [touch], target: canvas });
            gameState.touchX = pos.x;
            gameState.touchY = pos.y;
        }
    }
}, { passive: false });


// 3. TOUCH END (Il dito viene sollevato)
canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    
    // Controlla se il tocco tracciato è terminato
    const touchEnded = Array.from(e.changedTouches).some(t => t.identifier === gameState.touchIdentifier);

    if (touchEnded) {
        gameState.touchIdentifier = null;
        gameState.touchX = null;
        gameState.touchY = null;
    }
    
    // Opzionale: se il tocco viene usato solo per il movimento, 
    // potresti usare un secondo tocco (multitouch) per l'attacco speciale.
    // Esempio: fireSpecialAttack(); se e.changedTouches.length era 2 (se non c'era un altro touch attivo)
    
}, { passive: false });

// 4. TOUCH CANCEL (Caso di interruzione come una chiamata in arrivo)
canvas.addEventListener('touchcancel', (e) => {
    gameState.touchIdentifier = null;
    gameState.touchX = null;
    gameState.touchY = null;
});




// --- START DRAWING THE START SCREEN ANIMATION ---
drawStartScreen();
