# Tests

Unit tests for the chess engine logic using [vitest](https://vitest.dev/).

## Setup

```
npm install
```

## Run tests

```
npm test
```

## What's tested

The tests cover the pure chess logic in `chess-engine.js`:

- **FEN parsing** — starting position, empty board, puzzle positions
- **Coordinate conversion** — algebraic notation round-trips (e.g. `e4` to/from row/col)
- **Bounds checking** — valid and out-of-range board coordinates
- **Board cloning** — deep copy independence
- **Piece movement** — pawns, knights, bishops, rooks, queens, kings
- **Check detection** — rook, bishop, knight, and pawn checks; blocked paths
- **Checkmate detection** — back rank mate, smothered mate, escape/block scenarios
- **Puzzle verification** — both puzzle positions produce correct legal moves and mate
