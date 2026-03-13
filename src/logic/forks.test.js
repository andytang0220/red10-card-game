import { describe, it, expect } from 'vitest';
import { canFork, canDrawback, applyFork, applyDrawback, findForkCandidate, findDrawbackCandidate } from './forks.js';
import { TRICK_TYPES } from './tricks.js';
import { SMALL_JOKER_VALUE, BIG_JOKER_VALUE } from './cards.js';

// --- Helpers ---
const c = (rank, suit) => ({
    id: `${rank}-${suit}`,
    rank,
    suit,
    value: { '4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14,'2':15,'3':16 }[rank],
    isJoker: false,
});
const smallJoker = { id: 'joker-small', rank: 'Jkr', suit: null, value: SMALL_JOKER_VALUE, isJoker: true };
const bigJoker   = { id: 'joker-big',   rank: 'Jkr', suit: null, value: BIG_JOKER_VALUE,   isJoker: true };

const single = (card) => ({ type: TRICK_TYPES.SINGLE, value: card.value, length: 1, cards: [card], playedBy: 0 });
const pair   = (v)    => ({ type: TRICK_TYPES.PAIR,   value: v,          length: 2 });

const makeGameState = (overrides = {}) => ({
    hands: [[], [], [], [], []],
    activePlayerIndex: 0,
    trickStarter: 0,
    currentTrick: null,
    passesThisRound: [],
    forkWindow: { value: 7, pendingPlayerIndex: 1, stage: 'fork' },
    ...overrides,
});

// --- canFork ---

describe('canFork', () => {
    it('returns a pair when player has two cards of matching value', () => {
        const hand = [c('7','♥'), c('7','♠'), c('9','♦')];
        const trick = single(c('7','♣'));
        const result = canFork(hand, trick);
        expect(result).toHaveLength(2);
        expect(result.every(card => card.value === 7)).toBe(true);
    });

    it('returns null when player has only one card of matching value', () => {
        const hand = [c('7','♥'), c('9','♦')];
        const trick = single(c('7','♣'));
        expect(canFork(hand, trick)).toBeNull();
    });

    it('returns null when player has no cards of matching value', () => {
        const hand = [c('8','♥'), c('9','♦')];
        const trick = single(c('7','♣'));
        expect(canFork(hand, trick)).toBeNull();
    });

    it('returns null when the current trick is not a single', () => {
        const hand = [c('7','♥'), c('7','♠')];
        const trick = pair(7);
        expect(canFork(hand, trick)).toBeNull();
    });

    it('returns null when the current trick is null', () => {
        const hand = [c('7','♥'), c('7','♠')];
        expect(canFork(hand, null)).toBeNull();
    });

    it('returns null for a joker single — no same-value joker pair exists', () => {
        const hand = [smallJoker, bigJoker];
        const trick = single(smallJoker);
        // smallJoker(17) and bigJoker(18) have different values — no valid pair
        expect(canFork(hand, trick)).toBeNull();
    });

    it('does not return [10♥,10♦] as a fork — that is a red ten bomb', () => {
        const hand = [c('10','♥'), c('10','♦')];
        const trick = single(c('10','♣'));
        // [10♥,10♦] classifies as RED_TEN_BOMB, not PAIR — cannot be a fork
        expect(canFork(hand, trick)).toBeNull();
    });

    it('returns [10♣,10♠] as a valid fork on a single 10', () => {
        const hand = [c('10','♣'), c('10','♠')];
        const trick = single(c('10','♥'));
        const result = canFork(hand, trick);
        expect(result).not.toBeNull();
        expect(result.every(card => card.value === 10)).toBe(true);
    });
});

// --- canDrawback ---

describe('canDrawback', () => {
    it('returns the card when player holds the last card of the forked value', () => {
        const hand = [c('7','♦'), c('9','♠')];
        expect(canDrawback(hand, 7)).toMatchObject({ value: 7 });
    });

    it('returns null when player has no card of the forked value', () => {
        const hand = [c('8','♥'), c('9','♠')];
        expect(canDrawback(hand, 7)).toBeNull();
    });

    it('returns null for an empty hand', () => {
        expect(canDrawback([], 7)).toBeNull();
    });
});

// --- applyFork ---

describe('applyFork', () => {
    it('removes fork cards from the forking player\'s hand', () => {
        const forkCards = [c('7','♥'), c('7','♠')];
        const state = makeGameState({
            hands: [
                [c('7','♥'), c('7','♠'), c('9','♦')], // player 0 forks
                [c('4','♥')],
                [], [], [],
            ],
        });
        const result = applyFork(state, 0, forkCards);
        expect(result.hands[0]).toHaveLength(1);
        expect(result.hands[0][0].rank).toBe('9');
    });

    it('does not modify other players\' hands', () => {
        const forkCards = [c('7','♥'), c('7','♠')];
        const state = makeGameState({
            hands: [[c('7','♥'), c('7','♠')], [c('4','♥')], [], [], []],
        });
        const result = applyFork(state, 0, forkCards);
        expect(result.hands[1]).toHaveLength(1);
    });

    it('sets currentTrick to the fork pair', () => {
        const forkCards = [c('7','♥'), c('7','♠')];
        const state = makeGameState({ hands: [[c('7','♥'), c('7','♠')], [], [], [], []] });
        const result = applyFork(state, 0, forkCards);
        expect(result.currentTrick.type).toBe(TRICK_TYPES.PAIR);
        expect(result.currentTrick.value).toBe(7);
        expect(result.currentTrick.playedBy).toBe(0);
    });

    it('sets activePlayerIndex to the forking player', () => {
        const forkCards = [c('7','♥'), c('7','♠')];
        const state = makeGameState({ hands: [[c('7','♥'), c('7','♠')], [], [], [], []] });
        const result = applyFork(state, 0, forkCards);
        expect(result.activePlayerIndex).toBe(0);
    });

    it('resets passesThisRound', () => {
        const forkCards = [c('7','♥'), c('7','♠')];
        const state = makeGameState({
            hands: [[c('7','♥'), c('7','♠')], [], [], [], []],
            passesThisRound: [1, 2],
        });
        const result = applyFork(state, 0, forkCards);
        expect(result.passesThisRound).toEqual([]);
    });

    it('advances forkWindow stage to drawback', () => {
        const forkCards = [c('7','♥'), c('7','♠')];
        const state = makeGameState({ hands: [[c('7','♥'), c('7','♠')], [], [], [], []] });
        const result = applyFork(state, 0, forkCards);
        expect(result.forkWindow.stage).toBe('drawback');
    });

    it('adds forking player to revealedRedTens when a fork card is a red 10', () => {
        // [10♣, 10♥] is a valid fork pair (classifies as PAIR, not RED_TEN_BOMB)
        const forkCards = [c('10','♣'), c('10','♥')];
        const state = makeGameState({
            hands: [[c('10','♣'), c('10','♥')], [], [], [], []],
            revealedRedTens: [],
        });
        const result = applyFork(state, 0, forkCards);
        expect(result.revealedRedTens).toContain(0);
    });

    it('does not duplicate revealedRedTens if forking player already revealed', () => {
        const forkCards = [c('10','♣'), c('10','♥')];
        const state = makeGameState({
            hands: [[c('10','♣'), c('10','♥')], [], [], [], []],
            revealedRedTens: [0],
        });
        const result = applyFork(state, 0, forkCards);
        expect(result.revealedRedTens.filter(i => i === 0)).toHaveLength(1);
    });

    it('does not add to revealedRedTens when no fork card is a red 10', () => {
        const forkCards = [c('7','♥'), c('7','♠')];
        const state = makeGameState({
            hands: [[c('7','♥'), c('7','♠')], [], [], [], []],
            revealedRedTens: [],
        });
        const result = applyFork(state, 0, forkCards);
        expect(result.revealedRedTens).toEqual([]);
    });
});

// --- applyDrawback ---

describe('applyDrawback', () => {
    it('removes the drawback card from the drawback player\'s hand', () => {
        const drawbackCard = c('7','♦');
        const state = makeGameState({
            hands: [[], [], [c('7','♦'), c('9','♠')], [], []],
        });
        const result = applyDrawback(state, 2, drawbackCard);
        expect(result.hands[2]).toHaveLength(1);
        expect(result.hands[2][0].rank).toBe('9');
    });

    it('clears currentTrick', () => {
        const state = makeGameState({
            hands: [[], [], [c('7','♦')], [], []],
            currentTrick: { type: TRICK_TYPES.PAIR, value: 7, playedBy: 1 },
        });
        const result = applyDrawback(state, 2, c('7','♦'));
        expect(result.currentTrick).toBeNull();
    });

    it('sets trickStarter and activePlayerIndex to the drawback player', () => {
        const state = makeGameState({ hands: [[], [], [c('7','♦')], [], []] });
        const result = applyDrawback(state, 2, c('7','♦'));
        expect(result.trickStarter).toBe(2);
        expect(result.activePlayerIndex).toBe(2);
    });

    it('clears forkWindow', () => {
        const state = makeGameState({ hands: [[], [], [c('7','♦')], [], []] });
        const result = applyDrawback(state, 2, c('7','♦'));
        expect(result.forkWindow).toBeNull();
    });

    it('resets passesThisRound', () => {
        const state = makeGameState({
            hands: [[], [], [c('7','♦')], [], []],
            passesThisRound: [0, 1],
        });
        const result = applyDrawback(state, 2, c('7','♦'));
        expect(result.passesThisRound).toEqual([]);
    });

    it('adds drawback player to revealedRedTens when the drawback card is a red 10', () => {
        const state = makeGameState({
            hands: [[], [], [c('10','♦')], [], []],
            revealedRedTens: [],
        });
        const result = applyDrawback(state, 2, c('10','♦'));
        expect(result.revealedRedTens).toContain(2);
    });

    it('does not duplicate revealedRedTens if drawback player already revealed', () => {
        const state = makeGameState({
            hands: [[], [], [c('10','♥')], [], []],
            revealedRedTens: [2],
        });
        const result = applyDrawback(state, 2, c('10','♥'));
        expect(result.revealedRedTens.filter(i => i === 2)).toHaveLength(1);
    });

    it('does not add to revealedRedTens when drawback card is not a red 10', () => {
        const state = makeGameState({
            hands: [[], [], [c('7','♦')], [], []],
            revealedRedTens: [],
        });
        const result = applyDrawback(state, 2, c('7','♦'));
        expect(result.revealedRedTens).toEqual([]);
    });
});

// --- findForkCandidate ---

describe('findForkCandidate', () => {
    it('returns the first player who can fork', () => {
        const trick = single(c('7','♣'));
        const hands = [
            [],                                      // player 0: empty
            [c('7','♥'), c('7','♠'), c('9','♦')],   // player 1: can fork
            [c('8','♥')],                            // player 2: no match
            [], [],
        ];
        expect(findForkCandidate(hands, trick, 0, 4)).toBe(1);
    });

    it('returns null when no player can fork', () => {
        const trick = single(c('7','♣'));
        const hands = [
            [c('8','♥')],
            [c('9','♠')],
            [c('10','♦')],
            [c('J','♣')],
            [c('Q','♥')],
        ];
        expect(findForkCandidate(hands, trick, 0, 0)).toBeNull();
    });

    it('wraps around player indices', () => {
        const trick = single(c('7','♣'));
        const hands = [
            [c('7','♥'), c('7','♠')],   // player 0: can fork
            [c('8','♥')],
            [], [], [],
        ];
        // Start from player 3, stop before player 2 — should wrap and find player 0
        expect(findForkCandidate(hands, trick, 3, 2)).toBe(0);
    });

    it('skips players with empty hands', () => {
        const trick = single(c('7','♣'));
        const hands = [
            [],                                      // empty
            [],                                      // empty
            [c('7','♥'), c('7','♠')],                // can fork
            [], [],
        ];
        expect(findForkCandidate(hands, trick, 0, 4)).toBe(2);
    });

    it('returns null when startFrom equals stopBefore', () => {
        const trick = single(c('7','♣'));
        const hands = [[c('7','♥'), c('7','♠')], [], [], [], []];
        // Searching from 0 to 0 means no players to check
        expect(findForkCandidate(hands, trick, 0, 0)).toBeNull();
    });
});

// --- findDrawbackCandidate ---

describe('findDrawbackCandidate', () => {
    it('returns the first player holding the forked value', () => {
        const hands = [
            [],
            [c('8','♥')],
            [c('7','♦'), c('9','♠')],   // player 2: has the 7
            [], [],
        ];
        expect(findDrawbackCandidate(hands, 7, 0, 4)).toBe(2);
    });

    it('returns null when no player holds the forked value', () => {
        const hands = [
            [c('8','♥')],
            [c('9','♠')],
            [c('10','♦')],
            [c('J','♣')],
            [c('Q','♥')],
        ];
        expect(findDrawbackCandidate(hands, 7, 0, 0)).toBeNull();
    });

    it('wraps around player indices', () => {
        const hands = [
            [c('7','♣')],   // player 0: has the 7
            [c('8','♥')],
            [], [], [],
        ];
        expect(findDrawbackCandidate(hands, 7, 3, 2)).toBe(0);
    });

    it('skips players with empty hands', () => {
        const hands = [
            [],
            [],
            [c('7','♦')],
            [], [],
        ];
        expect(findDrawbackCandidate(hands, 7, 0, 4)).toBe(2);
    });

    it('returns null when startFrom equals stopBefore', () => {
        const hands = [[c('7','♥')], [], [], [], []];
        expect(findDrawbackCandidate(hands, 7, 0, 0)).toBeNull();
    });
});
