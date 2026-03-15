// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Card from './Card.jsx';

const card = { id: '7-♥', rank: '7', suit: '♥', value: 7, isJoker: false };

describe('Card (smoke test)', () => {
    it('renders rank and suit', () => {
        render(<Card card={card} />);
        expect(screen.getAllByText('♥').length).toBeGreaterThanOrEqual(1);
    });

    it('applies card--selected class when selected', () => {
        const { container } = render(<Card card={card} selected />);
        expect(container.querySelector('.card--selected')).not.toBeNull();
    });

    it('does not apply card--selected class when not selected', () => {
        const { container } = render(<Card card={card} />);
        expect(container.querySelector('.card--selected')).toBeNull();
    });
});
