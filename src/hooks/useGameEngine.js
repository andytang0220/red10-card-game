import { useState } from 'react';
import { dealCards, findRedTenHolders, playCard, passTurn, resolveTrick, isRoundOver, getRoundResult, applyTeamSweep, skipIneligiblePlayers } from '../logic/round.js';
import { canFork, canDrawback, applyFork, applyDrawback, findForkCandidate, findDrawbackCandidate } from '../logic/forks.js';
import { calculateRoundPoints, applyRoundScore, isGameOver } from '../logic/scoring.js';
import { TRICK_TYPES } from '../logic/tricks.js';

const PLAYER_COUNT = 5;

export const initialState = {
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
};

export function useGameEngine() {
    const [gameState, setGameState] = useState(initialState);
    const [selectedCards, setSelectedCards] = useState([]);
    const [validationMessage, setValidationMessage] = useState(null);
    const [forkReady, setForkReady] = useState(false);
    const [orderingPlayerIndex, setOrderingPlayerIndex] = useState(0);
    const [orderingReady, setOrderingReady] = useState(false);
    const [roundPoints, setRoundPoints] = useState({ red: 0, black: 0 });

    const {
        phase, activePlayerIndex, currentTrick,
        hands, scores, revealedRedTens, teams, finishOrder, forkWindow,
    } = gameState;

    // --- Transition helpers ---

    function startRound(existingScores, roundNumber) {
        const { hands: newHands, starterIndex } = dealCards();
        const redTeam = findRedTenHolders(newHands);
        const blackTeam = Array.from({ length: PLAYER_COUNT }, (_, i) => i)
            .filter(i => !redTeam.includes(i));
        setSelectedCards([]);
        setValidationMessage(null);
        setForkReady(false);
        setOrderingPlayerIndex(0);
        setOrderingReady(false);
        setGameState({
            ...initialState,
            phase: 'hand_ordering',
            hands: newHands,
            activePlayerIndex: starterIndex,
            trickStarter: starterIndex,
            teams: { red: redTeam, black: blackTeam },
            scores: existingScores,
            roundNumber,
        });
    }

    function afterSuccessfulPlay(newState) {
        setSelectedCards([]);
        setValidationMessage(null);

        const swept = applyTeamSweep(newState);
        const state0 = swept ?? newState;

        if (isRoundOver(state0)) {
            const { finishOrder: fo, loser } = getRoundResult(state0);
            const pts = calculateRoundPoints(fo, loser, state0.teams);
            const newScores = applyRoundScore(state0.scores, pts, state0.teams);
            const { over } = isGameOver(newScores);
            setRoundPoints(pts);
            setGameState({ ...state0, scores: newScores, phase: over ? 'game_over' : 'round_over' });
            return;
        }

        let state = state0;
        if (state.currentTrick) {
            const trickLeader = state.currentTrick.playedBy;
            const nonLeaderActive = state.hands
                .map((_, i) => i)
                .filter(i => state.hands[i].length > 0 && i !== trickLeader);
            if (nonLeaderActive.length > 0 && nonLeaderActive.every(i => state.passesThisRound.includes(i))) {
                state = resolveTrick(state);
            }
        }

        if (state.currentTrick?.type === TRICK_TYPES.SINGLE) {
            const playedBy = state.currentTrick.playedBy;
            const candidate = findForkCandidate(
                state.hands,
                state.currentTrick,
                state.activePlayerIndex,
                playedBy,
            );
            if (candidate !== null) {
                setForkReady(false);
                setGameState({
                    ...state,
                    phase: 'fork_window',
                    forkWindow: { value: state.currentTrick.value, pendingPlayerIndex: candidate, stage: 'fork' },
                });
                return;
            }
        }

        setGameState(skipIneligiblePlayers({ ...state, phase: 'pass_screen' }));
    }

    // --- Fork / drawback handlers ---

    function handleForkAccept() {
        const { stage, value, pendingPlayerIndex } = forkWindow;

        if (stage === 'fork') {
            const forkCards = canFork(hands[pendingPlayerIndex], currentTrick);
            let newState = applyFork(gameState, pendingPlayerIndex, forkCards);

            if (newState.hands[pendingPlayerIndex].length === 0 && !newState.finishOrder.includes(pendingPlayerIndex)) {
                newState = { ...newState, finishOrder: [...newState.finishOrder, pendingPlayerIndex] };
            }

            const forkSwept = applyTeamSweep(newState);
            const forkResolved = forkSwept ?? newState;
            if (isRoundOver(forkResolved)) {
                const { finishOrder: fo, loser } = getRoundResult(forkResolved);
                const pts = calculateRoundPoints(fo, loser, forkResolved.teams);
                const newScores = applyRoundScore(forkResolved.scores, pts, forkResolved.teams);
                const { over } = isGameOver(newScores);
                setRoundPoints(pts);
                setGameState({ ...forkResolved, scores: newScores, forkWindow: null, phase: over ? 'game_over' : 'round_over' });
                return;
            }

            const drawbackStart = (pendingPlayerIndex + 1) % PLAYER_COUNT;
            const dbCandidate = findDrawbackCandidate(forkResolved.hands, value, drawbackStart, pendingPlayerIndex);

            if (dbCandidate !== null) {
                setForkReady(false);
                setGameState({
                    ...forkResolved,
                    phase: 'fork_window',
                    forkWindow: { value, pendingPlayerIndex: dbCandidate, stage: 'drawback' },
                });
            } else {
                setForkReady(false);
                setGameState(skipIneligiblePlayers({
                    ...forkResolved,
                    activePlayerIndex: (pendingPlayerIndex + 1) % PLAYER_COUNT,
                    phase: 'pass_screen',
                    forkWindow: null,
                }));
            }
        } else {
            // stage === 'drawback'
            const drawbackCard = canDrawback(hands[pendingPlayerIndex], value);
            let newState = applyDrawback(gameState, pendingPlayerIndex, drawbackCard);

            if (newState.hands[pendingPlayerIndex].length === 0 && !newState.finishOrder.includes(pendingPlayerIndex)) {
                newState = { ...newState, finishOrder: [...newState.finishOrder, pendingPlayerIndex] };
            }

            const dbSwept = applyTeamSweep(newState);
            const dbResolved = dbSwept ?? newState;

            if (isRoundOver(dbResolved)) {
                const { finishOrder: fo, loser } = getRoundResult(dbResolved);
                const pts = calculateRoundPoints(fo, loser, dbResolved.teams);
                const newScores = applyRoundScore(dbResolved.scores, pts, dbResolved.teams);
                const { over } = isGameOver(newScores);
                setRoundPoints(pts);
                setGameState({ ...dbResolved, scores: newScores, forkWindow: null, phase: over ? 'game_over' : 'round_over' });
            } else {
                setForkReady(false);
                setGameState(skipIneligiblePlayers({ ...dbResolved, phase: 'pass_screen', forkWindow: null }));
            }
        }
    }

    function handleForkDecline() {
        const { stage, value, pendingPlayerIndex } = forkWindow;

        if (stage === 'fork') {
            const playedBy = currentTrick.playedBy;
            const next = findForkCandidate(
                hands, currentTrick,
                (pendingPlayerIndex + 1) % PLAYER_COUNT,
                playedBy,
            );
            if (next !== null) {
                setForkReady(false);
                setGameState(s => ({ ...s, forkWindow: { ...s.forkWindow, pendingPlayerIndex: next } }));
            } else {
                setForkReady(false);
                setGameState(s => skipIneligiblePlayers({ ...s, phase: 'pass_screen', forkWindow: null }));
            }
        } else {
            // stage === 'drawback'
            const forkingPlayer = currentTrick.playedBy;
            const next = findDrawbackCandidate(
                hands, value,
                (pendingPlayerIndex + 1) % PLAYER_COUNT,
                forkingPlayer,
            );
            if (next !== null) {
                setForkReady(false);
                setGameState(s => ({ ...s, forkWindow: { ...s.forkWindow, pendingPlayerIndex: next } }));
            } else {
                setForkReady(false);
                setGameState(s => skipIneligiblePlayers({
                    ...s,
                    activePlayerIndex: (forkingPlayer + 1) % PLAYER_COUNT,
                    phase: 'pass_screen',
                    forkWindow: null,
                }));
            }
        }
    }

    // --- Action handlers ---

    function handleCardClick(card) {
        setValidationMessage(null);
        setSelectedCards(prev =>
            prev.some(c => c.id === card.id)
                ? prev.filter(c => c.id !== card.id)
                : [...prev, card]
        );
    }

    function handlePlay() {
        if (selectedCards.length === 0) {
            setValidationMessage('Select cards to play first.');
            return;
        }
        const result = playCard(gameState, activePlayerIndex, selectedCards);
        if (result.error) {
            setValidationMessage(result.error);
            return;
        }
        afterSuccessfulPlay(result);
    }

    function handlePass() {
        const result = passTurn(gameState, activePlayerIndex);
        if (result.error) {
            setValidationMessage(result.error);
            return;
        }
        setValidationMessage(null);
        setSelectedCards([]);
        setGameState(skipIneligiblePlayers({ ...result, phase: 'pass_screen' }));
    }

    function handleOrderingDone(orderedHand) {
        const newHands = hands.map((h, i) => i === orderingPlayerIndex ? orderedHand : h);
        const next = orderingPlayerIndex + 1;
        if (next >= PLAYER_COUNT) {
            setGameState(s => ({ ...s, hands: newHands, phase: 'pass_screen' }));
        } else {
            setOrderingPlayerIndex(next);
            setOrderingReady(false);
            setGameState(s => ({ ...s, hands: newHands }));
        }
    }

    function handleNewGame() {
        setGameState({ ...initialState });
    }

    return {
        // State
        gameState,
        selectedCards,
        validationMessage,
        forkReady,
        orderingPlayerIndex,
        orderingReady,
        roundPoints,
        // Derived
        phase,
        activePlayerIndex,
        currentTrick,
        hands,
        scores,
        revealedRedTens,
        teams,
        finishOrder,
        forkWindow,
        // Handlers
        startRound,
        handlePlay,
        handlePass,
        handleCardClick,
        handleForkAccept,
        handleForkDecline,
        handleOrderingDone,
        handleNewGame,
        setForkReady,
        setOrderingReady,
        setGameState,
    };
}
