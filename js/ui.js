class UIController {
  constructor(network, game) {
    this.network = network;
    this.game = game;
    this.currentScreen = 'main-menu';
    this.players = [];
    this.isHost = false;
    
    this.initElements();
    this.initEventListeners();
    this.setupNetworkListeners();
    this.setupKeyboardControls();
  }

  initElements() {
    this.screens = {
      'main-menu': document.getElementById('main-menu'),
      'room-menu': document.getElementById('room-menu'),
      'join-menu': document.getElementById('join-menu'),
      'game-screen': document.getElementById('game-screen'),
      'result-screen': document.getElementById('result-screen')
    };
  }

  initEventListeners() {
    document.getElementById('btn-create-room').addEventListener('click', () => this.createRoom());
    document.getElementById('btn-join-room').addEventListener('click', () => this.showScreen('join-menu'));
    document.getElementById('btn-back-menu').addEventListener('click', () => this.leaveRoom());
    document.getElementById('btn-back-from-join').addEventListener('click', () => this.showScreen('main-menu'));
    document.getElementById('btn-confirm-join').addEventListener('click', () => this.joinRoom());
    document.getElementById('btn-copy-code').addEventListener('click', () => this.copyRoomCode());
    document.getElementById('btn-ready').addEventListener('click', () => this.toggleReady());
    document.getElementById('btn-start-game').addEventListener('click', () => this.startGame());
    document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
    document.getElementById('btn-quit-game').addEventListener('click', () => this.quitGame());
    document.getElementById('btn-play-again').addEventListener('click', () => this.playAgain());
    document.getElementById('btn-back-main').addEventListener('click', () => this.backToMain());

    document.getElementById('input-room-code').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.joinRoom();
    });

    document.getElementById('input-room-code').addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
    });

    this.initMobileControls();
  }

  initMobileControls() {
    const mobileBtns = document.querySelectorAll('.mobile-btn');
    mobileBtns.forEach(btn => {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const direction = btn.dataset.dir;
        if (direction) {
          this.game.handleInput(direction);
        }
      });

      btn.addEventListener('click', (e) => {
        const direction = btn.dataset.dir;
        if (direction) {
          this.game.handleInput(direction);
        }
      });
    });
  }

  setupNetworkListeners() {
    this.network.on('connected', (data) => {
      document.getElementById('player-id').textContent = `ID: ${data.playerId.substring(0, 8)}`;
      document.getElementById('connection-status').textContent = '🟢 已连接';
    });

    this.network.on('disconnected', () => {
      document.getElementById('connection-status').textContent = '⚫ 未连接';
    });

    this.network.on('error', (data) => {
      this.showError(data.message);
    });

    this.network.on('roomCreated', (data) => {
      this.isHost = true;
      this.showRoomScreen(data.roomId);
    });

    this.network.on('roomJoined', (data) => {
      this.isHost = false;
      this.showRoomScreen(data.roomId);
      this.updatePlayers(data.players);
      this.hideWaitingAnimation();
    });

    this.network.on('playerJoined', (data) => {
      this.addPlayerToSlot(data);
    });

    this.network.on('playerLeft', (data) => {
      this.removePlayerFromSlot(data.playerId);
      this.showWaitingAnimation();
    });

    this.network.on('playerReady', (data) => {
      this.markPlayerReady(data.playerId);
    });

    this.network.on('gameStart', () => {
      this.showScreen('game-screen');
    });

    this.network.on('gameReset', (data) => {
      this.showScreen('room-menu');
      this.updatePlayers(data.players);
      this.hideReadyButton();
      this.showReadyButton();
    });

    this.network.on('gameOver', () => {
    });

    this.network.on('opponentDisconnected', () => {
    });
  }

  setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
      if (this.currentScreen !== 'game-screen') return;
      if (this.game.isPaused && e.key !== 'Escape' && e.key !== ' ') return;

      const keyMap = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right',
        'w': 'up',
        'W': 'up',
        's': 'down',
        'S': 'down',
        'a': 'left',
        'A': 'left',
        'd': 'right',
        'D': 'right'
      };

      const direction = keyMap[e.key];
      if (direction) {
        e.preventDefault();
        this.game.handleInput(direction);
      }

      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        this.togglePause();
      }
    });
  }

  showScreen(screenId) {
    Object.keys(this.screens).forEach(id => {
      this.screens[id].classList.remove('active');
    });

    if (this.screens[screenId]) {
      this.screens[screenId].classList.add('active');
      this.currentScreen = screenId;
    }
  }

  showError(message) {
    alert(message);
  }

  createRoom() {
    const password = prompt('设置房间密码（留空则无需密码）:');
    this.network.createRoom(password || null);
  }

  joinRoom() {
    const roomCode = document.getElementById('input-room-code').value.trim().toUpperCase();
    const password = document.getElementById('input-password').value;

    if (!roomCode || roomCode.length !== 6) {
      this.showError('请输入正确的6位房间码');
      return;
    }

    this.network.joinRoom(roomCode, password || null);
  }

  leaveRoom() {
    this.network.leaveRoom();
    this.resetRoomUI();
    this.showScreen('main-menu');
  }

  showRoomScreen(roomId) {
    document.getElementById('room-code').textContent = roomId;
    this.showScreen('room-menu');
    this.showWaitingAnimation();
    this.hideReadyButton();
    this.hideStartButton();
    this.resetPlayerSlots();
  }

  updatePlayers(players) {
    this.players = players;
    this.resetPlayerSlots();
    
    players.forEach((player, index) => {
      this.addPlayerToSlot({ playerId: player.id, nickname: player.nickname, color: player.color }, index);
    });

    if (players.length === 2) {
      this.hideWaitingAnimation();
      this.showReadyButton();
    }
  }

  resetPlayerSlots() {
    for (let i = 1; i <= 2; i++) {
      const slot = document.getElementById(`player-slot-${i}`);
      slot.className = 'player-slot';
      slot.querySelector('.slot-label').textContent = '等待玩家...';
    }
  }

  addPlayerToSlot(playerData, forceIndex = null) {
    const index = forceIndex !== null ? forceIndex : this.players.findIndex(p => p.id === playerData.playerId);
    
    if (index === -1) {
      const emptySlot = document.querySelector('.player-slot:not(.occupied)');
      if (emptySlot) {
        const slotIndex = parseInt(emptySlot.id.split('-')[2]);
        this.addPlayerToSlot(playerData, slotIndex - 1);
      }
      return;
    }

    const slot = document.getElementById(`player-slot-${index + 1}`);
    if (slot) {
      slot.classList.add('occupied');
      if (index === 1) slot.classList.add('player-2-slot');
      slot.querySelector('.slot-label').textContent = playerData.nickname || playerData.playerId.substring(0, 8);
    }
  }

  removePlayerFromSlot(playerId) {
    const index = this.players.findIndex(p => p.id === playerId);
    if (index !== -1) {
      const slot = document.getElementById(`player-slot-${index + 1}`);
      if (slot) {
        slot.classList.remove('occupied', 'ready');
        slot.querySelector('.slot-label').textContent = '等待玩家...';
      }
      this.players.splice(index, 1);
    }
  }

  markPlayerReady(playerId) {
    const index = this.players.findIndex(p => p.id === playerId);
    if (index !== -1) {
      const slot = document.getElementById(`player-slot-${index + 1}`);
      if (slot) {
        slot.classList.add('ready');
      }
    }

    if (this.isHost && this.players.length === 2) {
      this.showStartButton();
    }
  }

  showWaitingAnimation() {
    document.getElementById('waiting-animation').style.display = 'block';
  }

  hideWaitingAnimation() {
    document.getElementById('waiting-animation').style.display = 'none';
  }

  showReadyButton() {
    const readyBtn = document.getElementById('btn-ready');
    readyBtn.style.display = 'flex';
  }

  hideReadyButton() {
    document.getElementById('btn-ready').style.display = 'none';
  }

  showStartButton() {
    const startBtn = document.getElementById('btn-start-game');
    startBtn.style.display = 'flex';
  }

  hideStartButton() {
    document.getElementById('btn-start-game').style.display = 'none';
  }

  toggleReady() {
    this.network.sendReady();
    document.getElementById('btn-ready').disabled = true;
    document.getElementById('btn-ready').textContent = '等待中...';
  }

  startGame() {
  }

  togglePause() {
    const isPaused = this.game.togglePause();
    const pauseBtn = document.getElementById('btn-pause');
    pauseBtn.textContent = isPaused ? '继续' : '暂停';
    
    if (isPaused) {
      this.game.showOverlay('游戏暂停', '按空格键或ESC继续');
    } else {
      this.game.hideOverlay();
    }
  }

  quitGame() {
    if (confirm('确定要退出游戏吗?')) {
      this.network.leaveRoom();
      this.showScreen('main-menu');
    }
  }

  playAgain() {
    this.network.restartGame();
  }

  backToMain() {
    this.network.leaveRoom();
    this.resetRoomUI();
    this.showScreen('main-menu');
  }

  resetRoomUI() {
    this.players = [];
    this.isHost = false;
    document.getElementById('room-code').textContent = '------';
    document.getElementById('btn-ready').disabled = false;
    document.getElementById('btn-ready').textContent = '准备就绪';
    this.resetPlayerSlots();
    this.hideWaitingAnimation();
    this.hideReadyButton();
    this.hideStartButton();
  }

  copyRoomCode() {
    const code = document.getElementById('room-code').textContent;
    if (code && code !== '------') {
      navigator.clipboard.writeText(code).then(() => {
        const copyBtn = document.getElementById('btn-copy-code');
        copyBtn.textContent = '✓';
        setTimeout(() => {
          copyBtn.textContent = '📋';
        }, 2000);
      });
    }
  }
}

window.UIController = UIController;
