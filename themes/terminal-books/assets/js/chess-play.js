(function () {
  'use strict';

  var PIECES = {
    K: '\u2654', Q: '\u2655', R: '\u2656', B: '\u2657', N: '\u2658', P: '\u2659',
    k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F'
  };

  var PIECE_NAMES = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn' };
  var START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  var app = document.getElementById('chess-play-app');
  if (!app) return;

  var boardEl = document.getElementById('chess-board');
  var statusEl = document.getElementById('chess-status');
  var moveLogEl = document.getElementById('move-log');
  var turnIconEl = document.querySelector('.chess-turn-icon');
  var turnTextEl = document.getElementById('chess-turn-text');
  var boardWrapper = document.querySelector('.chess-board-wrapper');

  var state = {
    board: null,
    selected: null,
    validMoves: [],
    currentTurn: 'w',
    castling: 'KQkq',
    epSquare: null,
    gameOver: false,
    gameResult: null,
    moveHistory: [],
    positionHistory: [],
    lastMove: null
  };

  // ── Game Init ──────────────────────────────────────────

  function newGame() {
    state.board = ChessEngine.parseFEN(START_FEN);
    state.selected = null;
    state.validMoves = [];
    state.currentTurn = 'w';
    state.castling = 'KQkq';
    state.epSquare = null;
    state.gameOver = false;
    state.gameResult = null;
    state.moveHistory = [];
    state.positionHistory = [];
    state.lastMove = null;
    boardWrapper.classList.remove('solved');
    setStatus('', '');
    statusEl.style.display = 'none';
    updateTurnIndicator();
    render({ fadeIn: true });
    renderMoveLog();
  }

  // ── Board Rendering ───────────────────────────────────

  function squarePos(row, col) {
    var size = boardEl.offsetWidth / 8;
    return { x: col * size, y: row * size };
  }

  function render(opts) {
    opts = opts || {};
    boardEl.innerHTML = '';
    var pieceCount = 0;
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var sq = document.createElement('div');
        sq.className = 'chess-square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
        sq.dataset.row = r;
        sq.dataset.col = c;

        var cell = state.board[r][c];
        if (cell) {
          var key = cell.color === 'w' ? cell.piece.toLowerCase() : cell.piece;
          sq.textContent = PIECES[key];
          sq.classList.add('has-piece');
          sq.title = (cell.color === 'w' ? 'White' : 'Black') + ' ' + PIECE_NAMES[cell.piece];

          if (opts.fadeIn) {
            sq.classList.add('piece-enter');
            sq.style.animationDelay = (pieceCount * 25) + 'ms';
            pieceCount++;
          }
        }

        if (state.lastMove && state.lastMove.to.row === r && state.lastMove.to.col === c && cell && !opts.fadeIn) {
          sq.classList.add('piece-arrived');
        }

        if (state.selected && state.selected.row === r && state.selected.col === c) {
          sq.classList.add('selected');
        }

        for (var v = 0; v < state.validMoves.length; v++) {
          if (state.validMoves[v].row === r && state.validMoves[v].col === c) {
            sq.classList.add('valid-move');
            break;
          }
        }

        if (state.lastMove) {
          if ((state.lastMove.from.row === r && state.lastMove.from.col === c) ||
              (state.lastMove.to.row === r && state.lastMove.to.col === c)) {
            sq.classList.add('last-move');
          }
        }

        if (cell && cell.piece === 'K' && ChessEngine.isInCheck(state.board, cell.color)) {
          sq.classList.add('check');
        }

        sq.addEventListener('click', handleClick);
        boardEl.appendChild(sq);
      }
    }
  }

  function animateMove(fromRow, fromCol, toRow, toCol, callback) {
    var fromPos = squarePos(fromRow, fromCol);
    var toPos = squarePos(toRow, toCol);
    var dx = fromPos.x - toPos.x;
    var dy = fromPos.y - toPos.y;

    var capturedPiece = state.board[toRow][toCol];
    if (capturedPiece) {
      var capturedSq = boardEl.querySelector('[data-row="' + toRow + '"][data-col="' + toCol + '"]');
      if (capturedSq) capturedSq.classList.add('piece-captured');
    }

    render();

    var arrivedSq = boardEl.querySelector('[data-row="' + toRow + '"][data-col="' + toCol + '"]');
    if (arrivedSq && (dx !== 0 || dy !== 0)) {
      arrivedSq.classList.remove('piece-arrived');
      arrivedSq.classList.add('piece-sliding');
      arrivedSq.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
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

  // ── Click Handler ─────────────────────────────────────

  function handleClick(e) {
    if (state.gameOver) return;

    var sq = e.currentTarget;
    var row = parseInt(sq.dataset.row, 10);
    var col = parseInt(sq.dataset.col, 10);
    var cell = state.board[row][col];

    // Execute move if clicking a valid target
    if (state.selected) {
      for (var i = 0; i < state.validMoves.length; i++) {
        if (state.validMoves[i].row === row && state.validMoves[i].col === col) {
          executeMove(state.selected.row, state.selected.col, row, col);
          return;
        }
      }
    }

    // Select a piece of the current player
    if (cell && cell.color === state.currentTurn) {
      var moves = ChessEngine.legalMoves(state.board, row, col, state.castling, state.epSquare);
      if (moves.length > 0) {
        state.selected = { row: row, col: col };
        state.validMoves = moves;
        render();
      }
    } else {
      state.selected = null;
      state.validMoves = [];
      render();
    }
  }

  // ── Move Execution ────────────────────────────────────

  function executeMove(fromRow, fromCol, toRow, toCol) {
    // Save position for undo
    state.positionHistory.push({
      board: ChessEngine.cloneBoard(state.board),
      currentTurn: state.currentTurn,
      castling: state.castling,
      epSquare: state.epSquare,
      lastMove: state.lastMove,
      moveHistoryLength: state.moveHistory.length
    });

    var piece = state.board[fromRow][fromCol];
    var captured = state.board[toRow][toCol];
    var notation = buildNotation(fromRow, fromCol, toRow, toCol, piece, captured);

    // Apply piece move
    state.board[toRow][toCol] = state.board[fromRow][fromCol];
    state.board[fromRow][fromCol] = null;

    // Castling: move the rook
    if (piece.piece === 'K' && Math.abs(toCol - fromCol) === 2) {
      var homeRow = piece.color === 'w' ? 7 : 0;
      if (toCol === 6) { // king-side
        state.board[homeRow][5] = state.board[homeRow][7];
        state.board[homeRow][7] = null;
      } else if (toCol === 2) { // queen-side
        state.board[homeRow][3] = state.board[homeRow][0];
        state.board[homeRow][0] = null;
      }
    }

    // En passant: remove captured pawn
    if (piece.piece === 'P' && state.epSquare) {
      var ep = ChessEngine.fromAlgebraic(state.epSquare);
      if (toRow === ep.row && toCol === ep.col) {
        state.board[fromRow][toCol] = null;
      }
    }

    // Pawn promotion (auto-queen)
    if (piece.piece === 'P') {
      if ((piece.color === 'w' && toRow === 0) || (piece.color === 'b' && toRow === 7)) {
        state.board[toRow][toCol].piece = 'Q';
        notation += '=Q';
      }
    }

    // Update en passant square
    if (piece.piece === 'P' && Math.abs(toRow - fromRow) === 2) {
      var epRow = (fromRow + toRow) / 2;
      state.epSquare = ChessEngine.toAlgebraic(epRow, fromCol);
    } else {
      state.epSquare = null;
    }

    // Update castling rights
    updateCastlingRights(piece, fromRow, fromCol, toRow, toCol);

    state.lastMove = { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } };
    state.selected = null;
    state.validMoves = [];

    // Switch turn
    var opp = state.currentTurn === 'w' ? 'b' : 'w';

    // Check for checkmate / stalemate / check
    if (ChessEngine.isCheckmate(state.board, opp, state.castling, state.epSquare)) {
      notation += '#';
      state.moveHistory.push({ notation: notation, color: state.currentTurn });
      state.gameOver = true;
      var winner = state.currentTurn === 'w' ? 'White' : 'Black';
      state.gameResult = winner + ' wins by checkmate!';
      boardWrapper.classList.add('solved');
      setStatus(state.gameResult, 'status-solved');
    } else if (ChessEngine.isStalemate(state.board, opp, state.castling, state.epSquare)) {
      state.moveHistory.push({ notation: notation, color: state.currentTurn });
      state.gameOver = true;
      state.gameResult = 'Draw by stalemate.';
      boardWrapper.classList.add('solved');
      setStatus(state.gameResult, 'status-solved');
    } else {
      if (ChessEngine.isInCheck(state.board, opp)) {
        notation += '+';
      }
      state.moveHistory.push({ notation: notation, color: state.currentTurn });
      state.currentTurn = opp;
      if (ChessEngine.isInCheck(state.board, opp)) {
        setStatus('Check!', 'status-check');
      } else {
        setStatus('', '');
        statusEl.style.display = 'none';
      }
    }

    updateTurnIndicator();
    renderMoveLog();

    animateMove(fromRow, fromCol, toRow, toCol, function () {
      if (state.gameOver && state.gameResult && state.gameResult.indexOf('checkmate') !== -1) {
        solvedCelebration();
      }
    });
  }

  // ── Move Notation ─────────────────────────────────────

  function buildNotation(fromRow, fromCol, toRow, toCol, piece, captured) {
    // Castling
    if (piece.piece === 'K' && Math.abs(toCol - fromCol) === 2) {
      return toCol === 6 ? 'O-O' : 'O-O-O';
    }

    var notation = '';
    if (piece.piece !== 'P') {
      notation += piece.piece;
    }

    // Add disambiguation for non-pawn, non-king pieces
    if (piece.piece !== 'P' && piece.piece !== 'K') {
      var ambiguous = findAmbiguousPieces(piece, fromRow, fromCol, toRow, toCol);
      if (ambiguous) notation += ambiguous;
    }

    // Pawn captures include file letter
    if (piece.piece === 'P' && fromCol !== toCol) {
      notation += String.fromCharCode(97 + fromCol);
    }

    if (captured || (piece.piece === 'P' && state.epSquare && toCol !== fromCol)) {
      notation += 'x';
    }

    notation += ChessEngine.toAlgebraic(toRow, toCol);
    return notation;
  }

  function findAmbiguousPieces(piece, fromRow, fromCol, toRow, toCol) {
    var found = [];
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        if (r === fromRow && c === fromCol) continue;
        var p = state.board[r][c];
        if (p && p.piece === piece.piece && p.color === piece.color) {
          var moves = ChessEngine.legalMoves(state.board, r, c, state.castling, state.epSquare);
          for (var i = 0; i < moves.length; i++) {
            if (moves[i].row === toRow && moves[i].col === toCol) {
              found.push({ row: r, col: c });
              break;
            }
          }
        }
      }
    }
    if (found.length === 0) return '';
    var sameFile = found.some(function (f) { return f.col === fromCol; });
    var sameRank = found.some(function (f) { return f.row === fromRow; });
    if (!sameFile) return String.fromCharCode(97 + fromCol);
    if (!sameRank) return String(8 - fromRow);
    return String.fromCharCode(97 + fromCol) + (8 - fromRow);
  }

  // ── Castling Rights Update ────────────────────────────

  function updateCastlingRights(piece, fromRow, fromCol, toRow, toCol) {
    var c = state.castling;
    // King moved — remove both flags
    if (piece.piece === 'K') {
      if (piece.color === 'w') {
        c = c.replace('K', '').replace('Q', '');
      } else {
        c = c.replace('k', '').replace('q', '');
      }
    }
    // Rook moved or captured
    if (fromRow === 7 && fromCol === 0) c = c.replace('Q', '');
    if (fromRow === 7 && fromCol === 7) c = c.replace('K', '');
    if (fromRow === 0 && fromCol === 0) c = c.replace('q', '');
    if (fromRow === 0 && fromCol === 7) c = c.replace('k', '');
    // Rook captured on home square
    if (toRow === 7 && toCol === 0) c = c.replace('Q', '');
    if (toRow === 7 && toCol === 7) c = c.replace('K', '');
    if (toRow === 0 && toCol === 0) c = c.replace('q', '');
    if (toRow === 0 && toCol === 7) c = c.replace('k', '');
    state.castling = c;
  }

  // ── Undo ──────────────────────────────────────────────

  function undo() {
    if (state.positionHistory.length === 0) return;
    var prev = state.positionHistory.pop();
    state.board = prev.board;
    state.currentTurn = prev.currentTurn;
    state.castling = prev.castling;
    state.epSquare = prev.epSquare;
    state.lastMove = prev.lastMove;
    state.moveHistory.length = prev.moveHistoryLength;
    state.selected = null;
    state.validMoves = [];
    state.gameOver = false;
    state.gameResult = null;
    boardWrapper.classList.remove('solved');

    if (ChessEngine.isInCheck(state.board, state.currentTurn)) {
      setStatus('Check!', 'status-check');
    } else {
      setStatus('', '');
      statusEl.style.display = 'none';
    }

    updateTurnIndicator();
    render();
    renderMoveLog();
  }

  // ── UI Helpers ────────────────────────────────────────

  function updateTurnIndicator() {
    if (state.gameOver) {
      turnTextEl.textContent = state.gameResult;
      turnIconEl.textContent = '';
    } else if (state.currentTurn === 'w') {
      turnIconEl.textContent = '\u265A';
      turnTextEl.textContent = "White's turn";
    } else {
      turnIconEl.textContent = '\u2654';
      turnTextEl.textContent = "Black's turn";
    }
  }

  function setStatus(msg, cls) {
    if (!msg) {
      statusEl.style.display = 'none';
      return;
    }
    statusEl.style.display = '';
    statusEl.textContent = msg;
    statusEl.className = 'chess-status';
    if (cls) statusEl.classList.add(cls);
  }

  // ── Move Log ──────────────────────────────────────────

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

  // ── Event Bindings ────────────────────────────────────

  document.getElementById('btn-new-game').addEventListener('click', newGame);
  document.getElementById('btn-undo').addEventListener('click', undo);

  // ── Init ──────────────────────────────────────────────

  newGame();
})();
