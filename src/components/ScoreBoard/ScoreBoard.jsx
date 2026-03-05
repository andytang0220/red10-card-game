import './ScoreBoard.css';

const PLACEMENTS = ['1st', '2nd', '3rd', '4th'];

export default function ScoreBoard({ scores, revealedRedTens, teams, finishOrder }) {
    return (
        <div className="scoreboard">
            {scores.map((score, i) => {
                const isRevealed = revealedRedTens.includes(i);
                const team = isRevealed
                    ? (teams.red.includes(i) ? 'red' : 'black')
                    : null;
                const placeIndex = finishOrder.indexOf(i);
                const placement = placeIndex !== -1 ? PLACEMENTS[placeIndex] : null;
                return (
                    <div
                        key={i}
                        className={`scoreboard__player${team ? ` scoreboard__player--${team}` : ''}${placement ? ' scoreboard__player--finished' : ''}`}
                    >
                        <span className="scoreboard__name">P{i + 1}</span>
                        <span className="scoreboard__score">{score}</span>
                        {isRevealed && (
                            <span className="scoreboard__team">
                                {team === 'red' ? '♥' : '♠'}
                            </span>
                        )}
                        {placement && (
                            <span className="scoreboard__placement">{placement}</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
