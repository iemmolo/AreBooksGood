(function () {
  'use strict';

  var PIECES = {
    K: '\u2654', Q: '\u2655', R: '\u2656', B: '\u2657', N: '\u2658', P: '\u2659',
    k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F'
  };

  var STORAGE_KEY = 'chess-learn-progress';

  var app = document.getElementById('chess-learn-app');
  if (!app) return;

  var data = JSON.parse(app.getAttribute('data-lessons'));
  if (!data || !data.lessons || !data.lessons.length) return;

  var lessons = data.lessons;

  // DOM elements
  var indexView = document.getElementById('learn-index');
  var lessonView = document.getElementById('learn-lesson');
  var lessonList = document.getElementById('lesson-list');
  var progressEl = document.getElementById('learn-progress');
  var lessonTitleEl = document.getElementById('lesson-title');
  var lessonTextEl = document.getElementById('lesson-text');
  var positionTabs = document.getElementById('position-tabs');
  var boardEl = document.getElementById('chess-board');
  var positionTitleEl = document.getElementById('position-title');
  var positionDescEl = document.getElementById('position-desc');
  var stepCommentEl = document.getElementById('step-comment');
  var stepCounterEl = document.getElementById('step-counter');
  var lessonCompleteEl = document.getElementById('lesson-complete');

  var state = {
    board: null,
    currentLesson: 0,
    currentPosition: 0,
    currentStep: -1,       // -1 = initial position, 0+ = after step N
    lastMove: null,
    completedLessons: [],
    viewMode: 'index'
  };

  // ── localStorage ────────────────────────────────────────

  function loadProgress() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) state.completedLessons = JSON.parse(saved);
    } catch (e) {
      state.completedLessons = [];
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.completedLessons));
    } catch (e) { /* ignore */ }
  }

  function isLessonCompleted(lessonId) {
    return state.completedLessons.indexOf(lessonId) !== -1;
  }

  function completeLesson(lessonId) {
    if (!isLessonCompleted(lessonId)) {
      state.completedLessons.push(lessonId);
      saveProgress();
    }
  }

  // ── Index View ──────────────────────────────────────────

  function renderIndex() {
    state.viewMode = 'index';
    indexView.style.display = '';
    lessonView.style.display = 'none';

    var completed = 0;
    for (var i = 0; i < lessons.length; i++) {
      if (isLessonCompleted(lessons[i].id)) completed++;
    }
    progressEl.textContent = completed + ' / ' + lessons.length + ' completed';

    lessonList.innerHTML = '';
    for (var j = 0; j < lessons.length; j++) {
      var lesson = lessons[j];
      var li = document.createElement('li');
      li.className = 'chess-lesson-item';
      if (isLessonCompleted(lesson.id)) li.classList.add('completed');

      var num = document.createElement('span');
      num.className = 'chess-lesson-num';
      num.textContent = (j + 1) + '.';

      var info = document.createElement('div');
      info.className = 'chess-lesson-info';

      var title = document.createElement('span');
      title.className = 'chess-lesson-item-title';
      title.textContent = lesson.title;

      var desc = document.createElement('span');
      desc.className = 'chess-lesson-item-desc';
      desc.textContent = lesson.description;

      info.appendChild(title);
      info.appendChild(desc);

      var indicator = document.createElement('span');
      indicator.className = 'chess-lesson-indicator';
      indicator.textContent = isLessonCompleted(lesson.id) ? '\u2713' : '>';

      li.appendChild(num);
      li.appendChild(info);
      li.appendChild(indicator);

      li.dataset.index = j;
      li.addEventListener('click', function (e) {
        var idx = parseInt(e.currentTarget.dataset.index, 10);
        openLesson(idx);
      });

      lessonList.appendChild(li);
    }
  }

  // ── Lesson View ─────────────────────────────────────────

  function openLesson(index) {
    state.currentLesson = index;
    state.currentPosition = 0;
    state.currentStep = -1;
    state.viewMode = 'lesson';

    indexView.style.display = 'none';
    lessonView.style.display = '';
    lessonCompleteEl.style.display = 'none';

    var lesson = lessons[index];
    lessonTitleEl.textContent = lesson.title;

    // Render lesson text (paragraphs separated by \n\n)
    lessonTextEl.innerHTML = '';
    var paragraphs = lesson.content.split('\n\n');
    for (var i = 0; i < paragraphs.length; i++) {
      var p = document.createElement('p');
      p.textContent = paragraphs[i];
      lessonTextEl.appendChild(p);
    }

    renderPositionTabs();
    loadPosition(0);
  }

  function renderPositionTabs() {
    var lesson = lessons[state.currentLesson];
    positionTabs.innerHTML = '';

    if (lesson.positions.length <= 1) return;

    for (var i = 0; i < lesson.positions.length; i++) {
      var btn = document.createElement('button');
      btn.className = 'chess-position-tab';
      if (i === state.currentPosition) btn.classList.add('active');
      btn.textContent = 'Position ' + (i + 1);
      btn.dataset.index = i;
      btn.addEventListener('click', function (e) {
        var idx = parseInt(e.currentTarget.dataset.index, 10);
        loadPosition(idx);
      });
      positionTabs.appendChild(btn);
    }
  }

  function loadPosition(index) {
    state.currentPosition = index;
    state.currentStep = -1;
    state.lastMove = null;

    var lesson = lessons[state.currentLesson];
    var pos = lesson.positions[index];

    state.board = ChessEngine.parseFEN(pos.fen);

    positionTitleEl.textContent = pos.title;
    positionDescEl.textContent = pos.description;
    stepCommentEl.textContent = 'Press Next to step through the moves.';
    lessonCompleteEl.style.display = 'none';

    renderPositionTabs();
    updateStepCounter();
    renderBoard();
  }

  // ── Board Rendering (read-only) ─────────────────────────

  function renderBoard() {
    boardEl.innerHTML = '';
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var sq = document.createElement('div');
        sq.className = 'chess-square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');

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
        }

        boardEl.appendChild(sq);
      }
    }
  }

  // ── Step Navigation ─────────────────────────────────────

  function currentPosition() {
    return lessons[state.currentLesson].positions[state.currentPosition];
  }

  function nextStep() {
    var pos = currentPosition();
    if (state.currentStep >= pos.steps.length - 1) {
      // At last step — check if there's a next position
      var lesson = lessons[state.currentLesson];
      if (state.currentPosition < lesson.positions.length - 1) {
        loadPosition(state.currentPosition + 1);
      } else {
        // Lesson complete
        completeLesson(lesson.id);
        lessonCompleteEl.style.display = '';
        // Hide "Next Lesson" if this is the last lesson
        var nextBtn = document.getElementById('btn-next-lesson');
        if (state.currentLesson >= lessons.length - 1) {
          nextBtn.textContent = 'Back to Lessons';
        } else {
          nextBtn.textContent = 'Next Lesson >';
        }
      }
      return;
    }

    state.currentStep++;
    var step = pos.steps[state.currentStep];

    // Apply the move to the board
    var from = ChessEngine.fromAlgebraic(step.from);
    var to = ChessEngine.fromAlgebraic(step.to);

    // Handle castling
    var piece = state.board[from.row][from.col];
    if (piece && piece.piece === 'K' && Math.abs(to.col - from.col) === 2) {
      var homeRow = piece.color === 'w' ? 7 : 0;
      if (to.col === 6) {
        state.board[homeRow][5] = state.board[homeRow][7];
        state.board[homeRow][7] = null;
      } else if (to.col === 2) {
        state.board[homeRow][3] = state.board[homeRow][0];
        state.board[homeRow][0] = null;
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

    state.lastMove = { from: from, to: to };
    stepCommentEl.textContent = step.comment;
    updateStepCounter();
    renderBoard();
  }

  function prevStep() {
    if (state.currentStep < 0) return;

    // Reset board to initial position and replay up to currentStep - 1
    var pos = currentPosition();
    state.board = ChessEngine.parseFEN(pos.fen);
    state.lastMove = null;

    var targetStep = state.currentStep - 1;
    state.currentStep = -1;

    for (var i = 0; i <= targetStep; i++) {
      state.currentStep = i;
      var step = pos.steps[i];
      var from = ChessEngine.fromAlgebraic(step.from);
      var to = ChessEngine.fromAlgebraic(step.to);

      var piece = state.board[from.row][from.col];
      if (piece && piece.piece === 'K' && Math.abs(to.col - from.col) === 2) {
        var homeRow = piece.color === 'w' ? 7 : 0;
        if (to.col === 6) {
          state.board[homeRow][5] = state.board[homeRow][7];
          state.board[homeRow][7] = null;
        } else if (to.col === 2) {
          state.board[homeRow][3] = state.board[homeRow][0];
          state.board[homeRow][0] = null;
        }
      }

      state.board[to.row][to.col] = state.board[from.row][from.col];
      state.board[from.row][from.col] = null;

      var moved = state.board[to.row][to.col];
      if (moved && moved.piece === 'P') {
        if ((moved.color === 'w' && to.row === 0) || (moved.color === 'b' && to.row === 7)) {
          moved.piece = 'Q';
        }
      }

      state.lastMove = { from: from, to: to };
    }

    if (targetStep < 0) {
      state.currentStep = -1;
      state.lastMove = null;
      stepCommentEl.textContent = 'Press Next to step through the moves.';
    } else {
      stepCommentEl.textContent = pos.steps[targetStep].comment;
    }

    lessonCompleteEl.style.display = 'none';
    updateStepCounter();
    renderBoard();
  }

  function resetPosition() {
    loadPosition(state.currentPosition);
  }

  function updateStepCounter() {
    var pos = currentPosition();
    var current = state.currentStep + 1;
    stepCounterEl.textContent = 'Step ' + current + ' / ' + pos.steps.length;
  }

  // ── Event Bindings ──────────────────────────────────────

  document.getElementById('btn-back').addEventListener('click', renderIndex);
  document.getElementById('btn-next').addEventListener('click', nextStep);
  document.getElementById('btn-prev').addEventListener('click', prevStep);
  document.getElementById('btn-reset-pos').addEventListener('click', resetPosition);

  document.getElementById('btn-next-lesson').addEventListener('click', function () {
    if (state.currentLesson < lessons.length - 1) {
      openLesson(state.currentLesson + 1);
    } else {
      renderIndex();
    }
  });

  // ── Init ────────────────────────────────────────────────

  loadProgress();
  renderIndex();
})();
