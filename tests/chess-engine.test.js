import { describe, it, expect } from 'vitest';
const engine = require('../themes/terminal-books/assets/js/chess-engine.js');

const {
  parseFEN,
  toAlgebraic,
  fromAlgebraic,
  inBounds,
  cloneBoard,
  findKing,
  isSquareAttackedBy,
  isInCheck,
  rawMoves,
  legalMoves,
  hasLegalMoves,
  isCheckmate,
} = engine;

// ── Helper: sort moves for stable comparisons ──────────
function sortMoves(moves) {
  return moves.slice().sort(function (a, b) {
    return a.row - b.row || a.col - b.col;
  });
}

function moveSet(moves) {
  return new Set(moves.map(function (m) { return m.row + ',' + m.col; }));
}

// ── FEN Parsing ────────────────────────────────────────

describe('parseFEN', () => {
  it('parses the starting position', () => {
    const board = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    // Row 0 = rank 8 (black back rank)
    expect(board[0][0]).toEqual({ piece: 'R', color: 'b' });
    expect(board[0][4]).toEqual({ piece: 'K', color: 'b' });
    // Row 1 = rank 7 (black pawns)
    for (let c = 0; c < 8; c++) {
      expect(board[1][c]).toEqual({ piece: 'P', color: 'b' });
    }
    // Rows 2-5 = empty
    for (let r = 2; r <= 5; r++) {
      for (let c = 0; c < 8; c++) {
        expect(board[r][c]).toBeNull();
      }
    }
    // Row 6 = white pawns
    for (let c = 0; c < 8; c++) {
      expect(board[6][c]).toEqual({ piece: 'P', color: 'w' });
    }
    // Row 7 = white back rank
    expect(board[7][0]).toEqual({ piece: 'R', color: 'w' });
    expect(board[7][4]).toEqual({ piece: 'K', color: 'w' });
  });

  it('parses an empty board', () => {
    const board = parseFEN('8/8/8/8/8/8/8/8 w - - 0 1');
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        expect(board[r][c]).toBeNull();
      }
    }
  });

  it('parses puzzle 1 FEN (back rank mate)', () => {
    // 6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1
    const board = parseFEN('6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1');
    expect(board[0][6]).toEqual({ piece: 'K', color: 'b' });
    expect(board[1][5]).toEqual({ piece: 'P', color: 'b' });
    expect(board[1][6]).toEqual({ piece: 'P', color: 'b' });
    expect(board[1][7]).toEqual({ piece: 'P', color: 'b' });
    expect(board[7][0]).toEqual({ piece: 'R', color: 'w' });
    expect(board[7][4]).toEqual({ piece: 'K', color: 'w' });
  });

  it('parses puzzle 2 FEN (queen checkmate)', () => {
    // 6k1/7p/5K2/8/8/8/8/Q7 w - - 0 1
    const board = parseFEN('6k1/7p/5K2/8/8/8/8/Q7 w - - 0 1');
    expect(board[0][6]).toEqual({ piece: 'K', color: 'b' });
    expect(board[1][7]).toEqual({ piece: 'P', color: 'b' });
    expect(board[2][5]).toEqual({ piece: 'K', color: 'w' });
    expect(board[7][0]).toEqual({ piece: 'Q', color: 'w' });
  });

  it('returns 8x8 board', () => {
    const board = parseFEN('8/8/8/8/8/8/8/8 w - - 0 1');
    expect(board.length).toBe(8);
    board.forEach(row => expect(row.length).toBe(8));
  });

  it('distinguishes piece colors correctly', () => {
    const board = parseFEN('r3k3/8/8/8/8/8/8/R3K3 w - - 0 1');
    expect(board[0][0].color).toBe('b');
    expect(board[7][0].color).toBe('w');
    expect(board[0][4].color).toBe('b');
    expect(board[7][4].color).toBe('w');
  });
});

// ── Coordinate Conversion ──────────────────────────────

