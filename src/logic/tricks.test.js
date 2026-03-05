import { describe, it, expect } from 'vitest';
import { classifyTrick, canFollow, beatsTrick, TRICK_TYPES } from './tricks.js';
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

// --- classifyTrick ---

describe('classifyTrick — single', () => {
    it('classifies a single card', () => {
        expect(classifyTrick([c('7', '♥')])).toMatchObject({ type: TRICK_TYPES.SINGLE, value: 7, length: 1 });
    });

    it('classifies a single joker', () => {
        expect(classifyTrick([smallJoker])).toMatchObject({ type: TRICK_TYPES.SINGLE, value: SMALL_JOKER_VALUE, length: 1 });
    });
});

describe('classifyTrick — pair', () => {
    it('classifies a pair of non-10s', () => {
        expect(classifyTrick([c('7', '♥'), c('7', '♠')])).toMatchObject({ type: TRICK_TYPES.PAIR, value: 7, length: 2 });
    });

    it('classifies black 10s as a regular pair', () => {
        expect(classifyTrick([c('10', '♣'), c('10', '♠')])).toMatchObject({ type: TRICK_TYPES.PAIR, value: 10, length: 2 });
    });

    it('does not classify two different values as a pair', () => {
        expect(classifyTrick([c('7', '♥'), c('8', '♠')])).toBeNull();
    });
});

describe('classifyTrick — red ten bomb', () => {
    it('classifies [10♥, 10♦] as red ten bomb', () => {
        expect(classifyTrick([c('10', '♥'), c('10', '♦')])).toMatchObject({ type: TRICK_TYPES.RED_TEN_BOMB });
    });

    it('does not classify [10♥, 10♣] as red ten bomb', () => {
        expect(classifyTrick([c('10', '♥'), c('10', '♣')])).not.toMatchObject({ type: TRICK_TYPES.RED_TEN_BOMB });
    });
});

describe('classifyTrick — joker bomb', () => {
    it('classifies [smallJoker, bigJoker] as joker bomb', () => {
        expect(classifyTrick([smallJoker, bigJoker])).toMatchObject({ type: TRICK_TYPES.JOKER_BOMB });
    });
});

describe('classifyTrick — bomb', () => {
    it('classifies three of a kind as a bomb', () => {
        expect(classifyTrick([c('7','♥'), c('7','♦'), c('7','♣')])).toMatchObject({ type: TRICK_TYPES.BOMB, value: 7, length: 3 });
    });

    it('classifies four of a kind as an atomic bomb', () => {
        expect(classifyTrick([c('7','♥'), c('7','♦'), c('7','♣'), c('7','♠')])).toMatchObject({ type: TRICK_TYPES.ATOMIC_BOMB, value: 7, length: 4 });
    });

    it('does not classify two jokers as a regular bomb', () => {
        expect(classifyTrick([smallJoker, bigJoker])).not.toMatchObject({ type: TRICK_TYPES.BOMB });
    });
});

describe('classifyTrick — straight', () => {
    it('classifies a 3-card straight', () => {
        const result = classifyTrick([c('6','♥'), c('7','♦'), c('8','♣')]);
        expect(result).toMatchObject({ type: TRICK_TYPES.STRAIGHT, value: 8, length: 3 });
    });

    it('classifies a 5-card straight', () => {
        const result = classifyTrick([c('7','♥'), c('8','♦'), c('9','♣'), c('10','♠'), c('J','♥')]);
        expect(result).toMatchObject({ type: TRICK_TYPES.STRAIGHT, value: 11, length: 5 });
    });

    it('does not classify a straight containing a joker', () => {
        expect(classifyTrick([c('6','♥'), c('7','♦'), smallJoker])).toBeNull();
    });

    it('does not classify two cards as a straight', () => {
        expect(classifyTrick([c('6','♥'), c('7','♦')])).toBeNull();
    });

    it('does not classify non-consecutive cards as a straight', () => {
        expect(classifyTrick([c('6','♥'), c('7','♦'), c('9','♣')])).toBeNull();
    });
});

describe('classifyTrick — straight flush', () => {
    it('classifies a same-suit straight as a straight flush', () => {
        const result = classifyTrick([c('6','♥'), c('7','♥'), c('8','♥')]);
        expect(result).toMatchObject({ type: TRICK_TYPES.STRAIGHT_FLUSH, value: 8, length: 3 });
    });

    it('classifies a mixed-suit straight as a plain straight', () => {
        const result = classifyTrick([c('6','♥'), c('7','♦'), c('8','♥')]);
        expect(result).toMatchObject({ type: TRICK_TYPES.STRAIGHT });
    });
});

