class NetworkManager {
  constructor() {
    this.ws = null;
    this.playerId = null;
    this.roomId = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.serverUrl = this.getServerUrl();
  }

  getServerUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = 8080;
    return `${protocol}//${host}:${port}`;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          console.log('WebSocket连接成功');
          this.reconnectAttempts = 0;
          this.emit('connected');
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (err) {
            console.error('消息解析错误:', err);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket错误:', error);
          this.emit('error', { code: 'CONNECTION_ERROR', message: '连接错误' });
        };

        this.ws.onclose = () => {
          console.log('WebSocket连接关闭');
          this.emit('disconnected');
          this.attemptReconnect();
        };

        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => {
        this.connect().catch(err => {
          console.error('重连失败:', err);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  handleMessage(message) {
    const { type, payload } = message;

    switch (type) {
      case 'connected':
        this.playerId = payload.playerId;
        this.emit('connected', payload);
        break;

      case 'room_created':
        this.roomId = payload.roomId;
        this.emit('roomCreated', payload);
        break;

      case 'room_joined':
        this.roomId = payload.roomId;
        this.emit('roomJoined', payload);
        break;

      case 'player_joined':
        this.emit('playerJoined', payload);
        break;

      case 'player_left':
        this.emit('playerLeft', payload);
        break;

      case 'player_ready':
        this.emit('playerReady', payload);
        break;

      case 'game_start':
        this.emit('gameStart', payload);
        break;

      case 'game_state':
        this.emit('gameState', payload);
        break;

      case 'game_over':
        this.emit('gameOver', payload);
        break;

      case 'game_reset':
        this.emit('gameReset', payload);
        break;

      case 'opponent_disconnected':
        this.emit('opponentDisconnected', payload);
        break;

      case 'error':
        this.emit('error', payload);
        break;

      default:
        console.log('未知消息类型:', type);
    }
  }

  send(type, payload = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type,
        payload,
        timestamp: Date.now()
      }));
    } else {
      console.error('WebSocket未连接');
    }
  }

  createRoom(password = null) {
    this.send('create_room', { password });
  }

  joinRoom(roomId, password = null) {
    this.send('join_room', { roomId, password });
  }

  sendInput(direction) {
    this.send('player_input', { direction });
  }

  sendReady() {
    this.send('ready');
  }

  leaveRoom() {
    this.send('leave_room');
  }

  restartGame() {
    this.send('restart_game');
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data = null) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`事件处理错误 (${event}):`, err);
        }
      });
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

window.NetworkManager = NetworkManager;
