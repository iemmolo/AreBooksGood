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
  var difficultyEl = document.getElementById('puzzle-difficulty');
  var categoryProgressEl = document.getElementById('category-progress');
  var hintBtn = document.getElementById('btn-hint');

  var STORAGE_KEY = 'chess-puzzle-stats';
  var solveStats = {}; // { "puzzle-id": { solved: true, solveCount: N } }

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
    lastMove: null,     // {from: {row,col}, to: {row,col}}
    hintSquare: null    // {row, col} or null — for pulse animation
  };

  var boardWrapper = document.querySelector('.chess-board-wrapper');

  function markSolved() {
    boardWrapper.classList.add('solved');
    hintBtn.style.display = 'none';
  }

  function solvedCelebration() {
    var squares = boardEl.querySelectorAll('.chess-square');
    for (var i = 0; i < squares.length; i++) {
      (function (sq, idx) {
        var row = Math.floor(idx / 8);
        var col = idx % 8;
        var dist = Math.abs(row - 3.5) + Math.abs(col - 3.5);
        setTimeout(function () {
          sq.classList.add('solve-ripple');
        }, dist * 40);
      })(squares[i], i);
    }
  }

  function clearSolved() {
    boardWrapper.classList.remove('solved');
    hintBtn.style.display = '';
  }

  // ── localStorage ────────────────────────────────────────

  function loadSolveStats() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) solveStats = JSON.parse(saved);
    } catch (e) {
      solveStats = {};
    }
  }

  function saveSolveStats() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(solveStats));
    } catch (e) { /* ignore */ }
  }

  function recordSolve(puzzleId) {
    var entry = solveStats[puzzleId] || { solved: false, solveCount: 0 };
    entry.solved = true;
    entry.solveCount++;
    solveStats[puzzleId] = entry;
    saveSolveStats();
  }

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

  function isFlipped() {
    return state.playerColor === 'b';
  }

  // Get pixel position of a board square
  function squarePos(row, col) {
    var flipped = isFlipped();
    var ri = flipped ? 7 - row : row;
    var ci = flipped ? 7 - col : col;
    var size = boardEl.offsetWidth / 8;
    return { x: ci * size, y: ri * size };
  }

  function render(opts) {
    opts = opts || {};
    var flipped = isFlipped();
    boardEl.innerHTML = '';
    var pieceCount = 0;

    for (var ri = 0; ri < 8; ri++) {
      for (var ci = 0; ci < 8; ci++) {
        var r = flipped ? 7 - ri : ri;
        var c = flipped ? 7 - ci : ci;
        var sq = document.createElement('div');
        sq.className = 'chess-square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
        sq.dataset.row = r;
        sq.dataset.col = c;

        var cell = state.board[r][c];
        if (cell) {
          var key = cell.color === 'w' ? cell.piece.toLowerCase() : cell.piece;
          sq.textContent = PIECES[key];
          sq.classList.add('has-piece');
          var colorName = cell.color === 'w' ? 'White' : 'Black';
          var pieceName = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn' }[cell.piece];
          sq.title = colorName + ' ' + pieceName;

          // Staggered fade-in on puzzle load
          if (opts.fadeIn) {
            sq.classList.add('piece-enter');
            sq.style.animationDelay = (pieceCount * 25) + 'ms';
            pieceCount++;
          }
        }

        // Arrival settle animation
        if (state.lastMove && state.lastMove.to.row === r && state.lastMove.to.col === c && cell && !opts.fadeIn) {
          sq.classList.add('piece-arrived');
        }

        // Hint pulse
        if (state.hintSquare && state.hintSquare.row === r && state.hintSquare.col === c) {
          sq.classList.add('hint-pulse');
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

  // Animate a piece sliding from one square to another
  function animateMove(fromRow, fromCol, toRow, toCol, callback) {
    var fromPos = squarePos(fromRow, fromCol);
    var toPos = squarePos(toRow, toCol);
    var dx = fromPos.x - toPos.x;
    var dy = fromPos.y - toPos.y;

    // Check if there's a piece to capture at destination
    var capturedPiece = state.board[toRow][toCol];
    var capturedSq = null;
    if (capturedPiece) {
      capturedSq = boardEl.querySelector('[data-row="' + toRow + '"][data-col="' + toCol + '"]');
      if (capturedSq) {
        capturedSq.classList.add('piece-captured');
      }
    }

    // Apply the move to state
    applyMove(fromRow, fromCol, toRow, toCol);

    // Re-render to show new board state
    render();

    // Find the piece at its new position and apply slide transform
    var arrivedSq = boardEl.querySelector('[data-row="' + toRow + '"][data-col="' + toCol + '"]');
    if (arrivedSq && (dx !== 0 || dy !== 0)) {
      arrivedSq.classList.remove('piece-arrived');
      arrivedSq.classList.add('piece-sliding');
      arrivedSq.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';

      // Force reflow then animate to final position
      arrivedSq.offsetHeight;
      arrivedSq.style.transform = 'translate(0, 0)';

      arrivedSq.addEventListener('transitionend', function onEnd() {
        arrivedSq.removeEventListener('transitionend', onEnd);
        arrivedSq.classList.remove('piece-sliding');
        arrivedSq.classList.add('piece-arrived');
        arrivedSq.style.transform = '';
        if (callback) callback();
      });
    } else {
      if (callback) callback();
    }
  }

  // ── Click Handler ───────────────────────────────────────

  function handleClick(e) {
    if (state.solved) return;

    // Clear hint pulse on any click
    state.hintSquare = null;

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

    // Clear hint
    state.hintSquare = null;

    // Check if move matches solution
    if (fromSq === expectedMove.from && toSq === expectedMove.to) {
      // Correct move — animate the slide
      addMoveToLog(expectedMove.notation, state.playerColor);
      state.solutionStep++;

      var oppColor = state.playerColor === 'w' ? 'b' : 'w';

      animateMove(fromRow, fromCol, toRow, toCol, function () {
        // Check if puzzle is solved
        if (state.solutionStep >= solution.length || ChessEngine.isCheckmate(state.board, oppColor)) {
          state.solved = true;
          recordSolve(puzzle.id);
          markSolved();
          updateCounter();
          updateCategoryProgress();
          setStatus('Puzzle solved! ' + (ChessEngine.isCheckmate(state.board, oppColor) ? 'Checkmate!' : ''), 'status-solved');
          solvedCelebration();
          return;
        }

        // Opponent auto-reply
        setStatus('Correct! Opponent is thinking...', '');
        setTimeout(function () {
          var oppMove = solution[state.solutionStep];
          var oppFrom = ChessEngine.fromAlgebraic(oppMove.from);
          var oppTo = ChessEngine.fromAlgebraic(oppMove.to);
          addMoveToLog(oppMove.notation, oppColor);
          state.solutionStep++;

          animateMove(oppFrom.row, oppFrom.col, oppTo.row, oppTo.col, function () {
            if (state.solutionStep >= solution.length) {
              state.solved = true;
              recordSolve(puzzle.id);
              markSolved();
              updateCounter();
              updateCategoryProgress();
              setStatus('Puzzle solved!', 'status-solved');
              solvedCelebration();
            } else {
              setStatus('Your turn. Find the best move.', '');
            }
          });
        }, 400);
      });
    } else {
      // Wrong move — show error
      setStatus('Not the best move. Try again.', 'status-error');
      state.selected = null;
      state.validMoves = [];
      render();

      // Shake the destination square
      var targetSq = boardEl.querySelector('[data-row="' + toRow + '"][data-col="' + toCol + '"]');
      if (targetSq) {
        targetSq.classList.add('wrong-move');
        setTimeout(function () {
          targetSq.classList.remove('wrong-move');
        }, 300);
      }
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
    updateCategoryProgress();
    loadPuzzle(0);
  }

  function updateCategoryProgress() {
    var puzzles = currentPuzzles();
    var solved = 0;
    for (var i = 0; i < puzzles.length; i++) {
      if (solveStats[puzzles[i].id] && solveStats[puzzles[i].id].solved) solved++;
    }
    categoryProgressEl.textContent = solved + ' / ' + puzzles.length + ' solved';
  }

  // ── Puzzle Loading ──────────────────────────────────────

  function updateCounter() {
    var puzzle = currentPuzzle();
    var puzzles = currentPuzzles();
    var text = (state.puzzleIndex + 1) + ' / ' + puzzles.length;
    if (solveStats[puzzle.id] && solveStats[puzzle.id].solved) {
      text += ' \u2713';
    }
    counterEl.textContent = text;
  }

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
    state.hintSquare = null;
    state.playerColor = puzzle.turn;
    clearSolved();

    titleEl.textContent = puzzle.title;
    descEl.textContent = puzzle.description;
    updateCounter();

    difficultyEl.textContent = puzzle.difficulty;
    difficultyEl.className = 'chess-puzzle-difficulty difficulty-' + puzzle.difficulty;

    updateCoords();
    setStatus('Your turn. Find the best move.', '');
    render({ fadeIn: true });
    renderMoveLog();
  }

  function updateCoords() {
    var flipped = isFlipped();
    var files = boardWrapper.querySelector('.chess-coords-files');
    var ranks = boardWrapper.querySelector('.chess-coords-ranks');
    var fileLetters = ['a','b','c','d','e','f','g','h'];
    var rankNumbers = ['8','7','6','5','4','3','2','1'];
    if (flipped) {
      fileLetters.reverse();
      rankNumbers.reverse();
    }
    var fileSpans = files.querySelectorAll('span');
    var rankSpans = ranks.querySelectorAll('span');
    for (var i = 0; i < 8; i++) {
      fileSpans[i].textContent = fileLetters[i];
      rankSpans[i].textContent = rankNumbers[i];
    }
  }

  // ── Hint ────────────────────────────────────────────────

  function showHint() {
    if (state.solved) return;
    var puzzle = currentPuzzle();
    var nextMove = puzzle.solution[state.solutionStep];
    if (!nextMove) return;

    var from = ChessEngine.fromAlgebraic(nextMove.from);

    // Pulse the piece that should move
    state.hintSquare = { row: from.row, col: from.col };
    state.selected = null;
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
    var len = currentPuzzles().length;
    loadPuzzle((state.puzzleIndex - 1 + len) % len);
  });

  document.getElementById('next-puzzle').addEventListener('click', function () {
    loadPuzzle((state.puzzleIndex + 1) % currentPuzzles().length);
  });

  categorySelect.addEventListener('change', function () {
    loadCategory(parseInt(categorySelect.value, 10));
  });

  // ── Init ────────────────────────────────────────────────

  loadSolveStats();
  populateCategories();
  loadCategory(0);
})();
