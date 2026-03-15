import { useReducer } from 'react';
import { dealCards, findRedTenHolders, playCard, passTurn, resolveTrick, isRoundOver, getRoundResult, applyTeamSweep, skipIneligiblePlayers } from '../logic/round.js';
import { canFork, canDrawback, applyFork, applyDrawback, findForkCandidate, findDrawbackCandidate } from '../logic/forks.js';
import { calculateRoundPoints, applyRoundScore, isGameOver } from '../logic/scoring.js';
import { TRICK_TYPES } from '../logic/tricks.js';

const PLAYER_COUNT = 5;

export const initialState = {
    // Game state
    phase: 'setup',
    hands: [[], [], [], [], []],
    activePlayerIndex: 0,
    trickStarter: 0,
    currentTrick: null,
    passesThisRound: [],
    teams: { red: [], black: [] },
    revealedRedTens: [],
    scores: [0, 0, 0, 0, 0],
    finishOrder: [],
    forkWindow: null,
    roundNumber: 1,
    // UI state
    selectedCards: [],
    validationMessage: null,
    forkReady: false,
    orderingPlayerIndex: 0,
    orderingReady: false,
    roundPoints: { red: 0, black: 0 },
};

// Resolves post-play transitions: sweep check, auto-resolve, fork window, or pass_screen.
// Returns the new state. Pure function — no side effects.
function resolveAfterPlay(state) {
    const swept = applyTeamSweep(state);
    const state0 = swept ?? state;

    if (isRoundOver(state0)) {
        return finalizeRound(state0);
    }

    // Auto-resolve if all non-leader active players already passed
    let s = state0;
    if (s.currentTrick) {
        const trickLeader = s.currentTrick.playedBy;
        const nonLeaderActive = s.hands
            .map((_, i) => i)
            .filter(i => s.hands[i].length > 0 && i !== trickLeader);
        if (nonLeaderActive.length > 0 && nonLeaderActive.every(i => s.passesThisRound.includes(i))) {
            s = resolveTrick(s);
        }
    }

    // Open a fork window if a SINGLE was just played and someone can fork it
    if (s.currentTrick?.type === TRICK_TYPES.SINGLE) {
        const playedBy = s.currentTrick.playedBy;
        const candidate = findForkCandidate(s.hands, s.currentTrick, s.activePlayerIndex, playedBy);
        if (candidate !== null) {
            return {
                ...s,
                phase: 'fork_window',
                forkWindow: { value: s.currentTrick.value, pendingPlayerIndex: candidate, stage: 'fork' },
                forkReady: false,
                selectedCards: [],
                validationMessage: null,
            };
        }
    }

    return skipIneligiblePlayers({
        ...s,
        phase: 'pass_screen',
        selectedCards: [],
        validationMessage: null,
    });
}

// Calculates scores, determines if game is over, and returns final round/game state.
function finalizeRound(state) {
    const { finishOrder: fo, loser } = getRoundResult(state);
    const pts = calculateRoundPoints(fo, loser, state.teams);
    const newScores = applyRoundScore(state.scores, pts, state.teams);
    const { over } = isGameOver(newScores);
    return {
        ...state,
        scores: newScores,
        phase: over ? 'game_over' : 'round_over',
        roundPoints: pts,
        selectedCards: [],
        validationMessage: null,
    };
}

// Tracks finish order if a player's hand was emptied, then checks for sweep/round-over.
function resolveAfterForkAction(state, playerIndex) {
    let s = state;
    if (s.hands[playerIndex].length === 0 && !s.finishOrder.includes(playerIndex)) {
        s = { ...s, finishOrder: [...s.finishOrder, playerIndex] };
    }
    const swept = applyTeamSweep(s);
    return swept ?? s;
}

// Returns true if action.playerIndex is present and doesn't match the expected player.
function wrongPlayer(action, expectedPlayerIndex) {
    return action.playerIndex !== undefined && action.playerIndex !== expectedPlayerIndex;
}

