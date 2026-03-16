// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ForkOverlay from './ForkOverlay.jsx';

afterEach(cleanup);

// --- Helpers ---
const c = (rank, suit) => ({
    id: `${rank}-${suit}`,
    rank,
    suit,
    value: { '4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14,'2':15,'3':16 }[rank],
    isJoker: false,
});

const hands = [
    [c('9','♠')],
    [c('7','♥'), c('7','♠'), c('9','♦'), c('K','♣')],
    [c('7','♦'), c('J','♣')],
    [c('8','♥')],
    [c('6','♣')],
];

const currentTrick = {
    type: 'single',
    value: 7,
    length: 1,
    playedBy: 0,
    cards: [c('7','♣')],
};

const forkWindow = { value: 7, pendingPlayerIndex: 1, stage: 'fork' };
const drawbackWindow = { value: 7, pendingPlayerIndex: 2, stage: 'drawback' };

function renderOverlay(overrides = {}) {
    const props = {
        forkWindow,
        hands,
        currentTrick,
        onAccept: vi.fn(),
        onDismiss: vi.fn(),
        ...overrides,
    };
    return { ...render(<ForkOverlay {...props} />), props };
}

function getHandCards(container) {
    const handSection = container.querySelector('.fork-overlay__hand-cards');
    return handSection ? Array.from(handSection.querySelectorAll('.card')) : [];
}

// --- Null rendering ---

describe('ForkOverlay (null state)', () => {
    it('renders nothing when forkWindow is null', () => {
        const { container } = renderOverlay({ forkWindow: null });
        expect(container.querySelector('.fork-overlay')).toBeNull();
    });
});

// --- Fork stage ---

describe('ForkOverlay (fork stage)', () => {
    it('shows the player label', () => {
        renderOverlay();
        expect(screen.getByText('Player 2')).toBeDefined();
    });

    it('shows fork question text', () => {
        renderOverlay();
        expect(screen.getByText(/fork the current trick with a pair/)).toBeDefined();
    });

    it('shows Fork button', () => {
        renderOverlay();
        expect(screen.getByText('Fork')).toBeDefined();
    });

    it('shows Pass button', () => {
        renderOverlay();
        expect(screen.getByText('Pass')).toBeDefined();
    });

    it('displays current trick context', () => {
        renderOverlay();
        expect(screen.getByText(/7♣/)).toBeDefined();
        expect(screen.getByText(/Player 1/)).toBeDefined();
    });

    it('renders the full hand', () => {
        const { container } = renderOverlay();
        const handCards = getHandCards(container);
        expect(handCards).toHaveLength(4);
    });

    it('highlights fork cards in the hand', () => {
        const { container } = renderOverlay();
        const handCards = getHandCards(container);
        const highlighted = handCards.filter(el => el.classList.contains('card--selected'));
        expect(highlighted).toHaveLength(2);
        for (const el of highlighted) {
            expect(el.textContent).toContain('7');
        }
    });

    it('does not highlight non-fork cards', () => {
        const { container } = renderOverlay();
        const handCards = getHandCards(container);
        const nonHighlighted = handCards.filter(el => !el.classList.contains('card--selected'));
        expect(nonHighlighted).toHaveLength(2);
    });

    it('calls onAccept when Fork is clicked', () => {
        const { props } = renderOverlay();
        fireEvent.click(screen.getByText('Fork'));
        expect(props.onAccept).toHaveBeenCalledOnce();
    });

    it('calls onDismiss when Pass is clicked', () => {
        const { props } = renderOverlay();
        fireEvent.click(screen.getByText('Pass'));
        expect(props.onDismiss).toHaveBeenCalledOnce();
    });
});

// --- Drawback stage ---

describe('ForkOverlay (drawback stage)', () => {
    it('shows drawback question text', () => {
        renderOverlay({ forkWindow: drawbackWindow });
        expect(screen.getByText(/last card.*drawback/)).toBeDefined();
    });

    it('shows Drawback button instead of Fork', () => {
        renderOverlay({ forkWindow: drawbackWindow });
        expect(screen.getByText('Drawback')).toBeDefined();
    });

    it('renders the full hand', () => {
        const { container } = renderOverlay({ forkWindow: drawbackWindow });
        const handCards = getHandCards(container);
        expect(handCards).toHaveLength(2);
    });

    it('highlights only the drawback card', () => {
        const { container } = renderOverlay({ forkWindow: drawbackWindow });
        const handCards = getHandCards(container);
        const highlighted = handCards.filter(el => el.classList.contains('card--selected'));
        expect(highlighted).toHaveLength(1);
        expect(highlighted[0].textContent).toContain('7');
    });

    it('does not highlight other cards', () => {
        const { container } = renderOverlay({ forkWindow: drawbackWindow });
        const handCards = getHandCards(container);
        const nonHighlighted = handCards.filter(el => !el.classList.contains('card--selected'));
        expect(nonHighlighted).toHaveLength(1);
    });

    it('calls onAccept when Drawback is clicked', () => {
        const { props } = renderOverlay({ forkWindow: drawbackWindow });
        fireEvent.click(screen.getByText('Drawback'));
        expect(props.onAccept).toHaveBeenCalledOnce();
    });
});

// --- Overlay structure ---

describe('ForkOverlay (overlay structure)', () => {
    it('renders with fork-overlay wrapper class', () => {
        const { container } = renderOverlay();
        expect(container.querySelector('.fork-overlay')).not.toBeNull();
    });

    it('renders with fork-overlay__panel inner panel', () => {
        const { container } = renderOverlay();
        expect(container.querySelector('.fork-overlay__panel')).not.toBeNull();
    });
});
