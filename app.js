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
        // Smooth lerping to target mouse/touch X
        this.x += (targetX - this.x) * 0.15;
        
        // Boundaries
        this.x = Math.max(this.width / 2, Math.min(this.game.canvas.width - this.width / 2, this.x));
    }

    shoot() {
        // Multi-shot based on power
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
        if (this.game.playerImg && this.game.playerImg.complete) {
            ctx.drawImage(this.game.playerImg, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        } else {
            // Placeholder if image not loaded
            ctx.fillStyle = '#ff85a2';
            ctx.beginPath();
            ctx.roundRect(this.x - 25, this.y - 50, 50, 100, 10);
            ctx.fill();
        }
    }
}

// --- Main Game Class ---
class Game {
    constructor() {
        console.log("Game Initializing...");
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();

        // Game State
        this.isRunning = false;
        this.score = 0;
        this.power = 1;
        this.progress = 0;
        this.trackLength = 5000;
        this.speed = 5;
        this.distance = 0;

        // Entities
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

        // Input
        this.mouseX = this.canvas.width / 2;
        this.isDragging = false;

        this.initEvents();
        this.loadAssets();
        console.log("Game Ready!");
    }

    resize() {
        const container = document.getElementById('game-container');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }

    initEvents() {
        window.addEventListener('resize', () => this.resize());
        
        const handleStart = (e) => {
            this.isDragging = true;
            const x = e.touches ? e.touches[0].clientX : e.clientX;
            this.updateMousePos(x);
        };
        
        const handleMove = (e) => {
            if (!this.isDragging) return;
            const x = e.touches ? e.touches[0].clientX : e.clientX;
            this.updateMousePos(x);
        };
        
        const handleEnd = () => this.isDragging = false;

        this.canvas.addEventListener('mousedown', handleStart);
        this.canvas.addEventListener('mousemove', handleMove);
        this.canvas.addEventListener('mouseup', handleEnd);
        this.canvas.addEventListener('touchstart', handleStart, {passive: false});
        this.canvas.addEventListener('touchmove', handleMove, {passive: false});
        this.canvas.addEventListener('touchend', handleEnd);

        document.getElementById('start-button').addEventListener('click', () => this.start());
        document.getElementById('restart-button').addEventListener('click', () => location.reload());
    }

    updateMousePos(clientX) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = clientX - rect.left;
    }

    loadAssets() {
        this.playerImg = new Image();
        this.playerImg.onload = () => console.log("Assets loaded");
        this.playerImg.onerror = () => console.error("Asset load failed");
        this.playerImg.src = 'images/player.png';
    }

    start() {
        console.log("Game Starting...");
        document.getElementById('start-screen').classList.add('hidden');
        this.isRunning = true;
        this.spawnInitialLevel();
        this.animate();
    }

    activateItem(type) {
        const duration = 300; 
        this.activePowerUps[type] = duration;
        const label = type.toUpperCase().replace('_', ' ');
        this.showFloatingText(label, this.player.x, this.player.y - 50);
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
        document.getElementById('progress-bar').style.width = `${Math.min(this.progress, 100)}%`;

        if (this.distance > this.trackLength) {
            this.win();
        }

        this.player.update(this.mouseX);

        if (this.distance % 10 === 0) {
            this.player.shoot();
        }

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
            if (this.checkCollision(this.player, g)) {
                if (g.type === 'power') this.power += g.value;
                document.getElementById('power-value').innerText = this.power;
                this.createExplosion(g.x, g.y, g.color);
                this.gates.splice(i, 1);
            }
            if (g.y > this.canvas.height) this.gates.splice(i, 1);
        });

        this.enemies.forEach((e, i) => {
            e.y += this.speed;
            if (this.activePowerUps.hydrogen > 0) {
                const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y);
                if (dist < 150) {
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
                        document.getElementById('score-value').innerText = this.score;
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

    checkCollision(p, g) {
        return p.x < g.x + g.width / 2 && p.x > g.x - g.width / 2 && p.y < g.y + g.height && p.y > g.y;
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
        document.getElementById('game-over-screen').classList.remove('hidden');
        document.getElementById('final-score').innerText = this.score;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.gates.forEach(g => {
            this.ctx.fillStyle = g.color + '44';
            this.ctx.fillRect(g.x - g.width / 2, g.y, g.width, g.height);
            this.ctx.strokeStyle = g.color;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(g.x - g.width / 2, g.y, g.width, g.height);
            this.ctx.fillStyle = g.color;
            this.ctx.font = 'bold 16px "M PLUS Rounded 1c"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(g.label, g.x, g.y + 35);
        });
        this.enemies.forEach(e => {
            this.ctx.beginPath(); this.ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            this.ctx.fillStyle = '#c084fc'; this.ctx.fill();
            this.ctx.strokeStyle = '#9333ea'; this.ctx.stroke();
            this.ctx.fillStyle = 'white'; this.ctx.font = '12px Orbitron';
            this.ctx.fillText(Math.ceil(e.hp), e.x, e.y + 5);
        });
        this.items.forEach(item => {
            this.ctx.beginPath(); this.ctx.arc(item.x, item.y, item.size, 0, Math.PI * 2);
            this.ctx.fillStyle = item.color; this.ctx.fill();
            this.ctx.shadowBlur = 15; this.ctx.shadowColor = item.color; this.ctx.stroke();
            this.ctx.fillStyle = 'black'; this.ctx.font = 'bold 10px sans-serif';
            this.ctx.fillText(item.type.charAt(0).toUpperCase(), item.x, item.y + 4);
        });
        this.ctx.shadowBlur = 0;
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
            this.ctx.shadowBlur = 10; this.ctx.shadowColor = this.ctx.fillStyle;
            b.size = size;
        });
        this.ctx.shadowBlur = 0;
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.alpha;
            if (p.isText) {
                this.ctx.fillStyle = '#ff1493'; this.ctx.font = 'bold 30px "M PLUS Rounded 1c"';
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

// Initialize Game
window.onload = () => {
    new Game();
};
