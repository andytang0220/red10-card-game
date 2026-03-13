import { canFork, canDrawback } from '../../logic/forks.js';
import PassScreen from '../PassScreen/PassScreen.jsx';
import ForkPrompt from '../ForkPrompt/ForkPrompt.jsx';

export default function ForkWindowPhase({ forkReady, forkWindow, hands, currentTrick, onReady, onAccept, onDecline }) {
    if (!forkReady) {
        return (
            <PassScreen
                playerIndex={forkWindow.pendingPlayerIndex}
                onReady={onReady}
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
            onAccept={onAccept}
            onDecline={onDecline}
        />
    );
}
