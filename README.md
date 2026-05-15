# Red10 Card Game

A 5-player web implementation of the Red10 card game built with React + Vite, playable locally on a single device or online with friends.

## Overview

Red10 is a trick-based card game for 5 players. Each round, players are secretly divided into two teams based on who holds a red 10 (10♥ or 10♦) in their hand. The goal is to empty your hand before the other players. Points are bad — the first player to reach 10 points loses.

## Play Modes

### Local Play
All 5 players share a single device, taking turns in a hot-seat style. No server or internet connection required — all game logic runs in the browser.

### Online Play
Play with friends over the internet using real-time networking powered by Socket.io.

- **Room system** — Create a room and share a 4-character code with friends, or join an existing room by entering its code.
- **Automatic start** — The game begins as soon as 5 players have joined.
- **Session persistence** — If you disconnect, you can rejoin the same room and pick up where you left off.
- **Private hands** — Each player only sees their own cards; the server filters game state per player before sending updates.

## How to Play

### Setup
- A 54-card deck (52 standard + small Joker + big Joker) is dealt to all 5 players
- The player holding the 4♥ goes first
- Each player privately arranges their hand before play begins
- Teams are secret: **Red team** = players holding a red 10, **Black team** = everyone else

### Card Values (low → high)
```
4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2 < 3 < Small Joker < Big Joker
```

### Valid Tricks
| Trick | Description |
|-------|-------------|
| **Single** | Any one card |
| **Pair** | Two cards of the same value |
| **Straight** | 3+ consecutive values, no Jokers (wrap-around allowed: e.g. 3-4-5) |
| **Straight Flush** | A straight where all cards share the same suit (beats a non-flush straight of equal or lower value) |
| **Tractor** | A straight of pairs (e.g. [6,6][7,7]); minimum 2 pairs |
| **Bomb** | 3+ of a kind |
| **Atomic Bomb** | Exactly 4 of a kind (beats regular bombs) |
| **Joker Bomb** | Small Joker + Big Joker |
| **Red Ten Bomb** | 10♥ + 10♦ (the strongest bomb) |

Bombs can be played at any time to beat any non-bomb trick.

### Trick Flow
- The leading player plays any valid trick; all subsequent players must play the **same trick type and length** (or a bomb)
- Players may **pass** instead of playing — but once you pass, you cannot play again until the next trick
- The trick ends when all other players have passed; the last player to play wins and leads the next trick

### Forks & Drawbacks
- **Fork**: During a single-card trick, any player who holds a pair of that card's value may interrupt and play the pair out of turn (before the next player acts). The forking player then leads the next trick with their pair.
- **Drawback**: Immediately after a fork, any player holding the remaining card of that value may play it out of turn. The drawback ends the trick immediately, and the drawback player leads next.

### Round End & Scoring
A round ends when 4 of the 5 players have emptied their hands (or when one entire team finishes before the other).

| Outcome | Points |
|---------|--------|
| Your team occupies the bottom N places (N = team size) | **+2 pts** per member |
| No team member finished 1st, but one finished last | **+1 pt** per member |
| Otherwise | **0 pts** |

The game ends when any player reaches **10 points**. Lowest score wins.

## Running Locally

```bash
npm install
npm run dev
```

For online play, also start the game server:

```bash
npm run server
```

The server runs on port 3001 by default. In development, Vite proxies WebSocket connections to the server automatically.

## Running Tests

```bash
npm test
```

## Tech Stack
- **React** + **Vite**
- **Express** + **Socket.io** for online multiplayer
- **Vitest** for unit tests
- Plain CSS (one file per component)
