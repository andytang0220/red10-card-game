import './RulesOverlay.css';

export default function RulesOverlay({ onClose }) {
    return (
        <div className="rules-overlay" onClick={onClose}>
            <div className="rules-overlay__panel" onClick={e => e.stopPropagation()}>
                <button className="rules-overlay__close" onClick={onClose}>Close</button>

                <h2 className="rules-overlay__heading">How to Play Red10</h2>

                <div className="rules-overlay__content">
                    <section>
                        <h3>Objective</h3>
                        <p>
                            Be one of the first players to empty your hand. The last player with cards
                            is the loser and scores penalty points. The first player to reach 10 penalty
                            points loses the game.
                        </p>
                    </section>

                    <section>
                        <h3>Card Hierarchy</h3>
                        <p>
                            From lowest to highest: <strong>4, 5, 6, 7, 8, 9, 10, J, Q, K, A, 2, 3</strong>, then
                            Small Joker, Big Joker.
                        </p>
                    </section>

                    <section>
                        <h3>Teams</h3>
                        <p>
                            The two players holding a red 10 (10&#9829; or 10&#9830;) are secretly on the same team.
                            The other three players form the opposing team. Team membership is hidden until
                            a red 10 is played.
                        </p>
                    </section>

                    <section>
                        <h3>Trick Types</h3>
                        <ul>
                            <li><strong>Single</strong> &mdash; one card</li>
                            <li><strong>Pair</strong> &mdash; two cards of the same rank</li>
                            <li><strong>Straight</strong> &mdash; 5+ consecutive ranks (no 2s, 3s, or jokers)</li>
                            <li><strong>Straight Flush</strong> &mdash; a straight all in one suit</li>
                            <li><strong>Tractor</strong> &mdash; 3+ consecutive pairs</li>
                        </ul>
                    </section>

                    <section>
                        <h3>Bombs</h3>
                        <p>
                            Bombs beat any non-bomb trick. Bomb types from weakest to strongest:
                        </p>
                        <ul>
                            <li><strong>Triple</strong> &mdash; three of a kind</li>
                            <li><strong>Quadruple</strong> &mdash; four of a kind</li>
                            <li><strong>Straight Flush</strong> &mdash; also counts as a bomb</li>
                            <li><strong>Joker Bomb</strong> &mdash; both jokers (strongest bomb)</li>
                        </ul>
                    </section>

                    <section>
                        <h3>Gameplay</h3>
                        <p>
                            The player holding the 4&#9829; leads the first trick. Players take turns
                            playing a valid combination that beats the current trick, or passing. When all
                            other players pass, the trick winner leads the next trick.
                        </p>
                    </section>

                    <section>
                        <h3>Forks</h3>
                        <p>
                            When a player plays a card that exactly matches the value of the current trick
                            (same rank, different card), they may &ldquo;fork&rdquo; &mdash; taking over the trick
                            and becoming the new leader. The forking player may also choose a drawback for
                            the previous leader.
                        </p>
                    </section>

                    <section>
                        <h3>Scoring</h3>
                        <p>
                            At the end of each round, penalty points are assigned based on finishing position.
                            The loser (last player with cards) receives points. If the red 10 team sweeps
                            (finishes 1st and 2nd), the opposing team gets extra penalties. The game ends
                            when any player reaches 10 penalty points.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
