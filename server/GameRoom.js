import { gameReducer, initialState } from '../src/hooks/useGameEngine.js';
import { getPlayerView } from '../src/logic/viewFilter.js';
import { dealCards } from '../src/logic/round.js';
import crypto from 'crypto';

const PLAYER_COUNT = 5;

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function generatePlayerId() {
    return crypto.randomBytes(16).toString('hex');
}

export class GameRoom {
    constructor(code) {
        this.code = code || generateRoomCode();
        this.sockets = new Array(PLAYER_COUNT).fill(null);
        this.playerIds = new Array(PLAYER_COUNT).fill(null);
        this.state = { ...initialState };
        this.started = false;
        this.orderedHands = new Array(PLAYER_COUNT).fill(null);
        this.readyForNextRound = new Array(PLAYER_COUNT).fill(false);
    }

    get playerCount() {
        return this.playerIds.filter(id => id !== null).length;
    }

    get connectedCount() {
        return this.sockets.filter(s => s !== null).length;
    }

    addPlayer(socket) {
        const index = this.playerIds.indexOf(null);
        if (index === -1) return null;
        const playerId = generatePlayerId();
        this.sockets[index] = socket;
        this.playerIds[index] = playerId;
        return { index, playerId };
    }

    reconnectPlayer(playerIndex, socket) {
        this.sockets[playerIndex] = socket;
    }

    findPlayerByToken(playerId) {
        return this.playerIds.indexOf(playerId);
    }

    disconnectPlayer(playerIndex) {
        this.sockets[playerIndex] = null;
        // Keep playerIds[playerIndex] so the player can reconnect
    }

    handleAction(playerIndex, action) {
        // Inject playerIndex into action so reducer guards work
        const fullAction = { ...action, playerIndex };

        // Client-local actions that the server doesn't process
        if (action.type === 'SELECT_CARD') {
            return { error: 'SELECT_CARD is client-local' };
        }

        // For PLAY_CARD, cards come from the client payload
        if (action.type === 'PLAY_CARD') {
            if (!action.cards || action.cards.length === 0) {
                return { error: 'Select cards to play first.' };
            }
            fullAction.cards = action.cards;
        }

        // For ORDER_HAND_DONE in multiplayer, collect and dispatch when all are in
        if (action.type === 'ORDER_HAND_DONE') {
            return this.handleOrderingDone(playerIndex, action.orderedHand);
        }

        // Collect ready signals for next round
        if (action.type === 'READY_NEXT_ROUND') {
            return this.handleReadyNextRound(playerIndex);
        }

        // Block client-sent START_ROUND — server handles this via ready-up
        if (action.type === 'START_ROUND') {
            return { error: 'Use READY_NEXT_ROUND instead.' };
        }

        const prevState = this.state;
        const newState = gameReducer(this.state, fullAction);

        if (newState === prevState) {
            return { error: 'Action rejected.' };
        }

        this.state = newState;
        this.autoAdvance();
        this.broadcastState();
        return { ok: true };
    }

    handleOrderingDone(playerIndex, orderedHand) {
        if (this.state.phase !== 'hand_ordering') {
            return { error: 'Not in hand_ordering phase.' };
        }
        if (this.orderedHands[playerIndex] !== null) {
            return { error: 'Already submitted hand ordering.' };
        }

        this.orderedHands[playerIndex] = orderedHand;

        // Notify the player they're now waiting
        const socket = this.sockets[playerIndex];
        if (socket) {
            socket.emit('waiting_for_others');
        }

        // Check if all players have submitted
        if (this.orderedHands.every(h => h !== null)) {
            // Dispatch ORDER_HAND_DONE for each player sequentially
            for (let i = 0; i < PLAYER_COUNT; i++) {
                this.state = gameReducer(this.state, {
                    type: 'ORDER_HAND_DONE',
                    orderedHand: this.orderedHands[i],
                    playerIndex: i,
                });
            }
            this.orderedHands = new Array(PLAYER_COUNT).fill(null);
            this.autoAdvance();
            this.broadcastState();
        }

        return { ok: true };
    }

    handleReadyNextRound(playerIndex) {
        if (this.state.phase !== 'round_over') {
            return { error: 'Not in round_over phase.' };
        }
        if (this.readyForNextRound[playerIndex]) {
            return { error: 'Already marked ready.' };
        }

        this.readyForNextRound[playerIndex] = true;

        // Notify the player they're waiting
        const socket = this.sockets[playerIndex];
        if (socket) {
            socket.emit('waiting_for_others');
        }

        // Broadcast updated ready count to all players
        const readyCount = this.readyForNextRound.filter(Boolean).length;
        for (let i = 0; i < PLAYER_COUNT; i++) {
            const s = this.sockets[i];
            if (s) {
                s.emit('ready_count', { readyCount });
            }
        }

        // Start next round when all are ready
        if (readyCount === PLAYER_COUNT) {
            this.readyForNextRound = new Array(PLAYER_COUNT).fill(false);
            const { hands, starterIndex } = dealCards();
            this.state = gameReducer(this.state, {
                type: 'START_ROUND',
                hands,
                starterIndex,
                existingScores: this.state.scores,
                roundNumber: this.state.roundNumber + 1,
            });
            this.broadcastState();
        }

        return { ok: true };
    }

    autoAdvance() {
        // Skip pass_screen in multiplayer — go straight to playing
        if (this.state.phase === 'pass_screen') {
            this.state = gameReducer(this.state, {
                type: 'ENTER_PLAYING',
                playerIndex: this.state.activePlayerIndex,
            });
        }
    }

    startGame() {
        if (this.started) return;
        this.started = true;

        const { hands, starterIndex } = dealCards();
        this.state = gameReducer(this.state, {
            type: 'START_ROUND',
            hands,
            starterIndex,
            existingScores: [0, 0, 0, 0, 0],
            roundNumber: 1,
        });

        this.broadcastState();
    }

    sendStateTo(playerIndex) {
        const socket = this.sockets[playerIndex];
        if (socket) {
            const view = getPlayerView(this.state, playerIndex);
            socket.emit('state_update', view);
        }
    }

    broadcastState() {
        for (let i = 0; i < PLAYER_COUNT; i++) {
            this.sendStateTo(i);
        }
    }
}

export { generateRoomCode };
