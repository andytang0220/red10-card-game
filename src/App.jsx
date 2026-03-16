import { useState, useEffect } from 'react';
import './App.css';
import { isGameOver } from './logic/scoring.js';
import { useGameEngine } from './hooks/useGameEngine.js';
import { useMultiplayerEngine } from './hooks/useMultiplayerEngine.js';
import PassScreen from './components/PassScreen/PassScreen.jsx';
import PlayerHand from './components/PlayerHand/PlayerHand.jsx';
import TrickArea from './components/TrickArea/TrickArea.jsx';
import ActionBar from './components/ActionBar/ActionBar.jsx';
import ScoreBoard from './components/ScoreBoard/ScoreBoard.jsx';
import RoundSummary from './components/RoundSummary/RoundSummary.jsx';
import HandOrderingPhase from './components/HandOrderingPhase/HandOrderingPhase.jsx';
import ForkOverlay from './components/ForkOverlay/ForkOverlay.jsx';
import Lobby from './components/Lobby/Lobby.jsx';

function LocalGame() {
    const engine = useGameEngine();
    return <GameUI engine={engine} isMultiplayer={false} />;
}

function OnlineGame() {
    const engine = useMultiplayerEngine();

    if (!engine.inGame) {
        return <Lobby engine={engine} />;
    }

    return <GameUI engine={engine} isMultiplayer={true} />;
}

function GameUI({ engine, isMultiplayer }) {
    const {
        phase, activePlayerIndex, currentTrick,
        scores, revealedRedTens, teams, finishOrder, forkWindow,
        selectedCards, validationMessage,
        orderingPlayerIndex, orderingReady, roundPoints, gameState,
    } = engine;

    // In multiplayer, we use engine.hand (own hand only)
    // In local, we use engine.hands (all hands)
    const hands = engine.hands;
    const hand = isMultiplayer ? engine.hand : (hands ? hands[activePlayerIndex] : []);
    const orderingHand = isMultiplayer ? engine.hand : (hands ? hands[orderingPlayerIndex] : []);

    const [dismissedForkKey, setDismissedForkKey] = useState(null);

    const forkKey = forkWindow
        ? `${forkWindow.pendingPlayerIndex}-${forkWindow.stage}-${forkWindow.value}`
        : null;
    const showForkOverlay = forkWindow !== null && forkKey !== dismissedForkKey;

    useEffect(() => {
        if (forkWindow === null) setDismissedForkKey(null);
    }, [forkWindow]);

    function handleForkDismiss() {
        setDismissedForkKey(forkKey);
    }

    // Multiplayer: show waiting screen during hand_ordering if already submitted
    if (isMultiplayer && engine.waitingForOrdering) {
        return (
            <div className="app app--centered">
                <h1 className="app__title">Red10</h1>
                <p>Waiting for other players to order their hands...</p>
            </div>
        );
    }

    if (phase === 'setup') {
        return (
            <div className="app app--centered">
                <h1 className="app__title">Red10</h1>
                <button className="app__start-btn" onClick={() => engine.startRound([0, 0, 0, 0, 0], 1)}>
                    Start Game
                </button>
            </div>
        );
    }

    if (phase === 'hand_ordering') {
        return (
            <HandOrderingPhase
                orderingReady={isMultiplayer ? true : orderingReady}
                orderingPlayerIndex={isMultiplayer ? engine.playerIndex : orderingPlayerIndex}
                hand={orderingHand}
                onReady={engine.setOrderingReady}
                onDone={engine.handleOrderingDone}
            />
        );
    }

    if (phase === 'pass_screen') {
        // In multiplayer, pass_screen is auto-skipped on server.
        // If we somehow receive it, just show a brief loading state.
        if (isMultiplayer) {
            return (
                <div className="app app--centered">
                    <p>Loading...</p>
                </div>
            );
        }
        return (
            <>
                <PassScreen
                    playerIndex={activePlayerIndex}
                    onReady={engine.enterPlaying}
                />
                {showForkOverlay && (
                    <ForkOverlay
                        forkWindow={forkWindow}
                        hands={hands}
                        currentTrick={currentTrick}
                        onAccept={engine.handleForkAccept}
                        onDismiss={handleForkDismiss}
                    />
                )}
            </>
        );
    }

    if (phase === 'round_over') {
        const loser = isMultiplayer
            ? (engine.handCounts || []).findIndex((count, i) => count > 0 && !finishOrder.includes(i))
            : hands.findIndex((h, i) => h.length > 0 && !finishOrder.includes(i));
        return (
            <RoundSummary
                finishOrder={finishOrder}
                loser={loser}
                roundPoints={roundPoints}
                teams={teams}
                scores={scores}
                onNextRound={() => engine.startRound(scores, gameState.roundNumber + 1)}
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
                <button className="app__start-btn" onClick={engine.handleNewGame}>
                    Play Again
                </button>
            </div>
        );
    }

    // 'playing'
    const isMyTurn = isMultiplayer ? (engine.playerIndex === activePlayerIndex) : true;

    return (
        <div className="app">
            <ScoreBoard scores={scores} revealedRedTens={revealedRedTens} teams={teams} finishOrder={finishOrder} />
            {isMultiplayer && (
                <p className="app__turn-info">
                    You are Player {engine.playerIndex + 1}
                    {isMyTurn ? ' — Your turn!' : ` — Player ${activePlayerIndex + 1}'s turn`}
                </p>
            )}
            <TrickArea currentTrick={currentTrick} />
            <PlayerHand
                hand={hand}
                selectedCards={isMyTurn ? selectedCards : []}
                onCardClick={isMyTurn ? engine.handleCardClick : () => {}}
                playerIndex={isMultiplayer ? engine.playerIndex : activePlayerIndex}
            />
            {isMyTurn && (
                <ActionBar
                    onPlay={engine.handlePlay}
                    onPass={engine.handlePass}
                    canFork={false}
                    onFork={() => {}}
                    validationMessage={validationMessage}
                />
            )}
            {showForkOverlay && (
                <ForkOverlay
                    forkWindow={forkWindow}
                    hands={hands}
                    hand={isMultiplayer ? engine.hand : undefined}
                    currentTrick={currentTrick}
                    onAccept={engine.handleForkAccept}
                    onDismiss={handleForkDismiss}
                />
            )}
        </div>
    );
}

function App() {
    const [mode, setMode] = useState(null);

    if (mode === null) {
        return (
            <div className="app app--centered">
                <h1 className="app__title">Red10</h1>
                <button className="app__start-btn" onClick={() => setMode('local')}>
                    Local Play
                </button>
                <button className="app__start-btn" onClick={() => setMode('online')}>
                    Online Play
                </button>
            </div>
        );
    }

    if (mode === 'local') {
        return <LocalGame />;
    }

    return <OnlineGame />;
}

export default App;
