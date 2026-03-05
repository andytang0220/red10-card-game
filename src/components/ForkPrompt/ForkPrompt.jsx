import Card from '../Card/Card.jsx';
import './ForkPrompt.css';

export default function ForkPrompt({ playerIndex, stage, forkCards, drawbackCard, currentTrick, onAccept, onDecline }) {
    const isFork = stage === 'fork';
    const cards = isFork ? forkCards : [drawbackCard];

    return (
        <div className="fork-prompt">
            <div className="fork-prompt__player">Player {playerIndex + 1}</div>
            <div className="fork-prompt__question">
                {isFork
                    ? 'You can fork the current trick with this pair:'
                    : 'You hold the last card — you can play it as a drawback:'}
            </div>
            <div className="fork-prompt__cards">
                {cards.map(card => <Card key={card.id} card={card} />)}
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
        </div>
    );
}
