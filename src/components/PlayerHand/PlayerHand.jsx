import Card from '../Card/Card.jsx';
import './PlayerHand.css';

export default function PlayerHand({ hand, selectedCards, onCardClick, playerIndex }) {
    return (
        <div className="player-hand">
            <div className="player-hand__label">Player {playerIndex + 1}</div>
            <div className="player-hand__cards">
                {hand.map(card => (
                    <Card
                        key={card.id}
                        card={card}
                        selected={selectedCards.some(sc => sc.id === card.id)}
                        onClick={() => onCardClick(card)}
                    />
                ))}
                {hand.length === 0 && (
                    <span className="player-hand__empty">No cards</span>
                )}
            </div>
        </div>
    );
}