describe('toAlgebraic', () => {
  it('converts corners correctly', () => {
    expect(toAlgebraic(0, 0)).toBe('a8');
    expect(toAlgebraic(0, 7)).toBe('h8');
    expect(toAlgebraic(7, 0)).toBe('a1');
    expect(toAlgebraic(7, 7)).toBe('h1');
  });

  it('converts middle squares', () => {
    expect(toAlgebraic(4, 3)).toBe('d4');
    expect(toAlgebraic(3, 4)).toBe('e5');
  });
});

describe('fromAlgebraic', () => {
  it('converts corners correctly', () => {
    expect(fromAlgebraic('a8')).toEqual({ row: 0, col: 0 });
    expect(fromAlgebraic('h8')).toEqual({ row: 0, col: 7 });
    expect(fromAlgebraic('a1')).toEqual({ row: 7, col: 0 });
    expect(fromAlgebraic('h1')).toEqual({ row: 7, col: 7 });
  });

  it('converts middle squares', () => {
    expect(fromAlgebraic('d4')).toEqual({ row: 4, col: 3 });
    expect(fromAlgebraic('e5')).toEqual({ row: 3, col: 4 });
  });
});

describe('toAlgebraic/fromAlgebraic round-trips', () => {
  it('round-trips all 64 squares', () => {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const alg = toAlgebraic(r, c);
        const back = fromAlgebraic(alg);
        expect(back).toEqual({ row: r, col: c });
      }
    }
  });
});

// ── Bounds Checking ────────────────────────────────────

describe('inBounds', () => {
  it('returns true for all valid squares', () => {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        expect(inBounds(r, c)).toBe(true);
      }
    }
  });

  it('returns false for out-of-range values', () => {
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(0, -1)).toBe(false);
    expect(inBounds(8, 0)).toBe(false);
    expect(inBounds(0, 8)).toBe(false);
    expect(inBounds(-1, -1)).toBe(false);
    expect(inBounds(8, 8)).toBe(false);
  });
});

// ── Board Cloning ──────────────────────────────────────

describe('cloneBoard', () => {
  it('creates a deep copy', () => {
    const board = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const clone = cloneBoard(board);

    // Equal values
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        expect(clone[r][c]).toEqual(board[r][c]);
      }
    }
  });

  it('mutating clone does not affect original', () => {
    const board = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const clone = cloneBoard(board);

    // Mutate clone
    clone[0][0] = null;
    clone[7][4].piece = 'Q';

    // Original unchanged
    expect(board[0][0]).toEqual({ piece: 'R', color: 'b' });
    expect(board[7][4]).toEqual({ piece: 'K', color: 'w' });
  });

  it('preserves null squares', () => {
    const board = parseFEN('8/8/8/8/8/8/8/8 w - - 0 1');
    const clone = cloneBoard(board);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        expect(clone[r][c]).toBeNull();
      }
    }
  });
});

// ── findKing ───────────────────────────────────────────

describe('findKing', () => {
  it('finds white king in starting position', () => {
    const board = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(findKing(board, 'w')).toEqual({ row: 7, col: 4 });
  });

  it('finds black king in starting position', () => {
    const board = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(findKing(board, 'b')).toEqual({ row: 0, col: 4 });
  });

  it('returns null if no king present', () => {
    const board = parseFEN('8/8/8/8/8/8/8/8 w - - 0 1');
    expect(findKing(board, 'w')).toBeNull();
  });
});

// ── Pawn Moves ─────────────────────────────────────────

