import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { GameRoom, generateRoomCode } from './GameRoom.js';

const PORT = process.env.PORT || 3001;

const app = express();
const httpServer = createServer(app);
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:5173', 'http://localhost:4173'];

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
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

        const { index, playerId } = room.addPlayer(socket);
        currentPlayerIndex = index;
        currentRoom = room;

        socket.join(code);
        socket.emit('room_created', { code, playerIndex: currentPlayerIndex, playerId });
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

        const result = room.addPlayer(socket);
        if (result === null) {
            socket.emit('error', { message: 'Room is full.' });
            return;
        }

        currentPlayerIndex = result.index;
        currentRoom = room;
        socket.join(upperCode);

        socket.emit('room_joined', {
            code: upperCode,
            playerIndex: currentPlayerIndex,
            playerCount: room.playerCount,
            playerId: result.playerId,
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

    socket.on('reconnect_room', ({ code, playerId }) => {
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

        const playerIndex = room.findPlayerByToken(playerId);
        if (playerIndex === -1) {
            socket.emit('error', { message: 'Invalid player token.' });
            return;
        }

        room.reconnectPlayer(playerIndex, socket);
        currentRoom = room;
        currentPlayerIndex = playerIndex;
        socket.join(upperCode);

        socket.emit('reconnected', {
            playerIndex,
            playerCount: room.playerCount,
            code: upperCode,
        });

        // Send current game state if game is in progress
        if (room.started) {
            room.sendStateTo(playerIndex);
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
            currentRoom.disconnectPlayer(currentPlayerIndex);

            // Clean up rooms where no players have IDs (shouldn't happen, but safety)
            if (currentRoom.playerCount === 0) {
                rooms.delete(currentRoom.code);
            }
        }
    });
});

httpServer.listen(PORT, () => {
    console.log(`Red10 server listening on port ${PORT}`);
});
