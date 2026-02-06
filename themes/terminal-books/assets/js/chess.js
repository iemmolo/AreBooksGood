(function () {
  'use strict';

  // Unicode piece map
  var PIECES = {
    K: '\u2654', Q: '\u2655', R: '\u2656', B: '\u2657', N: '\u2658', P: '\u2659',
    k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F'
  };

  var app = document.getElementById('chess-app');
  if (!app) return;

  var puzzles = JSON.parse(app.getAttribute('data-puzzles'));
  if (!puzzles || !puzzles.length) return;

  var boardEl = document.getElementById('chess-board');
  var statusEl = document.getElementById('chess-status');
  var moveLogEl = document.getElementById('move-log');
  var titleEl = document.getElementById('puzzle-title');
  var descEl = document.getElementById('puzzle-description');
  var counterEl = document.getElementById('puzzle-counter');

  var state = {
    board: null,        // 8x8 array [row][col], null or {piece, color}
    selected: null,     // {row, col} or null
    validMoves: [],     // [{row, col}]
    solutionStep: 0,
    moveHistory: [],
    puzzleIndex: 0,
    solved: false,
    playerColor: 'w',
    lastMove: null      // {from: {row,col}, to: {row,col}}
  };

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
    // Check all opponent pieces for attacks on (row, col)
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

  // ── Board Rendering ─────────────────────────────────────

  function render() {
    boardEl.innerHTML = '';
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var sq = document.createElement('div');
        sq.className = 'chess-square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
        sq.dataset.row = r;
        sq.dataset.col = c;

        var cell = state.board[r][c];
        if (cell) {
          var key = cell.color === 'w' ? cell.piece : cell.piece.toLowerCase();
          sq.textContent = PIECES[key];
          sq.classList.add('has-piece');
        }

        // Selected state
        if (state.selected && state.selected.row === r && state.selected.col === c) {
          sq.classList.add('selected');
        }

        // Valid move indicators
        for (var v = 0; v < state.validMoves.length; v++) {
          if (state.validMoves[v].row === r && state.validMoves[v].col === c) {
            sq.classList.add('valid-move');
            break;
          }
        }

        // Last move highlight
        if (state.lastMove) {
          if ((state.lastMove.from.row === r && state.lastMove.from.col === c) ||
              (state.lastMove.to.row === r && state.lastMove.to.col === c)) {
            sq.classList.add('last-move');
          }
        }

        // Check highlight
        if (cell && cell.piece === 'K') {
          var kingColor = cell.color;
          if (isInCheck(state.board, kingColor)) {
            sq.classList.add('check');
          }
        }

        sq.addEventListener('click', handleClick);
        boardEl.appendChild(sq);
      }
    }
  }

  // ── Click Handler ───────────────────────────────────────

  function handleClick(e) {
    if (state.solved) return;

    var sq = e.currentTarget;
    var row = parseInt(sq.dataset.row, 10);
    var col = parseInt(sq.dataset.col, 10);
    var cell = state.board[row][col];
    var puzzle = puzzles[state.puzzleIndex];

    // If a valid move square was clicked, execute the move
    if (state.selected) {
      for (var i = 0; i < state.validMoves.length; i++) {
        if (state.validMoves[i].row === row && state.validMoves[i].col === col) {
          executePlayerMove(state.selected.row, state.selected.col, row, col);
          return;
        }
      }
    }

    // Select a piece
    if (cell && cell.color === state.playerColor) {
      var moves = legalMoves(state.board, row, col);
      if (moves.length > 0) {
        state.selected = { row: row, col: col };
        state.validMoves = moves;
        render();
      }
    } else {
      // Clicked empty/opponent square with no selection — deselect
      state.selected = null;
      state.validMoves = [];
      render();
    }
  }

  function executePlayerMove(fromRow, fromCol, toRow, toCol) {
    var puzzle = puzzles[state.puzzleIndex];
    var solution = puzzle.solution;
    var expectedMove = solution[state.solutionStep];

    var fromSq = toAlgebraic(fromRow, fromCol);
    var toSq = toAlgebraic(toRow, toCol);

    // Check if move matches solution
    if (fromSq === expectedMove.from && toSq === expectedMove.to) {
      // Correct move
      applyMove(fromRow, fromCol, toRow, toCol);
      addMoveToLog(expectedMove.notation, state.playerColor);
      state.solutionStep++;

      // Check if puzzle is solved
      var oppColor = state.playerColor === 'w' ? 'b' : 'w';
      if (state.solutionStep >= solution.length || isCheckmate(state.board, oppColor)) {
        state.solved = true;
        setStatus('Puzzle solved! ' + (isCheckmate(state.board, oppColor) ? 'Checkmate!' : ''), 'status-solved');
        render();
        return;
      }

      // Opponent auto-reply
      setStatus('Correct! Opponent is thinking...', '');
      render();
      setTimeout(function () {
        var oppMove = solution[state.solutionStep];
        var oppFrom = fromAlgebraic(oppMove.from);
        var oppTo = fromAlgebraic(oppMove.to);
        applyMove(oppFrom.row, oppFrom.col, oppTo.row, oppTo.col);
        addMoveToLog(oppMove.notation, oppColor);
        state.solutionStep++;

        if (state.solutionStep >= solution.length) {
          state.solved = true;
          setStatus('Puzzle solved!', 'status-solved');
        } else {
          setStatus('Your turn. Find the best move.', '');
        }
        render();
      }, 500);
    } else {
      // Wrong move — show error
      setStatus('Not the best move. Try again.', 'status-error');
      state.selected = null;
      state.validMoves = [];
      render();

      // Shake the destination square
      var squares = boardEl.querySelectorAll('.chess-square');
      var idx = toRow * 8 + toCol;
      squares[idx].classList.add('wrong-move');
      setTimeout(function () {
        squares[idx].classList.remove('wrong-move');
      }, 300);
    }
  }

  function applyMove(fromRow, fromCol, toRow, toCol) {
    state.board[toRow][toCol] = state.board[fromRow][fromCol];
    state.board[fromRow][fromCol] = null;

    // Pawn promotion (auto-queen)
    var piece = state.board[toRow][toCol];
    if (piece && piece.piece === 'P') {
      if ((piece.color === 'w' && toRow === 0) || (piece.color === 'b' && toRow === 7)) {
        piece.piece = 'Q';
      }
    }

    state.lastMove = { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } };
    state.selected = null;
    state.validMoves = [];
  }

  // ── Move Log ────────────────────────────────────────────

  function addMoveToLog(notation, color) {
    state.moveHistory.push({ notation: notation, color: color });
    renderMoveLog();
  }

  function renderMoveLog() {
    moveLogEl.innerHTML = '';
    for (var i = 0; i < state.moveHistory.length; i += 2) {
      var li = document.createElement('li');
      var moveNum = Math.floor(i / 2) + 1;

      var pair = document.createElement('span');
      pair.className = 'move-pair';

      var num = document.createElement('span');
      num.className = 'move-number';
      num.textContent = moveNum + '.';

      var white = document.createElement('span');
      white.className = 'move-white';
      white.textContent = state.moveHistory[i].notation;

      pair.appendChild(num);
      pair.appendChild(white);

      if (i + 1 < state.moveHistory.length) {
        var black = document.createElement('span');
        black.className = 'move-black';
        black.textContent = state.moveHistory[i + 1].notation;
        pair.appendChild(black);
      }

      li.appendChild(pair);
      moveLogEl.appendChild(li);
    }
  }

  // ── Status ──────────────────────────────────────────────

  function setStatus(msg, cls) {
    statusEl.textContent = msg;
    statusEl.className = 'chess-status';
    if (cls) statusEl.classList.add(cls);
  }

  // ── Puzzle Loading ──────────────────────────────────────

  function loadPuzzle(index) {
    var puzzle = puzzles[index];
    state.board = parseFEN(puzzle.fen);
    state.selected = null;
    state.validMoves = [];
    state.solutionStep = 0;
    state.moveHistory = [];
    state.solved = false;
    state.lastMove = null;
    state.playerColor = puzzle.turn;

    titleEl.textContent = puzzle.title;
    descEl.textContent = puzzle.description;
    counterEl.textContent = (index + 1) + ' / ' + puzzles.length;

    setStatus('Your turn. Find the best move.', '');
    render();
    renderMoveLog();
  }

  // ── Hint ────────────────────────────────────────────────

  function showHint() {
    if (state.solved) return;
    var puzzle = puzzles[state.puzzleIndex];
    var nextMove = puzzle.solution[state.solutionStep];
    if (!nextMove) return;

    var from = fromAlgebraic(nextMove.from);

    // Highlight the piece that should move
    state.selected = { row: from.row, col: from.col };
    state.validMoves = [];
    setStatus('Try moving the piece on ' + nextMove.from + '.', '');
    render();
  }

  // ── Event Bindings ──────────────────────────────────────

  document.getElementById('btn-reset').addEventListener('click', function () {
    loadPuzzle(state.puzzleIndex);
  });

  document.getElementById('btn-hint').addEventListener('click', showHint);

  document.getElementById('prev-puzzle').addEventListener('click', function () {
    if (state.puzzleIndex > 0) {
      state.puzzleIndex--;
      loadPuzzle(state.puzzleIndex);
    }
  });

  document.getElementById('next-puzzle').addEventListener('click', function () {
    if (state.puzzleIndex < puzzles.length - 1) {
      state.puzzleIndex++;
      loadPuzzle(state.puzzleIndex);
    }
  });

  // ── Init ────────────────────────────────────────────────

  loadPuzzle(0);
})();
