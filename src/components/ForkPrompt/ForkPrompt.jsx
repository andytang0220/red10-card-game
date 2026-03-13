import Card from '../Card/Card.jsx';
import './ForkPrompt.css';

export default function ForkPrompt({ playerIndex, stage, forkCards, drawbackCard, hand, currentTrick, onAccept, onDecline }) {
    const isFork = stage === 'fork';
    const highlightedIds = new Set(
        isFork ? forkCards.map(c => c.id) : [drawbackCard.id]
    );

    return (
        <div className="fork-prompt">
            <div className="fork-prompt__player">Player {playerIndex + 1}</div>
            <div className="fork-prompt__question">
                {isFork
                    ? 'You can fork the current trick with a pair:'
                    : 'You hold the last card — you can play it as a drawback:'}
            </div>
            {currentTrick && (
                <div className="fork-prompt__context">
                    Current trick: {currentTrick.cards.map(c => `${c.rank}${c.suit ?? ''}`).join(', ')}
                    {' '}(Player {currentTrick.playedBy + 1})
                </div>
            )}
            <div className="fork-prompt__buttons">
                <button className="fork-prompt__btn fork-prompt__btn--yes" onClick={onAccept}>
                    {isFork ? 'Fork' : 'Drawback'}
                </button>
                <button className="fork-prompt__btn fork-prompt__btn--no" onClick={onDecline}>
                    Pass
                </button>
            </div>
            <div className="fork-prompt__hand">
                <div className="fork-prompt__hand-label">Your hand</div>
                <div className="fork-prompt__hand-cards">
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
    );
}