describe('classifyTrick — tractor', () => {
    it('classifies two consecutive pairs as a tractor', () => {
        const result = classifyTrick([c('6','♥'), c('6','♦'), c('7','♥'), c('7','♦')]);
        expect(result).toMatchObject({ type: TRICK_TYPES.TRACTOR, value: 7, length: 4 });
    });

    it('classifies three consecutive pairs as a tractor', () => {
        const result = classifyTrick([c('6','♥'), c('6','♦'), c('7','♥'), c('7','♦'), c('8','♥'), c('8','♦')]);
        expect(result).toMatchObject({ type: TRICK_TYPES.TRACTOR, value: 8, length: 6 });
    });

    it('does not classify non-consecutive pairs as a tractor', () => {
        expect(classifyTrick([c('6','♥'), c('6','♦'), c('8','♥'), c('8','♦')])).toBeNull();
    });

    it('does not classify a single pair as a tractor', () => {
        expect(classifyTrick([c('6','♥'), c('6','♦')])).not.toMatchObject({ type: TRICK_TYPES.TRACTOR });
    });
});

describe('classifyTrick — wrap-around straights', () => {
    it('[A,2,3] is a straight ending at 3 (value 16)', () => {
        const result = classifyTrick([c('A','♥'), c('2','♦'), c('3','♣')]);
        expect(result).toMatchObject({ type: TRICK_TYPES.STRAIGHT, value: 16, length: 3 });
    });

    it('[2,3,4] is a wrap straight ending at 4 (value 4)', () => {
        const result = classifyTrick([c('2','♥'), c('3','♦'), c('4','♣')]);
        expect(result).toMatchObject({ type: TRICK_TYPES.STRAIGHT, value: 4, length: 3 });
    });

    it('[3,4,5] is a wrap straight ending at 5 (value 5)', () => {
        const result = classifyTrick([c('3','♥'), c('4','♦'), c('5','♣')]);
        expect(result).toMatchObject({ type: TRICK_TYPES.STRAIGHT, value: 5, length: 3 });
    });

    it('[K,A,2,3] is a straight ending at 3 (value 16)', () => {
        const result = classifyTrick([c('K','♥'), c('A','♦'), c('2','♣'), c('3','♠')]);
        expect(result).toMatchObject({ type: TRICK_TYPES.STRAIGHT, value: 16, length: 4 });
    });

    it('[3,4,5] (value 5) is beaten by [4,5,6] (value 6)', () => {
        const wrap = classifyTrick([c('3','♥'), c('4','♦'), c('5','♣')]);
        const normal = classifyTrick([c('4','♥'), c('5','♦'), c('6','♣')]);
        expect(beatsTrick(wrap, normal)).toBe(true);
    });

    it('[A,2,3] (value 16) beats [J,Q,K] (value 13)', () => {
        const high = classifyTrick([c('A','♥'), c('2','♦'), c('3','♣')]);
        const low  = classifyTrick([c('J','♥'), c('Q','♦'), c('K','♣')]);
        expect(beatsTrick(low, high)).toBe(true);
    });

    it('[3,3,4,4] is a wrap tractor ending at 4', () => {
        const result = classifyTrick([c('3','♥'), c('3','♦'), c('4','♣'), c('4','♠')]);
        expect(result).toMatchObject({ type: TRICK_TYPES.TRACTOR, value: 4 });
    });
});

