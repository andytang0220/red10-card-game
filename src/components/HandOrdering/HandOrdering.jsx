import { useState } from 'react';
import { sortHand } from '../../logic/cards.js';
import Card from '../Card/Card.jsx';
import './HandOrdering.css';

export default function HandOrdering({ hand, playerIndex, onDone }) {
    const [orderedHand, setOrderedHand] = useState(() => sortHand(hand));
    const [dragIndex, setDragIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);

    function handleDragStart(e, index) {
        setDragIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDragOver(e, index) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIndex(index);
    }

    function handleDragLeave() {
        setDragOverIndex(null);
    }

    function handleDrop(e, dropIndex) {
        e.preventDefault();
        if (dragIndex === null || dragIndex === dropIndex) {
            setDragIndex(null);
            setDragOverIndex(null);
            return;
        }
        setOrderedHand(prev => {
            const next = [...prev];
            const [moved] = next.splice(dragIndex, 1);
            next.splice(dropIndex, 0, moved);
            return next;
        });
        setDragIndex(null);
        setDragOverIndex(null);
    }

    function handleDragEnd() {
        setDragIndex(null);
        setDragOverIndex(null);
    }

    return (
        <div className="hand-ordering">
            <div className="hand-ordering__player">Player {playerIndex + 1}</div>
            <div className="hand-ordering__title">Arrange your hand</div>

            <div className="hand-ordering__row">
                {orderedHand.map((card, i) => (
                    <div
                        key={card.id}
                        className={
                            'hand-ordering__card-wrapper' +
                            (dragIndex === i ? ' hand-ordering__card-wrapper--dragging' : '') +
                            (dragOverIndex === i ? ' hand-ordering__card-wrapper--drag-over' : '')
                        }
                        draggable
                        onDragStart={e => handleDragStart(e, i)}
                        onDragOver={e => handleDragOver(e, i)}
                        onDragLeave={handleDragLeave}
                        onDrop={e => handleDrop(e, i)}
                        onDragEnd={handleDragEnd}
                    >
                        <Card card={card} />
                    </div>
                ))}
            </div>

            <button
                className="hand-ordering__btn"
                onClick={() => onDone(orderedHand)}
            >
                Confirm hand
            </button>
        </div>
    );
}
