// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import HandOrderingPhase from './HandOrderingPhase.jsx';

afterEach(cleanup);

const mockHand = [
    { id: '7-♥', rank: '7', suit: '♥', value: 7, isJoker: false },
    { id: '8-♠', rank: '8', suit: '♠', value: 8, isJoker: false },
];

function renderPhase(overrides = {}) {
    const props = {
        orderingReady: false,
        orderingPlayerIndex: 2,
        hand: mockHand,
        onReady: vi.fn(),
        onDone: vi.fn(),
        ...overrides,
    };
    return { ...render(<HandOrderingPhase {...props} />), props };
}

describe('HandOrderingPhase', () => {
    it('shows PassScreen when not ready', () => {
        renderPhase({ orderingReady: false });
        expect(screen.getByText('Hand device to')).toBeDefined();
        expect(screen.getByText('Player 3')).toBeDefined();
    });

    it('shows the "to arrange your hand" subtitle on the pass screen', () => {
        renderPhase({ orderingReady: false });
        expect(screen.getByText('to arrange your hand')).toBeDefined();
    });

    it('calls onReady when "I\'m ready" is clicked on the pass screen', () => {
        const { props } = renderPhase({ orderingReady: false });
        fireEvent.click(screen.getByText("I'm ready"));
        expect(props.onReady).toHaveBeenCalledOnce();
    });

    it('shows HandOrdering when ready', () => {
        renderPhase({ orderingReady: true });
        expect(screen.getByText('Arrange your hand')).toBeDefined();
        expect(screen.getByText('Player 3')).toBeDefined();
    });

    it('does not show PassScreen when ready', () => {
        renderPhase({ orderingReady: true });
        expect(screen.queryByText('Hand device to')).toBeNull();
    });

    it('does not show HandOrdering when not ready', () => {
        renderPhase({ orderingReady: false });
        expect(screen.queryByText('Arrange your hand')).toBeNull();
    });
});
