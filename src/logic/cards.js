const SUITS = ['♥', '♦', '♣', '♠'];
const RANKS = ['4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', '3'];

export const CARD_VALUES = {
    '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15, '3': 16,
};
export const SMALL_JOKER_VALUE = 17;
export const BIG_JOKER_VALUE = 18;

export function createDeck() {
    const deck = [];

    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({
                id: `${rank}-${suit}`,
                rank,
                suit,
                value: CARD_VALUES[rank],
                isJoker: false,
            });
        }
    }

    deck.push({ id: 'joker-small', rank: 'Jkr', suit: null, value: SMALL_JOKER_VALUE, isJoker: true });
    deck.push({ id: 'joker-big',   rank: 'Jkr', suit: null, value: BIG_JOKER_VALUE,   isJoker: true });

    return deck;
}

export function shuffle(deck) {
    const result = [...deck];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

export function isRedTen(card) {
    return card.rank === '10' && (card.suit === '♥' || card.suit === '♦');
}

export function sortHand(hand) {
    return [...hand].sort((a, b) => {
        if (a.value !== b.value) return a.value - b.value;
        // secondary sort by suit for readability (jokers have null suit)
        const suitOrder = { '♣': 0, '♦': 1, '♥': 2, '♠': 3 };
        return (suitOrder[a.suit] ?? 4) - (suitOrder[b.suit] ?? 4);
    });
}

export function cardDisplayLabel(card) {
    if (card.isJoker) {
        return card.value === BIG_JOKER_VALUE ? 'Jkr(B)' : 'Jkr(S)';
    }
    return `${card.rank}${card.suit}`;
}