describe('classifyTrick — runaway wrap prevention', () => {
    it('a long valid wrap straight [Q,K,A,2,3,4,5,6] is classified correctly', () => {
        const result = classifyTrick([
            c('Q','♥'), c('K','♦'), c('A','♣'), c('2','♠'),
            c('3','♥'), c('4','♦'), c('5','♣'), c('6','♠'),
        ]);
        expect(result).toMatchObject({ type: TRICK_TYPES.STRAIGHT, value: 6, length: 8 });
    });

    it('a straight with a duplicate value (same rank, different suit) is invalid', () => {
        // [A♥, 2♦, 3♣, 4♠, A♠] — two Aces, cannot be a straight
        expect(classifyTrick([c('A','♥'), c('2','♦'), c('3','♣'), c('4','♠'), c('A','♠')])).toBeNull();
    });

    it('a wrap straight that revisits its starting value is invalid', () => {
        // [2♥, 3♦, 4♣, 5♠, 6♥, 7♦, 8♣, 9♠, 10♥, J♦, Q♣, K♠, A♥, 2♦] — duplicate 2
        expect(classifyTrick([
            c('2','♥'), c('3','♦'), c('4','♣'), c('5','♠'), c('6','♥'),
            c('7','♦'), c('8','♣'), c('9','♠'), c('10','♥'), c('J','♦'),
            c('Q','♣'), c('K','♠'), c('A','♥'), c('2','♦'),
        ])).toBeNull();
    });

    it('[2,2,3,3,4,4] is a valid wrap tractor ending at 4', () => {
        const result = classifyTrick([
            c('2','♥'), c('2','♦'), c('3','♣'), c('3','♠'), c('4','♥'), c('4','♦'),
        ]);
        expect(result).toMatchObject({ type: TRICK_TYPES.TRACTOR, value: 4 });
    });

    it('a tractor with a duplicate pair value is invalid', () => {
        // [A♥,A♦, 2♥,2♦, 3♥,3♦, A♣,A♠] — value 14 (A) appears 4 times, not two consecutive pairs
        expect(classifyTrick([
            c('A','♥'), c('A','♦'), c('2','♥'), c('2','♦'),
            c('3','♥'), c('3','♦'), c('A','♣'), c('A','♠'),
        ])).not.toMatchObject({ type: TRICK_TYPES.TRACTOR });
    });

    it('a wrap tractor that revisits its starting pair is invalid', () => {
        // [2♥,2♦, 3♣,3♠, 4♥,4♦, 5♣,5♠, ..., 2♣,2♠] — duplicate pair of 2s
        expect(classifyTrick([
            c('2','♥'), c('2','♦'), c('3','♣'), c('3','♠'),
            c('4','♥'), c('4','♦'), c('2','♣'), c('2','♠'),
        ])).not.toMatchObject({ type: TRICK_TYPES.TRACTOR });
    });
});

describe('classifyTrick — invalid combinations', () => {
    it('returns null for empty array', () => {
        expect(classifyTrick([])).toBeNull();
    });

    it('returns null for two cards of different values', () => {
        expect(classifyTrick([c('7','♥'), c('8','♠')])).toBeNull();
    });

    it('returns null for 5 cards with no valid trick', () => {
        expect(classifyTrick([c('4','♥'), c('6','♦'), c('8','♣'), c('10','♠'), c('Q','♥')])).toBeNull();
    });
});

// --- canFollow ---

describe('canFollow', () => {
    it('single can follow a single', () => {
        const played    = classifyTrick([c('7','♥')]);
        const candidate = classifyTrick([c('9','♠')]);
        expect(canFollow(played, candidate)).toBe(true);
    });

    it('pair cannot follow a single', () => {
        const played    = classifyTrick([c('7','♥')]);
        const candidate = classifyTrick([c('9','♥'), c('9','♠')]);
        expect(canFollow(played, candidate)).toBe(false);
    });

    it('3-card straight can follow a 3-card straight', () => {
        const played    = classifyTrick([c('6','♥'), c('7','♦'), c('8','♣')]);
        const candidate = classifyTrick([c('7','♥'), c('8','♦'), c('9','♣')]);
        expect(canFollow(played, candidate)).toBe(true);
    });

    it('4-card straight cannot follow a 3-card straight', () => {
        const played    = classifyTrick([c('6','♥'), c('7','♦'), c('8','♣')]);
        const candidate = classifyTrick([c('7','♥'), c('8','♦'), c('9','♣'), c('10','♠')]);
        expect(canFollow(played, candidate)).toBe(false);
    });

    it('straight flush can follow a straight of same length', () => {
        const played    = classifyTrick([c('6','♥'), c('7','♦'), c('8','♣')]);
        const candidate = classifyTrick([c('7','♥'), c('8','♥'), c('9','♥')]);
        expect(canFollow(played, candidate)).toBe(true);
    });

    it('straight can follow a straight flush of same length', () => {
        const played    = classifyTrick([c('6','♥'), c('7','♥'), c('8','♥')]);
        const candidate = classifyTrick([c('7','♦'), c('8','♣'), c('9','♠')]);
        expect(canFollow(played, candidate)).toBe(true);
    });

    it('bomb can follow any non-bomb trick', () => {
        const single = classifyTrick([c('7','♥')]);
        const bomb   = classifyTrick([c('8','♥'), c('8','♦'), c('8','♣')]);
        expect(canFollow(single, bomb)).toBe(true);
    });

    it('bomb can follow a bomb', () => {
        const bomb1 = classifyTrick([c('7','♥'), c('7','♦'), c('7','♣')]);
        const bomb2 = classifyTrick([c('8','♥'), c('8','♦'), c('8','♣')]);
        expect(canFollow(bomb1, bomb2)).toBe(true);
    });
});

