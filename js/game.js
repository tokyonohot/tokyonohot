class GameManager {
  constructor(renderer, network) {
    this.renderer = renderer;
    this.network = network;
    this.gameState = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.startTime = 0;
    this.animationFrame = null;
    this.lastFrameTime = 0;
    this.playerId = null;
    
    this.setupNetworkListeners();
  }

  setupNetworkListeners() {
    this.network.on('gameStart', (data) => {
      console.log('游戏开始:', data);
      this.startGame(data);
    });

    this.network.on('gameState', (data) => {
      this.gameState = data;
      this.updateHUD();
    });

    this.network.on('gameOver', (data) => {
      console.log('游戏结束:', data);
      this.endGame(data);
    });

    this.network.on('gameReset', (data) => {
      this.resetGame(data);
    });

    this.network.on('opponentDisconnected', () => {
      this.showOverlay('对手断开连接', '游戏结束');
    });
  }

  startGame(initialState) {
    this.gameState = initialState;
    this.isPlaying = true;
    this.isPaused = false;
    this.startTime = Date.now();
    this.playerId = this.network.playerId;
    
    if (initialState.gridWidth && initialState.gridHeight) {
      this.renderer.setGridSize(initialState.gridWidth, initialState.gridHeight);
    }
    
    this.hideOverlay();
    this.startRenderLoop();
  }

  startRenderLoop() {
    const loop = (currentTime) => {
      if (!this.isPlaying) return;
      
      const deltaTime = (currentTime - this.lastFrameTime) / 1000;
      this.lastFrameTime = currentTime;
      
      if (!this.isPaused) {
        this.renderer.render(this.gameState, deltaTime);
        this.updateTimer();
      }
      
      this.animationFrame = requestAnimationFrame(loop);
    };
    
    this.lastFrameTime = performance.now();
    this.animationFrame = requestAnimationFrame(loop);
  }

  stopRenderLoop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  handleInput(direction) {
    if (this.isPlaying && !this.isPaused) {
      this.network.sendInput(direction);
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  updateHUD() {
    if (!this.gameState) return;

    const player1Score = document.getElementById('score-player-1');
    const player2Score = document.getElementById('score-player-2');
    const status1 = document.getElementById('status-player-1');
    const status2 = document.getElementById('status-player-2');

    if (this.gameState.snakes && this.gameState.snakes.length >= 2) {
      const snake1 = this.gameState.snakes[0];
      const snake2 = this.gameState.snakes[1];

      if (player1Score) player1Score.textContent = this.gameState.scores[snake1.id] || 0;
      if (player2Score) player2Score.textContent = this.gameState.scores[snake2.id] || 0;

      if (status1) {
        status1.textContent = snake1.alive ? '存活' : '死亡';
        status1.className = 'player-status' + (snake1.alive ? '' : ' dead');
      }

      if (status2) {
        status2.textContent = snake2.alive ? '存活' : '死亡';
        status2.className = 'player-status' + (snake2.alive ? '' : ' dead');
      }
    }
  }

  updateTimer() {
    const timerElement = document.getElementById('game-timer');
    if (timerElement && this.startTime > 0) {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const seconds = (elapsed % 60).toString().padStart(2, '0');
      timerElement.textContent = `${minutes}:${seconds}`;
    }
  }

  endGame(result) {
    this.isPlaying = false;
    this.stopRenderLoop();
    
    const mySnake = this.gameState.snakes.find(s => s.id === this.playerId);
    const isWinner = result.winner === this.playerId;
    const isDraw = !result.winner && this.gameState.snakes.filter(s => s.alive).length === 0;
    
    let title, icon;
    if (isDraw) {
      title = '平局!';
      icon = '🤝';
    } else if (isWinner) {
      title = '胜利!';
      icon = '🏆';
    } else {
      title = '失败';
      icon = '💀';
    }

    const time = this.calculateGameTime();
    const length = mySnake ? mySnake.body.length : 0;
    const food = this.gameState.scores[this.playerId] || 0;

    this.showResultScreen(title, icon, time, length, food, result.reason);
  }

  calculateGameTime() {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  showResultScreen(title, icon, time, length, food, reason) {
    const titleEl = document.getElementById('result-title');
    const iconEl = document.getElementById('result-icon');
    const timeEl = document.getElementById('stat-time');
    const lengthEl = document.getElementById('stat-length');
    const foodEl = document.getElementById('stat-food');

    if (titleEl) {
      titleEl.textContent = title;
      titleEl.className = 'result-title';
      if (title.includes('胜利')) {
        titleEl.classList.add('victory');
      } else if (title.includes('失败')) {
        titleEl.classList.add('defeat');
      } else {
        titleEl.classList.add('draw');
      }
    }

    if (iconEl) iconEl.textContent = icon;
    if (timeEl) timeEl.textContent = time;
    if (lengthEl) lengthEl.textContent = length;
    if (foodEl) foodEl.textContent = food;

    ui.showScreen('result-screen');
  }

  showOverlay(title, message) {
    const overlay = document.getElementById('game-overlay');
    const titleEl = document.getElementById('overlay-title');
    const messageEl = document.getElementById('overlay-message');

    if (overlay) overlay.classList.remove('hidden');
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
  }

  hideOverlay() {
    const overlay = document.getElementById('game-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  resetGame(data) {
    this.isPlaying = false;
    this.stopRenderLoop();
    this.gameState = null;
    
    if (data && data.players) {
      this.updatePlayerSlots(data.players);
    }
  }

  updatePlayerSlots(players) {
    players.forEach((player, index) => {
      const slot = document.getElementById(`player-slot-${index + 1}`);
      if (slot) {
        slot.classList.add('occupied');
        if (index === 1) slot.classList.add('player-2-slot');
        slot.querySelector('.slot-label').textContent = player.nickname;
      }
    });
  }

  destroy() {
    this.stopRenderLoop();
    this.gameState = null;
    this.isPlaying = false;
  }
}

window.GameManager = GameManager;
