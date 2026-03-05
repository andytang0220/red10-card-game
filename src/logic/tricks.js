import { isRedTen, BIG_JOKER_VALUE, SMALL_JOKER_VALUE } from './cards.js';

export const TRICK_TYPES = {
    SINGLE:        'single',
    PAIR:          'pair',
    STRAIGHT:      'straight',
    STRAIGHT_FLUSH:'straight_flush',
    TRACTOR:       'tractor',
    BOMB:          'bomb',
    ATOMIC_BOMB:   'atomic_bomb',
    JOKER_BOMB:    'joker_bomb',
    RED_TEN_BOMB:  'red_ten_bomb',
};

const STRAIGHT_TYPES = [TRICK_TYPES.STRAIGHT, TRICK_TYPES.STRAIGHT_FLUSH];
const BOMB_TYPES = [TRICK_TYPES.BOMB, TRICK_TYPES.ATOMIC_BOMB, TRICK_TYPES.JOKER_BOMB, TRICK_TYPES.RED_TEN_BOMB];

// Cycle length of the non-joker card sequence (4 through 3 = 13 ranks)
const CYCLE = 13;

function isBombType(type) {
    return BOMB_TYPES.includes(type);
}

// Rank bombs for comparison: higher = stronger
function bombRank(classified) {
    switch (classified.type) {
        case TRICK_TYPES.RED_TEN_BOMB:  return 4;
        case TRICK_TYPES.JOKER_BOMB:    return 3;
        case TRICK_TYPES.ATOMIC_BOMB:   return 2;
        case TRICK_TYPES.BOMB:          return 1;
        default:                        return 0;
    }
}

// Returns { endValue, isFlush } if cards form a valid straight, otherwise null.
// Handles wrap-around (e.g. [A,2,3,4], [2,3,4], [Q,K,A,2,3]).
// endValue = the value of the last card in sequential order.
function getStraightInfo(cards) {
    if (cards.length < 3) return null;
    if (cards.some(c => c.isJoker)) return null;

    const sorted = [...cards].sort((a, b) => a.value - b.value);
    const values = sorted.map(c => c.value);

    // Duplicate values mean it's not a straight (could be a tractor)
    for (let i = 1; i < values.length; i++) {
        if (values[i] === values[i - 1]) return null;
    }

    let endValue = null;

    // Try each split point. split=0 = no wrap; split=k means values[k..] come first,
    // then values[0..k-1] shifted up by CYCLE.
    for (let split = 0; split < values.length; split++) {
        const rotated = [
            ...values.slice(split),
            ...values.slice(0, split).map(v => v + CYCLE),
        ];

        let consecutive = true;
        for (let i = 1; i < rotated.length; i++) {
            if (rotated[i] - rotated[i - 1] !== 1) { consecutive = false; break; }
        }

        if (consecutive) {
            // The "end" is the last card in sequential order:
            // split=0 → highest value; split>0 → values[split-1] (the last of the wrapped portion)
            endValue = split === 0 ? values[values.length - 1] : values[split - 1];
            break;
        }
    }

    if (endValue === null) return null;

    const isFlush = cards.every(c => c.suit === cards[0].suit);
    return { endValue, isFlush };
}

// Returns { endValue } if cards form a valid tractor, otherwise null.
// A tractor is a straight of pairs: every value appears exactly twice,
// the distinct values are consecutive (wrap allowed), minimum 2 pairs.
function getTractorInfo(cards) {
    if (cards.length < 4 || cards.length % 2 !== 0) return null;
    if (cards.some(c => c.isJoker)) return null;

    const valueCounts = {};
    for (const card of cards) {
        valueCounts[card.value] = (valueCounts[card.value] || 0) + 1;
    }

    const distinctValues = Object.keys(valueCounts).map(Number).sort((a, b) => a - b);

    if (distinctValues.some(v => valueCounts[v] !== 2)) return null;
    if (distinctValues.length < 2) return null;

    // Check that the distinct values form a consecutive sequence (possibly wrapped)
    let endValue = null;

    for (let split = 0; split < distinctValues.length; split++) {
        const rotated = [
            ...distinctValues.slice(split),
            ...distinctValues.slice(0, split).map(v => v + CYCLE),
        ];

        let consecutive = true;
        for (let i = 1; i < rotated.length; i++) {
            if (rotated[i] - rotated[i - 1] !== 1) { consecutive = false; break; }
        }

        if (consecutive) {
            endValue = split === 0 ? distinctValues[distinctValues.length - 1] : distinctValues[split - 1];
            break;
        }
    }

    if (endValue === null) return null;
    return { endValue };
}

