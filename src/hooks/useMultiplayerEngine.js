import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

export function useMultiplayerEngine() {
    const socketRef = useRef(null);

    // Connection / lobby state
    const [connected, setConnected] = useState(false);
    const [roomCode, setRoomCode] = useState(null);
    const [playerIndex, setPlayerIndex] = useState(null);
    const [playerCount, setPlayerCount] = useState(0);
    const [inGame, setInGame] = useState(false);
    const [lobbyError, setLobbyError] = useState(null);
    const [waitingForOrdering, setWaitingForOrdering] = useState(false);

    // Game state from server
    const [serverState, setServerState] = useState(null);

    // Client-local UI state
    const [selectedCards, setSelectedCards] = useState([]);
    const [validationMessage, setValidationMessage] = useState(null);

    // Connect socket on mount
    useEffect(() => {
        const socket = io({ transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('connect', () => setConnected(true));
        socket.on('disconnect', () => setConnected(false));

        socket.on('room_created', ({ code, playerIndex: pi }) => {
            setRoomCode(code);
            setPlayerIndex(pi);
            setPlayerCount(1);
            setLobbyError(null);
        });

        socket.on('room_joined', ({ playerIndex: pi, playerCount: pc }) => {
            setPlayerIndex(pi);
            setPlayerCount(pc);
            setLobbyError(null);
        });

        socket.on('player_joined', ({ playerCount: pc }) => {
            setPlayerCount(pc);
        });

        socket.on('state_update', (view) => {
            setServerState(view);
            setInGame(true);
            setWaitingForOrdering(false);
            // Clear selected cards when it's no longer our turn or phase changed
            setSelectedCards([]);
            setValidationMessage(null);
        });

        socket.on('waiting_for_others', () => {
            setWaitingForOrdering(true);
        });

        socket.on('error', ({ message }) => {
            if (!inGame) {
                setLobbyError(message);
            } else {
                setValidationMessage(message);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const emit = useCallback((event, data) => {
        socketRef.current?.emit(event, data);
    }, []);

    // Lobby actions
    const createRoom = useCallback(() => {
        setLobbyError(null);
        emit('create_room');
    }, [emit]);

    const joinRoom = useCallback((code) => {
        setLobbyError(null);
        emit('join_room', { code });
    }, [emit]);

    // Game action handlers — mirror useGameEngine interface
    const handleCardClick = useCallback((card) => {
        setValidationMessage(null);
        setSelectedCards(prev => {
            const already = prev.some(c => c.id === card.id);
            return already ? prev.filter(c => c.id !== card.id) : [...prev, card];
        });
    }, []);

    const handlePlay = useCallback(() => {
        if (selectedCards.length === 0) {
            setValidationMessage('Select cards to play first.');
            return;
        }
        emit('action', { type: 'PLAY_CARD', cards: selectedCards });
        setSelectedCards([]);
    }, [emit, selectedCards]);

    const handlePass = useCallback(() => {
        emit('action', { type: 'PASS_TURN' });
    }, [emit]);

    const handleForkAccept = useCallback(() => {
        emit('action', { type: 'FORK_ACCEPT' });
    }, [emit]);

    const handleOrderingDone = useCallback((orderedHand) => {
        emit('action', { type: 'ORDER_HAND_DONE', orderedHand });
    }, [emit]);

    const handleNewGame = useCallback(() => {
        emit('action', { type: 'NEW_GAME' });
    }, [emit]);

    const setOrderingReady = useCallback(() => {
        // In multiplayer, there's no pass screen between players,
        // so SET_ORDERING_READY is just local UI (proceed to ordering)
        emit('action', { type: 'SET_ORDERING_READY' });
    }, [emit]);

    const startRound = useCallback((existingScores, roundNumber) => {
        emit('action', { type: 'START_ROUND', existingScores, roundNumber });
    }, [emit]);

    const enterPlaying = useCallback(() => {
        // pass_screen is auto-skipped on server, this is a no-op
    }, []);

    // Build the return object to match useGameEngine's shape
    // When we have server state, use it; otherwise return defaults
    const s = serverState || {};

    return {
        // Full state access (for gameState.roundNumber)
        gameState: serverState || { roundNumber: 1 },

        // Game state fields from server
        phase: s.phase || 'setup',
        activePlayerIndex: s.activePlayerIndex ?? 0,
        currentTrick: s.currentTrick || null,
        hand: s.hand || [],
        hands: s.hand ? undefined : [[], [], [], [], []], // not used in multiplayer views
        handCounts: s.handCounts || [0, 0, 0, 0, 0],
        scores: s.scores || [0, 0, 0, 0, 0],
        revealedRedTens: s.revealedRedTens || [],
        teams: s.teams || { red: [], black: [] },
        finishOrder: s.finishOrder || [],
        forkWindow: s.forkWindow || null,
        orderingPlayerIndex: s.orderingPlayerIndex ?? 0,
        orderingReady: s.orderingReady ?? false,
        roundPoints: s.roundPoints || { red: 0, black: 0 },

        // Client-local UI state
        selectedCards,
        validationMessage,

        // Handlers
        startRound,
        handlePlay,
        handlePass,
        handleCardClick,
        handleForkAccept,
        handleOrderingDone,
        handleNewGame,
        setOrderingReady,
        enterPlaying,

        // Multiplayer-specific
        connected,
        roomCode,
        playerIndex,
        playerCount,
        inGame,
        lobbyError,
        waitingForOrdering,
        createRoom,
        joinRoom,
    };
}
