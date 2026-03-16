import { gameReducer, initialState } from '../src/hooks/useGameEngine.js';
import { getPlayerView } from '../src/logic/viewFilter.js';
import { dealCards } from '../src/logic/round.js';

const PLAYER_COUNT = 5;

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

export class GameRoom {
    constructor(code) {
        this.code = code || generateRoomCode();
        this.sockets = new Array(PLAYER_COUNT).fill(null);
        this.state = { ...initialState };
        this.started = false;
        this.orderedHands = new Array(PLAYER_COUNT).fill(null);
    }

    get playerCount() {
        return this.sockets.filter(s => s !== null).length;
    }

    addPlayer(socket) {
        const index = this.sockets.indexOf(null);
        if (index === -1) return null;
        this.sockets[index] = socket;
        return index;
    }

    removePlayer(playerIndex) {
        this.sockets[playerIndex] = null;
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

    broadcastState() {
        for (let i = 0; i < PLAYER_COUNT; i++) {
            const socket = this.sockets[i];
            if (socket) {
                const view = getPlayerView(this.state, i);
                socket.emit('state_update', view);
            }
        }
    }
}

export { generateRoomCode };
