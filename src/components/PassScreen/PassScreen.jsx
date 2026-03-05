import './PassScreen.css';

export default function PassScreen({ playerIndex, onReady, subtitle }) {
    return (
        <div className="pass-screen">
            <div className="pass-screen__prompt">Hand device to</div>
            <div className="pass-screen__player">Player {playerIndex + 1}</div>
            {subtitle && <div className="pass-screen__subtitle">{subtitle}</div>}
            <button className="pass-screen__btn" onClick={onReady}>
                I'm ready
            </button>
        </div>
    );
}
