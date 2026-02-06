(function (exports) {
  'use strict';

  // ── FEN Parser ──────────────────────────────────────────

  function parseFEN(fen) {
    var board = [];
    var ranks = fen.split(' ')[0].split('/');
    for (var r = 0; r < 8; r++) {
      board[r] = [];
      var col = 0;
      for (var i = 0; i < ranks[r].length; i++) {
        var ch = ranks[r][i];
        if (ch >= '1' && ch <= '8') {
          var empty = parseInt(ch, 10);
          for (var e = 0; e < empty; e++) {
            board[r][col++] = null;
          }
        } else {
          board[r][col++] = {
            piece: ch.toUpperCase(),
            color: ch === ch.toUpperCase() ? 'w' : 'b'
          };
        }
      }
    }
    return board;
  }

  // ── Coordinate Helpers ──────────────────────────────────

  function toAlgebraic(row, col) {
    return String.fromCharCode(97 + col) + (8 - row);
  }

  function fromAlgebraic(sq) {
    return { row: 8 - parseInt(sq[1], 10), col: sq.charCodeAt(0) - 97 };
  }

  function inBounds(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  function cloneBoard(board) {
    return board.map(function (row) {
      return row.map(function (cell) {
        return cell ? { piece: cell.piece, color: cell.color } : null;
      });
    });
  }

  // ── Move Generation ─────────────────────────────────────

  function findKing(board, color) {
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var p = board[r][c];
        if (p && p.piece === 'K' && p.color === color) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  function isSquareAttackedBy(board, row, col, byColor) {
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var p = board[r][c];
        if (!p || p.color !== byColor) continue;
        var moves = rawMoves(board, r, c);
        for (var i = 0; i < moves.length; i++) {
          if (moves[i].row === row && moves[i].col === col) return true;
        }
      }
    }
    return false;
  }

  function isInCheck(board, color) {
    var king = findKing(board, color);
    if (!king) return false;
    var opp = color === 'w' ? 'b' : 'w';
    return isSquareAttackedBy(board, king.row, king.col, opp);
  }

  // Raw moves for a piece (no check filtering)
  function rawMoves(board, row, col) {
    var p = board[row][col];
    if (!p) return [];
    var moves = [];
    var color = p.color;
    var opp = color === 'w' ? 'b' : 'w';

    function addIfValid(r, c) {
      if (!inBounds(r, c)) return false;
      var target = board[r][c];
      if (target && target.color === color) return false;
      moves.push({ row: r, col: c });
      return !target; // return true to continue sliding, false if captured
    }

    function slide(dr, dc) {
      for (var i = 1; i < 8; i++) {
        if (!addIfValid(row + dr * i, col + dc * i)) break;
      }
    }

    switch (p.piece) {
      case 'P':
        var dir = color === 'w' ? -1 : 1;
        var startRow = color === 'w' ? 6 : 1;
        // Forward
        if (inBounds(row + dir, col) && !board[row + dir][col]) {
          moves.push({ row: row + dir, col: col });
          // Double push
          if (row === startRow && !board[row + dir * 2][col]) {
            moves.push({ row: row + dir * 2, col: col });
          }
        }
        // Captures
        if (inBounds(row + dir, col - 1)) {
          var tl = board[row + dir][col - 1];
          if (tl && tl.color === opp) moves.push({ row: row + dir, col: col - 1 });
        }
        if (inBounds(row + dir, col + 1)) {
          var tr = board[row + dir][col + 1];
          if (tr && tr.color === opp) moves.push({ row: row + dir, col: col + 1 });
        }
        break;

      case 'N':
        var knightMoves = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        knightMoves.forEach(function (d) { addIfValid(row + d[0], col + d[1]); });
        break;

      case 'B':
        slide(-1, -1); slide(-1, 1); slide(1, -1); slide(1, 1);
        break;

      case 'R':
        slide(-1, 0); slide(1, 0); slide(0, -1); slide(0, 1);
        break;

      case 'Q':
        slide(-1, -1); slide(-1, 1); slide(1, -1); slide(1, 1);
        slide(-1, 0); slide(1, 0); slide(0, -1); slide(0, 1);
        break;

      case 'K':
        var kingMoves = [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1],           [0, 1],
          [1, -1],  [1, 0],  [1, 1]
        ];
        kingMoves.forEach(function (d) { addIfValid(row + d[0], col + d[1]); });
        break;
    }

    return moves;
  }

  // Legal moves (filters out moves that leave king in check)
  function legalMoves(board, row, col) {
    var p = board[row][col];
    if (!p) return [];
    var raw = rawMoves(board, row, col);
    return raw.filter(function (m) {
      var test = cloneBoard(board);
      test[m.row][m.col] = test[row][col];
      test[row][col] = null;
      return !isInCheck(test, p.color);
    });
  }

  // Check if a color has any legal moves
  function hasLegalMoves(board, color) {
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var p = board[r][c];
        if (p && p.color === color && legalMoves(board, r, c).length > 0) {
          return true;
        }
      }
    }
    return false;
  }

  function isCheckmate(board, color) {
    return isInCheck(board, color) && !hasLegalMoves(board, color);
  }

  // ── Exports ─────────────────────────────────────────────

  exports.parseFEN = parseFEN;
  exports.toAlgebraic = toAlgebraic;
  exports.fromAlgebraic = fromAlgebraic;
  exports.inBounds = inBounds;
  exports.cloneBoard = cloneBoard;
  exports.findKing = findKing;
  exports.isSquareAttackedBy = isSquareAttackedBy;
  exports.isInCheck = isInCheck;
  exports.rawMoves = rawMoves;
  exports.legalMoves = legalMoves;
  exports.hasLegalMoves = hasLegalMoves;
  exports.isCheckmate = isCheckmate;

})(typeof module !== 'undefined' && module.exports ? module.exports : (this.ChessEngine = {}));
