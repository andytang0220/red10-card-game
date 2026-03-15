// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import HandOrdering from './HandOrdering.jsx';

const mockHand = [
    { id: '7-♥', rank: '7', suit: '♥', value: 7, isJoker: false },
    { id: '8-♠', rank: '8', suit: '♠', value: 8, isJoker: false },
    { id: 'K-♦', rank: 'K', suit: '♦', value: 13, isJoker: false },
];

function renderOrdering(onDone = vi.fn()) {
    return render(<HandOrdering hand={mockHand} playerIndex={0} onDone={onDone} />);
}

// Finds a card element by its rank text within a specific section.
// Section is identified by its row label text ("Dealt cards" or "Your order").
function getCardInSection(container, sectionLabel, rank) {
    const labels = container.querySelectorAll('.hand-ordering__row-label');
    let section = null;
    for (const label of labels) {
        if (label.textContent === sectionLabel) {
            section = label.closest('.hand-ordering__section');
            break;
        }
    }
    if (!section) throw new Error(`Section "${sectionLabel}" not found`);
    const cards = section.querySelectorAll('.card');
    for (const card of cards) {
        if (card.textContent.includes(rank)) return card;
    }
    return null;
}

function getEmptySlots(container) {
    return container.querySelectorAll('.hand-ordering__slot');
}

afterEach(cleanup);

describe('HandOrdering', () => {
    it('shows player label', () => {
        renderOrdering();
        expect(screen.getByText('Player 1')).toBeDefined();
    });

    it('renders all dealt cards in the dealt row', () => {
        const { container } = renderOrdering();
        expect(getCardInSection(container, 'Dealt cards', '7')).not.toBeNull();
        expect(getCardInSection(container, 'Dealt cards', '8')).not.toBeNull();
        expect(getCardInSection(container, 'Dealt cards', 'K')).not.toBeNull();
    });

    it('starts with all empty slots in the order row', () => {
        const { container } = renderOrdering();
        const slots = getEmptySlots(container);
        expect(slots).toHaveLength(3);
    });

    it('Done button is disabled initially', () => {
        renderOrdering();
        const btn = screen.getByText('Done ordering hand');
        expect(btn.disabled).toBe(true);
    });

    it('selecting a dealt card highlights it', () => {
        const { container } = renderOrdering();
        const card = getCardInSection(container, 'Dealt cards', '7');
        fireEvent.click(card);
        expect(card.classList.contains('card--selected')).toBe(true);
    });

    it('clicking a selected card again deselects it', () => {
        const { container } = renderOrdering();
        const card = getCardInSection(container, 'Dealt cards', '7');
        fireEvent.click(card);
        fireEvent.click(card);
        expect(card.classList.contains('card--selected')).toBe(false);
    });

    it('selecting a card then clicking an empty slot places the card', () => {
        const { container } = renderOrdering();
        // Select the 7
        const card7 = getCardInSection(container, 'Dealt cards', '7');
        fireEvent.click(card7);
        // Click first empty slot
        const slot = getEmptySlots(container)[0];
        fireEvent.click(slot);
        // 7 should now be in the order row, not in dealt row
        expect(getCardInSection(container, 'Your order', '7')).not.toBeNull();
        expect(getCardInSection(container, 'Dealt cards', '7')).toBeNull();
    });

    it('clicking a filled slot with no selection returns the card to dealt row', () => {
        const { container } = renderOrdering();
        // Place 7 in first slot
        fireEvent.click(getCardInSection(container, 'Dealt cards', '7'));
        fireEvent.click(getEmptySlots(container)[0]);
        // Now click the filled slot (no card selected)
        const placedCard = getCardInSection(container, 'Your order', '7');
        fireEvent.click(placedCard);
        // 7 should be back in dealt row
        expect(getCardInSection(container, 'Dealt cards', '7')).not.toBeNull();
        expect(getCardInSection(container, 'Your order', '7')).toBeNull();
    });

    it('selecting a card then clicking a filled slot swaps them', () => {
        const { container } = renderOrdering();
        // Place 7 in first slot
        fireEvent.click(getCardInSection(container, 'Dealt cards', '7'));
        fireEvent.click(getEmptySlots(container)[0]);
        // Now select 8 from dealt row
        fireEvent.click(getCardInSection(container, 'Dealt cards', '8'));
        // Click the slot containing 7
        const placed7 = getCardInSection(container, 'Your order', '7');
        fireEvent.click(placed7);
        // 8 should be in the order row, 7 should be back in dealt
        expect(getCardInSection(container, 'Your order', '8')).not.toBeNull();
        expect(getCardInSection(container, 'Dealt cards', '7')).not.toBeNull();
    });

    it('enables Done button and shows "All cards placed" when all slots are filled', () => {
        const { container } = renderOrdering();
        // Place all 3 cards
        for (const rank of ['7', '8', 'K']) {
            fireEvent.click(getCardInSection(container, 'Dealt cards', rank));
            fireEvent.click(getEmptySlots(container)[0]);
        }
        expect(screen.getByText('Done ordering hand').disabled).toBe(false);
        expect(screen.getByText(/All cards placed/)).toBeDefined();
    });

    it('calls onDone with the ordered cards when Done is clicked', () => {
        const onDone = vi.fn();
        const { container } = render(<HandOrdering hand={mockHand} playerIndex={0} onDone={onDone} />);
        // Place cards in reverse order: K, 8, 7
        fireEvent.click(getCardInSection(container, 'Dealt cards', 'K'));
        fireEvent.click(getEmptySlots(container)[0]);
        fireEvent.click(getCardInSection(container, 'Dealt cards', '8'));
        fireEvent.click(getEmptySlots(container)[0]);
        fireEvent.click(getCardInSection(container, 'Dealt cards', '7'));
        fireEvent.click(getEmptySlots(container)[0]);
        // Click Done
        fireEvent.click(screen.getByText('Done ordering hand'));
        expect(onDone).toHaveBeenCalledOnce();
        const ordered = onDone.mock.calls[0][0];
        expect(ordered.map(c => c.rank)).toEqual(['K', '8', '7']);
    });

    it('empty slots get ready class when a card is selected', () => {
        const { container } = renderOrdering();
        // Before selecting: slots should not have ready class
        expect(container.querySelector('.hand-ordering__slot--ready')).toBeNull();
        // Select a card
        fireEvent.click(getCardInSection(container, 'Dealt cards', '7'));
        // Slots should now have ready class
        expect(container.querySelector('.hand-ordering__slot--ready')).not.toBeNull();
    });
});
