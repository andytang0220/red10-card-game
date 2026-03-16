import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SESSION_KEY = 'red10_session';

function saveSession(code, playerId) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ code, playerId }));
}

function loadSession() {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const { code, playerId } = JSON.parse(raw);
        if (code && playerId) return { code, playerId };
    } catch { /* ignore */ }
    return null;
}

function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
}

export function useMultiplayerEngine() {
    const socketRef = useRef(null);
    const reconnectAttemptedRef = useRef(false);

    // Connection / lobby state
    const [connected, setConnected] = useState(false);
    const [roomCode, setRoomCode] = useState(null);
    const [playerIndex, setPlayerIndex] = useState(null);
    const [playerCount, setPlayerCount] = useState(0);
    const [inGame, setInGame] = useState(false);
    const [lobbyError, setLobbyError] = useState(null);
    const [waitingForOrdering, setWaitingForOrdering] = useState(false);
    const [waitingForNextRound, setWaitingForNextRound] = useState(false);
    const [readyCount, setReadyCount] = useState(0);

    // Game state from server
    const [serverState, setServerState] = useState(null);

    // Client-local UI state
    const [selectedCards, setSelectedCards] = useState([]);
    const [validationMessage, setValidationMessage] = useState(null);

    // Connect socket on mount
    useEffect(() => {
        const socket = io({ transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);

            // Attempt reconnection if we have a saved session
            if (!reconnectAttemptedRef.current) {
                reconnectAttemptedRef.current = true;
                const session = loadSession();
                if (session) {
                    socket.emit('reconnect_room', session);
                }
            }
        });

        socket.on('disconnect', () => setConnected(false));

        socket.on('room_created', ({ code, playerIndex: pi, playerId }) => {
            setRoomCode(code);
            setPlayerIndex(pi);
            setPlayerCount(1);
            setLobbyError(null);
            saveSession(code, playerId);
        });

        socket.on('room_joined', ({ code, playerIndex: pi, playerCount: pc, playerId }) => {
            setRoomCode(code);
            setPlayerIndex(pi);
            setPlayerCount(pc);
            setLobbyError(null);
            saveSession(code, playerId);
        });

        socket.on('reconnected', ({ playerIndex: pi, playerCount: pc, code }) => {
            setRoomCode(code);
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
            setWaitingForNextRound(false);
            setReadyCount(0);
            // Clear selected cards when state updates
            setSelectedCards([]);
            setValidationMessage(null);
        });

        socket.on('waiting_for_others', () => {
            setWaitingForOrdering(true);
        });

        socket.on('ready_count', ({ readyCount: rc }) => {
            setReadyCount(rc);
        });

        socket.on('error', ({ message }) => {
            setLobbyError(prev => prev);
            // Use functional updates to read current inGame without dependency
            setInGame(current => {
                if (!current) {
                    setLobbyError(message);
                } else {
                    setValidationMessage(message);
                }
                return current;
            });
        });

        return () => {
            socket.disconnect();
        };
    }, []);

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
        setRoomCode(code.toUpperCase());
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
        clearSession();
        emit('action', { type: 'NEW_GAME' });
    }, [emit]);

    const setOrderingReady = useCallback(() => {
        emit('action', { type: 'SET_ORDERING_READY' });
    }, [emit]);

    const readyNextRound = useCallback(() => {
        setWaitingForNextRound(true);
        emit('action', { type: 'READY_NEXT_ROUND' });
    }, [emit]);

    const startRound = useCallback(() => {
        // In multiplayer, startRound is handled via readyNextRound
        // This is a no-op to keep the interface consistent
    }, []);

    const enterPlaying = useCallback(() => {
        // pass_screen is auto-skipped on server, this is a no-op
    }, []);

    // Build the return object to match useGameEngine's shape
    const s = serverState || {};

    return {
        gameState: serverState || { roundNumber: 1 },

        phase: s.phase || 'setup',
        activePlayerIndex: s.activePlayerIndex ?? 0,
        currentTrick: s.currentTrick || null,
        hand: s.hand || [],
        hands: s.hand ? undefined : [[], [], [], [], []],
        handCounts: s.handCounts || [0, 0, 0, 0, 0],
        scores: s.scores || [0, 0, 0, 0, 0],
        revealedRedTens: s.revealedRedTens || [],
        teams: s.teams || { red: [], black: [] },
        finishOrder: s.finishOrder || [],
        forkWindow: s.forkWindow || null,
        orderingPlayerIndex: s.orderingPlayerIndex ?? 0,
        orderingReady: s.orderingReady ?? false,
        roundPoints: s.roundPoints || { red: 0, black: 0 },

        selectedCards,
        validationMessage,

        startRound,
        handlePlay,
        handlePass,
        handleCardClick,
        handleForkAccept,
        handleOrderingDone,
        handleNewGame,
        setOrderingReady,
        enterPlaying,

        connected,
        roomCode,
        playerIndex,
        playerCount,
        inGame,
        lobbyError,
        waitingForOrdering,
        waitingForNextRound,
        readyCount,
        readyNextRound,
        createRoom,
        joinRoom,
    };
}
