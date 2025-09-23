const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Debug endpoint to check rooms
app.get('/debug/rooms', (req, res) => {
  res.json({
    rooms: Array.from(rooms.entries()).map(([id, room]) => ({
      id,
      ...room
    })),
    players: Array.from(players.entries()).map(([id, player]) => ({
      id,
      ...player
    }))
  });
});

// Admin endpoint to reset server
app.post('/admin/reset', (req, res) => {
  console.log('🔄 Server reset requested');
  
  // First, notify all clients about the reset
  io.emit('server-reset', { message: 'Server is resetting. You will be redirected to login.' });
  
  // Give clients a moment to receive the message, then disconnect them
  setTimeout(() => {
    // Disconnect all clients
    io.sockets.sockets.forEach((socket) => {
      console.log('🔌 Disconnecting client:', socket.id);
      socket.disconnect(true);
    });
    
    // Clear all server data
    rooms.clear();
    players.clear();
    
    // Clear all socket rooms
    io.sockets.adapter.rooms.clear();
    
    console.log('✅ Server reset completed - all clients disconnected, all data cleared');
  }, 1000); // 1 second delay to allow message delivery
  
  res.json({
    success: true,
    message: 'Server reset initiated - all clients will be disconnected',
    timestamp: new Date().toISOString()
  });
});