describe('pawn moves', () => {
  it('white pawn can move forward one square', () => {
    const board = parseFEN('8/8/8/8/8/4P3/8/8 w - - 0 1');
    // White pawn on e3 (row 5, col 4)
    const moves = rawMoves(board, 5, 4);
    expect(moves).toEqual([{ row: 4, col: 4 }]);
  });

  it('white pawn can double push from starting row', () => {
    const board = parseFEN('8/8/8/8/8/8/4P3/8 w - - 0 1');
    // White pawn on e2 (row 6, col 4)
    const moves = rawMoves(board, 6, 4);
    const set = moveSet(moves);
    expect(set.has('5,4')).toBe(true);
    expect(set.has('4,4')).toBe(true);
    expect(moves.length).toBe(2);
  });

  it('black pawn moves in opposite direction', () => {
    const board = parseFEN('8/4p3/8/8/8/8/8/8 w - - 0 1');
    // Black pawn on e7 (row 1, col 4)
    const moves = rawMoves(board, 1, 4);
    const set = moveSet(moves);
    expect(set.has('2,4')).toBe(true);
    expect(set.has('3,4')).toBe(true);
    expect(moves.length).toBe(2);
  });

  it('pawn captures diagonally', () => {
    const board = parseFEN('8/8/8/3p1p2/4P3/8/8/8 w - - 0 1');
    // White pawn e4 (row 4, col 4), black pawns d5 (row 3, col 3) and f5 (row 3, col 5)
    const moves = rawMoves(board, 4, 4);
    const set = moveSet(moves);
    expect(set.has('3,4')).toBe(true);  // forward
    expect(set.has('3,3')).toBe(true);  // capture left
    expect(set.has('3,5')).toBe(true);  // capture right
    expect(moves.length).toBe(3);
  });

  it('pawn cannot move backward', () => {
    const board = parseFEN('8/8/8/4P3/8/8/8/8 w - - 0 1');
    // White pawn e5 (row 3, col 4)
    const moves = rawMoves(board, 3, 4);
    const set = moveSet(moves);
    // Should only move forward (up for white = decreasing row)
    expect(set.has('4,4')).toBe(false);
    expect(set.has('2,4')).toBe(true);
  });

  it('pawn blocked by piece in front', () => {
    const board = parseFEN('8/8/8/8/4p3/4P3/8/8 w - - 0 1');
    // White pawn e3, black pawn e4 blocking
    const moves = rawMoves(board, 5, 4);
    expect(moves.length).toBe(0);
  });

  it('pawn cannot double push if blocked on first square', () => {
    const board = parseFEN('8/8/8/8/8/4p3/4P3/8 w - - 0 1');
    // White pawn e2 (row 6), blocked by black pawn e3 (row 5)
    const moves = rawMoves(board, 6, 4);
    expect(moves.length).toBe(0);
  });
});

// ── Knight Moves ───────────────────────────────────────

describe('knight moves', () => {
  it('knight in center has 8 moves', () => {
    const board = parseFEN('8/8/8/4N3/8/8/8/8 w - - 0 1');
    // White knight e5 (row 3, col 4)
    const moves = rawMoves(board, 3, 4);
    expect(moves.length).toBe(8);
  });

  it('knight in corner has 2 moves', () => {
    const board = parseFEN('N7/8/8/8/8/8/8/8 w - - 0 1');
    // White knight a8 (row 0, col 0)
    const moves = rawMoves(board, 0, 0);
    expect(moves.length).toBe(2);
    const set = moveSet(moves);
    expect(set.has('1,2')).toBe(true);
    expect(set.has('2,1')).toBe(true);
  });

  it('knight can jump over pieces', () => {
    // Fill the area around the knight with pawns
    const board = parseFEN('8/8/8/3PPP2/3PNP2/3PPP2/8/8 w - - 0 1');
    // Knight on e4 (row 4, col 4), surrounded by white pawns
    const moves = rawMoves(board, 4, 4);
    // Knight can still jump to L-shape squares not occupied by friendly pieces
    expect(moves.length).toBeGreaterThan(0);
  });

  it('knight cannot capture own pieces', () => {
    const board = parseFEN('8/8/3P1P2/2P3P1/4N3/2P3P1/3P1P2/8 w - - 0 1');
    // Knight e4 (row 4, col 4) with white pawns on all L-shape squares
    const moves = rawMoves(board, 4, 4);
    expect(moves.length).toBe(0);
  });

  it('knight can capture opponent pieces', () => {
    const board = parseFEN('8/8/3p1p2/2p3p1/4N3/2p3p1/3p1p2/8 w - - 0 1');
    // Knight e4 (row 4, col 4) with black pawns on all L-shape squares
    const moves = rawMoves(board, 4, 4);
    expect(moves.length).toBe(8);
  });
});

// ── Bishop Moves ───────────────────────────────────────

