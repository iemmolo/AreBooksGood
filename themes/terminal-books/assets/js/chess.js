(function () {
  'use strict';

  // Unicode piece map
  var PIECES = {
    K: '\u2654', Q: '\u2655', R: '\u2656', B: '\u2657', N: '\u2658', P: '\u2659',
    k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F'
  };

  var app = document.getElementById('chess-app');
  if (!app) return;

  var data = JSON.parse(app.getAttribute('data-puzzles'));
  if (!data || !data.categories || !data.categories.length) return;

  var categories = data.categories;

  var boardEl = document.getElementById('chess-board');
  var statusEl = document.getElementById('chess-status');
  var moveLogEl = document.getElementById('move-log');
  var titleEl = document.getElementById('puzzle-title');
  var descEl = document.getElementById('puzzle-description');
  var counterEl = document.getElementById('puzzle-counter');
  var categorySelect = document.getElementById('category-select');
  var categoryDescEl = document.getElementById('category-description');

  var state = {
    board: null,        // 8x8 array [row][col], null or {piece, color}
    selected: null,     // {row, col} or null
    validMoves: [],     // [{row, col}]
    solutionStep: 0,
    moveHistory: [],
    categoryIndex: 0,
    puzzleIndex: 0,
    solved: false,
    playerColor: 'w',
    lastMove: null      // {from: {row,col}, to: {row,col}}
  };

  // ── Category Helpers ──────────────────────────────────────

  function currentCategory() {
    return categories[state.categoryIndex];
  }

  function currentPuzzles() {
    return currentCategory().puzzles;
  }

  function currentPuzzle() {
    return currentPuzzles()[state.puzzleIndex];
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
          var colorName = cell.color === 'w' ? 'White' : 'Black';
          var pieceName = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn' }[cell.piece];
          sq.title = colorName + ' ' + pieceName;
        }

        // Arrival animation on destination square of last move
        if (state.lastMove && state.lastMove.to.row === r && state.lastMove.to.col === c && cell) {
          sq.classList.add('piece-arrived');
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
          if (ChessEngine.isInCheck(state.board, kingColor)) {
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
      var moves = ChessEngine.legalMoves(state.board, row, col);
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
    var puzzle = currentPuzzle();
    var solution = puzzle.solution;
    var expectedMove = solution[state.solutionStep];

    var fromSq = ChessEngine.toAlgebraic(fromRow, fromCol);
    var toSq = ChessEngine.toAlgebraic(toRow, toCol);

    // Check if move matches solution
    if (fromSq === expectedMove.from && toSq === expectedMove.to) {
      // Correct move
      applyMove(fromRow, fromCol, toRow, toCol);
      addMoveToLog(expectedMove.notation, state.playerColor);
      state.solutionStep++;

      // Check if puzzle is solved
      var oppColor = state.playerColor === 'w' ? 'b' : 'w';
      if (state.solutionStep >= solution.length || ChessEngine.isCheckmate(state.board, oppColor)) {
        state.solved = true;
        setStatus('Puzzle solved! ' + (ChessEngine.isCheckmate(state.board, oppColor) ? 'Checkmate!' : ''), 'status-solved');
        render();
        return;
      }

      // Opponent auto-reply
      setStatus('Correct! Opponent is thinking...', '');
      render();
      setTimeout(function () {
        var oppMove = solution[state.solutionStep];
        var oppFrom = ChessEngine.fromAlgebraic(oppMove.from);
        var oppTo = ChessEngine.fromAlgebraic(oppMove.to);
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

  // ── Category Management ───────────────────────────────

  function populateCategories() {
    categorySelect.innerHTML = '';
    for (var i = 0; i < categories.length; i++) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = categories[i].title;
      categorySelect.appendChild(opt);
    }
  }

  function loadCategory(index) {
    state.categoryIndex = index;
    state.puzzleIndex = 0;
    categorySelect.value = index;
    categoryDescEl.textContent = currentCategory().description;
    loadPuzzle(0);
  }

  // ── Puzzle Loading ──────────────────────────────────────

  function loadPuzzle(index) {
    state.puzzleIndex = index;
    var puzzle = currentPuzzle();
    var puzzles = currentPuzzles();
    state.board = ChessEngine.parseFEN(puzzle.fen);
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
    var puzzle = currentPuzzle();
    var nextMove = puzzle.solution[state.solutionStep];
    if (!nextMove) return;

    var from = ChessEngine.fromAlgebraic(nextMove.from);

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
    if (state.puzzleIndex < currentPuzzles().length - 1) {
      state.puzzleIndex++;
      loadPuzzle(state.puzzleIndex);
    }
  });

  categorySelect.addEventListener('change', function () {
    loadCategory(parseInt(categorySelect.value, 10));
  });

  // ── Init ────────────────────────────────────────────────

  populateCategories();
  loadCategory(0);
})();
