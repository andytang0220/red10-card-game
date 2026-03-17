// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import HandOrdering from './HandOrdering.jsx';

const mockHand = [
    { id: 'K-♦', rank: 'K', suit: '♦', value: 13, isJoker: false },
    { id: '7-♥', rank: '7', suit: '♥', value: 7, isJoker: false },
    { id: '8-♠', rank: '8', suit: '♠', value: 8, isJoker: false },
];

function renderOrdering(onDone = vi.fn()) {
    return render(<HandOrdering hand={mockHand} playerIndex={0} onDone={onDone} />);
}

afterEach(cleanup);

describe('HandOrdering', () => {
    it('shows player label', () => {
        renderOrdering();
        expect(screen.getByText('Player 1')).toBeDefined();
    });

    it('renders all cards pre-sorted by value', () => {
        const { container } = renderOrdering();
        const cards = container.querySelectorAll('.card');
        expect(cards).toHaveLength(3);
        // sortHand sorts by value ascending: 7 (7), 8 (8), K (13)
        const ranks = Array.from(cards).map(c => c.textContent);
        expect(ranks[0]).toContain('7');
        expect(ranks[1]).toContain('8');
        expect(ranks[2]).toContain('K');
    });

    it('confirm button is always enabled', () => {
        renderOrdering();
        const btn = screen.getByText('Confirm hand');
        expect(btn.disabled).toBe(false);
    });

    it('calls onDone with the hand array when confirm is clicked', () => {
        const onDone = vi.fn();
        renderOrdering(onDone);
        fireEvent.click(screen.getByText('Confirm hand'));
        expect(onDone).toHaveBeenCalledOnce();
        const ordered = onDone.mock.calls[0][0];
        expect(ordered).toHaveLength(3);
        // Pre-sorted: 7, 8, K
        expect(ordered.map(c => c.rank)).toEqual(['7', '8', 'K']);
    });

    it('all card wrappers are draggable', () => {
        const { container } = renderOrdering();
        const wrappers = container.querySelectorAll('.hand-ordering__card-wrapper');
        expect(wrappers).toHaveLength(3);
        wrappers.forEach(w => {
            expect(w.getAttribute('draggable')).toBe('true');
        });
    });

    it('adds dragging class on drag start', () => {
        const { container } = renderOrdering();
        const wrappers = container.querySelectorAll('.hand-ordering__card-wrapper');
        fireEvent.dragStart(wrappers[0], { dataTransfer: { effectAllowed: '' } });
        expect(wrappers[0].classList.contains('hand-ordering__card-wrapper--dragging')).toBe(true);
    });

    it('reorders cards on drop', () => {
        const onDone = vi.fn();
        const { container } = renderOrdering(onDone);
        const wrappers = container.querySelectorAll('.hand-ordering__card-wrapper');

        // Drag first card (7) and drop on third card (K)
        fireEvent.dragStart(wrappers[0], { dataTransfer: { effectAllowed: '' } });
        fireEvent.dragOver(wrappers[2], { dataTransfer: { dropEffect: '' }, preventDefault: () => {} });
        fireEvent.drop(wrappers[2], { dataTransfer: {}, preventDefault: () => {} });

        // Now confirm and check order: 8, K, 7 (moved 7 to after K)
        fireEvent.click(screen.getByText('Confirm hand'));
        const ordered = onDone.mock.calls[0][0];
        expect(ordered.map(c => c.rank)).toEqual(['8', 'K', '7']);
    });
});
