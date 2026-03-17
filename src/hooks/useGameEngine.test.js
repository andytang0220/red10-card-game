import { describe, it, expect } from 'vitest';
import { gameReducer, initialState } from './useGameEngine.js';

// --- Helpers ---
const c = (rank, suit) => ({
    id: `${rank}-${suit}`,
    rank,
    suit,
    value: { '4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14,'2':15,'3':16 }[rank],
    isJoker: false,
});

const TRICK_TYPES = {
    SINGLE: 'single',
    PAIR: 'pair',
};

function makeState(overrides = {}) {
    return { ...initialState, ...overrides };
}

// --- START_ROUND ---

describe('START_ROUND', () => {
    it('transitions to hand_ordering phase', () => {
        const hands = [[c('4','♥')], [c('5','♠')], [c('6','♦')], [c('7','♣')], [c('8','♥')]];
        const result = gameReducer(initialState, {
            type: 'START_ROUND',
            hands,
            starterIndex: 0,
            existingScores: [0, 0, 0, 0, 0],
            roundNumber: 1,
        });
        expect(result.phase).toBe('hand_ordering');
        expect(result.hands).toBe(hands);
        expect(result.activePlayerIndex).toBe(0);
    });

    it('preserves existing scores across rounds', () => {
        const hands = [[c('4','♥')], [c('5','♠')], [c('6','♦')], [c('7','♣')], [c('8','♥')]];
        const result = gameReducer(initialState, {
            type: 'START_ROUND',
            hands,
            starterIndex: 2,
            existingScores: [3, 1, 0, 2, 4],
            roundNumber: 3,
        });
        expect(result.scores).toEqual([3, 1, 0, 2, 4]);
        expect(result.roundNumber).toBe(3);
    });

    it('resets UI state', () => {
        const dirty = makeState({ selectedCards: [c('7','♥')], validationMessage: 'error' });
        const hands = [[c('4','♥')], [c('5','♠')], [c('6','♦')], [c('7','♣')], [c('8','♥')]];
        const result = gameReducer(dirty, {
            type: 'START_ROUND',
            hands,
            starterIndex: 0,
            existingScores: [0, 0, 0, 0, 0],
            roundNumber: 1,
        });
        expect(result.selectedCards).toEqual([]);
        expect(result.validationMessage).toBeNull();
        expect(result.orderingPlayerIndex).toBe(0);
        expect(result.orderingReady).toBe(false);
    });
});

// --- SELECT_CARD ---

describe('SELECT_CARD', () => {
    it('adds a card to selectedCards', () => {
        const card = c('7','♥');
        const state = makeState({ phase: 'playing' });
        const result = gameReducer(state, { type: 'SELECT_CARD', card });
        expect(result.selectedCards).toEqual([card]);
    });

    it('removes a card that is already selected', () => {
        const card = c('7','♥');
        const state = makeState({ phase: 'playing', selectedCards: [card] });
        const result = gameReducer(state, { type: 'SELECT_CARD', card });
        expect(result.selectedCards).toEqual([]);
    });

    it('clears validationMessage', () => {
        const state = makeState({ phase: 'playing', validationMessage: 'some error' });
        const result = gameReducer(state, { type: 'SELECT_CARD', card: c('7','♥') });
        expect(result.validationMessage).toBeNull();
    });

    it('is ignored in wrong phase', () => {
        const state = makeState({ phase: 'pass_screen' });
        const result = gameReducer(state, { type: 'SELECT_CARD', card: c('7','♥') });
        expect(result).toBe(state);
    });

    it('is ignored from wrong player', () => {
        const state = makeState({ phase: 'playing', activePlayerIndex: 2 });
        const result = gameReducer(state, { type: 'SELECT_CARD', card: c('7','♥'), playerIndex: 3 });
        expect(result).toBe(state);
    });
});

// --- PLAY_CARD ---

describe('PLAY_CARD', () => {
    it('returns validation error when no cards selected', () => {
        const state = makeState({ phase: 'playing' });
        const result = gameReducer(state, { type: 'PLAY_CARD', cards: [] });
        expect(result.validationMessage).toBe('Select cards to play first.');
    });

    it('returns validation error for invalid trick', () => {
        const state = makeState({
            phase: 'playing',
            hands: [[c('7','♥'), c('9','♠')], [c('8','♦')], [c('6','♣')], [c('5','♥')], [c('4','♠')]],
            activePlayerIndex: 0,
        });
        const result = gameReducer(state, { type: 'PLAY_CARD', cards: [c('7','♥'), c('9','♠')] });
        expect(result.validationMessage).toBeDefined();
    });

    it('plays a valid single card and transitions to pass_screen', () => {
        const state = makeState({
            phase: 'playing',
            hands: [[c('7','♥'), c('9','♠')], [c('8','♦')], [c('6','♣')], [c('5','♥')], [c('4','♠')]],
            activePlayerIndex: 0,
        });
        const result = gameReducer(state, { type: 'PLAY_CARD', cards: [c('7','♥')] });
        expect(result.validationMessage).toBeNull();
        expect(result.selectedCards).toEqual([]);
        expect(result.hands[0]).toHaveLength(1);
    });

    it('is ignored in wrong phase', () => {
        const state = makeState({ phase: 'pass_screen' });
        const result = gameReducer(state, { type: 'PLAY_CARD', cards: [c('7','♥')] });
        expect(result).toBe(state);
    });

    it('is ignored from wrong player', () => {
        const state = makeState({
            phase: 'playing',
            hands: [[c('7','♥')], [c('8','♦')], [c('6','♣')], [c('5','♥')], [c('4','♠')]],
            activePlayerIndex: 0,
        });
        const result = gameReducer(state, { type: 'PLAY_CARD', cards: [c('7','♥')], playerIndex: 1 });
        expect(result).toBe(state);
    });

    it('clears an open fork window when next player plays', () => {
        const state = makeState({
            phase: 'playing',
            hands: [[c('9','♠')], [c('8','♦'), c('K','♣')], [c('6','♣')], [c('5','♥')], [c('4','♠')]],
            activePlayerIndex: 1,
            currentTrick: { type: TRICK_TYPES.SINGLE, value: 7, length: 1, playedBy: 0, cards: [c('7','♣')] },
            forkWindow: { value: 7, pendingPlayerIndex: 3, stage: 'fork' },
        });
        const result = gameReducer(state, { type: 'PLAY_CARD', cards: [c('K','♣')] });
        // Fork window should be cleared (opportunity lost)
        expect(result.forkWindow).toBeNull();
    });
});

// --- PASS_TURN ---

describe('PASS_TURN', () => {
    it('returns error when there is no current trick', () => {
        const state = makeState({ phase: 'playing', currentTrick: null });
        const result = gameReducer(state, { type: 'PASS_TURN' });
        expect(result.validationMessage).toBeDefined();
    });

    it('records pass and transitions to pass_screen', () => {
        const state = makeState({
            phase: 'playing',
            hands: [[c('7','♥')], [c('8','♦')], [c('9','♣')], [c('10','♠')], [c('J','♥')]],
            activePlayerIndex: 0,
            currentTrick: { type: TRICK_TYPES.SINGLE, value: 12, length: 1, playedBy: 2, cards: [c('Q','♦')] },
        });
        const result = gameReducer(state, { type: 'PASS_TURN' });
        expect(result.phase).toBe('pass_screen');
        expect(result.passesThisRound).toContain(0);
        expect(result.selectedCards).toEqual([]);
        expect(result.validationMessage).toBeNull();
    });

    it('is ignored in wrong phase', () => {
        const state = makeState({ phase: 'setup' });
        const result = gameReducer(state, { type: 'PASS_TURN' });
        expect(result).toBe(state);
    });

    it('is ignored from wrong player', () => {
        const state = makeState({
            phase: 'playing',
            activePlayerIndex: 0,
            currentTrick: { type: TRICK_TYPES.SINGLE, value: 12, length: 1, playedBy: 2, cards: [c('Q','♦')] },
        });
        const result = gameReducer(state, { type: 'PASS_TURN', playerIndex: 3 });
        expect(result).toBe(state);
    });
});

// --- FORK_ACCEPT ---

describe('FORK_ACCEPT (fork stage)', () => {
    it('applies fork and checks for drawback candidate', () => {
        const state = makeState({
            phase: 'pass_screen',
            hands: [
                [c('9','♠')],                        // player 0
                [c('7','♥'), c('7','♠'), c('K','♦')], // player 1: can fork
                [c('7','♦'), c('J','♣')],             // player 2: has drawback card
                [c('8','♥')],
                [c('6','♣')],
            ],
            activePlayerIndex: 1,
            currentTrick: { type: TRICK_TYPES.SINGLE, value: 7, length: 1, playedBy: 0, cards: [c('7','♣')] },
            forkWindow: { value: 7, pendingPlayerIndex: 1, stage: 'fork' },
        });
        const result = gameReducer(state, { type: 'FORK_ACCEPT' });
        // Fork applied, now looking for drawback
        expect(result.forkWindow.stage).toBe('drawback');
        expect(result.forkWindow.pendingPlayerIndex).toBe(2);
    });

    it('is valid during pass_screen phase', () => {
        const state = makeState({
            phase: 'pass_screen',
            hands: [
                [c('9','♠')],
                [c('7','♥'), c('7','♠'), c('K','♦')],
                [c('8','♦')],
                [c('6','♣')],
                [c('5','♥')],
            ],
            activePlayerIndex: 1,
            currentTrick: { type: TRICK_TYPES.SINGLE, value: 7, length: 1, playedBy: 0, cards: [c('7','♣')] },
            forkWindow: { value: 7, pendingPlayerIndex: 1, stage: 'fork' },
        });
        const result = gameReducer(state, { type: 'FORK_ACCEPT' });
        // Should process (not return state unchanged)
        expect(result).not.toBe(state);
        expect(result.forkWindow).toBeNull();
    });
});

describe('FORK_ACCEPT (self-drawback)', () => {
    it('forker becomes drawback candidate when they hold the last card of the forked rank', () => {
        // Player 1 has three 7s (a bomb), another player played a single 7
        // Player 1 forks with two 7s, still holds the third
        const state = makeState({
            phase: 'pass_screen',
            hands: [
                [c('9','♠')],                                    // player 0
                [c('7','♥'), c('7','♠'), c('7','♦'), c('K','♣')], // player 1: 3 sevens + king
                [c('J','♣')],                                    // player 2
                [c('8','♥')],                                    // player 3
                [c('6','♣')],                                    // player 4
            ],
            activePlayerIndex: 1,
            currentTrick: { type: TRICK_TYPES.SINGLE, value: 7, length: 1, playedBy: 0, cards: [c('7','♣')] },
            forkWindow: { value: 7, pendingPlayerIndex: 1, stage: 'fork' },
        });
        const result = gameReducer(state, { type: 'FORK_ACCEPT' });
        // Fork applied — now drawback candidate should be player 1 (self)
        expect(result.forkWindow).not.toBeNull();
        expect(result.forkWindow.stage).toBe('drawback');
        expect(result.forkWindow.pendingPlayerIndex).toBe(1);
    });

    it('self-drawback clears trick and gives forker the lead', () => {
        // State after fork was accepted — player 1 is the drawback candidate for their own fork
        const state = makeState({
            phase: 'pass_screen',
            hands: [
                [c('9','♠')],
                [c('7','♦'), c('K','♣')],   // player 1: holds last 7 + king
                [c('J','♣')],
                [c('8','♥')],
                [c('6','♣')],
            ],
            activePlayerIndex: 2,
            currentTrick: { type: TRICK_TYPES.PAIR, value: 7, length: 2, playedBy: 1, cards: [c('7','♥'), c('7','♠')] },
            forkWindow: { value: 7, pendingPlayerIndex: 1, stage: 'drawback' },
        });
        const result = gameReducer(state, { type: 'FORK_ACCEPT' });
        // Drawback applied — trick cleared, player 1 leads next
        expect(result.forkWindow).toBeNull();
        expect(result.currentTrick).toBeNull();
        expect(result.trickStarter).toBe(1);
        expect(result.activePlayerIndex).toBe(1);
        // The 7♦ should be removed from player 1's hand
        expect(result.hands[1]).toHaveLength(1);
        expect(result.hands[1][0].rank).toBe('K');
    });

    it('full self-drawback flow: fork then drawback by same player', () => {
        // Player 2 has three 8s, player 0 played a single 8
        const state = makeState({
            phase: 'pass_screen',
            hands: [
                [c('9','♠')],
                [c('J','♣')],
                [c('8','♥'), c('8','♠'), c('8','♦'), c('K','♣')], // player 2: 3 eights
                [c('6','♥')],
                [c('5','♣')],
            ],
            activePlayerIndex: 2,
            currentTrick: { type: TRICK_TYPES.SINGLE, value: 8, length: 1, playedBy: 0, cards: [c('8','♣')] },
            forkWindow: { value: 8, pendingPlayerIndex: 2, stage: 'fork' },
        });

        // Step 1: Accept fork
        const afterFork = gameReducer(state, { type: 'FORK_ACCEPT' });
        expect(afterFork.forkWindow.stage).toBe('drawback');
        expect(afterFork.forkWindow.pendingPlayerIndex).toBe(2);

        // Step 2: Accept self-drawback
        const afterDrawback = gameReducer(afterFork, { type: 'FORK_ACCEPT' });
        expect(afterDrawback.forkWindow).toBeNull();
        expect(afterDrawback.currentTrick).toBeNull();
        expect(afterDrawback.trickStarter).toBe(2);
        expect(afterDrawback.activePlayerIndex).toBe(2);
        // All three 8s played (2 fork + 1 drawback), only K remains
        expect(afterDrawback.hands[2]).toHaveLength(1);
        expect(afterDrawback.hands[2][0].rank).toBe('K');
    });
});

describe('FORK_ACCEPT guards', () => {
    it('is ignored when no fork window exists', () => {
        const state = makeState({ phase: 'playing', forkWindow: null });
        const result = gameReducer(state, { type: 'FORK_ACCEPT' });
        expect(result).toBe(state);
    });

    it('is ignored from wrong player', () => {
        const state = makeState({
            phase: 'pass_screen',
            forkWindow: { value: 7, pendingPlayerIndex: 1, stage: 'fork' },
        });
        const result = gameReducer(state, { type: 'FORK_ACCEPT', playerIndex: 2 });
        expect(result).toBe(state);
    });
});

// --- ORDER_HAND_DONE ---

describe('ORDER_HAND_DONE', () => {
    it('advances to next player for ordering', () => {
        const state = makeState({
            phase: 'hand_ordering',
            hands: [[c('7','♥')], [c('8','♦')], [c('9','♣')], [c('10','♠')], [c('J','♥')]],
            orderingPlayerIndex: 0,
            orderingReady: true,
        });
        const result = gameReducer(state, { type: 'ORDER_HAND_DONE', orderedHand: [c('7','♥')] });
        expect(result.orderingPlayerIndex).toBe(1);
        expect(result.orderingReady).toBe(false);
    });

    it('transitions to pass_screen when last player finishes ordering', () => {
        const state = makeState({
            phase: 'hand_ordering',
            hands: [[c('7','♥')], [c('8','♦')], [c('9','♣')], [c('10','♠')], [c('J','♥')]],
            orderingPlayerIndex: 4,
            orderingReady: true,
        });
        const result = gameReducer(state, { type: 'ORDER_HAND_DONE', orderedHand: [c('J','♥')] });
        expect(result.phase).toBe('pass_screen');
    });
});

// --- Simple actions ---

describe('SET_ORDERING_READY', () => {
    it('sets orderingReady to true', () => {
        const state = makeState({ phase: 'hand_ordering' });
        const result = gameReducer(state, { type: 'SET_ORDERING_READY' });
        expect(result.orderingReady).toBe(true);
    });

    it('is ignored in wrong phase', () => {
        const state = makeState({ phase: 'playing' });
        const result = gameReducer(state, { type: 'SET_ORDERING_READY' });
        expect(result).toBe(state);
    });

    it('is ignored from wrong player', () => {
        const state = makeState({ phase: 'hand_ordering', orderingPlayerIndex: 2 });
        const result = gameReducer(state, { type: 'SET_ORDERING_READY', playerIndex: 0 });
        expect(result).toBe(state);
    });
});

describe('ENTER_PLAYING', () => {
    it('transitions to playing phase', () => {
        const state = makeState({ phase: 'pass_screen' });
        const result = gameReducer(state, { type: 'ENTER_PLAYING' });
        expect(result.phase).toBe('playing');
    });

    it('is ignored in wrong phase', () => {
        const state = makeState({ phase: 'playing' });
        const result = gameReducer(state, { type: 'ENTER_PLAYING' });
        expect(result).toBe(state);
    });

    it('is ignored from wrong player', () => {
        const state = makeState({ phase: 'pass_screen', activePlayerIndex: 3 });
        const result = gameReducer(state, { type: 'ENTER_PLAYING', playerIndex: 1 });
        expect(result).toBe(state);
    });
});

describe('NEW_GAME', () => {
    it('resets to initial state', () => {
        const dirty = makeState({
            phase: 'game_over',
            scores: [10, 5, 3, 2, 1],
            selectedCards: [c('7','♥')],
        });
        const result = gameReducer(dirty, { type: 'NEW_GAME' });
        expect(result.phase).toBe('setup');
        expect(result.scores).toEqual([0, 0, 0, 0, 0]);
        expect(result.selectedCards).toEqual([]);
    });

    it('is ignored in wrong phase', () => {
        const state = makeState({ phase: 'playing' });
        const result = gameReducer(state, { type: 'NEW_GAME' });
        expect(result).toBe(state);
    });
});

describe('START_ROUND guards', () => {
    it('is ignored in wrong phase', () => {
        const state = makeState({ phase: 'playing' });
        const result = gameReducer(state, {
            type: 'START_ROUND',
            hands: [[], [], [], [], []],
            starterIndex: 0,
            existingScores: [0, 0, 0, 0, 0],
            roundNumber: 1,
        });
        expect(result).toBe(state);
    });

    it('is allowed from round_over phase', () => {
        const state = makeState({ phase: 'round_over' });
        const hands = [[c('4','♥')], [c('5','♠')], [c('6','♦')], [c('7','♣')], [c('8','♥')]];
        const result = gameReducer(state, {
            type: 'START_ROUND',
            hands,
            starterIndex: 0,
            existingScores: [0, 0, 0, 0, 0],
            roundNumber: 2,
        });
        expect(result.phase).toBe('hand_ordering');
    });
});

describe('ORDER_HAND_DONE guards', () => {
    it('is ignored in wrong phase', () => {
        const state = makeState({ phase: 'playing' });
        const result = gameReducer(state, { type: 'ORDER_HAND_DONE', orderedHand: [] });
        expect(result).toBe(state);
    });

    it('is ignored from wrong player', () => {
        const state = makeState({
            phase: 'hand_ordering',
            hands: [[c('7','♥')], [c('8','♦')], [c('9','♣')], [c('10','♠')], [c('J','♥')]],
            orderingPlayerIndex: 2,
        });
        const result = gameReducer(state, { type: 'ORDER_HAND_DONE', orderedHand: [c('7','♥')], playerIndex: 0 });
        expect(result).toBe(state);
    });
});