// Classifies a set of cards as a trick.
// Returns { type, value, length } or null if the cards don't form a valid trick.
// 'value' is used for comparison: ending card value for straights/tractors,
// card value for singles/pairs/bombs.
export function classifyTrick(cards) {
    if (!cards || cards.length === 0) return null;

    // --- Special bombs (checked first, before generic bomb logic) ---

    // Red ten bomb: exactly [10♥, 10♦]
    if (cards.length === 2 && cards.every(c => isRedTen(c))) {
        return { type: TRICK_TYPES.RED_TEN_BOMB, value: BIG_JOKER_VALUE + 2, length: 2 };
    }

    // Joker bomb: exactly [small joker, big joker]
    if (cards.length === 2 && cards.every(c => c.isJoker)) {
        return { type: TRICK_TYPES.JOKER_BOMB, value: BIG_JOKER_VALUE + 1, length: 2 };
    }

    // --- Regular bombs ---

    const allSameValue = cards.every(c => c.value === cards[0].value);

    if (cards.length >= 3 && allSameValue && !cards[0].isJoker) {
        if (cards.length === 4) {
            return { type: TRICK_TYPES.ATOMIC_BOMB, value: cards[0].value, length: 4 };
        }
        return { type: TRICK_TYPES.BOMB, value: cards[0].value, length: cards.length };
    }

    // --- Single ---
    if (cards.length === 1) {
        return { type: TRICK_TYPES.SINGLE, value: cards[0].value, length: 1 };
    }

    // --- Pair ---
    if (cards.length === 2 && cards[0].value === cards[1].value && !cards[0].isJoker) {
        return { type: TRICK_TYPES.PAIR, value: cards[0].value, length: 2 };
    }

    // --- Tractor (checked before straight to avoid misclassifying [6,6,7,7] as anything else) ---
    const tractorInfo = getTractorInfo(cards);
    if (tractorInfo) {
        return { type: TRICK_TYPES.TRACTOR, value: tractorInfo.endValue, length: cards.length };
    }

    // --- Straight / Straight flush ---
    const straightInfo = getStraightInfo(cards);
    if (straightInfo) {
        const type = straightInfo.isFlush ? TRICK_TYPES.STRAIGHT_FLUSH : TRICK_TYPES.STRAIGHT;
        return { type, value: straightInfo.endValue, length: cards.length };
    }

    return null;
}

// Returns true if candidate is a legal trick type to play in response to played.
// Does NOT check whether candidate actually beats played — use beatsTrick for that.
// Bombs can always be played in response to any trick.
export function canFollow(played, candidate) {
    if (!played || !candidate) return false;

    // Bombs can always be played
    if (isBombType(candidate.type)) return true;

    // STRAIGHT and STRAIGHT_FLUSH are interchangeable in terms of following
    if (STRAIGHT_TYPES.includes(played.type) && STRAIGHT_TYPES.includes(candidate.type)) {
        return candidate.length === played.length;
    }

    return candidate.type === played.type && candidate.length === played.length;
}

// Returns true if challenger beats current.
export function beatsTrick(current, challenger) {
    const currentIsBomb = isBombType(current.type);
    const challengerIsBomb = isBombType(challenger.type);

    // Bomb always beats non-bomb
    if (challengerIsBomb && !currentIsBomb) return true;
    if (!challengerIsBomb && currentIsBomb) return false;

    // Both bombs: compare by tier first, then by value/count within tier
    if (currentIsBomb && challengerIsBomb) {
        const curRank = bombRank(current);
        const chalRank = bombRank(challenger);
        if (chalRank !== curRank) return chalRank > curRank;

        // Same tier
        if (current.type === TRICK_TYPES.BOMB) {
            // Higher count beats lower count; same count → higher value wins
            if (challenger.length !== current.length) return challenger.length > current.length;
            return challenger.value > current.value;
        }
        if (current.type === TRICK_TYPES.ATOMIC_BOMB) {
            return challenger.value > current.value;
        }
        // JOKER_BOMB vs JOKER_BOMB or RED_TEN_BOMB vs RED_TEN_BOMB: only one of each → can't beat
        return false;
    }

    // Both non-bombs
    // Straight flush beats a non-flush straight of the same or lower ending value
    if (STRAIGHT_TYPES.includes(current.type) && STRAIGHT_TYPES.includes(challenger.type)) {
        if (current.type === TRICK_TYPES.STRAIGHT && challenger.type === TRICK_TYPES.STRAIGHT_FLUSH) {
            return challenger.value >= current.value;
        }
        if (current.type === TRICK_TYPES.STRAIGHT_FLUSH && challenger.type === TRICK_TYPES.STRAIGHT) {
            return challenger.value > current.value;
        }
    }

    return challenger.value > current.value;
}
