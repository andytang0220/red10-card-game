// Calculates points earned per member of each team for a round.
// finishOrder: player indices in order of finishing [1st, 2nd, 3rd, 4th]
// loser: player index of last place (5th)
// teams: { red: number[], black: number[] }
// Returns { red: number, black: number } — points per team member
export function calculateRoundPoints(finishOrder, loser, teams) {
    return {
        red: pointsForTeam(finishOrder, loser, teams.red),
        black: pointsForTeam(finishOrder, loser, teams.black),
    };
}

function pointsForTeam(finishOrder, loser, members) {
    const teamWon = members.includes(finishOrder[0]);
    const teamLost = members.includes(loser);

    // All members occupy the bottom (team size) positions
    const allPlaces = [...finishOrder, loser];
    const bottomPlaces = allPlaces.slice(allPlaces.length - members.length);
    const teamSweepLost = members.every(m => bottomPlaces.includes(m));

    if (teamSweepLost) return 2;
    if (!teamWon && teamLost) return 1;
    return 0;
}

// Adds round points to each player's score.
// roundPoints: { red: number, black: number }
// teams: { red: number[], black: number[] }
// Returns new scores array.
export function applyRoundScore(scores, roundPoints, teams) {
    return scores.map((score, i) => {
        if (teams.red.includes(i)) return score + roundPoints.red;
        if (teams.black.includes(i)) return score + roundPoints.black;
        return score;
    });
}

// Returns { over: bool, losingPlayers: number[] }.
// over is true when any player has reached or exceeded 10 points.
// losingPlayers contains the indices of all players at or above 10.
export function isGameOver(scores) {
    const losingPlayers = scores.reduce((acc, s, i) => {
        if (s >= 10) acc.push(i);
        return acc;
    }, []);
    return { over: losingPlayers.length > 0, losingPlayers };
}