describe('bishop moves', () => {
  it('bishop in center on empty board has 13 moves', () => {
    const board = parseFEN('8/8/8/4B3/8/8/8/8 w - - 0 1');
    // Bishop e5 (row 3, col 4)
    const moves = rawMoves(board, 3, 4);
    expect(moves.length).toBe(13);
  });

  it('bishop is blocked by friendly pieces', () => {
    const board = parseFEN('8/8/3P1P2/4B3/3P1P2/8/8/8 w - - 0 1');
    // Bishop e5 (row 3, col 4) with white pawns on all adjacent diagonals
    const moves = rawMoves(board, 3, 4);
    expect(moves.length).toBe(0);
  });

  it('bishop can capture but stops after', () => {
    const board = parseFEN('8/8/3p4/4B3/8/8/8/8 w - - 0 1');
    // Bishop e5 (row 3, col 4), black pawn d6 (row 2, col 3)
    const moves = rawMoves(board, 3, 4);
    const set = moveSet(moves);
    // Can capture d6 but cannot continue to c7
    expect(set.has('2,3')).toBe(true);
    expect(set.has('1,2')).toBe(false);
  });

  it('bishop in corner has 7 moves on empty board', () => {
    const board = parseFEN('B7/8/8/8/8/8/8/8 w - - 0 1');
    // Bishop a8 (row 0, col 0)
    const moves = rawMoves(board, 0, 0);
    expect(moves.length).toBe(7);
  });
});

// ── Rook Moves ─────────────────────────────────────────

describe('rook moves', () => {
  it('rook in center on empty board has 14 moves', () => {
    const board = parseFEN('8/8/8/4R3/8/8/8/8 w - - 0 1');
    // Rook e5 (row 3, col 4)
    const moves = rawMoves(board, 3, 4);
    expect(moves.length).toBe(14);
  });

  it('rook is blocked by friendly pieces', () => {
    const board = parseFEN('8/8/4P3/3PRP2/4P3/8/8/8 w - - 0 1');
    // Rook e5 (row 3, col 4) with white pawns on all adjacent orthogonal squares
    const moves = rawMoves(board, 3, 4);
    expect(moves.length).toBe(0);
  });

  it('rook can capture but stops after', () => {
    const board = parseFEN('8/8/4p3/4R3/8/8/8/8 w - - 0 1');
    // Rook e5 (row 3, col 4), black pawn e6 (row 2, col 4)
    const moves = rawMoves(board, 3, 4);
    const set = moveSet(moves);
    expect(set.has('2,4')).toBe(true);  // capture
    expect(set.has('1,4')).toBe(false); // blocked after capture
  });

  it('rook in corner has 14 moves on empty board', () => {
    const board = parseFEN('R7/8/8/8/8/8/8/8 w - - 0 1');
    const moves = rawMoves(board, 0, 0);
    expect(moves.length).toBe(14);
  });
});

// ── Queen Moves ────────────────────────────────────────

describe('queen moves', () => {
  it('queen in center on empty board has 27 moves', () => {
    const board = parseFEN('8/8/8/4Q3/8/8/8/8 w - - 0 1');
    // Queen e5 (row 3, col 4) — combines bishop (13) + rook (14) = 27
    const moves = rawMoves(board, 3, 4);
    expect(moves.length).toBe(27);
  });

  it('queen moves are union of bishop and rook moves', () => {
    const board = parseFEN('8/8/8/4Q3/8/8/8/8 w - - 0 1');
    const queenMoves = moveSet(rawMoves(board, 3, 4));

    // Put a bishop on same square
    const bBoard = parseFEN('8/8/8/4B3/8/8/8/8 w - - 0 1');
    const bishopMoves = moveSet(rawMoves(bBoard, 3, 4));

    // Put a rook on same square
    const rBoard = parseFEN('8/8/8/4R3/8/8/8/8 w - - 0 1');
    const rookMoves = moveSet(rawMoves(rBoard, 3, 4));

    // Queen should cover all bishop and rook squares
    for (const m of bishopMoves) {
      expect(queenMoves.has(m)).toBe(true);
    }
    for (const m of rookMoves) {
      expect(queenMoves.has(m)).toBe(true);
    }
  });
});

