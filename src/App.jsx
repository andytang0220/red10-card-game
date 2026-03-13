import { useState } from 'react';
import './App.css';
import { dealCards, findRedTenHolders, getNextPlayerIndex, playCard, passTurn, resolveTrick, isRoundOver, getRoundResult, applyTeamSweep, skipIneligiblePlayers } from './logic/round.js';
import { canFork, canDrawback, applyFork, applyDrawback, findForkCandidate, findDrawbackCandidate } from './logic/forks.js';
import { calculateRoundPoints, applyRoundScore, isGameOver } from './logic/scoring.js';
import { TRICK_TYPES } from './logic/tricks.js';
import PassScreen from './components/PassScreen/PassScreen.jsx';
import PlayerHand from './components/PlayerHand/PlayerHand.jsx';
import TrickArea from './components/TrickArea/TrickArea.jsx';
import ActionBar from './components/ActionBar/ActionBar.jsx';
import ScoreBoard from './components/ScoreBoard/ScoreBoard.jsx';
import RoundSummary from './components/RoundSummary/RoundSummary.jsx';
import ForkPrompt from './components/ForkPrompt/ForkPrompt.jsx';
import HandOrdering from './components/HandOrdering/HandOrdering.jsx';

const PLAYER_COUNT = 5;

const initialState = {
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

function App() {
    const [gameState, setGameState] = useState(initialState);
    const [selectedCards, setSelectedCards] = useState([]);
    const [validationMessage, setValidationMessage] = useState(null);
    // Whether the pass screen in fork_window has been confirmed
    const [forkReady, setForkReady] = useState(false);
    // Hand ordering phase state
    const [orderingPlayerIndex, setOrderingPlayerIndex] = useState(0);
    const [orderingReady, setOrderingReady] = useState(false);
    // Stored so RoundSummary can display it
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

    // Called after any successful playCard or applyDrawback.
    // Handles round-over, fork-window, and pass_screen transitions.
    function afterSuccessfulPlay(newState) {
        setSelectedCards([]);
        setValidationMessage(null);

        // Check for team sweep: if all of one team finished, fill in the losing
        // team's remaining placements sorted by cards left (fewest = best).
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

        // Auto-resolve if all non-leader active players already passed before this play
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

        // Open a fork window if a SINGLE was just played and someone can fork it
        if (state.currentTrick?.type === TRICK_TYPES.SINGLE) {
            const playedBy = state.currentTrick.playedBy;
            const candidate = findForkCandidate(
                state.hands,
                state.currentTrick,
                state.activePlayerIndex, // start from the next player
                playedBy,                // stop before the player who played
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

            // Track finish order if the fork emptied the player's hand
            if (newState.hands[pendingPlayerIndex].length === 0 && !newState.finishOrder.includes(pendingPlayerIndex)) {
                newState = { ...newState, finishOrder: [...newState.finishOrder, pendingPlayerIndex] };
            }

            // Check for team sweep or natural round-over before looking for drawback
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

            // Check for drawback candidates starting from the player after the forker
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
                // No drawback candidates; play resumes from the player after the forker
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

            // Track finish order if the drawback emptied the player's hand
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
                // All drawback candidates declined; play resumes from the player after the forker
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

    // --- Render ---

    if (phase === 'setup') {
        return (
            <div className="app app--centered">
                <h1 className="app__title">Red10</h1>
                <button className="app__start-btn" onClick={() => startRound([0, 0, 0, 0, 0], 1)}>
                    Start Game
                </button>
            </div>
        );
    }

    if (phase === 'hand_ordering') {
        if (!orderingReady) {
            return (
                <PassScreen
                    playerIndex={orderingPlayerIndex}
                    subtitle="to arrange your hand"
                    onReady={() => setOrderingReady(true)}
                />
            );
        }
        return (
            <HandOrdering
                hand={hands[orderingPlayerIndex]}
                playerIndex={orderingPlayerIndex}
                onDone={(orderedHand) => {
                    const newHands = hands.map((h, i) => i === orderingPlayerIndex ? orderedHand : h);
                    const next = orderingPlayerIndex + 1;
                    if (next >= PLAYER_COUNT) {
                        // All players have ordered — start the game
                        setGameState(s => ({ ...s, hands: newHands, phase: 'pass_screen' }));
                    } else {
                        setOrderingPlayerIndex(next);
                        setOrderingReady(false);
                        setGameState(s => ({ ...s, hands: newHands }));
                    }
                }}
            />
        );
    }

    if (phase === 'pass_screen') {
        return (
            <PassScreen
                playerIndex={activePlayerIndex}
                onReady={() => setGameState(s => ({ ...s, phase: 'playing' }))}
            />
        );
    }

    if (phase === 'fork_window') {
        if (!forkReady) {
            return (
                <PassScreen
                    playerIndex={forkWindow.pendingPlayerIndex}
                    onReady={() => setForkReady(true)}
                />
            );
        }
        const { stage, value, pendingPlayerIndex } = forkWindow;
        const forkCards = stage === 'fork' ? canFork(hands[pendingPlayerIndex], currentTrick) : null;
        const drawbackCard = stage === 'drawback' ? canDrawback(hands[pendingPlayerIndex], value) : null;
        return (
            <ForkPrompt
                playerIndex={pendingPlayerIndex}
                stage={stage}
                forkCards={forkCards}
                drawbackCard={drawbackCard}
                currentTrick={currentTrick}
                onAccept={handleForkAccept}
                onDecline={handleForkDecline}
            />
        );
    }

    if (phase === 'round_over') {
        const loser = hands.findIndex((h, i) => h.length > 0 && !finishOrder.includes(i));
        return (
            <RoundSummary
                finishOrder={finishOrder}
                loser={loser}
                roundPoints={roundPoints}
                teams={teams}
                scores={scores}
                onNextRound={() => startRound(scores, gameState.roundNumber + 1)}
            />
        );
    }

    if (phase === 'game_over') {
        const { losingPlayers } = isGameOver(scores);
        return (
            <div className="app app--centered">
                <h1 className="app__title">Game Over</h1>
                <p className="app__game-over-msg">
                    {losingPlayers.map(i => `Player ${i + 1}`).join(' & ')} reached 10 points.
                </p>
                <button className="app__start-btn" onClick={() => setGameState({ ...initialState })}>
                    Play Again
                </button>
            </div>
        );
    }

    // 'playing'
    return (
        <div className="app">
            <ScoreBoard scores={scores} revealedRedTens={revealedRedTens} teams={teams} finishOrder={finishOrder} />
            <TrickArea currentTrick={currentTrick} />
            <PlayerHand
                hand={hands[activePlayerIndex]}
                selectedCards={selectedCards}
                onCardClick={handleCardClick}
                playerIndex={activePlayerIndex}
            />
            <ActionBar
                onPlay={handlePlay}
                onPass={handlePass}
                canFork={false}
                onFork={() => {}}
                validationMessage={validationMessage}
            />
        </div>
    );
}

export default App;
