import './RoundSummary.css';

export default function RoundSummary({ finishOrder, loser, roundPoints, teams, scores, onNextRound, nextRoundLabel, nextRoundDisabled }) {
    const allPlaces = [...finishOrder, loser];

    return (
        <div className="round-summary">
            <h2 className="round-summary__title">Round Over</h2>

            <ol className="round-summary__order">
                {allPlaces.map((playerIndex, rank) => {
                    const isLoser = rank === allPlaces.length - 1;
                    const team = teams.red.includes(playerIndex) ? 'red' : 'black';
                    const pts = team === 'red' ? roundPoints.red : roundPoints.black;
                    return (
                        <li
                            key={playerIndex}
                            className={`round-summary__entry round-summary__entry--${team}${isLoser ? ' round-summary__entry--loser' : ''}`}
                        >
                            <span className="round-summary__rank">{rank + 1}.</span>
                            <span className="round-summary__name">Player {playerIndex + 1}</span>
                            <span className={`round-summary__team-badge round-summary__team-badge--${team}`}>
                                {team === 'red' ? '♥' : '♠'}
                            </span>
                            {pts > 0 && (
                                <span className="round-summary__pts">
                                    +{pts} pt{pts !== 1 ? 's' : ''}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>

            <div className="round-summary__teams">
                {['red', 'black'].map(team => {
                    const members = teams[team];
                    const pts = roundPoints[team];
                    return (
                        <div key={team} className={`round-summary__team-block round-summary__team-block--${team}`}>
                            <span className="round-summary__team-icon">
                                {team === 'red' ? '♥' : '♠'}
                            </span>
                            <span className="round-summary__team-members">
                                {members.map(i => `P${i + 1}`).join(', ')}
                            </span>
                            <span className="round-summary__team-pts">
                                {pts > 0 ? `+${pts} pt${pts !== 1 ? 's' : ''} each` : '0 pts'}
                            </span>
                        </div>
                    );
                })}
            </div>

            <div className="round-summary__scores">
                {scores.map((score, i) => (
                    <div key={i} className="round-summary__score-entry">
                        P{i + 1}: {score}
                    </div>
                ))}
            </div>

            <button className="round-summary__btn" onClick={onNextRound} disabled={nextRoundDisabled}>
                {nextRoundLabel || 'Next Round'}
            </button>
        </div>
    );
}