// Admin endpoint to get server stats
app.get('/admin/stats', (req, res) => {
  const connectedSockets = Array.from(io.sockets.sockets.keys());
  
  res.json({
    rooms: rooms.size,
    players: players.size,
    connectedClients: io.engine.clientsCount,
    connectedSockets: connectedSockets.length,
    socketIds: connectedSockets,
    uptime: Math.floor(process.uptime()),
    serverSessionId: serverSessionId,
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Check if a player name is available
app.post('/api/check-name', (req, res) => {
  const { name } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({
      available: false,
      message: 'Name cannot be empty'
    });
  }
  
  const trimmedName = name.trim();
  if (trimmedName.length < 2) {
    return res.status(400).json({
      available: false,
      message: 'Name must be at least 2 characters long'
    });
  }
  
  // Check if name is already taken
  const nameInUse = Array.from(players.values()).find(p => 
    p.name.toLowerCase() === trimmedName.toLowerCase()
  );
  
  if (nameInUse) {
    return res.json({
      available: false,
      message: `The name "${trimmedName}" is already in use`
    });
  }
  
  res.json({
    available: true,
    message: `The name "${trimmedName}" is available`
  });
});

// Check if a room name is available
app.post('/api/check-room-name', (req, res) => {
  const { name } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({
      available: false,
      message: 'Room name cannot be empty'
    });
  }
  
  const trimmedName = name.trim();
  if (trimmedName.length < 2) {
    return res.status(400).json({
      available: false,
      message: 'Room name must be at least 2 characters long'
    });
  }
  
  // Check if room name is already taken
  const roomInUse = Array.from(rooms.values()).find(room => 
    room.name.toLowerCase() === trimmedName.toLowerCase()
  );
  
  if (roomInUse) {
    return res.json({
      available: false,
      message: `The room name "${trimmedName}" is already taken`
    });
  }
  
  res.json({
    available: true,
    message: `The room name "${trimmedName}" is available`
  });
});

// Store active rooms and players
const rooms = new Map();
const players = new Map();

// Server session ID to detect restarts
const serverSessionId = Date.now().toString();

io.on('connection', (socket) => {
  const windowSessionId = socket.handshake.query.browserSessionId; // Keep same parameter name for compatibility
  console.log('New client connected:', socket.id, 'Window Session:', windowSessionId);

  // Check if this window session already has a player
  const existingPlayer = Array.from(players.values()).find(p => p.windowSessionId === windowSessionId);
  if (existingPlayer && existingPlayer.id !== socket.id) {
    console.log('🔄 Removing old connection for window session:', windowSessionId, 'Old socket:', existingPlayer.id);
    // Remove the old player entry
    players.delete(existingPlayer.id);
    // Remove from any rooms
    if (existingPlayer.room) {
      const room = rooms.get(existingPlayer.room);
      if (room) {
        room.players = room.players.filter(id => id !== existingPlayer.id);
        if (room.players.length === 0) {
          console.log('🗑️ Deleting empty room:', existingPlayer.room, `"${room.name}" is now available again`);
          rooms.delete(existingPlayer.room);
        }
      }
    }
  }

  // Send server session ID to client for restart detection
  socket.emit('server-session', { sessionId: serverSessionId });

  // Handle player joining
  socket.on('join-lobby', (playerData) => {
    console.log(`🔵 Player joining lobby: ${playerData.name} (Socket: ${socket.id})`);
    
    // Check if name is already taken by another player
    const nameInUse = Array.from(players.values()).find(p => 
      p.name.toLowerCase() === playerData.name.toLowerCase() && p.id !== socket.id
    );
    
    if (nameInUse) {
      console.log(`❌ Name '${playerData.name}' is already in use by player ${nameInUse.id}`);
      socket.emit('name-taken', { 
        message: `The name "${playerData.name}" is already in use. Please choose a different name.`,
        takenBy: nameInUse.id
      });
      return;
    }
    
    const existingPlayer = players.get(socket.id);
    if (existingPlayer) {
      console.log(`🔄 Player already in lobby, updating info: ${playerData.name}`);
      // Update existing player info
      existingPlayer.name = playerData.name;
    } else {
      // Add new player with window session ID
      players.set(socket.id, {
        id: socket.id,
        name: playerData.name,
        room: null,
        windowSessionId: windowSessionId
      });
      console.log(`✅ New player added to lobby: ${playerData.name} (Window: ${windowSessionId})`);
    }
    
    console.log(`📊 Total players in lobby: ${players.size}`);
    console.log(`👥 Current players:`, Array.from(players.values()).map(p => `${p.name}(${p.id.slice(-4)})`));
    
    socket.emit('lobby-joined', {
      playerId: socket.id,
      rooms: Array.from(rooms.values())
    });
    
    // Broadcast updated player list to ALL clients (including sender)
    io.emit('player-list-updated', Array.from(players.values()));
  });

  // Handle room creation
  socket.on('create-room', (roomData) => {
    console.log('Creating room:', roomData);
    
    // Validate room data
    if (!roomData.name || roomData.name.trim().length === 0) {
      socket.emit('create-room-error', 'Room name is required');
      return;
    }
    
    // Check if room name already exists (case-insensitive)
    const trimmedName = roomData.name.trim();
    const existingRoom = Array.from(rooms.values()).find(room => 
      room.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (existingRoom) {
      console.log(`❌ Room name '${trimmedName}' already exists`);
      socket.emit('create-room-error', `Room name "${trimmedName}" is already taken. Please choose a different name.`);
      return;
    }
    
    if (roomData.maxPlayers < 2 || roomData.maxPlayers > 8) {
      socket.emit('create-room-error', 'Max players must be between 2 and 8');
      return;
    }
    
    const roomId = Date.now().toString();
    const player = players.get(socket.id);
    
    const room = {
      id: roomId,
      name: roomData.name.trim(),
      players: [socket.id],
      maxPlayers: roomData.maxPlayers || 4,
      status: 'waiting',
      hostId: socket.id,
      createdAt: new Date().toISOString()
    };
    
    rooms.set(roomId, room);
    socket.join(roomId);
    
    // Update player's room
    if (player) {
      player.room = roomId;
    }
    
    console.log('Room created successfully:', room.id, 'by player:', socket.id);
    console.log('Current rooms:', Array.from(rooms.keys()));
    
    // Send room created confirmation to the creator
    socket.emit('room-created', room);
    
    // Broadcast updated room list to ALL clients
    io.emit('room-list-updated', Array.from(rooms.values()));
    
    // Update player list since player is now in a room
    io.emit('player-list-updated', Array.from(players.values()));
  });

  // Handle joining a room
  socket.on('join-room', (roomId) => {
    console.log(`🎯 Player attempting to join room: ${roomId} (Socket: ${socket.id})`);
    console.log(`🏠 Available rooms: [${Array.from(rooms.keys()).join(', ')}]`);
    console.log(`👥 Players in lobby: ${players.size}`);
    
    // Check if player exists in players map, if not, they need to join lobby first
    if (!players.has(socket.id)) {
      console.log(`❌ Player ${socket.id} not in lobby, cannot join room`);
      console.log(`📋 Current lobby players:`, Array.from(players.keys()).map(id => id.slice(-4)));
      socket.emit('join-room-error', 'You must join the lobby first. Please refresh the page.');
      return;
    }
    
    const player = players.get(socket.id);
    console.log(`✅ Player found in lobby: ${player.name} (${socket.id.slice(-4)})`);
    
    // If player is already in a room, remove them from the old room first
    if (player.room) {
      const oldRoom = rooms.get(player.room);
      if (oldRoom) {
        oldRoom.players = oldRoom.players.filter(id => id !== socket.id);
        console.log(`🚪 Removed player from old room: ${oldRoom.name}`);
      }
    }
    
    const room = rooms.get(roomId);
    if (!room) {
      console.log('Room not found:', roomId);
      console.log('All rooms:', Array.from(rooms.entries()));
      socket.emit('join-room-error', 'Room does not exist');
      return;
    }
    
    console.log('Room found:', room.name, 'Current players:', room.players.length, 'Max players:', room.maxPlayers);
    
    // Check if player is already in this room
    if (room.players.includes(socket.id)) {
      console.log('Player already in room:', socket.id);
      
      // Create room data with player names
      const roomWithPlayerNames = {
        ...room,
        playerNames: room.players.map(playerId => {
          const p = players.get(playerId);
          return { id: playerId, name: p ? p.name : 'Unknown' };
        })
      };
      
      socket.emit('room-joined', roomWithPlayerNames);
      return;
    }
    
    // Check if room is full
    if (room.players.length >= room.maxPlayers) {
      console.log('Room is full:', roomId, 'Current players:', room.players.length, 'Max:', room.maxPlayers);
      socket.emit('join-room-error', 'Room is full');
      return;
    }
    
    // Check if room is already playing
    if (room.status === 'playing') {
      console.log('Room is already playing:', roomId);
      socket.emit('join-room-error', 'Game is already in progress');
      return;
    }
    
    // Add player to room
    room.players.push(socket.id);
    socket.join(roomId);
    
    // Update player's room
    if (player) {
      player.room = roomId;
    }
    
    console.log('Player joined room successfully:', socket.id, 'Room:', roomId, 'New player count:', room.players.length);
    
    // Create room data with player names
    const roomWithPlayerNames = {
      ...room,
      playerNames: room.players.map(playerId => {
        const p = players.get(playerId);
        return { id: playerId, name: p ? p.name : 'Unknown' };
      })
    };
    
    // Notify the player they joined successfully
    socket.emit('room-joined', roomWithPlayerNames);
    
    // Notify all players in the room about the new player
    io.to(roomId).emit('player-joined-room', {
      playerId: socket.id,
      room: roomWithPlayerNames
    });
    
    // Broadcast updated room list to ALL clients
    io.emit('room-list-updated', Array.from(rooms.values()));
    
    // Update player list since player is now in a room
    io.emit('player-list-updated', Array.from(players.values()));
  });

  // Handle game start
  socket.on('start-game', (roomId) => {
    const room = rooms.get(roomId);
    if (room && room.players.includes(socket.id)) {
      room.status = 'playing';
      io.to(roomId).emit('game-started', room);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    const player = players.get(socket.id);
    if (player && player.room) {
      const room = rooms.get(player.room);
      if (room) {
        room.players = room.players.filter(id => id !== socket.id);
        
        if (room.players.length === 0) {
          console.log('🗑️ Deleting empty room:', player.room, `"${room.name}" is now available again`);
          rooms.delete(player.room);
        }
        
        io.to(player.room).emit('player-left-room', {
          playerId: socket.id,
          room: room
        });
        
        io.emit('room-list-updated', Array.from(rooms.values()));
      }
    }
    
    players.delete(socket.id);
    io.emit('player-list-updated', Array.from(players.values()));
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});