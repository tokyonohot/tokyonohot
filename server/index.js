const WebSocket = require('ws');
const RoomManager = require('./room');
const GameLogic = require('./gameLogic');

const PORT = process.env.PORT || 8080;
const TICK_RATE = 150;

const wss = new WebSocket.Server({ port: PORT });

const roomManager = new RoomManager();
const gameIntervals = new Map();

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function broadcast(roomId, message) {
  const room = roomManager.getRoom(roomId);
  if (!room) return;
  
  const data = JSON.stringify(message);
  room.players.forEach(player => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(data);
    }
  });
}

function startGameLoop(roomId) {
  const room = roomManager.getRoom(roomId);
  if (!room || room.state === 'playing') return;
  
  room.state = 'playing';
  room.gameLogic = new GameLogic(room.players);
  
  const interval = setInterval(() => {
    if (room.state !== 'playing') {
      clearInterval(interval);
      gameIntervals.delete(roomId);
      return;
    }
    
    room.gameLogic.update();
    const state = room.gameLogic.getState();
    
    if (state.gameOver) {
      clearInterval(interval);
      gameIntervals.delete(roomId);
      room.state = 'finished';
      
      broadcast(roomId, {
        type: 'game_over',
        payload: {
          winner: state.winner,
          reason: state.reason,
          finalScores: state.scores
        }
      });
    } else {
      broadcast(roomId, {
        type: 'game_state',
        payload: state
      });
    }
  }, TICK_RATE);
  
  gameIntervals.set(roomId, interval);
  
  broadcast(roomId, {
    type: 'game_start',
    payload: room.gameLogic.getState()
  });
}

wss.on('connection', (ws) => {
  let currentPlayer = null;
  let currentRoomId = null;
  
  const playerId = generateId();
  console.log(`玩家连接: ${playerId}`);
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'create_room': {
          const { password } = message.payload || {};
          const roomId = roomManager.createRoom(playerId, ws, password);
          currentRoomId = roomId;
          currentPlayer = {
            id: playerId,
            ws,
            nickname: `玩家${playerId.substr(0, 4)}`,
            ready: false,
            score: 0,
            color: '#00ffaa'
          };
          roomManager.addPlayer(roomId, currentPlayer);
          
          ws.send(JSON.stringify({
            type: 'room_created',
            payload: { roomId, playerId }
          }));
          break;
        }
        
        case 'join_room': {
          const { roomId: joinRoomId, password } = message.payload;
          const room = roomManager.getRoom(joinRoomId);
          
          if (!room) {
            ws.send(JSON.stringify({
              type: 'error',
              payload: { code: 'ROOM_NOT_FOUND', message: '房间不存在' }
            }));
            break;
          }
          
          if (room.players.length >= 2) {
            ws.send(JSON.stringify({
              type: 'error',
              payload: { code: 'ROOM_FULL', message: '房间已满' }
            }));
            break;
          }
          
          if (room.password && room.password !== password) {
            ws.send(JSON.stringify({
              type: 'error',
              payload: { code: 'WRONG_PASSWORD', message: '密码错误' }
            }));
            break;
          }
          
          currentRoomId = joinRoomId;
          currentPlayer = {
            id: playerId,
            ws,
            nickname: `玩家${playerId.substr(0, 4)}`,
            ready: false,
            score: 0,
            color: '#ff3366'
          };
          roomManager.addPlayer(joinRoomId, currentPlayer);
          
          ws.send(JSON.stringify({
            type: 'room_joined',
            payload: {
              roomId: joinRoomId,
              playerId,
              players: room.players.map(p => ({
                id: p.id,
                nickname: p.nickname,
                ready: p.ready,
                color: p.color
              }))
            }
          }));
          
          broadcast(joinRoomId, {
            type: 'player_joined',
            payload: {
              playerId,
              nickname: currentPlayer.nickname,
              color: currentPlayer.color
            }
          });
          break;
        }
        
        case 'ready': {
          if (currentRoomId && currentPlayer) {
            currentPlayer.ready = true;
            broadcast(currentRoomId, {
              type: 'player_ready',
              payload: { playerId: currentPlayer.id }
            });
            
            const room = roomManager.getRoom(currentRoomId);
            if (room && room.players.length === 2 && room.players.every(p => p.ready)) {
              setTimeout(() => startGameLoop(currentRoomId), 1000);
            }
          }
          break;
        }
        
        case 'player_input': {
          if (currentRoomId && currentPlayer) {
            const room = roomManager.getRoom(currentRoomId);
            if (room && room.gameLogic) {
              room.gameLogic.handleInput(currentPlayer.id, message.payload.direction);
            }
          }
          break;
        }
        
        case 'leave_room': {
          if (currentRoomId && currentPlayer) {
            roomManager.leaveRoom(currentRoomId, currentPlayer.id);
            
            if (gameIntervals.has(currentRoomId)) {
              clearInterval(gameIntervals.get(currentRoomId));
              gameIntervals.delete(currentRoomId);
            }
            
            broadcast(currentRoomId, {
              type: 'player_left',
              payload: { playerId: currentPlayer.id }
            });
            
            currentRoomId = null;
            currentPlayer = null;
          }
          break;
        }
        
        case 'restart_game': {
          if (currentRoomId && currentPlayer) {
            const room = roomManager.getRoom(currentRoomId);
            if (room && room.state === 'finished') {
              room.state = 'waiting';
              room.players.forEach(p => p.ready = false);
              broadcast(currentRoomId, {
                type: 'game_reset',
                payload: {
                  players: room.players.map(p => ({
                    id: p.id,
                    nickname: p.nickname,
                    ready: p.ready,
                    color: p.color
                  }))
                }
              });
            }
          }
          break;
        }
      }
    } catch (err) {
      console.error('消息处理错误:', err);
    }
  });
  
  ws.on('close', () => {
    console.log(`玩家断开: ${playerId}`);
    if (currentRoomId) {
      if (gameIntervals.has(currentRoomId)) {
        clearInterval(gameIntervals.get(currentRoomId));
        gameIntervals.delete(currentRoomId);
      }
      roomManager.leaveRoom(currentRoomId, playerId);
      broadcast(currentRoomId, {
        type: 'player_left',
        payload: { playerId }
      });
    }
  });
  
  ws.send(JSON.stringify({
    type: 'connected',
    payload: { playerId }
  }));
});

console.log(`游戏服务器运行在端口 ${PORT}`);
