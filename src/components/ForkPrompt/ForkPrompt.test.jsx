// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ForkPrompt from './ForkPrompt.jsx';

afterEach(cleanup);

// --- Helpers ---
const c = (rank, suit) => ({
    id: `${rank}-${suit}`,
    rank,
    suit,
    value: { '4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14,'2':15,'3':16 }[rank],
    isJoker: false,
});

const forkHand = [c('7','♥'), c('7','♠'), c('9','♦'), c('K','♣')];
const forkCards = [c('7','♥'), c('7','♠')];
const currentTrick = {
    type: 'single',
    value: 7,
    length: 1,
    playedBy: 0,
    cards: [c('7','♣')],
};

const drawbackHand = [c('7','♦'), c('9','♠'), c('J','♣')];
const drawbackCard = c('7','♦');

function renderFork(overrides = {}) {
    const props = {
        playerIndex: 1,
        stage: 'fork',
        forkCards,
        drawbackCard: null,
        hand: forkHand,
        currentTrick,
        onAccept: vi.fn(),
        onDecline: vi.fn(),
        ...overrides,
    };
    return { ...render(<ForkPrompt {...props} />), props };
}

function getHandCards(container) {
    const handSection = container.querySelector('.fork-prompt__hand-cards');
    return handSection ? Array.from(handSection.querySelectorAll('.card')) : [];
}

// --- Fork stage tests ---

describe('ForkPrompt (fork stage)', () => {
    it('shows the player label', () => {
        renderFork();
        expect(screen.getByText('Player 2')).toBeDefined();
    });

    it('shows fork question text', () => {
        renderFork();
        expect(screen.getByText(/fork the current trick with a pair/)).toBeDefined();
    });

    it('shows Fork button', () => {
        renderFork();
        expect(screen.getByText('Fork')).toBeDefined();
    });

    it('shows Pass button', () => {
        renderFork();
        expect(screen.getByText('Pass')).toBeDefined();
    });

    it('displays current trick context', () => {
        renderFork();
        expect(screen.getByText(/7♣/)).toBeDefined();
        expect(screen.getByText(/Player 1/)).toBeDefined();
    });

    it('renders the full hand', () => {
        const { container } = renderFork();
        const handCards = getHandCards(container);
        expect(handCards).toHaveLength(4);
    });

    it('highlights fork cards in the hand', () => {
        const { container } = renderFork();
        const handCards = getHandCards(container);
        const highlighted = handCards.filter(el => el.classList.contains('card--selected'));
        expect(highlighted).toHaveLength(2);
        // The highlighted cards should be the two 7s
        for (const el of highlighted) {
            expect(el.textContent).toContain('7');
        }
    });

    it('does not highlight non-fork cards', () => {
        const { container } = renderFork();
        const handCards = getHandCards(container);
        const nonHighlighted = handCards.filter(el => !el.classList.contains('card--selected'));
        expect(nonHighlighted).toHaveLength(2);
    });

    it('calls onAccept when Fork is clicked', () => {
        const { props } = renderFork();
        fireEvent.click(screen.getByText('Fork'));
        expect(props.onAccept).toHaveBeenCalledOnce();
    });

    it('calls onDecline when Pass is clicked', () => {
        const { props } = renderFork();
        fireEvent.click(screen.getByText('Pass'));
        expect(props.onDecline).toHaveBeenCalledOnce();
    });
});

// --- Drawback stage tests ---

describe('ForkPrompt (drawback stage)', () => {
    function renderDrawback(overrides = {}) {
        return renderFork({
            stage: 'drawback',
            forkCards: null,
            drawbackCard,
            hand: drawbackHand,
            ...overrides,
        });
    }

    it('shows drawback question text', () => {
        renderDrawback();
        expect(screen.getByText(/last card.*drawback/)).toBeDefined();
    });

    it('shows Drawback button instead of Fork', () => {
        renderDrawback();
        expect(screen.getByText('Drawback')).toBeDefined();
    });

    it('renders the full hand', () => {
        const { container } = renderDrawback();
        const handCards = getHandCards(container);
        expect(handCards).toHaveLength(3);
    });

    it('highlights only the drawback card', () => {
        const { container } = renderDrawback();
        const handCards = getHandCards(container);
        const highlighted = handCards.filter(el => el.classList.contains('card--selected'));
        expect(highlighted).toHaveLength(1);
        expect(highlighted[0].textContent).toContain('7');
    });

    it('does not highlight other cards', () => {
        const { container } = renderDrawback();
        const handCards = getHandCards(container);
        const nonHighlighted = handCards.filter(el => !el.classList.contains('card--selected'));
        expect(nonHighlighted).toHaveLength(2);
    });

    it('calls onAccept when Drawback is clicked', () => {
        const { props } = renderDrawback();
        fireEvent.click(screen.getByText('Drawback'));
        expect(props.onAccept).toHaveBeenCalledOnce();
    });
});
