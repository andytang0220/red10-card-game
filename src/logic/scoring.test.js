import { describe, it, expect } from 'vitest';
import { calculateRoundPoints, applyRoundScore, isGameOver } from './scoring.js';

// Red team: players 0 and 1 (2 members)
// Black team: players 2, 3, and 4 (3 members)
const teams = { red: [0, 1], black: [2, 3, 4] };

// --- calculateRoundPoints ---

describe('calculateRoundPoints', () => {
    it('gives 2 pts to black when all black members finish bottom 3', () => {
        // Red 1st and 2nd; black 3rd, 4th, last
        const { red, black } = calculateRoundPoints([0, 1, 2, 3], 4, teams);
        expect(red).toBe(0);
        expect(black).toBe(2);
    });

    it('gives 2 pts to red when all red members finish bottom 2', () => {
        // Black 1st, 2nd, 3rd; red 4th and last
        const { red, black } = calculateRoundPoints([2, 3, 4, 0], 1, teams);
        expect(red).toBe(2);
        expect(black).toBe(0);
    });

    it('gives 1 pt to red when no red won and one red is the loser (no sweep)', () => {
        // Black 1st; red 2nd; black 3rd and 4th; red last
        // Bottom 2 = [3, 1] — player 3 is black, so red does not sweep
        const { red, black } = calculateRoundPoints([2, 0, 4, 3], 1, teams);
        expect(red).toBe(1);
        expect(black).toBe(0);
    });

    it('gives 1 pt to black when no black won and one black is the loser (no sweep)', () => {
        // Red 1st; black 2nd; red 3rd; black 4th; black last
        // Bottom 3 = [1, 3, 4] — player 1 is red, so black does not sweep
        const { red, black } = calculateRoundPoints([0, 2, 1, 3], 4, teams);
        expect(red).toBe(0);
        expect(black).toBe(1);
    });

    it('gives 0 pts to both when no team has first or last', () => {
        // Black 1st; red 2nd and 3rd; black 4th; black last
        // Red: no first, no last → 0. Black: won → 0.
        const { red, black } = calculateRoundPoints([2, 0, 1, 3], 4, teams);
        expect(red).toBe(0);
        expect(black).toBe(0);
    });

    it('gives 0 pts to both when one red finished first and one red is the loser', () => {
        // Red 0 is first, red 1 is loser — cancel out → 0
        // Black: no first (red won), no last (red is loser) → 0
        const { red, black } = calculateRoundPoints([0, 2, 3, 4], 1, teams);
        expect(red).toBe(0);
        expect(black).toBe(0);
    });

    it('gives 0 pts to both when one black finished first and one black is the loser', () => {
        // Black 2 is first, black 4 is loser — cancel out → 0
        // Red: no first, no last → 0
        const { red, black } = calculateRoundPoints([2, 0, 1, 3], 4, teams);
        // Wait: loser is 4 (black). Black 2 is first. So black won AND lost → 0.
        // Re-check: finishOrder=[2,0,1,3], loser=4
        // Black teamWon=true (2 is 1st), teamLost=true (4 is loser) → 0 pts
        expect(red).toBe(0);
        expect(black).toBe(0);
    });
});

// --- applyRoundScore ---

describe('applyRoundScore', () => {
    it('adds red points to red team members and black points to black team members', () => {
        const result = applyRoundScore([0, 0, 0, 0, 0], { red: 2, black: 0 }, teams);
        expect(result).toEqual([2, 2, 0, 0, 0]);
    });

    it('accumulates on top of existing scores', () => {
        const result = applyRoundScore([1, 3, 2, 0, 1], { red: 1, black: 2 }, teams);
        expect(result).toEqual([2, 4, 4, 2, 3]);
    });

    it('returns unchanged scores when both teams score 0', () => {
        const result = applyRoundScore([5, 3, 2, 1, 4], { red: 0, black: 0 }, teams);
        expect(result).toEqual([5, 3, 2, 1, 4]);
    });

    it('does not mutate the original scores array', () => {
        const scores = [0, 0, 0, 0, 0];
        applyRoundScore(scores, { red: 2, black: 1 }, teams);
        expect(scores).toEqual([0, 0, 0, 0, 0]);
    });
});

// --- isGameOver ---

describe('isGameOver', () => {
    it('returns over: false and empty losingPlayers when no player has reached 10', () => {
        expect(isGameOver([0, 5, 9, 3, 7])).toEqual({ over: false, losingPlayers: [] });
    });

    it('returns over: true with the single player at exactly 10', () => {
        expect(isGameOver([0, 5, 10, 3, 7])).toEqual({ over: true, losingPlayers: [2] });
    });

    it('returns over: true with a single player above 10', () => {
        expect(isGameOver([0, 12, 5, 3, 7])).toEqual({ over: true, losingPlayers: [1] });
    });

    it('returns all players who reached 10+ when multiple cross the threshold', () => {
        expect(isGameOver([0, 10, 12, 3, 7])).toEqual({ over: true, losingPlayers: [1, 2] });
    });

    it('returns all players at 10+ even when their scores differ', () => {
        expect(isGameOver([10, 5, 11, 10, 3])).toEqual({ over: true, losingPlayers: [0, 2, 3] });
    });
});
