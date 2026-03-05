import Card from '../Card/Card.jsx';
import { TRICK_TYPES } from '../../logic/tricks.js';
import './TrickArea.css';

const ORDERED_TYPES = new Set([TRICK_TYPES.STRAIGHT, TRICK_TYPES.STRAIGHT_FLUSH, TRICK_TYPES.TRACTOR]);

// Sort cards for display in sequential order, handling wrap-around sequences.
// For wrap-arounds (e.g. 3,4,5,6 where 3 has value 16), the high-valued cards
// come first so the sequence reads naturally left-to-right.
function sortForDisplay(cards) {
    const sorted = [...cards].sort((a, b) => a.value - b.value);
    let maxGap = 0;
    let gapIdx = -1;
    for (let i = 0; i < sorted.length - 1; i++) {
        const gap = sorted[i + 1].value - sorted[i].value;
        if (gap > maxGap) { maxGap = gap; gapIdx = i; }
    }
    if (maxGap <= 1) return sorted;
    return [...sorted.slice(gapIdx + 1), ...sorted.slice(0, gapIdx + 1)];
}

export default function TrickArea({ currentTrick }) {
    const displayCards = currentTrick && ORDERED_TYPES.has(currentTrick.type)
        ? sortForDisplay(currentTrick.cards)
        : currentTrick?.cards ?? [];

    return (
        <div className="trick-area">
            <div className="trick-area__label">Current Trick</div>
            {currentTrick ? (
                <div className="trick-area__content">
                    <div className="trick-area__cards">
                        {displayCards.map(card => (
                            <Card key={card.id} card={card} />
                        ))}
                    </div>
                    <div className="trick-area__meta">
                        Played by Player {currentTrick.playedBy + 1}
                    </div>
                </div>
            ) : (
                <div className="trick-area__empty">
                    No trick in play — lead with any valid combination
                </div>
            )}
        </div>
    );
}
