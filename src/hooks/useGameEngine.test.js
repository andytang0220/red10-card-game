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
        const dirty = makeState({ selectedCards: [c('7','♥')], validationMessage: 'error', forkReady: true });
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
        expect(result.forkReady).toBe(false);
        expect(result.orderingPlayerIndex).toBe(0);
        expect(result.orderingReady).toBe(false);
    });
});

// --- SELECT_CARD ---

describe('SELECT_CARD', () => {
    it('adds a card to selectedCards', () => {
        const card = c('7','♥');
        const result = gameReducer(initialState, { type: 'SELECT_CARD', card });
        expect(result.selectedCards).toEqual([card]);
    });

    it('removes a card that is already selected', () => {
        const card = c('7','♥');
        const state = makeState({ selectedCards: [card] });
        const result = gameReducer(state, { type: 'SELECT_CARD', card });
        expect(result.selectedCards).toEqual([]);
    });

    it('clears validationMessage', () => {
        const state = makeState({ validationMessage: 'some error' });
        const result = gameReducer(state, { type: 'SELECT_CARD', card: c('7','♥') });
        expect(result.validationMessage).toBeNull();
    });
});

// --- PLAY_CARD ---

describe('PLAY_CARD', () => {
    it('returns validation error when no cards selected', () => {
        const result = gameReducer(initialState, { type: 'PLAY_CARD', cards: [] });
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
});

// --- FORK_ACCEPT / FORK_DECLINE ---

describe('FORK_ACCEPT (fork stage)', () => {
    it('applies fork and checks for drawback candidate', () => {
        const state = makeState({
            phase: 'fork_window',
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
            forkReady: true,
        });
        const result = gameReducer(state, { type: 'FORK_ACCEPT' });
        // Fork applied, now looking for drawback
        expect(result.forkWindow.stage).toBe('drawback');
        expect(result.forkWindow.pendingPlayerIndex).toBe(2);
        expect(result.forkReady).toBe(false);
    });
});

describe('FORK_DECLINE (fork stage)', () => {
    it('advances to next fork candidate or exits fork window', () => {
        const state = makeState({
            phase: 'fork_window',
            hands: [
                [c('9','♠')],
                [c('7','♥'), c('7','♠')],   // player 1: can fork but declines
                [c('8','♦')],
                [c('6','♣')],
                [c('5','♥')],
            ],
            activePlayerIndex: 1,
            currentTrick: { type: TRICK_TYPES.SINGLE, value: 7, length: 1, playedBy: 0, cards: [c('7','♣')] },
            forkWindow: { value: 7, pendingPlayerIndex: 1, stage: 'fork' },
        });
        const result = gameReducer(state, { type: 'FORK_DECLINE' });
        // No other fork candidates, should exit to pass_screen
        expect(result.phase).toBe('pass_screen');
        expect(result.forkWindow).toBeNull();
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
        const result = gameReducer(initialState, { type: 'SET_ORDERING_READY' });
        expect(result.orderingReady).toBe(true);
    });
});

describe('SET_FORK_READY', () => {
    it('sets forkReady to true', () => {
        const result = gameReducer(initialState, { type: 'SET_FORK_READY' });
        expect(result.forkReady).toBe(true);
    });
});

describe('ENTER_PLAYING', () => {
    it('transitions to playing phase', () => {
        const state = makeState({ phase: 'pass_screen' });
        const result = gameReducer(state, { type: 'ENTER_PLAYING' });
        expect(result.phase).toBe('playing');
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
});