// ── King Moves ─────────────────────────────────────────

describe('king moves', () => {
  it('king in center has 8 raw moves', () => {
    const board = parseFEN('8/8/8/4K3/8/8/8/8 w - - 0 1');
    const moves = rawMoves(board, 3, 4);
    expect(moves.length).toBe(8);
  });

  it('king in corner has 3 raw moves', () => {
    const board = parseFEN('K7/8/8/8/8/8/8/8 w - - 0 1');
    const moves = rawMoves(board, 0, 0);
    expect(moves.length).toBe(3);
  });

  it('king cannot move into check (legal moves)', () => {
    // White king e1, black rook on d8 — king cannot go to d-file
    const board = parseFEN('3r4/8/8/8/8/8/8/4K3 w - - 0 1');
    const moves = legalMoves(board, 7, 4);
    const set = moveSet(moves);
    expect(set.has('6,3')).toBe(false); // d2 attacked by rook
    expect(set.has('7,3')).toBe(false); // d1 attacked by rook
  });

  it('king can capture an attacking piece', () => {
    // White king e4, black pawn d5 — king can capture
    const board = parseFEN('8/8/8/3p4/4K3/8/8/8 w - - 0 1');
    const moves = legalMoves(board, 4, 4);
    const set = moveSet(moves);
    expect(set.has('3,3')).toBe(true); // capture d5
  });
});

// ── Check Detection ────────────────────────────────────

describe('isInCheck', () => {
  it('detects rook check', () => {
    const board = parseFEN('4k3/8/8/8/8/8/8/4R2K w - - 0 1');
    // Black king e8, white rook e1 — black is in check
    expect(isInCheck(board, 'b')).toBe(true);
    expect(isInCheck(board, 'w')).toBe(false);
  });

  it('detects bishop check', () => {
    const board = parseFEN('4k3/8/8/8/8/8/3B4/7K w - - 0 1');
    // White bishop d2, black king e8 — not in check (different diagonal)
    expect(isInCheck(board, 'b')).toBe(false);

    const board2 = parseFEN('7k/8/8/8/8/3B4/8/4K3 w - - 0 1');
    // White bishop d3, black king h8 — not in check (different diagonal)
    expect(isInCheck(board2, 'b')).toBe(false);

    const board3 = parseFEN('8/8/8/3k4/8/8/6B1/4K3 w - - 0 1');
    // White bishop g2, black king d5 — in check on diagonal
    expect(isInCheck(board3, 'b')).toBe(true);
  });

  it('detects knight check', () => {
    const board = parseFEN('4k3/8/3N4/8/8/8/8/4K3 w - - 0 1');
    // White knight d6 attacks e8 — black in check
    expect(isInCheck(board, 'b')).toBe(true);
  });

  it('detects pawn check', () => {
    const board = parseFEN('4k3/3P4/8/8/8/8/8/4K3 w - - 0 1');
    // White pawn d7 attacks e8 diagonally — black in check
    expect(isInCheck(board, 'b')).toBe(true);
  });

  it('no check when path is blocked', () => {
    const board = parseFEN('4k3/4p3/8/8/8/8/8/4R2K w - - 0 1');
    // White rook e1 but black pawn e7 blocks — no check
    expect(isInCheck(board, 'b')).toBe(false);
  });

  it('not in check at game start', () => {
    const board = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(isInCheck(board, 'w')).toBe(false);
    expect(isInCheck(board, 'b')).toBe(false);
  });
});

// ── isSquareAttackedBy ─────────────────────────────────

describe('isSquareAttackedBy', () => {
  it('detects attack on empty square', () => {
    const board = parseFEN('8/8/8/8/8/8/8/R3K3 w - - 0 1');
    // White rook on a1 attacks all of rank 1 and file a
    expect(isSquareAttackedBy(board, 0, 0, 'w')).toBe(true); // a8
    expect(isSquareAttackedBy(board, 7, 3, 'w')).toBe(true); // d1 (rook)
  });

  it('returns false for unattacked square', () => {
    const board = parseFEN('8/8/8/8/8/8/8/R3K3 w - - 0 1');
    // b2 is not attacked by rook (rook on a1 attacks a-file and rank 1, not b2)
    expect(isSquareAttackedBy(board, 6, 1, 'w')).toBe(false);
  });
});

