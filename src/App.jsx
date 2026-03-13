import './App.css';
import { isGameOver } from './logic/scoring.js';
import { useGameEngine } from './hooks/useGameEngine.js';
import PassScreen from './components/PassScreen/PassScreen.jsx';
import PlayerHand from './components/PlayerHand/PlayerHand.jsx';
import TrickArea from './components/TrickArea/TrickArea.jsx';
import ActionBar from './components/ActionBar/ActionBar.jsx';
import ScoreBoard from './components/ScoreBoard/ScoreBoard.jsx';
import RoundSummary from './components/RoundSummary/RoundSummary.jsx';
import HandOrderingPhase from './components/HandOrderingPhase/HandOrderingPhase.jsx';
import ForkWindowPhase from './components/ForkWindowPhase/ForkWindowPhase.jsx';

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
        return (
            <HandOrderingPhase
                orderingReady={orderingReady}
                orderingPlayerIndex={orderingPlayerIndex}
                hand={hands[orderingPlayerIndex]}
                onReady={() => engine.setOrderingReady(true)}
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
        return (
            <ForkWindowPhase
                forkReady={forkReady}
                forkWindow={forkWindow}
                hands={hands}
                currentTrick={currentTrick}
                onReady={() => engine.setForkReady(true)}
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
