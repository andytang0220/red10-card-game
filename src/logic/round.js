import { createDeck, shuffle, isRedTen } from './cards.js';
import { classifyTrick, canFollow, beatsTrick } from './tricks.js';

const PLAYER_COUNT = 5;

// Deals a shuffled 54-card deck evenly to 5 players.
// 54 / 5 = 10 remainder 4, so the first 4 players get 11 cards and the last gets 10.
// Returns { hands: Card[][], starterIndex: number } where starterIndex is the player
// holding the 4♥ (they play first).
export function dealCards() {
    const deck = shuffle(createDeck());
    const hands = [[], [], [], [], []];
    const offset = Math.floor(Math.random() * PLAYER_COUNT);

    for (let i = 0; i < deck.length; i++) {
        hands[(i + offset) % PLAYER_COUNT].push(deck[i]);
    }

    const starterIndex = hands.findIndex(hand => hand.some(c => c.rank === '4' && c.suit === '♥'));

    return { hands, starterIndex };
}

// Returns an array of player indices who hold a red 10.
export function findRedTenHolders(hands) {
    return hands.reduce((holders, hand, i) => {
        if (hand.some(c => isRedTen(c))) holders.push(i);
        return holders;
    }, []);
}

// Returns the index of the next player in rotation.
export function getNextPlayerIndex(current) {
    return (current + 1) % PLAYER_COUNT;
}

// Attempts to play cards for a player. Returns updated game state on success,
// or { error: string } if the play is invalid.
export function playCard(gameState, playerIndex, cards) {
    if (playerIndex !== gameState.activePlayerIndex) {
        return { error: 'It is not your turn.' };
    }

    const classified = classifyTrick(cards);
    if (!classified) {
        return { error: 'Selected cards do not form a valid trick.' };
    }

    // First play of the trick — anything goes
    if (!gameState.currentTrick) {
        return applyPlay(gameState, playerIndex, cards, classified);
    }

    // Must be able to follow the current trick type
    if (!canFollow(gameState.currentTrick, classified)) {
        return { error: 'Your play must match the trick type and length.' };
    }

    // Must beat the current trick
    if (!beatsTrick(gameState.currentTrick, classified)) {
        return { error: 'Your play must beat the current trick.' };
    }

    return applyPlay(gameState, playerIndex, cards, classified);
}

function applyPlay(gameState, playerIndex, cards, classified) {
    const newHands = gameState.hands.map((hand, i) =>
        i === playerIndex
            ? hand.filter(c => !cards.some(played => played.id === c.id))
            : hand
    );

    // Reveal team membership if a red 10 was played
    const playedRedTen = cards.some(c => isRedTen(c));
    const newRevealedRedTens = playedRedTen && !gameState.revealedRedTens.includes(playerIndex)
        ? [...gameState.revealedRedTens, playerIndex]
        : gameState.revealedRedTens;

    // Track finish order if this play empties the player's hand
    const newFinishOrder = newHands[playerIndex].length === 0 && !gameState.finishOrder.includes(playerIndex)
        ? [...gameState.finishOrder, playerIndex]
        : gameState.finishOrder;

    return {
        ...gameState,
        hands: newHands,
        revealedRedTens: newRevealedRedTens,
        finishOrder: newFinishOrder,
        currentTrick: {
            ...classified,
            playedBy: playerIndex,
            cards,
        },
        // Preserve passes when overriding an existing trick; only reset when starting fresh.
        // (resolveTrick always resets passesThisRound, so on a fresh lead it will already be [].)
        passesThisRound: gameState.currentTrick ? gameState.passesThisRound : [],
        activePlayerIndex: getNextPlayerIndex(playerIndex),
    };
}

// Records a pass for a player and advances to the next player.
// If all other active players have passed, resolves the trick.
export function passTurn(gameState, playerIndex) {
    if (playerIndex !== gameState.activePlayerIndex) {
        return { error: 'It is not your turn.' };
    }
    if (!gameState.currentTrick) {
        return { error: 'You must play a card to start the trick.' };
    }

    const newPasses = [...gameState.passesThisRound, playerIndex];

    // Count players who still have cards (excluding the trick winner candidate)
    const activePlayers = gameState.hands
        .map((hand, i) => i)
        .filter(i => gameState.hands[i].length > 0);

    // Trick resolves when everyone except the current trick leader has passed
    const trickLeader = gameState.currentTrick?.playedBy;
    const nonLeaderActive = activePlayers.filter(i => i !== trickLeader);
    const allPassed = nonLeaderActive.every(i => newPasses.includes(i));

    if (allPassed) {
        return resolveTrick({ ...gameState, passesThisRound: newPasses });
    }

    return {
        ...gameState,
        passesThisRound: newPasses,
        activePlayerIndex: getNextPlayerIndex(playerIndex),
    };
}

// Resolves the current trick: the trick leader wins and starts the next trick.
export function resolveTrick(gameState) {
    const winner = gameState.currentTrick?.playedBy ?? gameState.trickStarter;
    return {
        ...gameState,
        currentTrick: null,
        trickStarter: winner,
        activePlayerIndex: winner,
        passesThisRound: [],
    };
}

// Checks if all members of one team have finished (swept the top N places).
// If so, fills the remaining losing team members into finishOrder sorted by
// cards remaining ascending (fewest cards = best placement among losers).
// The player with the most cards left becomes the loser (not added to finishOrder).
// Returns the updated gameState if a sweep occurred, null otherwise.
export function applyTeamSweep(gameState) {
    const { teams, finishOrder, hands } = gameState;

    // Don't interfere if the round is already naturally over
    if (finishOrder.length >= 4) return null;

    for (const teamKey of ['red', 'black']) {
        const members = teams[teamKey];
        if (members.length === 0) continue;
        if (!members.every(i => finishOrder.includes(i))) continue;

        // This team swept — fill in the other team's placements
        const otherKey = teamKey === 'red' ? 'black' : 'red';
        const unfinished = teams[otherKey].filter(i => !finishOrder.includes(i));
        if (unfinished.length <= 1) return null; // Only the loser remains; normal flow handles it

        // Sort by card count ascending: fewer cards = better placement
        const sorted = [...unfinished].sort((a, b) => hands[a].length - hands[b].length);

        // All but the last go into finishOrder; the last is the loser
        const newFinishOrder = [...finishOrder, ...sorted.slice(0, sorted.length - 1)];
        return { ...gameState, finishOrder: newFinishOrder };
    }

    return null;
}

// Advances activePlayerIndex past players who are ineligible to act:
// those with empty hands (already finished) or who already passed this trick.
export function skipIneligiblePlayers(state) {
    let idx = state.activePlayerIndex;
    let count = 0;
    while (count < PLAYER_COUNT) {
        const emptyHand = state.hands[idx].length === 0;
        const alreadyPassed = state.passesThisRound.includes(idx);
        if (!emptyHand && !alreadyPassed) break;
        idx = (idx + 1) % PLAYER_COUNT;
        count++;
    }
    return { ...state, activePlayerIndex: idx };
}

// Returns true when 4 or more players have emptied their hands.
export function isRoundOver(gameState) {
    return gameState.finishOrder.length >= 4;
}

// Returns the finishing order and the loser (the last remaining player).
// Should only be called when isRoundOver is true.
export function getRoundResult(gameState) {
    const finishOrder = [...gameState.finishOrder];
    const loser = gameState.hands.findIndex(
        (hand, i) => hand.length > 0 && !finishOrder.includes(i)
    );
    return { finishOrder, loser };
}
