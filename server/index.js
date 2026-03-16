import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { GameRoom, generateRoomCode } from './GameRoom.js';

const PORT = process.env.PORT || 3001;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:4173'],
        methods: ['GET', 'POST'],
    },
});

const rooms = new Map();

function findUniqueCode() {
    let code;
    do {
        code = generateRoomCode();
    } while (rooms.has(code));
    return code;
}

io.on('connection', (socket) => {
    let currentRoom = null;
    let currentPlayerIndex = null;

    socket.on('create_room', () => {
        if (currentRoom) {
            socket.emit('error', { message: 'Already in a room.' });
            return;
        }

        const code = findUniqueCode();
        const room = new GameRoom(code);
        rooms.set(code, room);

        currentPlayerIndex = room.addPlayer(socket);
        currentRoom = room;

        socket.join(code);
        socket.emit('room_created', { code, playerIndex: currentPlayerIndex });
    });

    socket.on('join_room', ({ code }) => {
        if (currentRoom) {
            socket.emit('error', { message: 'Already in a room.' });
            return;
        }

        const upperCode = code.toUpperCase();
        const room = rooms.get(upperCode);

        if (!room) {
            socket.emit('error', { message: 'Room not found.' });
            return;
        }

        if (room.started) {
            socket.emit('error', { message: 'Game already in progress.' });
            return;
        }

        currentPlayerIndex = room.addPlayer(socket);
        if (currentPlayerIndex === null) {
            socket.emit('error', { message: 'Room is full.' });
            return;
        }

        currentRoom = room;
        socket.join(upperCode);

        socket.emit('room_joined', {
            playerIndex: currentPlayerIndex,
            playerCount: room.playerCount,
        });

        // Notify others
        socket.to(upperCode).emit('player_joined', {
            playerCount: room.playerCount,
        });

        // Auto-start when 5 players are in
        if (room.playerCount === 5) {
            room.startGame();
        }
    });

    socket.on('action', (action) => {
        if (!currentRoom || currentPlayerIndex === null) {
            socket.emit('error', { message: 'Not in a room.' });
            return;
        }

        const result = currentRoom.handleAction(currentPlayerIndex, action);
        if (result.error) {
            socket.emit('error', { message: result.error });
        }
    });

    socket.on('disconnect', () => {
        if (currentRoom && currentPlayerIndex !== null) {
            currentRoom.removePlayer(currentPlayerIndex);

            // Clean up empty rooms
            if (currentRoom.playerCount === 0) {
                rooms.delete(currentRoom.code);
            }
        }
    });
});

httpServer.listen(PORT, () => {
    console.log(`Red10 server listening on port ${PORT}`);
});