// --- beatsTrick ---

describe('beatsTrick — non-bombs', () => {
    it('higher single beats lower single', () => {
        const low  = classifyTrick([c('7','♥')]);
        const high = classifyTrick([c('9','♠')]);
        expect(beatsTrick(low, high)).toBe(true);
        expect(beatsTrick(high, low)).toBe(false);
    });

    it('equal single does not beat', () => {
        const a = classifyTrick([c('7','♥')]);
        const b = classifyTrick([c('7','♠')]);
        expect(beatsTrick(a, b)).toBe(false);
    });

    it('higher pair beats lower pair', () => {
        const low  = classifyTrick([c('6','♥'), c('6','♠')]);
        const high = classifyTrick([c('9','♥'), c('9','♠')]);
        expect(beatsTrick(low, high)).toBe(true);
    });

    it('straight flush beats non-flush straight of same ending value', () => {
        const nonFlush = classifyTrick([c('6','♥'), c('7','♦'), c('8','♣')]);
        const flush    = classifyTrick([c('6','♠'), c('7','♠'), c('8','♠')]);
        expect(beatsTrick(nonFlush, flush)).toBe(true);
    });

    it('non-flush straight does not beat straight flush of same ending value', () => {
        const flush    = classifyTrick([c('6','♠'), c('7','♠'), c('8','♠')]);
        const nonFlush = classifyTrick([c('6','♥'), c('7','♦'), c('8','♣')]);
        expect(beatsTrick(flush, nonFlush)).toBe(false);
    });

    it('non-flush straight with higher value beats straight flush with lower value', () => {
        const flush    = classifyTrick([c('6','♠'), c('7','♠'), c('8','♠')]);
        const nonFlush = classifyTrick([c('7','♥'), c('8','♦'), c('9','♣')]);
        expect(beatsTrick(flush, nonFlush)).toBe(true);
    });
});

describe('beatsTrick — bombs', () => {
    it('bomb beats a non-bomb single', () => {
        const single = classifyTrick([c('A','♥')]);
        const bomb   = classifyTrick([c('4','♥'), c('4','♦'), c('4','♣')]);
        expect(beatsTrick(single, bomb)).toBe(true);
    });

    it('non-bomb does not beat a bomb', () => {
        const bomb   = classifyTrick([c('4','♥'), c('4','♦'), c('4','♣')]);
        const single = classifyTrick([c('A','♥')]);
        expect(beatsTrick(bomb, single)).toBe(false);
    });

    it('higher value bomb beats lower value bomb', () => {
        const low  = classifyTrick([c('7','♥'), c('7','♦'), c('7','♣')]);
        const high = classifyTrick([c('8','♥'), c('8','♦'), c('8','♣')]);
        expect(beatsTrick(low, high)).toBe(true);
    });

    it('atomic bomb beats a regular bomb of higher value', () => {
        const bomb   = classifyTrick([c('A','♥'), c('A','♦'), c('A','♣')]);
        const atomic = classifyTrick([c('4','♥'), c('4','♦'), c('4','♣'), c('4','♠')]);
        expect(beatsTrick(bomb, atomic)).toBe(true);
    });

    it('joker bomb beats an atomic bomb', () => {
        const atomic = classifyTrick([c('A','♥'), c('A','♦'), c('A','♣'), c('A','♠')]);
        const joker  = classifyTrick([smallJoker, bigJoker]);
        expect(beatsTrick(atomic, joker)).toBe(true);
    });

    it('red ten bomb beats a joker bomb', () => {
        const joker  = classifyTrick([smallJoker, bigJoker]);
        const redTen = classifyTrick([c('10','♥'), c('10','♦')]);
        expect(beatsTrick(joker, redTen)).toBe(true);
    });

    it('nothing beats a red ten bomb', () => {
        const redTen = classifyTrick([c('10','♥'), c('10','♦')]);
        const joker  = classifyTrick([smallJoker, bigJoker]);
        expect(beatsTrick(redTen, joker)).toBe(false);
        expect(beatsTrick(redTen, redTen)).toBe(false);
    });
});
