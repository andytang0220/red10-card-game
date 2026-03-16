import Card from '../Card/Card.jsx';
import { canFork, canDrawback } from '../../logic/forks.js';
import './ForkOverlay.css';

export default function ForkOverlay({ forkWindow, hands, currentTrick, onAccept, onDismiss }) {
    if (!forkWindow) return null;

    const { stage, value, pendingPlayerIndex } = forkWindow;
    const isFork = stage === 'fork';
    const hand = hands[pendingPlayerIndex];
    const forkCards = isFork ? canFork(hand, currentTrick) : null;
    const drawbackCard = !isFork ? canDrawback(hand, value) : null;
    const highlightedIds = new Set(
        isFork ? (forkCards ?? []).map(c => c.id) : drawbackCard ? [drawbackCard.id] : []
    );

    return (
        <div className="fork-overlay">
            <div className="fork-overlay__panel">
                <div className="fork-overlay__player">Player {pendingPlayerIndex + 1}</div>
                <div className="fork-overlay__question">
                    {isFork
                        ? 'You can fork the current trick with a pair:'
                        : 'You hold the last card — you can play it as a drawback:'}
                </div>
                {currentTrick && (
                    <div className="fork-overlay__context">
                        Current trick: {currentTrick.cards.map(c => `${c.rank}${c.suit ?? ''}`).join(', ')}
                        {' '}(Player {currentTrick.playedBy + 1})
                    </div>
                )}
                <div className="fork-overlay__buttons">
                    <button className="fork-overlay__btn fork-overlay__btn--yes" onClick={onAccept}>
                        {isFork ? 'Fork' : 'Drawback'}
                    </button>
                    <button className="fork-overlay__btn fork-overlay__btn--no" onClick={onDismiss}>
                        Pass
                    </button>
                </div>
                <div className="fork-overlay__hand">
                    <div className="fork-overlay__hand-label">Your hand</div>
                    <div className="fork-overlay__hand-cards">
                        {hand.map(card => (
                            <Card
                                key={card.id}
                                card={card}
                                selected={highlightedIds.has(card.id)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