// ── Legal Moves ────────────────────────────────────────

describe('legalMoves', () => {
  it('returns empty for null square', () => {
    const board = parseFEN('8/8/8/8/8/8/8/8 w - - 0 1');
    expect(legalMoves(board, 3, 3)).toEqual([]);
  });

  it('filters moves that leave king in check', () => {
    // White king e1, white rook d1 pinned by black rook a1 — no, that's not a pin
    // Better: white king e1, white bishop e2, black rook e8 — bishop is pinned
    const board = parseFEN('4r3/8/8/8/8/8/4B3/4K3 w - - 0 1');
    // White bishop e2 is pinned to king on e1 by black rook e8
    const moves = legalMoves(board, 6, 4);
    // Bishop can only move along the e-file (staying in the pin line)
    const set = moveSet(moves);
    for (const m of moves) {
      expect(m.col).toBe(4); // must stay on e-file
    }
  });

  it('king must escape check', () => {
    // White king e1 in check from black rook e8
    const board = parseFEN('4r3/8/8/8/8/8/8/4K3 w - - 0 1');
    const kingMoves = legalMoves(board, 7, 4);
    // King must move off the e-file (all e-file squares attacked by rook)
    for (const m of kingMoves) {
      expect(m.col).not.toBe(4);
    }
    expect(kingMoves.length).toBeGreaterThan(0);
  });
});

// ── hasLegalMoves ──────────────────────────────────────

describe('hasLegalMoves', () => {
  it('returns true in starting position', () => {
    const board = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(hasLegalMoves(board, 'w')).toBe(true);
    expect(hasLegalMoves(board, 'b')).toBe(true);
  });

  it('returns false when checkmated', () => {
    // Back rank mate: black king g8, pawns f7 g7 h7, white rook a8
    const board = parseFEN('R5k1/5ppp/8/8/8/8/8/4K3 w - - 0 1');
    expect(hasLegalMoves(board, 'b')).toBe(false);
  });
});

// ── Checkmate Detection ────────────────────────────────

