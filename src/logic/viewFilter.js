/**
 * Filters the full game state down to what a single player is allowed to see.
 * Pure function — no React dependency, can run on server or client.
 */
export function getPlayerView(state, playerIndex) {
    return {
        // Public state
        phase: state.phase,
        activePlayerIndex: state.activePlayerIndex,
        trickStarter: state.trickStarter,
        currentTrick: state.currentTrick,
        passesThisRound: state.passesThisRound,
        revealedRedTens: state.revealedRedTens,
        scores: state.scores,
        finishOrder: state.finishOrder,
        roundNumber: state.roundNumber,
        teams: state.teams,
        orderingPlayerIndex: state.orderingPlayerIndex,
        orderingReady: state.orderingReady,
        roundPoints: state.roundPoints,

        // Filtered: own hand + card counts for others
        hand: state.hands[playerIndex],
        handCounts: state.hands.map(h => h.length),

        // Filtered: fork window
        forkWindow: state.forkWindow
            ? state.forkWindow.pendingPlayerIndex === playerIndex
                ? state.forkWindow
                : { stage: state.forkWindow.stage, value: state.forkWindow.value, isYours: false }
            : null,

        // Private UI state (only for the active player)
        selectedCards: playerIndex === state.activePlayerIndex ? state.selectedCards : [],
        validationMessage: playerIndex === state.activePlayerIndex ? state.validationMessage : null,
    };
}
