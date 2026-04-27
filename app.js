// Debugging helper: Show errors on screen if they occur
window.onerror = function(msg, url, lineNo, columnNo, error) {
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '0';
    errorDiv.style.left = '0';
    errorDiv.style.background = 'rgba(255,0,0,0.8)';
    errorDiv.style.color = 'white';
    errorDiv.style.padding = '10px';
    errorDiv.style.zIndex = '9999';
    errorDiv.style.fontSize = '12px';
    errorDiv.innerHTML = 'Error: ' + msg + '<br>Line: ' + lineNo;
    document.body.appendChild(errorDiv);
    return false;
};

// --- Entity Classes ---
class Player {
    constructor(game) {
        this.game = game;
        this.x = game.canvas.width / 2;
        this.y = game.canvas.height - 150;
        this.width = 80;
        this.height = 120;
    }

    update(targetX) {
        this.x += (targetX - this.x) * 0.15;
        this.x = Math.max(this.width / 2, Math.min(this.game.canvas.width - this.width / 2, this.x));
    }

    shoot() {
        const shotCount = Math.min(5, Math.floor(this.game.power / 10) + 1);
        for (let i = 0; i < shotCount; i++) {
            const offset = (i - (shotCount - 1) / 2) * 20;
            this.game.bullets.push({
                x: this.x + offset,
                y: this.y - 20,
                size: 5
            });
        }
    }

    draw(ctx) {
        if (this.game.playerImg && this.game.playerImg.complete && this.game.playerImg.naturalWidth !== 0) {
            ctx.drawImage(this.game.playerImg, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        } else {
            ctx.fillStyle = '#ff85a2';
            ctx.beginPath();
            ctx.rect(this.x - 25, this.y - 50, 50, 100); // Standard rect for compatibility
            ctx.fill();
        }
    }
}

// --- Main Game Class ---
class Game {
    constructor() {
        console.log("Game Init...");
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            alert("Canvas element not found!");
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.resize();

        this.isRunning = false;
        this.score = 0;
        this.power = 1;
        this.progress = 0;
        this.trackLength = 5000;
        this.speed = 5;
        this.distance = 0;

        this.player = new Player(this);
        this.bullets = [];
        this.enemies = [];
        this.gates = [];
        this.items = [];
        this.particles = [];
        this.activePowerUps = {
            airBari: 0,
            oxygen: 0,
            hydrogen: 0
        };

        // Load Saved Data
        this.highScore = parseInt(localStorage.getItem('beauty_blast_high_score')) || 0;
        this.totalPurified = parseInt(localStorage.getItem('beauty_blast_total_purified')) || 0;
        this.updateHUD();

        this.mouseX = this.canvas.width / 2;
        this.isDragging = false;

        this.initEvents();
        this.loadAssets();
        
        // Final fallback to ensure visibility
        this.draw(); 
    }

    resize() {
        const container = document.getElementById('game-container');
        this.canvas.width = container.clientWidth || window.innerWidth;
        this.canvas.height = container.clientHeight || window.innerHeight;
        if (this.player) {
            this.player.x = this.canvas.width / 2;
            this.player.y = this.canvas.height - 150;
        }
    }

    initEvents() {
        window.addEventListener('resize', () => this.resize());
        
        const getX = (e) => {
            const x = e.touches ? e.touches[0].clientX : e.clientX;
            const rect = this.canvas.getBoundingClientRect();
            return x - rect.left;
        };

        const handleStart = (e) => {
            this.isDragging = true;
            this.mouseX = getX(e);
        };
        
        const handleMove = (e) => {
            if (!this.isDragging && !e.touches) return;
            this.mouseX = getX(e);
            if (e.touches) e.preventDefault(); // Prevent scrolling on touch
        };
        
        const handleEnd = () => this.isDragging = false;

        this.canvas.addEventListener('mousedown', handleStart);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);
        
        this.canvas.addEventListener('touchstart', (e) => {
            handleStart(e);
            e.preventDefault();
        }, {passive: false});
        this.canvas.addEventListener('touchmove', (e) => {
            handleMove(e);
            e.preventDefault();
        }, {passive: false});
        this.canvas.addEventListener('touchend', handleEnd);

        document.getElementById('start-button').addEventListener('click', (e) => {
            e.stopPropagation();
            this.start();
        });
        
        const restartBtn = document.getElementById('restart-button');
        if (restartBtn) restartBtn.addEventListener('click', () => location.reload());
    }

    loadAssets() {
        this.playerImg = new Image();
        this.playerImg.src = 'images/player.png';
    }

