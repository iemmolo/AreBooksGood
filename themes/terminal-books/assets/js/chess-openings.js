(function () {
  'use strict';

  var PIECES = {
    K: '\u2654', Q: '\u2655', R: '\u2656', B: '\u2657', N: '\u2658', P: '\u2659',
    k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F'
  };

  var STORAGE_KEY = 'chess-openings-stats';
  var AUTO_PLAY_DELAY = 600;

  var app = document.getElementById('chess-openings-app');
  if (!app) return;

  var data = JSON.parse(app.getAttribute('data-openings'));
  if (!data || !data.openings || !data.openings.length) return;

  var openings = data.openings;

  // DOM elements
  var indexView = document.getElementById('openings-index');
  var drillView = document.getElementById('openings-drill');
  var openingList = document.getElementById('opening-list');
  var openingTitleEl = document.getElementById('opening-title');
  var openingDescEl = document.getElementById('opening-desc');
  var boardEl = document.getElementById('chess-board');
  var drillColorEl = document.getElementById('drill-color');
  var drillStatusEl = document.getElementById('drill-status');
  var drillMoveList = document.getElementById('drill-move-list');
  var drillCompleteEl = document.getElementById('drill-complete');
  var drillCompleteMsgEl = document.getElementById('drill-complete-msg');
  var drillAccuracyEl = document.getElementById('drill-accuracy');
  var boardWrapper = document.querySelector('.chess-board-wrapper');

  var state = {
    board: null,
    currentOpening: null,
    currentMove: 0,       // index into opening.moves
    selected: null,
    validMoves: [],
    lastMove: null,
    castling: 'KQkq',
    epSquare: null,
    currentErrors: 0,
    waitingForAutoPlay: false,
    drillStats: {},       // { openingId: { attempts: N, bestAccuracy: N } }
    viewMode: 'index'
  };

  // ── localStorage ────────────────────────────────────────

  function loadStats() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) state.drillStats = JSON.parse(saved);
    } catch (e) {
      state.drillStats = {};
    }
  }

  function saveStats() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.drillStats));
    } catch (e) { /* ignore */ }
  }

  function getStats(openingId) {
    return state.drillStats[openingId] || { attempts: 0, bestAccuracy: 0 };
  }

  function recordDrill(openingId, accuracy) {
    var s = getStats(openingId);
    s.attempts++;
    if (accuracy > s.bestAccuracy) s.bestAccuracy = accuracy;
    state.drillStats[openingId] = s;
    saveStats();
  }

  // ── Index View ──────────────────────────────────────────

  function renderIndex() {
    state.viewMode = 'index';
    indexView.style.display = '';
    drillView.style.display = 'none';

    openingList.innerHTML = '';
    for (var i = 0; i < openings.length; i++) {
      var opening = openings[i];
      var stats = getStats(opening.id);

      var li = document.createElement('li');
      li.className = 'chess-opening-item';

      var info = document.createElement('div');
      info.className = 'chess-opening-item-info';

      var title = document.createElement('span');
      title.className = 'chess-opening-item-title';
      title.textContent = opening.title;

      var desc = document.createElement('span');
      desc.className = 'chess-opening-item-desc';
      desc.textContent = opening.description;

      info.appendChild(title);
      info.appendChild(desc);

      var statsEl = document.createElement('div');
      statsEl.className = 'chess-opening-stats';
      if (stats.attempts > 0) {
        statsEl.textContent = stats.attempts + ' attempt' + (stats.attempts === 1 ? '' : 's') +
          ' \u00B7 best ' + stats.bestAccuracy + '%';
      } else {
        statsEl.textContent = 'Not attempted';
      }

      var indicator = document.createElement('span');
      indicator.className = 'chess-lesson-indicator';
      indicator.textContent = '>';

      li.appendChild(info);
      li.appendChild(statsEl);
      li.appendChild(indicator);

      li.dataset.index = i;
      li.addEventListener('click', function (e) {
        var idx = parseInt(e.currentTarget.dataset.index, 10);
        startDrill(idx);
      });

      openingList.appendChild(li);
    }
  }

  // ── Drill View ──────────────────────────────────────────

  function startDrill(index) {
    var opening = openings[index];
    state.currentOpening = opening;
    state.currentMove = 0;
    state.selected = null;
    state.validMoves = [];
    state.lastMove = null;
    state.castling = 'KQkq';
    state.epSquare = null;
    state.currentErrors = 0;
    state.waitingForAutoPlay = false;
    state.viewMode = 'drill';

    state.board = ChessEngine.parseFEN(opening.startFen);

    indexView.style.display = 'none';
    drillView.style.display = '';
    drillCompleteEl.style.display = 'none';
    boardWrapper.classList.remove('solved');

    openingTitleEl.textContent = opening.title;
    openingDescEl.textContent = opening.description;

    var colorLabel = opening.playerColor === 'b' ? 'Black' : 'White';
    drillColorEl.textContent = 'You play as ' + colorLabel;

    updateCoords();
    setStatus('Your turn \u2014 make the correct move.', '');
    renderMoveList();
    renderBoard();

    // If player is black, auto-play White's first move
    if (opening.playerColor === 'b' && state.currentMove < opening.moves.length) {
      setStatus('Watch White\'s move...', '');
      autoPlayOpponent();
    }
  }

  function isPlayerMove(moveIndex) {
    var opening = state.currentOpening;
    // Even indices = White, odd indices = Black
    if (opening.playerColor === 'b') return moveIndex % 2 === 1;
    return moveIndex % 2 === 0;
  }

  function autoPlayOpponent() {
    state.waitingForAutoPlay = true;
    setTimeout(function () {
      if (state.viewMode !== 'drill') return;

      var move = state.currentOpening.moves[state.currentMove];
      applyMove(move.from, move.to);
      state.currentMove++;

      setStatus(move.comment || 'Your turn \u2014 make the correct move.', '');
      renderMoveList();
      renderBoard();
      state.waitingForAutoPlay = false;

      // Check if drill is complete after opponent move
      if (state.currentMove >= state.currentOpening.moves.length) {
        completeDrill();
      }
    }, AUTO_PLAY_DELAY);
  }

  function applyMove(fromSq, toSq) {
    var from = ChessEngine.fromAlgebraic(fromSq);
    var to = ChessEngine.fromAlgebraic(toSq);
    var piece = state.board[from.row][from.col];
    if (!piece) return;

    // Castling: move the rook
    if (piece.piece === 'K' && Math.abs(to.col - from.col) === 2) {
      var homeRow = piece.color === 'w' ? 7 : 0;
      if (to.col === 6) {
        state.board[homeRow][5] = state.board[homeRow][7];
        state.board[homeRow][7] = null;
      } else if (to.col === 2) {
        state.board[homeRow][3] = state.board[homeRow][0];
        state.board[homeRow][0] = null;
      }
    }

    // En passant: remove captured pawn
    if (piece.piece === 'P' && state.epSquare) {
      var ep = ChessEngine.fromAlgebraic(state.epSquare);
      if (to.row === ep.row && to.col === ep.col) {
        state.board[from.row][to.col] = null;
      }
    }

    state.board[to.row][to.col] = state.board[from.row][from.col];
    state.board[from.row][from.col] = null;

    // Pawn promotion (auto-queen)
    var moved = state.board[to.row][to.col];
    if (moved && moved.piece === 'P') {
      if ((moved.color === 'w' && to.row === 0) || (moved.color === 'b' && to.row === 7)) {
        moved.piece = 'Q';
      }
    }

    // Update en passant square
    if (piece.piece === 'P' && Math.abs(to.row - from.row) === 2) {
      var epRow = (from.row + to.row) / 2;
      state.epSquare = ChessEngine.toAlgebraic(epRow, from.col);
    } else {
      state.epSquare = null;
    }

    // Update castling rights
    updateCastlingRights(piece, from.row, from.col, to.row, to.col);

    state.lastMove = { from: from, to: to };
  }

  function updateCastlingRights(piece, fromRow, fromCol, toRow, toCol) {
    var c = state.castling;
    if (piece.piece === 'K') {
      if (piece.color === 'w') {
        c = c.replace('K', '').replace('Q', '');
      } else {
        c = c.replace('k', '').replace('q', '');
      }
    }
    if (fromRow === 7 && fromCol === 0) c = c.replace('Q', '');
    if (fromRow === 7 && fromCol === 7) c = c.replace('K', '');
    if (fromRow === 0 && fromCol === 0) c = c.replace('q', '');
    if (fromRow === 0 && fromCol === 7) c = c.replace('k', '');
    if (toRow === 7 && toCol === 0) c = c.replace('Q', '');
    if (toRow === 7 && toCol === 7) c = c.replace('K', '');
    if (toRow === 0 && toCol === 0) c = c.replace('q', '');
    if (toRow === 0 && toCol === 7) c = c.replace('k', '');
    state.castling = c;
  }

  // ── Board Rendering ─────────────────────────────────────

  function isFlipped() {
    return state.currentOpening && state.currentOpening.playerColor === 'b';
  }

  function renderBoard() {
    var flipped = isFlipped();
    boardEl.innerHTML = '';
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
        }

        // Last move highlight
        if (state.lastMove) {
          if ((state.lastMove.from.row === r && state.lastMove.from.col === c) ||
              (state.lastMove.to.row === r && state.lastMove.to.col === c)) {
            sq.classList.add('last-move');
          }
          if (state.lastMove.to.row === r && state.lastMove.to.col === c && cell) {
            sq.classList.add('piece-arrived');
          }
        }

        // Selected piece
        if (state.selected && state.selected.row === r && state.selected.col === c) {
          sq.classList.add('selected');
        }

        // Valid move dots
        for (var v = 0; v < state.validMoves.length; v++) {
          if (state.validMoves[v].row === r && state.validMoves[v].col === c) {
            sq.classList.add('valid-move');
            break;
          }
        }

        sq.addEventListener('click', handleClick);
        boardEl.appendChild(sq);
      }
    }
  }

  // ── Click Handler ───────────────────────────────────────

  function handleClick(e) {
    if (state.waitingForAutoPlay) return;
    if (state.currentMove >= state.currentOpening.moves.length) return;
    if (!isPlayerMove(state.currentMove)) return;

    var sq = e.currentTarget;
    var row = parseInt(sq.dataset.row, 10);
    var col = parseInt(sq.dataset.col, 10);
    var cell = state.board[row][col];

    // Determine player color
    var playerColor = state.currentOpening.playerColor;

    // Execute move if clicking a valid target
    if (state.selected) {
      for (var i = 0; i < state.validMoves.length; i++) {
        if (state.validMoves[i].row === row && state.validMoves[i].col === col) {
          attemptMove(state.selected.row, state.selected.col, row, col);
          return;
        }
      }
    }

    // Select a piece of the player's color
    if (cell && cell.color === playerColor) {
      var moves = ChessEngine.legalMoves(state.board, row, col, state.castling, state.epSquare);
      if (moves.length > 0) {
        state.selected = { row: row, col: col };
        state.validMoves = moves;
        renderBoard();
      }
    } else {
      state.selected = null;
      state.validMoves = [];
      renderBoard();
    }
  }

  function attemptMove(fromRow, fromCol, toRow, toCol) {
    var expected = state.currentOpening.moves[state.currentMove];
    var from = ChessEngine.fromAlgebraic(expected.from);
    var to = ChessEngine.fromAlgebraic(expected.to);

    if (fromRow === from.row && fromCol === from.col && toRow === to.row && toCol === to.col) {
      // Correct move
      applyMove(expected.from, expected.to);
      state.currentMove++;
      state.selected = null;
      state.validMoves = [];

      setStatus(expected.comment || 'Correct!', 'status-solved');
      renderMoveList();
      renderBoard();

      // Check if drill is complete
      if (state.currentMove >= state.currentOpening.moves.length) {
        completeDrill();
        return;
      }

      // Auto-play opponent's next move if needed
      if (!isPlayerMove(state.currentMove)) {
        autoPlayOpponent();
      }
    } else {
      // Wrong move
      state.currentErrors++;
      state.selected = null;
      state.validMoves = [];
      setStatus('Wrong move \u2014 try again.', 'status-error');
      renderBoard();

      // Shake animation on the target square
      var targetSq = boardEl.querySelector('[data-row="' + toRow + '"][data-col="' + toCol + '"]');
      if (targetSq) {
        targetSq.classList.add('wrong-move');
        setTimeout(function () {
          targetSq.classList.remove('wrong-move');
        }, 400);
      }
    }
  }

  function completeDrill() {
    var opening = state.currentOpening;
    var playerMoves = 0;
    for (var i = 0; i < opening.moves.length; i++) {
      if (isPlayerMove(i)) playerMoves++;
    }

    var accuracy = playerMoves > 0
      ? Math.round((playerMoves / (playerMoves + state.currentErrors)) * 100)
      : 100;

    recordDrill(opening.id, accuracy);

    boardWrapper.classList.add('solved');
    drillCompleteEl.style.display = '';
    drillCompleteMsgEl.textContent = 'Drill complete!';
    drillAccuracyEl.textContent = accuracy + '% accuracy (' + state.currentErrors + ' mistake' +
      (state.currentErrors === 1 ? '' : 's') + ')';
    setStatus('Well done! You completed the ' + opening.title + '.', 'status-solved');
  }

  // ── Back one move ───────────────────────────────────────

  function backMove() {
    if (state.currentMove === 0) return;
    if (state.waitingForAutoPlay) return;

    // If the previous move was an opponent move, go back two moves
    var stepsBack = 1;
    if (state.currentMove >= 2 && !isPlayerMove(state.currentMove - 1)) {
      stepsBack = 2;
    }

    state.currentMove = Math.max(0, state.currentMove - stepsBack);

    // Replay all moves from the start
    replayToCurrentMove();
  }

  function replayToCurrentMove() {
    var opening = state.currentOpening;
    state.board = ChessEngine.parseFEN(opening.startFen);
    state.castling = 'KQkq';
    state.epSquare = null;
    state.lastMove = null;
    state.selected = null;
    state.validMoves = [];

    for (var i = 0; i < state.currentMove; i++) {
      applyMove(opening.moves[i].from, opening.moves[i].to);
    }

    drillCompleteEl.style.display = 'none';
    boardWrapper.classList.remove('solved');
    setStatus('Your turn \u2014 make the correct move.', '');
    renderMoveList();
    renderBoard();

    // If current move is an opponent move, auto-play it
    if (state.currentMove < opening.moves.length && !isPlayerMove(state.currentMove)) {
      autoPlayOpponent();
    }
  }

  // ── Move List ───────────────────────────────────────────

  function renderMoveList() {
    drillMoveList.innerHTML = '';
    var moves = state.currentOpening.moves;

    for (var i = 0; i < moves.length; i += 2) {
      var li = document.createElement('li');
      var pair = document.createElement('span');
      pair.className = 'move-pair';

      var num = document.createElement('span');
      num.className = 'move-number';
      num.textContent = Math.floor(i / 2) + 1 + '.';

      var white = document.createElement('span');
      white.className = 'move-white';
      if (i < state.currentMove) {
        white.textContent = moves[i].notation.replace(/^\d+\.\s*/, '');
      } else if (i === state.currentMove) {
        white.textContent = '???';
        white.classList.add('drill-current-move');
      } else {
        white.textContent = '\u00B7\u00B7\u00B7';
        white.classList.add('drill-future-move');
      }

      pair.appendChild(num);
      pair.appendChild(white);

      if (i + 1 < moves.length) {
        var black = document.createElement('span');
        black.className = 'move-black';
        if (i + 1 < state.currentMove) {
          black.textContent = moves[i + 1].notation.replace(/^\d+\.\.\.\s*/, '');
        } else if (i + 1 === state.currentMove) {
          black.textContent = '???';
          black.classList.add('drill-current-move');
        } else {
          black.textContent = '\u00B7\u00B7\u00B7';
          black.classList.add('drill-future-move');
        }
        pair.appendChild(black);
      }

      li.appendChild(pair);
      drillMoveList.appendChild(li);
    }
  }

  // ── UI Helpers ──────────────────────────────────────────

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

  function setStatus(msg, cls) {
    if (!msg) {
      drillStatusEl.style.display = 'none';
      return;
    }
    drillStatusEl.style.display = '';
    drillStatusEl.textContent = msg;
    drillStatusEl.className = 'chess-status';
    if (cls) drillStatusEl.classList.add(cls);
  }

  // ── Event Bindings ──────────────────────────────────────

  document.getElementById('btn-back-openings').addEventListener('click', renderIndex);
  document.getElementById('btn-reset-drill').addEventListener('click', function () {
    if (state.currentOpening) {
      var idx = openings.indexOf(state.currentOpening);
      startDrill(idx);
    }
  });
  document.getElementById('btn-back-move').addEventListener('click', backMove);
  document.getElementById('btn-drill-again').addEventListener('click', function () {
    if (state.currentOpening) {
      var idx = openings.indexOf(state.currentOpening);
      startDrill(idx);
    }
  });

  // ── Init ────────────────────────────────────────────────

  loadStats();
  renderIndex();
})();