export function gameReducer(state, action) {
    switch (action.type) {
        case 'START_ROUND': {
            if (state.phase !== 'setup' && state.phase !== 'round_over') return state;
            const { hands, starterIndex, existingScores, roundNumber } = action;
            const redTeam = findRedTenHolders(hands);
            const blackTeam = Array.from({ length: PLAYER_COUNT }, (_, i) => i)
                .filter(i => !redTeam.includes(i));
            return {
                ...initialState,
                phase: 'hand_ordering',
                hands,
                activePlayerIndex: starterIndex,
                trickStarter: starterIndex,
                teams: { red: redTeam, black: blackTeam },
                scores: existingScores,
                roundNumber,
            };
        }

        case 'PLAY_CARD': {
            if (state.phase !== 'playing') return state;
            if (wrongPlayer(action, state.activePlayerIndex)) return state;
            const { cards } = action;
            if (cards.length === 0) {
                return { ...state, validationMessage: 'Select cards to play first.' };
            }
            const result = playCard(state, state.activePlayerIndex, cards);
            if (result.error) {
                return { ...state, validationMessage: result.error };
            }
            return resolveAfterPlay(result);
        }

        case 'PASS_TURN': {
            if (state.phase !== 'playing') return state;
            if (wrongPlayer(action, state.activePlayerIndex)) return state;
            const result = passTurn(state, state.activePlayerIndex);
            if (result.error) {
                return { ...state, validationMessage: result.error };
            }
            return skipIneligiblePlayers({
                ...result,
                phase: 'pass_screen',
                validationMessage: null,
                selectedCards: [],
            });
        }

        case 'SELECT_CARD': {
            if (state.phase !== 'playing') return state;
            if (wrongPlayer(action, state.activePlayerIndex)) return state;
            const { card } = action;
            const already = state.selectedCards.some(c => c.id === card.id);
            return {
                ...state,
                validationMessage: null,
                selectedCards: already
                    ? state.selectedCards.filter(c => c.id !== card.id)
                    : [...state.selectedCards, card],
            };
        }

        case 'FORK_ACCEPT': {
            if (state.phase !== 'fork_window') return state;
            if (wrongPlayer(action, state.forkWindow.pendingPlayerIndex)) return state;
            const { stage, value, pendingPlayerIndex } = state.forkWindow;

            if (stage === 'fork') {
                const forkCards = canFork(state.hands[pendingPlayerIndex], state.currentTrick);
                const forked = applyFork(state, pendingPlayerIndex, forkCards);
                const resolved = resolveAfterForkAction(forked, pendingPlayerIndex);

                if (isRoundOver(resolved)) {
                    return finalizeRound({ ...resolved, forkWindow: null });
                }

                const drawbackStart = (pendingPlayerIndex + 1) % PLAYER_COUNT;
                const dbCandidate = findDrawbackCandidate(resolved.hands, value, drawbackStart, pendingPlayerIndex);

                if (dbCandidate !== null) {
                    return {
                        ...resolved,
                        phase: 'fork_window',
                        forkWindow: { value, pendingPlayerIndex: dbCandidate, stage: 'drawback' },
                        forkReady: false,
                    };
                }
                return skipIneligiblePlayers({
                    ...resolved,
                    activePlayerIndex: (pendingPlayerIndex + 1) % PLAYER_COUNT,
                    phase: 'pass_screen',
                    forkWindow: null,
                    forkReady: false,
                });
            }

            // stage === 'drawback'
            const drawbackCard = canDrawback(state.hands[pendingPlayerIndex], value);
            const drawbacked = applyDrawback(state, pendingPlayerIndex, drawbackCard);
            const resolved = resolveAfterForkAction(drawbacked, pendingPlayerIndex);

            if (isRoundOver(resolved)) {
                return finalizeRound({ ...resolved, forkWindow: null });
            }
            return skipIneligiblePlayers({
                ...resolved,
                phase: 'pass_screen',
                forkWindow: null,
                forkReady: false,
            });
        }

        case 'FORK_DECLINE': {
            if (state.phase !== 'fork_window') return state;
            if (wrongPlayer(action, state.forkWindow.pendingPlayerIndex)) return state;
            const { stage, value, pendingPlayerIndex } = state.forkWindow;

            if (stage === 'fork') {
                const playedBy = state.currentTrick.playedBy;
                const next = findForkCandidate(
                    state.hands, state.currentTrick,
                    (pendingPlayerIndex + 1) % PLAYER_COUNT,
                    playedBy,
                );
                if (next !== null) {
                    return { ...state, forkWindow: { ...state.forkWindow, pendingPlayerIndex: next }, forkReady: false };
                }
                return skipIneligiblePlayers({ ...state, phase: 'pass_screen', forkWindow: null, forkReady: false });
            }

            // stage === 'drawback'
            const forkingPlayer = state.currentTrick.playedBy;
            const next = findDrawbackCandidate(
                state.hands, value,
                (pendingPlayerIndex + 1) % PLAYER_COUNT,
                forkingPlayer,
            );
            if (next !== null) {
                return { ...state, forkWindow: { ...state.forkWindow, pendingPlayerIndex: next }, forkReady: false };
            }
            return skipIneligiblePlayers({
                ...state,
                activePlayerIndex: (forkingPlayer + 1) % PLAYER_COUNT,
                phase: 'pass_screen',
                forkWindow: null,
                forkReady: false,
            });
        }

        case 'ORDER_HAND_DONE': {
            if (state.phase !== 'hand_ordering') return state;
            if (wrongPlayer(action, state.orderingPlayerIndex)) return state;
            const { orderedHand } = action;
            const newHands = state.hands.map((h, i) => i === state.orderingPlayerIndex ? orderedHand : h);
            const next = state.orderingPlayerIndex + 1;
            if (next >= PLAYER_COUNT) {
                return { ...state, hands: newHands, phase: 'pass_screen' };
            }
            return {
                ...state,
                hands: newHands,
                orderingPlayerIndex: next,
                orderingReady: false,
            };
        }

        case 'SET_ORDERING_READY':
            if (state.phase !== 'hand_ordering') return state;
            if (wrongPlayer(action, state.orderingPlayerIndex)) return state;
            return { ...state, orderingReady: true };

        case 'SET_FORK_READY':
            if (state.phase !== 'fork_window') return state;
            if (wrongPlayer(action, state.forkWindow.pendingPlayerIndex)) return state;
            return { ...state, forkReady: true };

        case 'ENTER_PLAYING':
            if (state.phase !== 'pass_screen') return state;
            if (wrongPlayer(action, state.activePlayerIndex)) return state;
            return { ...state, phase: 'playing' };

        case 'NEW_GAME':
            if (state.phase !== 'game_over') return state;
            return { ...initialState };

        default:
            return state;
    }
}