    start() {
        console.log("Start button clicked");
        const cheatMode = document.getElementById('cheat-mode').checked;
        const startScreen = document.getElementById('start-screen');
        if (startScreen) startScreen.style.display = 'none';
        
        this.isRunning = true;
        this.score = 0;
        
        if (cheatMode) {
            this.power = 100;
            this.activePowerUps.airBari = 999999;
            this.activePowerUps.oxygen = 999999;
            this.activePowerUps.hydrogen = 999999;
            this.speed = 8;
            this.showFloatingText("CHEAT MODE ON!", this.canvas.width/2, this.canvas.height/2);
        }

        this.updateHUD();
        this.spawnInitialLevel();
        this.animate();
    }

    updateHUD() {
        const scoreVal = document.getElementById('score-value');
        const bestVal = document.getElementById('best-value');
        const powerVal = document.getElementById('power-value');
        
        if (scoreVal) scoreVal.innerText = this.score;
        if (bestVal) bestVal.innerText = this.highScore;
        if (powerVal) powerVal.innerText = this.power;
    }

    activateItem(type) {
        this.activePowerUps[type] = 300;
        this.showFloatingText(type.toUpperCase(), this.player.x, this.player.y - 50);
    }

    showFloatingText(text, x, y) {
        this.particles.push({
            x, y, vx: 0, vy: -2, alpha: 1, color: '#ff1493', text: text, isText: true
        });
    }

    spawnInitialLevel() {
        for (let i = 1; i < 15; i++) {
            this.spawnGate(i * 600);
            if (i % 3 === 0) this.spawnItem(i * 600 + 300);
            this.spawnEnemies(i * 600 + 450);
        }
    }

    spawnItem(z) {
        const types = ['airBari', 'oxygen', 'hydrogen'];
        const type = types[Math.floor(Math.random() * types.length)];
        const colors = { airBari: '#ff69b4', oxygen: '#00ced1', hydrogen: '#ffffff' };
        this.items.push({ x: Math.random() * (this.canvas.width - 100) + 50, y: -z, type, color: colors[type], size: 25 });
    }

    spawnGate(z) {
        const isLeft = Math.random() > 0.5;
        const type = Math.random() > 0.5 ? 'power' : 'fireRate';
        const value = type === 'power' ? Math.floor(Math.random() * 5) + 1 : Math.floor(Math.random() * 2) + 2;
        this.gates.push({
            x: isLeft ? this.canvas.width * 0.25 : this.canvas.width * 0.75, y: -z,
            width: this.canvas.width * 0.4, height: 60, type, value,
            color: type === 'power' ? '#ff85a2' : '#ffd700',
            label: type === 'power' ? `POWER +${value}` : `SHOTS x${value}`
        });
    }

    spawnEnemies(z) {
        const count = Math.floor(Math.random() * 3) + 2;
        for (let i = 0; i < count; i++) {
            this.enemies.push({
                x: Math.random() * (this.canvas.width - 60) + 30, y: -z - (Math.random() * 200),
                hp: this.power * 2 + Math.floor(Math.random() * 5), size: 30 + Math.random() * 20
            });
        }
    }

    update() {
        if (!this.isRunning) return;

        this.distance += this.speed;
        this.progress = (this.distance / this.trackLength) * 100;
        const pb = document.getElementById('progress-bar');
        if (pb) pb.style.width = Math.min(this.progress, 100) + '%';

        if (this.distance > this.trackLength) this.win();

        this.player.update(this.mouseX);

        if (this.distance % 10 === 0) this.player.shoot();

        this.bullets.forEach((b, i) => {
            b.y -= 15;
            if (b.y < 0) this.bullets.splice(i, 1);
        });

        this.items.forEach((item, i) => {
            item.y += this.speed;
            const dist = Math.hypot(this.player.x - item.x, this.player.y - item.y);
            if (dist < 50) {
                this.activateItem(item.type);
                this.createExplosion(item.x, item.y, item.color);
                this.items.splice(i, 1);
            }
            if (item.y > this.canvas.height) this.items.splice(i, 1);
        });

        Object.keys(this.activePowerUps).forEach(key => {
            if (this.activePowerUps[key] > 0) this.activePowerUps[key]--;
        });

        this.gates.forEach((g, i) => {
            g.y += this.speed;
            const px = this.player.x;
            const py = this.player.y;
            if (px < g.x + g.width / 2 && px > g.x - g.width / 2 && py < g.y + g.height && py > g.y) {
                if (g.type === 'power') this.power += g.value;
                const pVal = document.getElementById('power-value');
                if (pVal) pVal.innerText = this.power;
                this.createExplosion(g.x, g.y, g.color);
                this.gates.splice(i, 1);
            }
            if (g.y > this.canvas.height) this.gates.splice(i, 1);
        });

        this.enemies.forEach((e, i) => {
            e.y += this.speed;
            if (this.activePowerUps.hydrogen > 0) {
                if (Math.hypot(this.player.x - e.x, this.player.y - e.y) < 150) {
                    e.hp -= 0.1;
                    if (Math.random() > 0.9) this.createExplosion(e.x, e.y, '#ffffff');
                }
            }
            this.bullets.forEach((b, bi) => {
                const dist = Math.hypot(e.x - b.x, e.y - b.y);
                const hitRadius = this.activePowerUps.airBari > 0 ? b.size * 2 : e.size;
                if (dist < hitRadius) {
                    e.hp -= (this.activePowerUps.airBari > 0 ? 5 : 1);
                    if (this.activePowerUps.airBari <= 0) this.bullets.splice(bi, 1);
                    if (e.hp <= 0) {
                        this.score += 1;
                        const sVal = document.getElementById('score-value');
                        if (sVal) sVal.innerText = this.score;
                        this.createExplosion(e.x, e.y, '#c084fc');
                        this.enemies.splice(i, 1);
                    }
                }
            });
            if (e.y > this.canvas.height) this.enemies.splice(i, 1);
        });

        this.particles.forEach((p, i) => {
            p.x += p.vx; p.y += p.vy;
            p.alpha -= p.isText ? 0.01 : 0.02;
            if (p.alpha <= 0) this.particles.splice(i, 1);
        });

        if (this.distance % 600 === 0) {
            this.spawnGate(this.canvas.height + 200);
            if (Math.random() > 0.5) this.spawnItem(this.canvas.height + 300);
            this.spawnEnemies(this.canvas.height + 400);
        }
    }

