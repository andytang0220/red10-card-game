import './App.css';
import { canFork, canDrawback } from './logic/forks.js';
import { isGameOver } from './logic/scoring.js';
import { useGameEngine } from './hooks/useGameEngine.js';
import PassScreen from './components/PassScreen/PassScreen.jsx';
import PlayerHand from './components/PlayerHand/PlayerHand.jsx';
import TrickArea from './components/TrickArea/TrickArea.jsx';
import ActionBar from './components/ActionBar/ActionBar.jsx';
import ScoreBoard from './components/ScoreBoard/ScoreBoard.jsx';
import RoundSummary from './components/RoundSummary/RoundSummary.jsx';
import ForkPrompt from './components/ForkPrompt/ForkPrompt.jsx';
import HandOrdering from './components/HandOrdering/HandOrdering.jsx';

function App() {
    const engine = useGameEngine();
    const {
        phase, activePlayerIndex, currentTrick,
        hands, scores, revealedRedTens, teams, finishOrder, forkWindow,
        selectedCards, validationMessage, forkReady,
        orderingPlayerIndex, orderingReady, roundPoints, gameState,
    } = engine;

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
        if (!orderingReady) {
            return (
                <PassScreen
                    playerIndex={orderingPlayerIndex}
                    subtitle="to arrange your hand"
                    onReady={() => engine.setOrderingReady(true)}
                />
            );
        }
        return (
            <HandOrdering
                hand={hands[orderingPlayerIndex]}
                playerIndex={orderingPlayerIndex}
                onDone={engine.handleOrderingDone}
            />
        );
    }

    if (phase === 'pass_screen') {
        return (
            <PassScreen
                playerIndex={activePlayerIndex}
                onReady={() => engine.setGameState(s => ({ ...s, phase: 'playing' }))}
            />
        );
    }

    if (phase === 'fork_window') {
        if (!forkReady) {
            return (
                <PassScreen
                    playerIndex={forkWindow.pendingPlayerIndex}
                    onReady={() => engine.setForkReady(true)}
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
                onAccept={engine.handleForkAccept}
                onDecline={engine.handleForkDecline}
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
    return (
        <div className="app">
            <ScoreBoard scores={scores} revealedRedTens={revealedRedTens} teams={teams} finishOrder={finishOrder} />
            <TrickArea currentTrick={currentTrick} />
            <PlayerHand
                hand={hands[activePlayerIndex]}
                selectedCards={selectedCards}
                onCardClick={engine.handleCardClick}
                playerIndex={activePlayerIndex}
            />
            <ActionBar
                onPlay={engine.handlePlay}
                onPass={engine.handlePass}
                canFork={false}
                onFork={() => {}}
                validationMessage={validationMessage}
            />
        </div>
    );
}

export default App;