export function useGameEngine() {
    const [state, dispatch] = useReducer(gameReducer, initialState);

    const {
        phase, activePlayerIndex, currentTrick,
        hands, scores, revealedRedTens, teams, finishOrder, forkWindow,
        selectedCards, validationMessage, forkReady,
        orderingPlayerIndex, orderingReady, roundPoints,
    } = state;

    function startRound(existingScores, roundNumber) {
        const { hands, starterIndex } = dealCards();
        dispatch({ type: 'START_ROUND', hands, starterIndex, existingScores, roundNumber });
    }

    return {
        // Full state (for gameState.roundNumber access etc.)
        gameState: state,
        // Destructured state
        phase,
        activePlayerIndex,
        currentTrick,
        hands,
        scores,
        revealedRedTens,
        teams,
        finishOrder,
        forkWindow,
        selectedCards,
        validationMessage,
        forkReady,
        orderingPlayerIndex,
        orderingReady,
        roundPoints,
        // Handlers
        startRound,
        handlePlay: () => dispatch({ type: 'PLAY_CARD', cards: selectedCards }),
        handlePass: () => dispatch({ type: 'PASS_TURN' }),
        handleCardClick: (card) => dispatch({ type: 'SELECT_CARD', card }),
        handleForkAccept: () => dispatch({ type: 'FORK_ACCEPT' }),
        handleForkDecline: () => dispatch({ type: 'FORK_DECLINE' }),
        handleOrderingDone: (orderedHand) => dispatch({ type: 'ORDER_HAND_DONE', orderedHand }),
        handleNewGame: () => dispatch({ type: 'NEW_GAME' }),
        setForkReady: () => dispatch({ type: 'SET_FORK_READY' }),
        setOrderingReady: () => dispatch({ type: 'SET_ORDERING_READY' }),
        enterPlaying: () => dispatch({ type: 'ENTER_PLAYING' }),
    };
}