    createExplosion(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x, y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, alpha: 1, color
            });
        }
    }

    win() {
        this.isRunning = false;
        
        // Save logic
        this.totalPurified += this.score;
        if (this.score > this.highScore) {
            this.highScore = this.score;
        }
        
        localStorage.setItem('beauty_blast_high_score', this.highScore);
        localStorage.setItem('beauty_blast_total_purified', this.totalPurified);
        
        const goScreen = document.getElementById('game-over-screen');
        if (goScreen) goScreen.classList.remove('hidden');
        const fScore = document.getElementById('final-score');
        if (fScore) fScore.innerText = this.score;
        
        this.updateHUD();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Background track (Skin texture feel)
        this.ctx.fillStyle = '#fff0f3';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.gates.forEach(g => {
            this.ctx.fillStyle = g.color + '44';
            this.ctx.fillRect(g.x - g.width / 2, g.y, g.width, g.height);
            this.ctx.strokeStyle = g.color;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(g.x - g.width / 2, g.y, g.width, g.height);
            this.ctx.fillStyle = g.color;
            this.ctx.font = 'bold 16px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(g.label, g.x, g.y + 35);
        });
        this.enemies.forEach(e => {
            this.ctx.beginPath(); this.ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            this.ctx.fillStyle = '#c084fc'; this.ctx.fill();
            this.ctx.strokeStyle = '#9333ea'; this.ctx.stroke();
            this.ctx.fillStyle = 'white'; this.ctx.font = '12px sans-serif';
            this.ctx.fillText(Math.ceil(e.hp), e.x, e.y + 5);
        });
        this.items.forEach(item => {
            this.ctx.beginPath(); this.ctx.arc(item.x, item.y, item.size, 0, Math.PI * 2);
            this.ctx.fillStyle = item.color; this.ctx.fill();
            this.ctx.fillStyle = 'black'; this.ctx.font = 'bold 10px sans-serif';
            this.ctx.fillText(item.type.charAt(0).toUpperCase(), item.x, item.y + 4);
        });
        if (this.activePowerUps.hydrogen > 0) {
            this.ctx.beginPath(); this.ctx.arc(this.player.x, this.player.y, 150, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; this.ctx.lineWidth = 5; this.ctx.stroke();
        }
        this.bullets.forEach(b => {
            this.ctx.beginPath();
            const size = this.activePowerUps.airBari > 0 ? 15 : 5;
            this.ctx.arc(b.x, b.y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = this.activePowerUps.airBari > 0 ? '#ff1493' : '#ffd700';
            this.ctx.fill();
            b.size = size;
        });
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.alpha;
            if (p.isText) {
                this.ctx.fillStyle = '#ff1493'; this.ctx.font = 'bold 30px sans-serif';
                this.ctx.textAlign = 'center'; this.ctx.fillText(p.text, p.x, p.y);
            } else {
                this.ctx.fillStyle = p.color; this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); this.ctx.fill();
            }
        });
        this.ctx.globalAlpha = 1;
        this.player.draw(this.ctx);
    }

    animate() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

// Start immediately to avoid window.onload issues
const game = new Game();
