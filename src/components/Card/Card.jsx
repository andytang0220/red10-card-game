import { BIG_JOKER_VALUE } from '../../logic/cards.js';
import './Card.css';

export default function Card({ card, selected = false, faceDown = false, onClick }) {
    if (faceDown) {
        return (
            <div className="card card--face-down" onClick={onClick}>
                <div className="card__back" />
            </div>
        );
    }

    if (card.isJoker) {
        const isBig = card.value === BIG_JOKER_VALUE;
        return (
            <div
                className={`card card--joker ${isBig ? 'card--joker-big' : 'card--joker-small'} ${selected ? 'card--selected' : ''}`}
                onClick={onClick}
            >
                <span className="card__joker-label">{isBig ? 'Big' : 'Small'}</span>
                <span className="card__joker-symbol">★</span>
                <span className="card__joker-label">Joker</span>
            </div>
        );
    }

    const isRed = card.suit === '♥' || card.suit === '♦';
    return (
        <div
            className={`card ${isRed ? 'card--red' : ''} ${selected ? 'card--selected' : ''}`}
            onClick={onClick}
        >
            <span className="card__corner card__corner--top">{card.rank}<br />{card.suit}</span>
            <span className="card__center">{card.suit}</span>
            <span className="card__corner card__corner--bottom">{card.rank}<br />{card.suit}</span>
        </div>
    );
}
