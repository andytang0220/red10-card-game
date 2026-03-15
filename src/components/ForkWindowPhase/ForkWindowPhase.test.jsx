// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ForkWindowPhase from './ForkWindowPhase.jsx';

afterEach(cleanup);

const c = (rank, suit) => ({
    id: `${rank}-${suit}`,
    rank,
    suit,
    value: { '4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14,'2':15,'3':16 }[rank],
    isJoker: false,
});

const hands = [
    [c('9','♠')],
    [c('7','♥'), c('7','♠'), c('K','♦')],
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

function renderPhase(overrides = {}) {
    const props = {
        forkReady: false,
        forkWindow,
        hands,
        currentTrick,
        onReady: vi.fn(),
        onAccept: vi.fn(),
        onDecline: vi.fn(),
        ...overrides,
    };
    return { ...render(<ForkWindowPhase {...props} />), props };
}

describe('ForkWindowPhase (fork stage)', () => {
    it('shows PassScreen when not ready', () => {
        renderPhase({ forkReady: false });
        expect(screen.getByText('Hand device to')).toBeDefined();
        expect(screen.getByText('Player 2')).toBeDefined();
    });

    it('calls onReady when "I\'m ready" is clicked', () => {
        const { props } = renderPhase({ forkReady: false });
        fireEvent.click(screen.getByText("I'm ready"));
        expect(props.onReady).toHaveBeenCalledOnce();
    });

    it('does not show ForkPrompt when not ready', () => {
        renderPhase({ forkReady: false });
        expect(screen.queryByText(/fork the current trick/)).toBeNull();
    });

    it('shows ForkPrompt when ready', () => {
        renderPhase({ forkReady: true });
        expect(screen.getByText(/fork the current trick/)).toBeDefined();
    });

    it('does not show PassScreen when ready', () => {
        renderPhase({ forkReady: true });
        expect(screen.queryByText('Hand device to')).toBeNull();
    });

    it('passes correct fork cards to ForkPrompt', () => {
        const { container } = renderPhase({ forkReady: true });
        // The two 7s in player 1's hand should be highlighted
        const highlighted = container.querySelectorAll('.card--selected');
        expect(highlighted).toHaveLength(2);
    });
});

describe('ForkWindowPhase (drawback stage)', () => {
    it('shows PassScreen for drawback player when not ready', () => {
        renderPhase({ forkReady: false, forkWindow: drawbackWindow });
        expect(screen.getByText('Player 3')).toBeDefined();
    });

    it('shows drawback prompt when ready', () => {
        renderPhase({ forkReady: true, forkWindow: drawbackWindow });
        expect(screen.getByText(/last card.*drawback/)).toBeDefined();
    });

    it('highlights only the drawback card', () => {
        const { container } = renderPhase({ forkReady: true, forkWindow: drawbackWindow });
        const highlighted = container.querySelectorAll('.card--selected');
        expect(highlighted).toHaveLength(1);
    });
});
