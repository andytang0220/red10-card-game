import './ActionBar.css';

export default function ActionBar({ onPlay, onPass, canFork, onFork, validationMessage }) {
    return (
        <div className="action-bar">
            <div className="action-bar__message">
                {validationMessage && <span>{validationMessage}</span>}
            </div>
            <div className="action-bar__buttons">
                <button className="action-bar__btn action-bar__btn--play" onClick={onPlay}>
                    Play
                </button>
                <button className="action-bar__btn action-bar__btn--pass" onClick={onPass}>
                    Pass
                </button>
                {canFork && (
                    <button className="action-bar__btn action-bar__btn--fork" onClick={onFork}>
                        Fork
                    </button>
                )}
            </div>
        </div>
    );
}
