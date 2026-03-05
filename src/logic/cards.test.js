import { describe, it, expect } from 'vitest';
import {
    createDeck, shuffle, isRedTen, sortHand, cardDisplayLabel,
    CARD_VALUES, SMALL_JOKER_VALUE, BIG_JOKER_VALUE,
} from './cards';

describe('createDeck', () => {
    it('contains exactly 54 cards', () => {
        expect(createDeck()).toHaveLength(54);
    });

    it('contains exactly 2 jokers', () => {
        const jokers = createDeck().filter(c => c.isJoker);
        expect(jokers).toHaveLength(2);
    });

    it('contains a small joker and a big joker', () => {
        const deck = createDeck();
        expect(deck.find(c => c.value === SMALL_JOKER_VALUE)).toBeDefined();
        expect(deck.find(c => c.value === BIG_JOKER_VALUE)).toBeDefined();
    });

    it('contains both red 10s', () => {
        const deck = createDeck();
        expect(deck.find(c => c.rank === '10' && c.suit === '♥')).toBeDefined();
        expect(deck.find(c => c.rank === '10' && c.suit === '♦')).toBeDefined();
    });

    it('has no duplicate ids', () => {
        const deck = createDeck();
        const ids = new Set(deck.map(c => c.id));
        expect(ids.size).toBe(54);
    });

    it('non-joker cards have correct values', () => {
        const deck = createDeck().filter(c => !c.isJoker);
        for (const card of deck) {
            expect(card.value).toBe(CARD_VALUES[card.rank]);
        }
    });

    it('contains 4 suits with 13 cards each', () => {
        const deck = createDeck().filter(c => !c.isJoker);
        const suits = ['♥', '♦', '♣', '♠'];
        for (const suit of suits) {
            expect(deck.filter(c => c.suit === suit)).toHaveLength(13);
        }
    });
});

describe('shuffle', () => {
    it('returns a new array of the same length', () => {
        const deck = createDeck();
        const shuffled = shuffle(deck);
        expect(shuffled).toHaveLength(54);
        expect(shuffled).not.toBe(deck);
    });

    it('preserves all cards', () => {
        const deck = createDeck();
        const shuffled = shuffle(deck);
        const original = deck.map(c => c.id).sort();
        const result = shuffled.map(c => c.id).sort();
        expect(result).toEqual(original);
    });

    it('does not mutate the original deck', () => {
        const deck = createDeck();
        const firstId = deck[0].id;
        shuffle(deck);
        expect(deck[0].id).toBe(firstId);
    });

    it('changes the order of cards', () => {
        const deck = createDeck();
        // Run multiple times — statistically guaranteed to differ at least once
        const results = Array.from({ length: 10 }, () => shuffle(deck).map(c => c.id).join(','));
        const unique = new Set(results);
        expect(unique.size).toBeGreaterThan(1);
    });
});

describe('isRedTen', () => {
    it('returns true for 10♥', () => {
        expect(isRedTen({ rank: '10', suit: '♥', value: 10, isJoker: false })).toBe(true);
    });

    it('returns true for 10♦', () => {
        expect(isRedTen({ rank: '10', suit: '♦', value: 10, isJoker: false })).toBe(true);
    });

    it('returns false for 10♣', () => {
        expect(isRedTen({ rank: '10', suit: '♣', value: 10, isJoker: false })).toBe(false);
    });

    it('returns false for 10♠', () => {
        expect(isRedTen({ rank: '10', suit: '♠', value: 10, isJoker: false })).toBe(false);
    });

    it('returns false for J♥', () => {
        expect(isRedTen({ rank: 'J', suit: '♥', value: 11, isJoker: false })).toBe(false);
    });

    it('returns false for jokers', () => {
        expect(isRedTen({ rank: 'Jkr', suit: null, value: SMALL_JOKER_VALUE, isJoker: true })).toBe(false);
        expect(isRedTen({ rank: 'Jkr', suit: null, value: BIG_JOKER_VALUE, isJoker: true })).toBe(false);
    });
});

describe('sortHand', () => {
    it('sorts by value ascending', () => {
        const hand = [
            { id: 'A-♠', rank: 'A', suit: '♠', value: 14, isJoker: false },
            { id: '4-♥', rank: '4', suit: '♥', value: 4,  isJoker: false },
            { id: '2-♣', rank: '2', suit: '♣', value: 15, isJoker: false },
        ];
        const sorted = sortHand(hand);
        expect(sorted.map(c => c.rank)).toEqual(['4', 'A', '2']);
    });

    it('places small joker before big joker', () => {
        const hand = [
            { id: 'joker-big',   rank: 'Jkr', suit: null, value: BIG_JOKER_VALUE,   isJoker: true },
            { id: 'joker-small', rank: 'Jkr', suit: null, value: SMALL_JOKER_VALUE, isJoker: true },
        ];
        const sorted = sortHand(hand);
        expect(sorted[0].value).toBe(SMALL_JOKER_VALUE);
        expect(sorted[1].value).toBe(BIG_JOKER_VALUE);
    });

    it('places jokers at the end', () => {
        const hand = [
            { id: 'joker-small', rank: 'Jkr', suit: null, value: SMALL_JOKER_VALUE, isJoker: true },
            { id: '3-♥', rank: '3', suit: '♥', value: 16, isJoker: false },
        ];
        const sorted = sortHand(hand);
        expect(sorted[0].rank).toBe('3');
        expect(sorted[1].isJoker).toBe(true);
    });

    it('does not mutate the original hand', () => {
        const hand = [
            { id: 'A-♠', rank: 'A', suit: '♠', value: 14, isJoker: false },
            { id: '4-♥', rank: '4', suit: '♥', value: 4,  isJoker: false },
        ];
        const firstId = hand[0].id;
        sortHand(hand);
        expect(hand[0].id).toBe(firstId);
    });
});

describe('cardDisplayLabel', () => {
    it('formats a regular card as rank+suit', () => {
        expect(cardDisplayLabel({ rank: '10', suit: '♥', isJoker: false })).toBe('10♥');
    });

    it('formats small joker as Jkr(S)', () => {
        expect(cardDisplayLabel({ rank: 'Jkr', suit: null, value: SMALL_JOKER_VALUE, isJoker: true })).toBe('Jkr(S)');
    });

    it('formats big joker as Jkr(B)', () => {
        expect(cardDisplayLabel({ rank: 'Jkr', suit: null, value: BIG_JOKER_VALUE, isJoker: true })).toBe('Jkr(B)');
    });
});
