import { describe, it, expect } from 'vitest';
import { dealCards, findRedTenHolders, getNextPlayerIndex, playCard, passTurn, resolveTrick, isRoundOver, getRoundResult, applyTeamSweep, skipIneligiblePlayers } from './round.js';
import { TRICK_TYPES } from './tricks.js';

// --- Helpers ---
const c = (rank, suit) => ({
    id: `${rank}-${suit}`,
    rank,
    suit,
    value: { '4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14,'2':15,'3':16 }[rank],
    isJoker: false,
});

const makeState = (overrides = {}) => ({
    hands: [[], [], [], [], []],
    activePlayerIndex: 0,
    trickStarter: 0,
    currentTrick: null,
    passesThisRound: [],
    revealedRedTens: [],
    finishOrder: [],
    forkWindow: null,
    ...overrides,
});

// --- dealCards ---

describe('dealCards', () => {
    it('deals 54 cards total across 5 players', () => {
        const { hands } = dealCards();
        const total = hands.reduce((sum, h) => sum + h.length, 0);
        expect(total).toBe(54);
    });

    it('first 4 players get 11 cards, last player gets 10', () => {
        const { hands } = dealCards();
        expect(hands[0]).toHaveLength(11);
        expect(hands[1]).toHaveLength(11);
        expect(hands[2]).toHaveLength(11);
        expect(hands[3]).toHaveLength(11);
        expect(hands[4]).toHaveLength(10);
    });

    it('starterIndex is the player holding 4♥', () => {
        const { hands, starterIndex } = dealCards();
        const starter = hands[starterIndex];
        expect(starter.some(card => card.rank === '4' && card.suit === '♥')).toBe(true);
    });

    it('no card appears in more than one hand', () => {
        const { hands } = dealCards();
        const allIds = hands.flat().map(c => c.id);
        const unique = new Set(allIds);
        expect(unique.size).toBe(54);
    });
});

// --- findRedTenHolders ---

describe('findRedTenHolders', () => {
    it('returns indices of players holding a red 10', () => {
        const hands = [
            [c('10', '♥')],
            [c('7', '♠')],
            [c('10', '♦')],
            [c('4', '♣')],
            [c('A', '♠')],
        ];
        expect(findRedTenHolders(hands)).toEqual([0, 2]);
    });

    it('returns empty array when no player holds a red 10', () => {
        const hands = [[c('10','♣')], [c('7','♠')], [], [], []];
        expect(findRedTenHolders(hands)).toEqual([]);
    });
});

// --- getNextPlayerIndex ---

describe('getNextPlayerIndex', () => {
    it('advances by 1', () => {
        expect(getNextPlayerIndex(0)).toBe(1);
        expect(getNextPlayerIndex(3)).toBe(4);
    });

    it('wraps around from player 4 to player 0', () => {
        expect(getNextPlayerIndex(4)).toBe(0);
    });
});

// --- playCard ---

describe('playCard — validation', () => {
    it('returns error when it is not the player\'s turn', () => {
        const state = makeState({ activePlayerIndex: 1 });
        const result = playCard(state, 0, [c('7','♥')]);
        expect(result.error).toBeDefined();
    });

    it('returns error for an invalid trick (cards don\'t form a valid combination)', () => {
        const state = makeState({
            hands: [[c('7','♥'), c('9','♠')], [], [], [], []],
        });
        const result = playCard(state, 0, [c('7','♥'), c('9','♠')]);
        expect(result.error).toBeDefined();
    });

    it('returns error when play does not follow current trick type', () => {
        const state = makeState({
            hands: [[c('7','♥'), c('7','♠')], [], [], [], []],
            currentTrick: { type: TRICK_TYPES.SINGLE, value: 6, length: 1, playedBy: 1, cards: [c('6','♦')] },
        });
        // Playing a pair when a single is required
        const result = playCard(state, 0, [c('7','♥'), c('7','♠')]);
        expect(result.error).toBeDefined();
    });

    it('returns error when play does not beat current trick', () => {
        const state = makeState({
            hands: [[c('8','♥')], [], [], [], []],
            currentTrick: { type: TRICK_TYPES.SINGLE, value: 9, length: 1, playedBy: 1, cards: [c('9','♦')] },
        });
        const result = playCard(state, 0, [c('8','♥')]);
        expect(result.error).toBeDefined();
    });
});

describe('playCard — valid plays', () => {
    it('allows any valid trick when no current trick', () => {
        const state = makeState({
            hands: [[c('7','♥')], [], [], [], []],
        });
        const result = playCard(state, 0, [c('7','♥')]);
        expect(result.error).toBeUndefined();
        expect(result.currentTrick.value).toBe(7);
    });

    it('removes played cards from the player\'s hand', () => {
        const state = makeState({
            hands: [[c('7','♥'), c('9','♠')], [], [], [], []],
        });
        const result = playCard(state, 0, [c('7','♥')]);
        expect(result.hands[0]).toHaveLength(1);
        expect(result.hands[0][0].rank).toBe('9');
    });

    it('advances activePlayerIndex to the next player', () => {
        const state = makeState({
            hands: [[c('7','♥')], [], [], [], []],
        });
        const result = playCard(state, 0, [c('7','♥')]);
        expect(result.activePlayerIndex).toBe(1);
    });

    it('allows a bomb to beat a non-bomb trick', () => {
        const state = makeState({
            hands: [[c('4','♥'), c('4','♦'), c('4','♣')], [], [], [], []],
            currentTrick: { type: TRICK_TYPES.SINGLE, value: 14, length: 1, playedBy: 1, cards: [c('A','♦')] },
        });
        const result = playCard(state, 0, [c('4','♥'), c('4','♦'), c('4','♣')]);
        expect(result.error).toBeUndefined();
    });

    it('reveals team when a red 10 is played', () => {
        const state = makeState({
            hands: [[c('10','♥')], [], [], [], []],
            revealedRedTens: [],
        });
        const result = playCard(state, 0, [c('10','♥')]);
        expect(result.revealedRedTens).toContain(0);
    });

    it('does not duplicate revealedRedTens if already revealed', () => {
        // No current trick so any play is valid; player 0 already revealed
        const state = makeState({
            hands: [[c('10','♥')], [], [], [], []],
            revealedRedTens: [0],
        });
        const result = playCard(state, 0, [c('10','♥')]);
        expect(result.revealedRedTens.filter(i => i === 0)).toHaveLength(1);
    });

    it('adds player to finishOrder when their hand is emptied', () => {
        const state = makeState({
            hands: [[c('7','♥')], [], [], [], []],
            finishOrder: [],
        });
        const result = playCard(state, 0, [c('7','♥')]);
        expect(result.finishOrder).toContain(0);
    });

    it('preserves passesThisRound when overriding an existing trick', () => {
        const state = makeState({
            hands: [[c('9','♥')], [], [], [], []],
            currentTrick: { type: TRICK_TYPES.SINGLE, value: 7, length: 1, playedBy: 2, cards: [c('7','♦')] },
            passesThisRound: [1, 3],
        });
        const result = playCard(state, 0, [c('9','♥')]);
        expect(result.passesThisRound).toEqual([1, 3]);
    });

    it('resets passesThisRound when starting a fresh trick (no current trick)', () => {
        const state = makeState({
            hands: [[c('7','♥')], [], [], [], []],
            currentTrick: null,
            passesThisRound: [],
        });
        const result = playCard(state, 0, [c('7','♥')]);
        expect(result.passesThisRound).toEqual([]);
    });

    it('does not add player to finishOrder if hand is not empty', () => {
        const state = makeState({
            hands: [[c('7','♥'), c('9','♠')], [], [], [], []],
        });
        const result = playCard(state, 0, [c('7','♥')]);
        expect(result.finishOrder).not.toContain(0);
    });
});

// --- passTurn ---

describe('passTurn', () => {
    it('returns error when it is not the player\'s turn', () => {
        const state = makeState({ activePlayerIndex: 1 });
        expect(passTurn(state, 0).error).toBeDefined();
    });

    it('returns error when there is no current trick (player must lead)', () => {
        const state = makeState({ currentTrick: null });
        expect(passTurn(state, 0).error).toBeDefined();
    });

    it('records the pass and advances to the next player', () => {
        const state = makeState({
            hands: [[c('7','♥')], [c('8','♦')], [c('9','♣')], [c('10','♠')], [c('J','♥')]],
            currentTrick: { type: TRICK_TYPES.SINGLE, value: 12, length: 1, playedBy: 2, cards: [c('Q','♦')] },
        });
        const result = passTurn(state, 0);
        expect(result.passesThisRound).toContain(0);
        expect(result.activePlayerIndex).toBe(1);
    });

    it('resolves trick when all non-leader players have passed', () => {
        const state = makeState({
            hands: [[c('7','♥')], [c('8','♦')], [c('9','♣')], [c('10','♠')], [c('J','♥')]],
            currentTrick: { type: TRICK_TYPES.SINGLE, value: 12, length: 1, playedBy: 0, cards: [c('Q','♣')] },
            passesThisRound: [1, 2, 3],
            activePlayerIndex: 4,
        });
        const result = passTurn(state, 4);
        // Trick resolved: currentTrick cleared, winner (player 0) starts next
        expect(result.currentTrick).toBeNull();
        expect(result.trickStarter).toBe(0);
        expect(result.activePlayerIndex).toBe(0);
    });

    it('skips empty-handed players when determining if trick is resolved', () => {
        // Player 1 has no cards — they can't pass, so the trick should resolve
        // when all players with cards (except the leader) have passed
        const state = makeState({
            hands: [[c('7','♥')], [], [c('9','♣')], [c('10','♠')], [c('J','♥')]],
            currentTrick: { type: TRICK_TYPES.SINGLE, value: 12, length: 1, playedBy: 0, cards: [c('Q','♣')] },
            passesThisRound: [2, 3],
            activePlayerIndex: 4,
        });
        const result = passTurn(state, 4);
        expect(result.currentTrick).toBeNull();
    });
});

// --- resolveTrick ---

describe('resolveTrick', () => {
    it('sets the trick leader as the next active player and trick starter', () => {
        const state = makeState({
            currentTrick: { type: TRICK_TYPES.SINGLE, value: 9, length: 1, playedBy: 3, cards: [c('9','♦')] },
        });
        const result = resolveTrick(state);
        expect(result.trickStarter).toBe(3);
        expect(result.activePlayerIndex).toBe(3);
    });

    it('clears currentTrick', () => {
        const state = makeState({
            currentTrick: { type: TRICK_TYPES.SINGLE, value: 9, length: 1, playedBy: 3, cards: [c('9','♦')] },
        });
        expect(resolveTrick(state).currentTrick).toBeNull();
    });

    it('resets passesThisRound', () => {
        const state = makeState({
            currentTrick: { type: TRICK_TYPES.SINGLE, value: 9, length: 1, playedBy: 3, cards: [c('9','♦')] },
            passesThisRound: [0, 1, 2, 4],
        });
        expect(resolveTrick(state).passesThisRound).toEqual([]);
    });
});

// --- isRoundOver / getRoundResult ---

describe('isRoundOver', () => {
    it('returns false when fewer than 4 players have finished', () => {
        expect(isRoundOver(makeState({ finishOrder: [0, 1, 2] }))).toBe(false);
    });

    it('returns true when 4 players have finished', () => {
        expect(isRoundOver(makeState({ finishOrder: [0, 1, 2, 3] }))).toBe(true);
    });
});

describe('getRoundResult', () => {
    it('returns the correct finish order and loser', () => {
        // Players 2, 0, 1, 3 finished in that order; player 4 still has cards → loser
        const state = makeState({
            finishOrder: [2, 0, 1, 3],
            hands: [[], [], [], [], [c('7','♥')]],
        });
        const { finishOrder, loser } = getRoundResult(state);
        expect(finishOrder).toEqual([2, 0, 1, 3]);
        expect(loser).toBe(4);
    });
});

// --- applyTeamSweep ---

describe('applyTeamSweep', () => {
    it('returns null when no team has fully finished', () => {
        const state = makeState({
            teams: { red: [0, 1], black: [2, 3, 4] },
            finishOrder: [0],
            hands: [[], [c('7','♥')], [c('8','♦')], [c('9','♣')], [c('10','♠')]],
        });
        expect(applyTeamSweep(state)).toBeNull();
    });

    it('returns null when finishOrder is already >= 4 (natural round-over)', () => {
        const state = makeState({
            teams: { red: [0, 1], black: [2, 3, 4] },
            finishOrder: [0, 1, 2, 3],
            hands: [[], [], [], [], [c('7','♥')]],
        });
        expect(applyTeamSweep(state)).toBeNull();
    });

    it('fills in losing team placements when red team sweeps', () => {
        // Red team (0,1) both finished; black team (2,3,4) still playing
        // Player 2: 1 card → 3rd, Player 3: 2 cards → 4th, Player 4: 3 cards → loser
        const state = makeState({
            teams: { red: [0, 1], black: [2, 3, 4] },
            finishOrder: [0, 1],
            hands: [[], [], [c('7','♥')], [c('8','♦'), c('9','♣')], [c('10','♠'), c('J','♥'), c('Q','♦')]],
        });
        const result = applyTeamSweep(state);
        expect(result).not.toBeNull();
        expect(result.finishOrder).toEqual([0, 1, 2, 3]);
    });

    it('orders losing team by card count ascending', () => {
        // Player 3 has fewest cards → placed before player 4
        const state = makeState({
            teams: { red: [0, 1], black: [2, 3, 4] },
            finishOrder: [0, 1],
            hands: [[], [], [c('7','♥'), c('8','♦'), c('9','♣')], [c('10','♠')], [c('J','♥'), c('Q','♦')]],
        });
        const result = applyTeamSweep(state);
        // Player 3: 1 card → 3rd, Player 4: 2 cards → 4th, Player 2: 3 cards → loser
        expect(result.finishOrder).toEqual([0, 1, 3, 4]);
    });

    it('works when black team sweeps', () => {
        const state = makeState({
            teams: { red: [0, 1], black: [2, 3, 4] },
            finishOrder: [2, 3, 4],
            hands: [[c('7','♥'), c('8','♦')], [c('9','♣')], [], [], []],
        });
        const result = applyTeamSweep(state);
        // Player 1: 1 card → 4th, Player 0: 2 cards → loser
        expect(result.finishOrder).toEqual([2, 3, 4, 1]);
    });

    it('isRoundOver returns true after applyTeamSweep fills finishOrder to 4', () => {
        const state = makeState({
            teams: { red: [0, 1], black: [2, 3, 4] },
            finishOrder: [0, 1],
            hands: [[], [], [c('7','♥')], [c('8','♦'), c('9','♣')], [c('10','♠'), c('J','♥'), c('Q','♦')]],
        });
        const swept = applyTeamSweep(state);
        expect(isRoundOver(swept)).toBe(true);
    });
});

// --- skipIneligiblePlayers ---

describe('skipIneligiblePlayers', () => {
    it('returns the same index if the active player is eligible', () => {
        const state = makeState({
            activePlayerIndex: 2,
            hands: [[c('7','♥')], [c('8','♦')], [c('9','♣')], [c('10','♠')], [c('J','♥')]],
            passesThisRound: [],
        });
        expect(skipIneligiblePlayers(state).activePlayerIndex).toBe(2);
    });

    it('skips players with empty hands', () => {
        const state = makeState({
            activePlayerIndex: 0,
            hands: [[], [], [c('9','♣')], [c('10','♠')], [c('J','♥')]],
            passesThisRound: [],
        });
        expect(skipIneligiblePlayers(state).activePlayerIndex).toBe(2);
    });

    it('skips players who already passed', () => {
        const state = makeState({
            activePlayerIndex: 1,
            hands: [[c('7','♥')], [c('8','♦')], [c('9','♣')], [c('10','♠')], [c('J','♥')]],
            passesThisRound: [1, 2],
        });
        expect(skipIneligiblePlayers(state).activePlayerIndex).toBe(3);
    });

    it('wraps around to find eligible player', () => {
        const state = makeState({
            activePlayerIndex: 3,
            hands: [[c('7','♥')], [], [], [], []],
            passesThisRound: [3, 4],
        });
        expect(skipIneligiblePlayers(state).activePlayerIndex).toBe(0);
    });

    it('skips both empty-handed and passed players', () => {
        const state = makeState({
            activePlayerIndex: 0,
            hands: [[], [c('8','♦')], [c('9','♣')], [], [c('J','♥')]],
            passesThisRound: [1],
        });
        expect(skipIneligiblePlayers(state).activePlayerIndex).toBe(2);
    });
});