describe('isCheckmate', () => {
  it('detects back rank mate', () => {
    // White rook on a8, black king g8 with pawns f7 g7 h7
    const board = parseFEN('R5k1/5ppp/8/8/8/8/8/4K3 w - - 0 1');
    expect(isCheckmate(board, 'b')).toBe(true);
  });

  it('detects back rank mate after puzzle 1 solution', () => {
    // Puzzle 1: 6k1/5ppp/8/8/8/8/8/R3K3 — after Ra8#
    const board = parseFEN('6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1');
    // Apply Ra1-a8
    board[0][0] = board[7][0]; // move rook to a8
    board[7][0] = null;
    expect(isCheckmate(board, 'b')).toBe(true);
  });

  it('detects queen mate after puzzle 2 solution', () => {
    // Puzzle 2: 6k1/7p/5K2/8/8/8/8/Q7 — after Qa8#
    const board = parseFEN('6k1/7p/5K2/8/8/8/8/Q7 w - - 0 1');
    // Apply Qa1-a8
    board[0][0] = board[7][0]; // move queen to a8
    board[7][0] = null;
    expect(isCheckmate(board, 'b')).toBe(true);
  });

  it('not checkmate if king can escape', () => {
    // White rook on a8 giving check, but king on g8 with no pawn on h7 — can escape to h7
    const board = parseFEN('R5k1/5pp1/8/8/8/8/8/4K3 w - - 0 1');
    expect(isInCheck(board, 'b')).toBe(true);
    expect(isCheckmate(board, 'b')).toBe(false);
  });

  it('not checkmate if check can be blocked', () => {
    // White rook on a8 giving check, black king g8, pawns f7 g7 h7, but black rook on d1 can block
    const board = parseFEN('R5k1/5ppp/8/8/8/8/8/3rK3 w - - 0 1');
    // Black rook can go to a-file but wait — it's white's problem. Let's check for black checkmate.
    // Rook on a8 checks black king. Black rook on d1 could potentially interpose.
    // Actually d1 rook can't interpose on the 8th rank. Let me fix:
    const board2 = parseFEN('R5k1/5ppp/8/8/8/8/8/4K3 w - - 0 1');
    // This is checkmate (no blocker). Let me create a non-mate scenario:
    // Rook on e8 checking, king on g8, rook on f1 (black) can block on f8
    const board3 = parseFEN('4R1k1/6pp/8/8/8/8/8/4Kr2 w - - 0 1');
    expect(isInCheck(board3, 'b')).toBe(true);
    expect(isCheckmate(board3, 'b')).toBe(false); // black rook can block on f8
  });

  it('not checkmate when not in check', () => {
    const board = parseFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(isCheckmate(board, 'w')).toBe(false);
    expect(isCheckmate(board, 'b')).toBe(false);
  });

  it('smothered mate', () => {
    // Classic smothered mate: black king h8, black rook g8, black pawn g7 h7
    // White knight on f7 gives check but that's not mate...
    // Smothered mate: Kg8, Rf8, pg7 ph7, white Nf7 — not mate because king can take knight
    // Proper smothered: Kg8, Rg8 doesn't work... Let me just do:
    // King h8, pawns g7 h7, own rook g8, white knight f7
    // Wait, knight on f7 checks h8? No, f7 knight covers e5,g5,d6,d8,h6,h8,e5,g5
    // f7 knight: (5,5) -> covers (3,4)(3,6)(4,3)(4,7)(6,3)(6,7)(7,4)(7,6)
    // h8 = (0,7). f7 knight at row 1, col 5. Moves: (-2,-1)=(-1,4), (-2,1)=(-1,6), (-1,-2)=(0,3), (-1,2)=(0,7)✓
    // Yes! Knight on f7 attacks h8.
    // Smothered mate: Kh8, Rg8, Nf8 around the king
    // King h8 (0,7), pawn g7 (1,6), pawn h7 (1,7), own rook g8 (0,6)
    // White knight on f7 (1,5)
    const board = parseFEN('6rk/5Npp/8/8/8/8/8/4K3 w - - 0 1');
    expect(isCheckmate(board, 'b')).toBe(true);
  });
});

// ── Puzzle Position Verification ───────────────────────

describe('puzzle positions', () => {
  it('puzzle 1: Ra8 is a legal move and results in checkmate', () => {
    const board = parseFEN('6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1');
    // Rook on a1 (row 7, col 0)
    const moves = legalMoves(board, 7, 0);
    const set = moveSet(moves);
    // Ra8 = row 0, col 0
    expect(set.has('0,0')).toBe(true);

    // Apply the move and verify checkmate
    const after = cloneBoard(board);
    after[0][0] = after[7][0];
    after[7][0] = null;
    expect(isCheckmate(after, 'b')).toBe(true);
  });

  it('puzzle 2: Qa8 is a legal move and results in checkmate', () => {
    const board = parseFEN('6k1/7p/5K2/8/8/8/8/Q7 w - - 0 1');
    // Queen on a1 (row 7, col 0)
    const moves = legalMoves(board, 7, 0);
    const set = moveSet(moves);
    // Qa8 = row 0, col 0
    expect(set.has('0,0')).toBe(true);

    // Apply the move and verify checkmate
    const after = cloneBoard(board);
    after[0][0] = after[7][0];
    after[7][0] = null;
    expect(isCheckmate(after, 'b')).toBe(true);
  });

  it('puzzle 1: black has legal moves before solution', () => {
    const board = parseFEN('6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1');
    expect(hasLegalMoves(board, 'b')).toBe(true);
    expect(isCheckmate(board, 'b')).toBe(false);
  });

  it('puzzle 2: black has legal moves before solution', () => {
    const board = parseFEN('6k1/7p/5K2/8/8/8/8/Q7 w - - 0 1');
    expect(hasLegalMoves(board, 'b')).toBe(true);
    expect(isCheckmate(board, 'b')).toBe(false);
  });
});
