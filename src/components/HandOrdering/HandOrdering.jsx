import { useState } from 'react';
import Card from '../Card/Card.jsx';
import './HandOrdering.css';

export default function HandOrdering({ hand, playerIndex, onDone }) {
    const [slots, setSlots] = useState(Array(hand.length).fill(null));
    const [selectedCard, setSelectedCard] = useState(null);

    const unplacedCards = hand.filter(card => !slots.some(s => s?.id === card.id));
    const allFilled = slots.every(s => s !== null);

    function handleCardClick(card) {
        setSelectedCard(prev => prev?.id === card.id ? null : card);
    }

    function handleSlotClick(slotIndex) {
        const slotCard = slots[slotIndex];

        if (slotCard !== null && selectedCard !== null) {
            // Swap: place selected card here, displaced card returns to unplaced row
            setSlots(prev => prev.map((s, i) => i === slotIndex ? selectedCard : s));
            setSelectedCard(null);
        } else if (slotCard === null && selectedCard !== null) {
            // Place selected card into empty slot
            setSlots(prev => prev.map((s, i) => i === slotIndex ? selectedCard : s));
            setSelectedCard(null);
        } else if (slotCard !== null && selectedCard === null) {
            // Return card from slot back to unplaced row
            setSlots(prev => prev.map((s, i) => i === slotIndex ? null : s));
        }
    }

    return (
        <div className="hand-ordering">
            <div className="hand-ordering__player">Player {playerIndex + 1}</div>
            <div className="hand-ordering__title">Arrange your hand</div>

            <div className="hand-ordering__section">
                <div className="hand-ordering__row-label">Dealt cards</div>
                <div className="hand-ordering__row hand-ordering__row--dealt">
                    {unplacedCards.map(card => (
                        <Card
                            key={card.id}
                            card={card}
                            selected={selectedCard?.id === card.id}
                            onClick={() => handleCardClick(card)}
                        />
                    ))}
                    {unplacedCards.length === 0 && (
                        <span className="hand-ordering__all-placed">All cards placed ✓</span>
                    )}
                </div>
            </div>

            <div className="hand-ordering__section">
                <div className="hand-ordering__row-label">Your order</div>
                <div className="hand-ordering__row">
                    {slots.map((card, i) =>
                        card !== null ? (
                            <Card
                                key={card.id}
                                card={card}
                                onClick={() => handleSlotClick(i)}
                            />
                        ) : (
                            <div
                                key={i}
                                className={`hand-ordering__slot${selectedCard ? ' hand-ordering__slot--ready' : ''}`}
                                onClick={() => handleSlotClick(i)}
                            />
                        )
                    )}
                </div>
            </div>

            <button
                className="hand-ordering__btn"
                disabled={!allFilled}
                onClick={() => onDone(slots)}
            >
                Done ordering hand
            </button>
        </div>
    );
}
