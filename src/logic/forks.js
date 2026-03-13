import { classifyTrick, TRICK_TYPES } from './tricks.js';
import { isRedTen } from './cards.js';

const PLAYER_COUNT = 5;

// Returns the first player in rotation from startFrom (inclusive) up to but
// not including stopBefore who can fork the current single trick, or null.
export function findForkCandidate(hands, currentTrick, startFrom, stopBefore) {
    let idx = startFrom;
    while (idx !== stopBefore) {
        if (hands[idx].length > 0 && canFork(hands[idx], currentTrick) !== null) {
            return idx;
        }
        idx = (idx + 1) % PLAYER_COUNT;
    }
    return null;
}

// Returns the first player in rotation from startFrom (inclusive) up to but
// not including stopBefore who holds the last card of forkValue, or null.
export function findDrawbackCandidate(hands, forkValue, startFrom, stopBefore) {
    let idx = startFrom;
    while (idx !== stopBefore) {
        if (hands[idx].length > 0 && canDrawback(hands[idx], forkValue) !== null) {
            return idx;
        }
        idx = (idx + 1) % PLAYER_COUNT;
    }
    return null;
}

// Returns a pair of cards from hand that can fork the current single trick, or null.
// A fork is only valid during a SINGLE trick.
// The returned pair must classify as PAIR — not a special bomb (e.g. [10♥,10♦] is a
// RED_TEN_BOMB and cannot be used as a fork).
// Joker singles cannot be forked: smallJoker(17) and bigJoker(18) have different values,
// so no same-value joker pair exists.
export function canFork(hand, currentTrick) {
    if (!currentTrick || currentTrick.type !== TRICK_TYPES.SINGLE) return null;

    const targetValue = currentTrick.value;
    const matching = hand.filter(c => c.value === targetValue);

    for (let i = 0; i < matching.length; i++) {
        for (let j = i + 1; j < matching.length; j++) {
            const candidate = [matching[i], matching[j]];
            const classified = classifyTrick(candidate);
            if (classified && classified.type === TRICK_TYPES.PAIR) {
                return candidate;
            }
        }
    }

    return null;
}

// Returns the single remaining card of the forked value from hand, or null.
// After a fork (pair played), 3 cards of that value are in play; at most 1 can remain.
export function canDrawback(hand, forkedValue) {
    return hand.find(c => c.value === forkedValue) ?? null;
}

// Applies a fork to game state. Returns updated state with:
// - forkCards removed from the forking player's hand
// - currentTrick replaced by the fork pair
// - activePlayerIndex set to the forking player
// - passesThisRound reset (the pair trick is a fresh start)
// - forkWindow.stage advanced to 'drawback'
export function applyFork(gameState, forkingPlayerIndex, forkCards) {
    const newHands = gameState.hands.map((hand, i) =>
        i === forkingPlayerIndex
            ? hand.filter(c => !forkCards.some(fc => fc.id === c.id))
            : hand
    );

    const playedRedTen = forkCards.some(c => isRedTen(c));
    const newRevealedRedTens = playedRedTen && !gameState.revealedRedTens.includes(forkingPlayerIndex)
        ? [...gameState.revealedRedTens, forkingPlayerIndex]
        : gameState.revealedRedTens;

    return {
        ...gameState,
        hands: newHands,
        revealedRedTens: newRevealedRedTens,
        currentTrick: {
            type: TRICK_TYPES.PAIR,
            value: forkCards[0].value,
            length: 2,
            playedBy: forkingPlayerIndex,
            cards: forkCards,
        },
        activePlayerIndex: forkingPlayerIndex,
        passesThisRound: [],
        forkWindow: {
            ...gameState.forkWindow,
            stage: 'drawback',
        },
    };
}

// Applies a drawback to game state. Returns updated state with:
// - drawbackCard removed from the drawback player's hand
// - currentTrick cleared (trick ends immediately)
// - trickStarter and activePlayerIndex set to the drawback player
// - forkWindow cleared
// - passesThisRound reset
export function applyDrawback(gameState, drawbackPlayerIndex, drawbackCard) {
    const newHands = gameState.hands.map((hand, i) =>
        i === drawbackPlayerIndex
            ? hand.filter(c => c.id !== drawbackCard.id)
            : hand
    );

    const playedRedTen = isRedTen(drawbackCard);
    const newRevealedRedTens = playedRedTen && !gameState.revealedRedTens.includes(drawbackPlayerIndex)
        ? [...gameState.revealedRedTens, drawbackPlayerIndex]
        : gameState.revealedRedTens;

    return {
        ...gameState,
        hands: newHands,
        revealedRedTens: newRevealedRedTens,
        currentTrick: null,
        trickStarter: drawbackPlayerIndex,
        activePlayerIndex: drawbackPlayerIndex,
        passesThisRound: [],
        forkWindow: null,
    };
}
