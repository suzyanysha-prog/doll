// Backend server for Beauty Study Live - Collaborative Study Timer
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const PORT = process.env.PORT || 3000;

// In-memory storage (replace with database for production)
const users = new Map();
const rooms = new Map();
const sessions = new Map();

// User model
class User {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.socketId = null;
    this.currentRoom = null;
    this.status = 'idle'; // idle, studying, breaking
    this.focusTime = 0;
  }
}

// Room model
class StudyRoom {
  constructor(id, name, creatorId, creatorName) {
    this.id = id;
    this.name = name;
    this.creatorId = creatorId;
    this.creatorName = creatorName;
    this.members = [{ id: creatorId, name: creatorName, status: 'idle', focusTime: 0, socketId: null }];
    this.timerState = {
      isRunning: false,
      isWorkSession: true,
      timeRemaining: 30 * 60,
      totalTime: 30 * 60
    };
    this.createdAt = new Date();
    this.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  addMember(userId, userName, socketId) {
    if (!this.members.find(m => m.id === userId)) {
      this.members.push({
        id: userId,
        name: userName,
        status: 'idle',
        focusTime: 0,
        socketId
      });
    } else {
      const member = this.members.find(m => m.id === userId);
      member.socketId = socketId;
    }
  }

  removeMember(userId) {
    this.members = this.members.filter(m => m.id !== userId);
  }

  updateMemberStatus(userId, status) {
    const member = this.members.find(m => m.id === userId);
    if (member) member.status = status;
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User initialization
  socket.on('user:init', (data) => {
    const userId = data.userId || uuidv4();
    const user = new User(userId, data.name);
    user.socketId = socket.id;
    users.set(userId, user);
    socket.userId = userId;
    socket.emit('user:ready', { userId });
    console.log('User initialized:', userId, data.name);
  });

  // Create new study room
  socket.on('room:create', (data) => {
    const userId = socket.userId;
    const user = users.get(userId);
    const roomId = uuidv4();
    const room = new StudyRoom(roomId, data.roomName, userId, user.name);
    
    rooms.set(roomId, room);
    user.currentRoom = roomId;
    
    socket.join(`room:${roomId}`);
    socket.emit('room:created', {
      roomId,
      inviteCode: room.inviteCode,
      room: {
        id: room.id,
        name: room.name,
        members: room.members,
        timerState: room.timerState,
        createdAt: room.createdAt
      }
    });
    io.emit('room:list:updated', { rooms: Array.from(rooms.values()) });
  });

  // Join room by code
  socket.on('room:join', (data) => {
    const userId = socket.userId;
    const user = users.get(userId);
    let room = null;

    // Find room by invite code
    for (let r of rooms.values()) {
      if (r.inviteCode === data.inviteCode) {
        room = r;
        break;
      }
    }

    if (!room) {
      socket.emit('error', { message: 'Invalid invite code' });
      return;
    }

    user.currentRoom = room.id;
    room.addMember(userId, user.name, socket.id);
    socket.join(`room:${room.id}`);

    socket.emit('room:joined', {
      roomId: room.id,
      room: {
        id: room.id,
        name: room.name,
        members: room.members,
        timerState: room.timerState,
        createdAt: room.createdAt
      }
    });

    io.to(`room:${room.id}`).emit('member:joined', {
      roomId: room.id,
      member: { id: userId, name: user.name, status: 'idle', focusTime: 0, socketId: socket.id },
      members: room.members
    });
  });

  // Start timer
  socket.on('timer:start', (data) => {
    const userId = socket.userId;
    const user = users.get(userId);
    const room = rooms.get(user.currentRoom);

    if (!room) return;

    room.timerState.isRunning = true;
    room.timerState.isWorkSession = data.isWorkSession !== undefined ? data.isWorkSession : true;
    room.timerState.totalTime = data.duration || (room.timerState.isWorkSession ? 30 * 60 : 5 * 60);
    room.timerState.timeRemaining = room.timerState.totalTime;

    io.to(`room:${room.id}`).emit('timer:started', {
      timerState: room.timerState,
      startedBy: user.name
    });
  });

  // Pause timer
  socket.on('timer:pause', () => {
    const userId = socket.userId;
    const user = users.get(userId);
    const room = rooms.get(user.currentRoom);

    if (!room) return;

    room.timerState.isRunning = false;
    io.to(`room:${room.id}`).emit('timer:paused', { timerState: room.timerState });
  });

  // Timer tick (every second)
  socket.on('timer:tick', (data) => {
    const userId = socket.userId;
    const user = users.get(userId);
    const room = rooms.get(user.currentRoom);

    if (!room) return;

    room.timerState.timeRemaining = data.timeRemaining;

    if (room.timerState.timeRemaining <= 0) {
      room.timerState.isRunning = false;
      io.to(`room:${room.id}`).emit('timer:finished', { timerState: room.timerState });
    } else {
      io.to(`room:${room.id}`).emit('timer:update', { timerState: room.timerState });
    }
  });

  // Update user status
  socket.on('status:update', (data) => {
    const userId = socket.userId;
    const user = users.get(userId);
    const room = rooms.get(user.currentRoom);

    if (!room) return;

    user.status = data.status;
    room.updateMemberStatus(userId, data.status);

    io.to(`room:${room.id}`).emit('member:status', {
      userId,
      status: data.status,
      members: room.members
    });
  });

  // Get list of rooms
  socket.on('room:list', () => {
    socket.emit('room:list', { rooms: Array.from(rooms.values()) });
  });

  // Leave room
  socket.on('room:leave', () => {
    const userId = socket.userId;
    const user = users.get(userId);
    const room = rooms.get(user.currentRoom);

    if (room) {
      room.removeMember(userId);
      socket.leave(`room:${room.id}`);

      io.to(`room:${room.id}`).emit('member:left', {
        userId,
        members: room.members
      });

      // Delete room if empty
      if (room.members.length === 0) {
        rooms.delete(room.id);
      }
    }

    user.currentRoom = null;
  });

  // Disconnect
  socket.on('disconnect', () => {
    const user = users.get(socket.userId);
    if (user && user.currentRoom) {
      const room = rooms.get(user.currentRoom);
      if (room) {
        room.removeMember(socket.userId);
        io.to(`room:${room.id}`).emit('member:left', {
          userId: socket.userId,
          members: room.members
        });
        if (room.members.length === 0) {
          rooms.delete(room.id);
        }
      }
    }
    users.delete(socket.userId);
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🌸 dolludy server running on http://localhost:${PORT}`);
});
