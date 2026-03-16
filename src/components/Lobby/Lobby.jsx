import { useState } from 'react';

function Lobby({ engine }) {
    const [joinCode, setJoinCode] = useState('');
    const { connected, roomCode, playerIndex, playerCount, lobbyError, createRoom, joinRoom } = engine;

    if (!connected) {
        return (
            <div className="app app--centered">
                <h1 className="app__title">Red10</h1>
                <p>Connecting to server...</p>
            </div>
        );
    }

    // Already in a room — show waiting screen
    if (roomCode !== null) {
        return (
            <div className="app app--centered">
                <h1 className="app__title">Red10</h1>
                <p className="lobby__info">Room Code: <strong className="lobby__code">{roomCode}</strong></p>
                <p className="lobby__info">You are Player {playerIndex + 1}</p>
                <p className="lobby__info">Waiting for players... ({playerCount}/5)</p>
                {playerCount >= 5 && <p className="lobby__info">Starting game...</p>}
            </div>
        );
    }

    // Not in a room — show create/join
    return (
        <div className="app app--centered">
            <h1 className="app__title">Red10 Online</h1>

            <button className="app__start-btn" onClick={createRoom}>
                Create Room
            </button>

            <div className="lobby__divider">— or —</div>

            <div className="lobby__join">
                <input
                    className="lobby__input"
                    type="text"
                    placeholder="Room code"
                    maxLength={4}
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                />
                <button
                    className="app__start-btn"
                    onClick={() => joinRoom(joinCode)}
                    disabled={joinCode.length < 4}
                >
                    Join Room
                </button>
            </div>

            {lobbyError && <p className="lobby__error">{lobbyError}</p>}
        </div>
    );
}

export default Lobby;
