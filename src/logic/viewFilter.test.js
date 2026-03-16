import { describe, it, expect } from 'vitest';
import { getPlayerView } from './viewFilter';

function makeState(overrides = {}) {
    return {
        phase: 'playing',
        hands: [
            [{ id: 'c1', rank: '3', suit: '♠', value: 3 }],
            [{ id: 'c2', rank: '5', suit: '♥', value: 5 }, { id: 'c3', rank: '6', suit: '♥', value: 6 }],
            [],
            [{ id: 'c4', rank: 'K', suit: '♦', value: 13 }],
            [{ id: 'c5', rank: 'A', suit: '♣', value: 14 }, { id: 'c6', rank: '2', suit: '♣', value: 15 }, { id: 'c7', rank: '7', suit: '♠', value: 7 }],
        ],
        activePlayerIndex: 1,
        trickStarter: 0,
        currentTrick: { type: 'single', value: 3, length: 1, playedBy: 0, cards: [{ id: 'c0', rank: '3', suit: '♠', value: 3 }] },
        passesThisRound: [2],
        teams: { red: [0, 3], black: [1, 2, 4] },
        revealedRedTens: [0],
        scores: [10, 5, 5, 10, 0],
        finishOrder: [2],
        forkWindow: null,
        roundNumber: 2,
        selectedCards: [{ id: 'c2', rank: '5', suit: '♥', value: 5 }],
        validationMessage: 'Must play higher',
        orderingPlayerIndex: 0,
        orderingReady: true,
        roundPoints: { red: 0, black: 0 },
        ...overrides,
    };
}

describe('getPlayerView', () => {
    it('returns own hand correctly', () => {
        const state = makeState();
        const view = getPlayerView(state, 1);
        expect(view.hand).toEqual(state.hands[1]);
    });

    it('does not include other players\' hands (no hands field)', () => {
        const view = getPlayerView(makeState(), 0);
        expect(view).not.toHaveProperty('hands');
    });

    it('handCounts reflects correct card counts for all players', () => {
        const view = getPlayerView(makeState(), 0);
        expect(view.handCounts).toEqual([1, 2, 0, 1, 3]);
    });

    it('includes teams in output', () => {
        const state = makeState();
        const view = getPlayerView(state, 0);
        expect(view).toHaveProperty('teams');
        expect(view.teams).toEqual(state.teams);
    });

    it('revealedRedTens is passed through', () => {
        const state = makeState({ revealedRedTens: [0, 3] });
        const view = getPlayerView(state, 1);
        expect(view.revealedRedTens).toEqual([0, 3]);
    });

    it('forkWindow is full when pendingPlayerIndex === playerIndex', () => {
        const fw = { stage: 'fork', value: 10, pendingPlayerIndex: 2 };
        const view = getPlayerView(makeState({ forkWindow: fw }), 2);
        expect(view.forkWindow).toEqual(fw);
    });

    it('forkWindow is redacted (no pendingPlayerIndex) when it\'s another player\'s', () => {
        const fw = { stage: 'fork', value: 10, pendingPlayerIndex: 2 };
        const view = getPlayerView(makeState({ forkWindow: fw }), 0);
        expect(view.forkWindow).toEqual({ stage: 'fork', value: 10, isYours: false });
        expect(view.forkWindow).not.toHaveProperty('pendingPlayerIndex');
    });

    it('forkWindow is null when state has no fork window', () => {
        const view = getPlayerView(makeState({ forkWindow: null }), 0);
        expect(view.forkWindow).toBeNull();
    });

    it('selectedCards is populated when playerIndex is active player', () => {
        const state = makeState({ activePlayerIndex: 1, selectedCards: [{ id: 'c2' }] });
        const view = getPlayerView(state, 1);
        expect(view.selectedCards).toEqual([{ id: 'c2' }]);
    });

    it('selectedCards is empty when playerIndex is not active player', () => {
        const state = makeState({ activePlayerIndex: 1, selectedCards: [{ id: 'c2' }] });
        const view = getPlayerView(state, 0);
        expect(view.selectedCards).toEqual([]);
    });

    it('validationMessage is populated when playerIndex is active player', () => {
        const state = makeState({ activePlayerIndex: 1, validationMessage: 'Must play higher' });
        const view = getPlayerView(state, 1);
        expect(view.validationMessage).toBe('Must play higher');
    });

    it('validationMessage is null when playerIndex is not active player', () => {
        const state = makeState({ activePlayerIndex: 1, validationMessage: 'Must play higher' });
        const view = getPlayerView(state, 0);
        expect(view.validationMessage).toBeNull();
    });

    it('public fields are passed through unchanged', () => {
        const state = makeState();
        const view = getPlayerView(state, 0);

        expect(view.phase).toBe(state.phase);
        expect(view.activePlayerIndex).toBe(state.activePlayerIndex);
        expect(view.trickStarter).toBe(state.trickStarter);
        expect(view.currentTrick).toEqual(state.currentTrick);
        expect(view.passesThisRound).toEqual(state.passesThisRound);
        expect(view.scores).toEqual(state.scores);
        expect(view.finishOrder).toEqual(state.finishOrder);
        expect(view.roundNumber).toBe(state.roundNumber);
        expect(view.orderingPlayerIndex).toBe(state.orderingPlayerIndex);
        expect(view.orderingReady).toBe(state.orderingReady);
        expect(view.roundPoints).toEqual(state.roundPoints);
    });
});
