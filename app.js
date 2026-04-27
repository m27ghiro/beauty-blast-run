// Debugging helper
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
                y: this.y - 40,
                size: this.game.activePowerUps.airBari > 0 ? 30 : 10
            });
        }
    }

    draw(ctx) {
        if (this.game.assets.player.complete && this.game.assets.player.naturalWidth !== 0) {
            ctx.drawImage(this.game.assets.player, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        } else {
            ctx.fillStyle = '#ff85a2';
            ctx.fillRect(this.x - 25, this.y - 50, 50, 100);
        }
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();

        this.isRunning = false;
        this.score = 0;
        this.power = 1;
        this.progress = 0;
        this.trackLength = 10000;
        this.speed = 2.5; 
        this.distance = 0;

        this.assets = {
            player: new Image(),
            background: new Image(),
            enemySmall: new Image(),
            boss: new Image(),
            item: new Image()
        };

        this.player = new Player(this);
        this.bullets = [];
        this.enemies = [];
        this.gates = [];
        this.items = [];
        this.particles = [];
        this.activePowerUps = { airBari: 0, oxygen: 0, hydrogen: 0 };

        this.highScore = parseInt(localStorage.getItem('beauty_blast_high_score')) || 0;
        this.totalPurified = parseInt(localStorage.getItem('beauty_blast_total_purified')) || 0;

        this.mouseX = this.canvas.width / 2;
        this.isDragging = false;

        this.initEvents();
        this.loadAssets();
        this.updateHUD();
    }

    resize() {
        const container = document.getElementById('game-container');
        this.canvas.width = container.clientWidth || window.innerWidth;
        this.canvas.height = container.clientHeight || window.innerHeight;
    }

    initEvents() {
        window.addEventListener('resize', () => this.resize());
        const getX = (e) => {
            const x = e.touches ? e.touches[0].clientX : e.clientX;
            const rect = this.canvas.getBoundingClientRect();
            return x - rect.left;
        };
        const handleStart = (e) => { this.isDragging = true; this.mouseX = getX(e); };
        const handleMove = (e) => { if (this.isDragging || e.touches) this.mouseX = getX(e); if (e.touches) e.preventDefault(); };
        const handleEnd = () => this.isDragging = false;

        this.canvas.addEventListener('mousedown', handleStart);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);
        this.canvas.addEventListener('touchstart', (e) => { handleStart(e); e.preventDefault(); }, {passive: false});
        this.canvas.addEventListener('touchmove', (e) => { handleMove(e); e.preventDefault(); }, {passive: false});
        this.canvas.addEventListener('touchend', handleEnd);

        document.getElementById('start-button').addEventListener('click', (e) => { e.stopPropagation(); this.start(); });
        const restartBtn = document.getElementById('restart-button');
        if (restartBtn) restartBtn.addEventListener('click', () => location.reload());
    }

    loadAssets() {
        this.assets.player.src = 'player.png';
        this.assets.background.src = 'background.png';
        this.assets.enemySmall.src = 'enemy_small.png';
        this.assets.boss.src = 'boss.png';
        this.assets.item.src = 'item.png';
    }

    updateHUD() {
        const scoreVal = document.getElementById('score-value');
        const bestVal = document.getElementById('best-value');
        const powerVal = document.getElementById('power-value');
        if (scoreVal) scoreVal.innerText = this.score;
        if (bestVal) bestVal.innerText = this.highScore;
        if (powerVal) powerVal.innerText = this.power;
    }

    start() {
        const cheatMode = document.getElementById('cheat-mode').checked;
        document.getElementById('start-screen').style.display = 'none';
        this.isRunning = true;
        this.score = 0;
        if (cheatMode) {
            this.power = 100;
            this.activePowerUps.airBari = 999999;
            this.activePowerUps.oxygen = 999999;
            this.activePowerUps.hydrogen = 999999;
            this.speed = 4;
        }
        this.updateHUD();
        this.spawnInitialLevel();
        this.animate();
    }

    spawnInitialLevel() {
        for (let i = 1; i < 20; i++) {
            this.spawnGate(i * 800);
            if (i % 3 === 0) this.spawnItem(i * 800 + 400);
            this.spawnEnemies(i * 800 + 600);
        }
    }

    spawnItem(z) {
        const types = ['airBari', 'oxygen', 'hydrogen'];
        const type = types[Math.floor(Math.random() * types.length)];
        this.items.push({ x: Math.random() * (this.canvas.width - 100) + 50, y: -z, type, size: 40 });
    }

    spawnGate(z) {
        const isLeft = Math.random() > 0.5;
        const type = Math.random() > 0.5 ? 'power' : 'fireRate';
        const value = type === 'power' ? Math.floor(Math.random() * 10) + 5 : Math.floor(Math.random() * 2) + 2;
        const color = type === 'power' ? '#3b82f6' : '#60a5fa'; // Blue for plus
        this.gates.push({
            x: isLeft ? this.canvas.width * 0.25 : this.canvas.width * 0.75, y: -z,
            width: this.canvas.width * 0.45, height: 80, type, value, color,
            label: type === 'power' ? `POWER +${value}` : `SHOTS x${value}`
        });
    }

    spawnEnemies(z) {
        const isBoss = Math.random() > 0.8;
        const count = isBoss ? 1 : Math.floor(Math.random() * 5) + 3;
        for (let i = 0; i < count; i++) {
            this.enemies.push({
                x: isBoss ? this.canvas.width/2 : Math.random() * (this.canvas.width - 60) + 30,
                y: -z - (Math.random() * 200),
                hp: isBoss ? this.power * 20 : this.power * 2 + 5,
                size: isBoss ? 120 : 40,
                isBoss: isBoss
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
        if (this.distance % 6 === 0) this.player.shoot();

        this.bullets.forEach((b, i) => { b.y -= 12; if (b.y < -100) this.bullets.splice(i, 1); });

        this.items.forEach((item, i) => {
            item.y += this.speed;
            if (Math.hypot(this.player.x - item.x, this.player.y - item.y) < 60) {
                this.activateItem(item.type);
                this.createExplosion(item.x, item.y, '#ffd700');
                this.items.splice(i, 1);
            }
            if (item.y > this.canvas.height + 100) this.items.splice(i, 1);
        });

        Object.keys(this.activePowerUps).forEach(key => { if (this.activePowerUps[key] > 0) this.activePowerUps[key]--; });

        this.gates.forEach((g, i) => {
            g.y += this.speed;
            if (this.player.x < g.x + g.width / 2 && this.player.x > g.x - g.width / 2 && this.player.y < g.y + g.height && this.player.y > g.y) {
                if (g.type === 'power') this.power += g.value;
                this.updateHUD();
                this.createExplosion(g.x, g.y, g.color);
                this.gates.splice(i, 1);
            }
            if (g.y > this.canvas.height + 100) this.gates.splice(i, 1);
        });

        this.enemies.forEach((e, i) => {
            e.y += this.speed;
            if (this.activePowerUps.hydrogen > 0 && Math.hypot(this.player.x - e.x, this.player.y - e.y) < 180) {
                e.hp -= 0.2;
                if (Math.random() > 0.8) this.createExplosion(e.x, e.y, '#ffffff');
            }
            this.bullets.forEach((b, bi) => {
                const dist = Math.hypot(e.x - b.x, e.y - b.y);
                const hitRadius = e.size;
                if (dist < hitRadius) {
                    e.hp -= (this.activePowerUps.airBari > 0 ? 10 : 1);
                    if (this.activePowerUps.airBari <= 0) this.bullets.splice(bi, 1);
                    if (e.hp <= 0) {
                        this.score += e.isBoss ? 50 : 1;
                        this.updateHUD();
                        this.createExplosion(e.x, e.y, '#c084fc');
                        this.enemies.splice(i, 1);
                    }
                }
            });
            if (e.y > this.canvas.height + 100) this.enemies.splice(i, 1);
        });

        this.particles.forEach((p, i) => {
            p.x += p.vx; p.y += p.vy; p.alpha -= 0.02;
            if (p.alpha <= 0) this.particles.splice(i, 1);
        });

        if (this.distance % 500 === 0) {
            this.spawnGate(this.canvas.height + 200);
            if (Math.random() > 0.4) this.spawnItem(this.canvas.height + 400);
            this.spawnEnemies(this.canvas.height + 600);
        }
    }

    activateItem(type) {
        this.activePowerUps[type] = 400;
        this.particles.push({ x: this.player.x, y: this.player.y - 50, vx: 0, vy: -1.5, alpha: 1, text: type.toUpperCase(), isText: true });
    }

    createExplosion(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({ x, y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, alpha: 1, color });
        }
    }

    win() {
        this.isRunning = false;
        this.totalPurified += this.score;
        if (this.score > this.highScore) this.highScore = this.score;
        localStorage.setItem('beauty_blast_high_score', this.highScore);
        localStorage.setItem('beauty_blast_total_purified', this.totalPurified);
        document.getElementById('game-over-screen').classList.remove('hidden');
        document.getElementById('final-score').innerText = this.score;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Background Scrolled
        if (this.assets.background.complete) {
            const bg = this.assets.background;
            const scroll = (this.distance % this.canvas.height);
            this.ctx.drawImage(bg, 0, scroll - this.canvas.height, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(bg, 0, scroll, this.canvas.width, this.canvas.height);
        } else {
            this.ctx.fillStyle = '#fff5f7';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Gates
        this.gates.forEach(g => {
            this.ctx.fillStyle = g.color + '66';
            this.ctx.fillRect(g.x - g.width / 2, g.y, g.width, g.height);
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(g.x - g.width / 2, g.y, g.width, g.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 20px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(g.label, g.x, g.y + 45);
        });

        // Enemies
        this.enemies.forEach(e => {
            const img = e.isBoss ? this.assets.boss : this.assets.enemySmall;
            if (img.complete) {
                this.ctx.drawImage(img, e.x - e.size/2, e.y - e.size/2, e.size, e.size);
            } else {
                this.ctx.beginPath(); this.ctx.arc(e.x, e.y, e.size/2, 0, Math.PI * 2);
                this.ctx.fillStyle = e.isBoss ? 'red' : 'purple'; this.ctx.fill();
            }
            this.ctx.fillStyle = 'white';
            this.ctx.font = (e.isBoss ? 'bold 18px' : 'bold 12px') + ' sans-serif';
            this.ctx.fillText(Math.ceil(e.hp), e.x, e.y + (e.isBoss ? 70 : 30));
        });

        // Items
        this.items.forEach(item => {
            if (this.assets.item.complete) {
                this.ctx.drawImage(this.assets.item, item.x - item.size/2, item.y - item.size/2, item.size, item.size);
            } else {
                this.ctx.beginPath(); this.ctx.arc(item.x, item.y, item.size/2, 0, Math.PI * 2);
                this.ctx.fillStyle = 'gold'; this.ctx.fill();
            }
        });

        if (this.activePowerUps.hydrogen > 0) {
            this.ctx.beginPath(); this.ctx.arc(this.player.x, this.player.y, 180, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; this.ctx.lineWidth = 10; this.ctx.stroke();
        }

        // Bullets
        this.bullets.forEach(b => {
            this.ctx.beginPath();
            this.ctx.arc(b.x, b.y, b.size/2, 0, Math.PI * 2);
            this.ctx.fillStyle = this.activePowerUps.airBari > 0 ? '#ff1493' : '#ffd700';
            this.ctx.fill();
        });

        // Particles
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.alpha;
            if (p.isText) {
                this.ctx.fillStyle = 'white'; this.ctx.font = 'bold 30px sans-serif';
                this.ctx.textAlign = 'center'; this.ctx.fillText(p.text, p.x, p.y);
            } else {
                this.ctx.fillStyle = p.color; this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); this.ctx.fill();
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

const game = new Game();
