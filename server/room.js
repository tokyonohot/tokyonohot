class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let roomId = '';
    for (let i = 0; i < 6; i++) {
      roomId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return roomId;
  }

  createRoom(playerId, ws, password = null) {
    let roomId = this.generateRoomId();
    while (this.rooms.has(roomId)) {
      roomId = this.generateRoomId();
    }
    
    const room = {
      id: roomId,
      password,
      players: [],
      state: 'waiting',
      gameLogic: null,
      createdAt: Date.now()
    };
    
    this.rooms.set(roomId, room);
    console.log(`房间创建: ${roomId} by ${playerId}`);
    return roomId;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  addPlayer(roomId, player) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.players.push(player);
      player.roomId = roomId;
      console.log(`玩家 ${player.id} 加入房间 ${roomId}`);
    }
  }

  removePlayer(roomId, playerId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.players = room.players.filter(p => p.id !== playerId);
      
      if (room.players.length === 0) {
        this.rooms.delete(roomId);
        console.log(`房间 ${roomId} 已删除`);
      }
    }
  }

  leaveRoom(roomId, playerId) {
    this.removePlayer(roomId, playerId);
  }

  isRoomFull(roomId) {
    const room = this.rooms.get(roomId);
    return room ? room.players.length >= 2 : false;
  }

  getAllRooms() {
    return Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      playerCount: room.players.length,
      state: room.state
    }));
  }
}

module.exports = RoomManager;
