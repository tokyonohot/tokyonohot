class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cellSize = 25;
    this.gridWidth = 20;
    this.gridHeight = 20;
    this.animationFrame = null;
    this.lastRenderTime = 0;
    this.foodPulse = 0;
    this.particles = [];
    
    this.colors = {
      background: '#0f0f1a',
      grid: '#1a1a2e',
      player1: '#00ffaa',
      player2: '#ff3366',
      food: '#ffff00',
      poison: '#9932cc',
      text: '#e0e0e0'
    };
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const container = this.canvas.parentElement;
    const size = Math.min(container.clientWidth, container.clientHeight);
    this.canvas.width = size;
    this.canvas.height = size;
    this.cellSize = Math.floor(size / this.gridWidth);
  }

  setGridSize(width, height) {
    this.gridWidth = width;
    this.gridHeight = height;
    this.resize();
  }

  clear() {
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGrid() {
    this.ctx.strokeStyle = this.colors.grid;
    this.ctx.lineWidth = 0.5;

    for (let x = 0; x <= this.gridWidth; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * this.cellSize, 0);
      this.ctx.lineTo(x * this.cellSize, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = 0; y <= this.gridHeight; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * this.cellSize);
      this.ctx.lineTo(this.canvas.width, y * this.cellSize);
      this.ctx.stroke();
    }
  }

  drawSnake(snake) {
    if (!snake || !snake.alive) return;

    const color = snake.color;
    const glowColor = this.hexToRgba(color, 0.5);
    
    snake.body.forEach((segment, index) => {
      const x = segment.x * this.cellSize;
      const y = segment.y * this.cellSize;
      const size = this.cellSize - 2;
      const offset = 1;

      if (index === 0) {
        this.ctx.shadowColor = glowColor;
        this.ctx.shadowBlur = 15;
        
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.roundRect(x + offset, y + offset, size, size, 5);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#ffffff';
        const eyeSize = 4;
        const eyeOffset = 6;
        
        let eye1X, eye1Y, eye2X, eye2Y;
        switch (snake.direction) {
          case 'up':
            eye1X = x + eyeOffset;
            eye1Y = y + eyeOffset + 2;
            eye2X = x + size - eyeOffset;
            eye2Y = y + eyeOffset + 2;
            break;
          case 'down':
            eye1X = x + eyeOffset;
            eye1Y = y + size - eyeOffset - 2;
            eye2X = x + size - eyeOffset;
            eye2Y = y + size - eyeOffset - 2;
            break;
          case 'left':
            eye1X = x + eyeOffset + 2;
            eye1Y = y + eyeOffset;
            eye2X = x + eyeOffset + 2;
            eye2Y = y + size - eyeOffset;
            break;
          case 'right':
          default:
            eye1X = x + size - eyeOffset - 2;
            eye1Y = y + eyeOffset;
            eye2X = x + size - eyeOffset - 2;
            eye2Y = y + size - eyeOffset;
        }
        
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(eye1X, eye1Y, eyeSize / 2, 0, Math.PI * 2);
        this.ctx.arc(eye2X, eye2Y, eyeSize / 2, 0, Math.PI * 2);
        this.ctx.fill();
        
      } else {
        this.ctx.shadowColor = glowColor;
        this.ctx.shadowBlur = 10;
        
        const gradient = this.ctx.createLinearGradient(x, y, x + size, y + size);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, this.darkenColor(color, 30));
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.roundRect(x + offset, y + offset, size, size, 3);
        this.ctx.fill();
      }
      
      this.ctx.shadowBlur = 0;
    });
  }

  drawFood(food) {
    const x = food.x * this.cellSize + this.cellSize / 2;
    const y = food.y * this.cellSize + this.cellSize / 2;
    const baseRadius = (this.cellSize - 4) / 2;
    const pulseRadius = baseRadius + Math.sin(this.foodPulse) * 2;
    
    if (food.type === 'poison') {
      this.ctx.shadowColor = 'rgba(153, 50, 204, 0.8)';
      this.ctx.shadowBlur = 15;
      this.ctx.fillStyle = this.colors.poison;
    } else {
      this.ctx.shadowColor = 'rgba(255, 255, 0, 0.8)';
      this.ctx.shadowBlur = 15;
      this.ctx.fillStyle = this.colors.food;
    }
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.shadowBlur = 0;
    
    if (food.type === 'normal') {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.beginPath();
      this.ctx.arc(x - 2, y - 2, pulseRadius / 3, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x - 4, y - 4);
      this.ctx.lineTo(x + 4, y + 4);
      this.ctx.moveTo(x + 4, y - 4);
      this.ctx.lineTo(x - 4, y + 4);
      this.ctx.stroke();
    }
  }

  addParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x * this.cellSize + this.cellSize / 2,
        y: y * this.cellSize + this.cellSize / 2,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1,
        color: color,
        size: Math.random() * 5 + 2
      });
    }
  }

  updateParticles(deltaTime) {
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= deltaTime * 2;
      p.vy += 0.5;
      return p.life > 0;
    });
  }

  drawParticles() {
    this.particles.forEach(p => {
      this.ctx.globalAlpha = p.life;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
  }

  render(gameState, deltaTime = 0.016) {
    this.foodPulse += deltaTime * 5;
    
    this.clear();
    this.drawGrid();
    
    if (gameState && gameState.foods) {
      gameState.foods.forEach(food => this.drawFood(food));
    }
    
    if (gameState && gameState.snakes) {
      gameState.snakes.forEach(snake => this.drawSnake(snake));
    }
    
    this.updateParticles(deltaTime);
    this.drawParticles();
  }

  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  darkenColor(hex, percent) {
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - percent);
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - percent);
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - percent);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  screenShake(intensity = 5, duration = 200) {
    const originalTransform = this.ctx.getTransform();
    const startTime = Date.now();
    
    const shake = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        const progress = elapsed / duration;
        const currentIntensity = intensity * (1 - progress);
        const offsetX = (Math.random() - 0.5) * currentIntensity * 2;
        const offsetY = (Math.random() - 0.5) * currentIntensity * 2;
        this.ctx.setTransform(1, 0, 0, 1, offsetX, offsetY);
        requestAnimationFrame(shake);
      } else {
        this.ctx.setTransform(originalTransform.a, originalTransform.b, originalTransform.c, originalTransform.d, originalTransform.e, originalTransform.f);
      }
    };
    
    shake();
  }

  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    window.removeEventListener('resize', this.resize);
  }
}

window.GameRenderer = GameRenderer;
