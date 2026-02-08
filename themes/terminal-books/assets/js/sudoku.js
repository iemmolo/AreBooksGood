(function () {
  'use strict';

  // ── Constants ────────────────────────────────────────────
  var STORAGE_KEY = 'sudoku-stats';
  var STATE_KEY = 'sudoku-state';
  var DIFFICULTIES = ['easy', 'medium', 'hard', 'diabolical'];

  // ── DOM refs ─────────────────────────────────────────────
  var app = document.getElementById('sudoku-app');
  if (!app) return;

  var dom = {
    board:          document.getElementById('sdk-board'),
    difficulty:     document.getElementById('sdk-difficulty'),
    newBtn:         document.getElementById('sdk-new'),
    timer:          document.getElementById('sdk-timer'),
    numpad:         document.getElementById('sdk-numpad'),
    pencilBtn:      document.getElementById('sdk-pencil'),
    autoPencilBtn:  document.getElementById('sdk-auto-pencil'),
    undoBtn:        document.getElementById('sdk-undo'),
    checkBtn:       document.getElementById('sdk-check'),
    pauseBtn:       document.getElementById('sdk-pause'),
    completeMsg:    document.getElementById('sdk-complete-msg'),
    completeMsgTime: document.getElementById('sdk-complete-time'),
    completeNewBtn: document.getElementById('sdk-complete-new'),
    resetStats:     document.getElementById('sdk-reset-stats')
  };

  var statEls = {};
  DIFFICULTIES.forEach(function (d) {
    statEls[d]         = document.getElementById('sdk-stat-' + d);
    statEls[d + 'Best'] = document.getElementById('sdk-stat-' + d + '-best');
  });

  // ── Data ─────────────────────────────────────────────────
  var data = window.__SUDOKU_DATA;
  if (!data) return;

  var puzzlesByDiff = {};
  data.difficulties.forEach(function (d) {
    puzzlesByDiff[d.name] = d.puzzles;
  });

  // ── State ────────────────────────────────────────────────
  var state = {
    puzzle: null,       // 81-char string (original)
    puzzleId: null,     // puzzle id for state persistence
    solution: null,     // 81-char string (solved)
    grid: [],           // current player grid (0=empty)
    pencil: [],         // pencil[i] = Set of marks
    selected: -1,       // selected cell index
    pencilMode: false,
    history: [],        // undo stack: {index, prevValue, prevPencil}
    timerSeconds: 0,
    timerInterval: null,
    paused: false,
    completed: false,
    difficulty: 'easy',
    usedPuzzles: {}     // track used puzzles per difficulty
  };

  var stats = loadStats();

  // ── Stats persistence ────────────────────────────────────
  function defaultStats() {
    var s = {};
    DIFFICULTIES.forEach(function (d) {
      s[d] = { solved: 0, best: null };
    });
    return s;
  }

  function loadStats() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        DIFFICULTIES.forEach(function (d) {
          if (!parsed[d]) parsed[d] = { solved: 0, best: null };
        });
        return parsed;
      }
    } catch (e) { /* ignore */ }
    return defaultStats();
  }

  function saveStats() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); } catch (e) { /* ignore */ }
  }

  function renderStats() {
    DIFFICULTIES.forEach(function (d) {
      statEls[d].textContent = stats[d].solved;
      statEls[d + 'Best'].textContent = stats[d].best !== null ? formatTime(stats[d].best) : '--';
    });
  }

  // ── State persistence ────────────────────────────────────
  function saveState() {
    if (state.completed) {
      clearSavedState();
      return;
    }
    try {
      var pencilData = [];
      for (var i = 0; i < 81; i++) {
        pencilData.push(Array.from(state.pencil[i]));
      }
      var obj = {
        puzzleId: state.puzzleId,
        difficulty: state.difficulty,
        grid: state.grid.slice(),
        pencil: pencilData,
        pencilMode: state.pencilMode,
        timerSeconds: state.timerSeconds,
        history: state.history.map(function (h) {
          return { index: h.index, prevValue: h.prevValue, prevPencil: Array.from(h.prevPencil) };
        })
      };
      localStorage.setItem(STATE_KEY, JSON.stringify(obj));
    } catch (e) { /* ignore */ }
  }

  function loadSavedState() {
    try {
      var raw = localStorage.getItem(STATE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj.puzzleId || !obj.difficulty || !obj.grid) return null;
      var pool = puzzlesByDiff[obj.difficulty];
      if (!pool) return null;
      var entry = null;
      for (var i = 0; i < pool.length; i++) {
        if (pool[i].id === obj.puzzleId) { entry = pool[i]; break; }
      }
      if (!entry) return null;
      return { entry: entry, saved: obj };
    } catch (e) { return null; }
  }

  function clearSavedState() {
    try { localStorage.removeItem(STATE_KEY); } catch (e) { /* ignore */ }
  }

  function restoreState(entry, saved) {
    state.puzzle = entry.puzzle;
    state.puzzleId = entry.id;
    state.solution = entry.solution;
    state.difficulty = saved.difficulty;
    state.grid = saved.grid;
    state.pencil = [];
    for (var i = 0; i < 81; i++) {
      state.pencil.push(new Set(saved.pencil[i] || []));
    }
    state.pencilMode = saved.pencilMode || false;
    state.timerSeconds = saved.timerSeconds || 0;
    state.history = (saved.history || []).map(function (h) {
      return { index: h.index, prevValue: h.prevValue, prevPencil: new Set(h.prevPencil || []) };
    });
    state.selected = -1;
    state.completed = false;
    state.paused = false;

    dom.difficulty.value = saved.difficulty;
    dom.pencilBtn.textContent = 'Pencil: ' + (state.pencilMode ? 'ON' : 'OFF');
    if (state.pencilMode) {
      dom.pencilBtn.classList.add('sdk-active');
    } else {
      dom.pencilBtn.classList.remove('sdk-active');
    }
    dom.board.classList.remove('sdk-complete');
    dom.board.classList.remove('sdk-paused');
    dom.completeMsg.style.display = 'none';
    dom.pauseBtn.textContent = '\u23F8';

    buildBoard();
    dom.timer.textContent = formatTime(state.timerSeconds);
    startTimerFromCurrent();
    updateNumpadState();
  }

  // ── Timer ────────────────────────────────────────────────
  function startTimer() {
    stopTimer();
    state.timerSeconds = 0;
    state.paused = false;
    dom.timer.textContent = '0:00';
    dom.pauseBtn.textContent = '\u23F8';
    dom.board.classList.remove('sdk-paused');
    state.timerInterval = setInterval(function () {
      state.timerSeconds++;
      dom.timer.textContent = formatTime(state.timerSeconds);
    }, 1000);
  }

  function startTimerFromCurrent() {
    stopTimer();
    state.paused = false;
    state.timerInterval = setInterval(function () {
      state.timerSeconds++;
      dom.timer.textContent = formatTime(state.timerSeconds);
    }, 1000);
  }

  function stopTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  function togglePause() {
    if (state.completed) return;
    if (state.paused) {
      state.paused = false;
      dom.pauseBtn.textContent = '\u23F8';
      dom.board.classList.remove('sdk-paused');
      state.timerInterval = setInterval(function () {
        state.timerSeconds++;
        dom.timer.textContent = formatTime(state.timerSeconds);
      }, 1000);
    } else {
      stopTimer();
      state.paused = true;
      dom.pauseBtn.textContent = '\u25B6';
      dom.board.classList.add('sdk-paused');
    }
  }

  function formatTime(s) {
    var min = Math.floor(s / 60);
    var sec = s % 60;
    return min + ':' + (sec < 10 ? '0' : '') + sec;
  }

  // ── Puzzle loading ───────────────────────────────────────
  function loadNewPuzzle() {
    var diff = dom.difficulty.value;
    state.difficulty = diff;
    var pool = puzzlesByDiff[diff];
    if (!pool || pool.length === 0) return;

    // Track used puzzles to avoid repeats
    if (!state.usedPuzzles[diff]) state.usedPuzzles[diff] = [];
    if (state.usedPuzzles[diff].length >= pool.length) {
      state.usedPuzzles[diff] = [];
    }

    var available = pool.filter(function (p) {
      return state.usedPuzzles[diff].indexOf(p.id) === -1;
    });
    if (available.length === 0) {
      state.usedPuzzles[diff] = [];
      available = pool;
    }

    var entry = available[Math.floor(Math.random() * available.length)];
    state.usedPuzzles[diff].push(entry.id);

    state.puzzle = entry.puzzle;
    state.puzzleId = entry.id;
    state.solution = entry.solution;
    state.grid = entry.puzzle.split('').map(Number);
    state.pencil = [];
    for (var i = 0; i < 81; i++) state.pencil.push(new Set());
    state.selected = -1;
    state.pencilMode = false;
    state.history = [];
    state.completed = false;
    state.paused = false;

    dom.pencilBtn.textContent = 'Pencil: OFF';
    dom.pencilBtn.classList.remove('sdk-active');
    dom.board.classList.remove('sdk-complete');
    dom.board.classList.remove('sdk-paused');
    dom.completeMsg.style.display = 'none';
    dom.pauseBtn.textContent = '\u23F8';

    buildBoard();
    startTimer();
    updateNumpadState();
    saveState();
  }

  // ── Board rendering ──────────────────────────────────────
  function buildBoard() {
    dom.board.innerHTML = '';
    for (var i = 0; i < 81; i++) {
      var cell = document.createElement('div');
      cell.className = 'sdk-cell';
      cell.dataset.index = i;
      cell.dataset.row = Math.floor(i / 9);
      cell.dataset.col = i % 9;
      cell.setAttribute('tabindex', '0');
      dom.board.appendChild(cell);
    }
    renderBoard();
  }

  function renderBoard() {
    var cells = dom.board.children;
    var selRow = -1, selCol = -1, selBox = -1, selNum = 0;

    if (state.selected >= 0) {
      selRow = Math.floor(state.selected / 9);
      selCol = state.selected % 9;
      selBox = Math.floor(selRow / 3) * 3 + Math.floor(selCol / 3);
      selNum = state.grid[state.selected];
    }

    for (var i = 0; i < 81; i++) {
      var cell = cells[i];
      var val = state.grid[i];
      var isGiven = state.puzzle.charAt(i) !== '0';
      var row = Math.floor(i / 9);
      var col = i % 9;
      var box = Math.floor(row / 3) * 3 + Math.floor(col / 3);

      // Reset classes
      cell.className = 'sdk-cell';
      if (isGiven) cell.classList.add('sdk-given');
      else if (val !== 0) cell.classList.add('sdk-player');

      // Highlighting
      if (i === state.selected) {
        cell.classList.add('sdk-selected');
      } else if (state.selected >= 0) {
        if (row === selRow || col === selCol || box === selBox) {
          cell.classList.add('sdk-peer');
        }
        if (selNum !== 0 && val === selNum) {
          cell.classList.add('sdk-same-num');
        }
      }

      // Conflict detection
      if (val !== 0 && !isGiven && hasConflict(i, val)) {
        cell.classList.add('sdk-conflict');
      }

      // Render content
      if (val !== 0) {
        cell.textContent = val;
      } else if (state.pencil[i].size > 0) {
        cell.textContent = '';
        var markDiv = document.createElement('div');
        markDiv.className = 'sdk-pencil-marks';
        for (var n = 1; n <= 9; n++) {
          var span = document.createElement('span');
          span.textContent = state.pencil[i].has(n) ? n : '';
          markDiv.appendChild(span);
        }
        cell.appendChild(markDiv);
      } else {
        cell.textContent = '';
      }
    }
  }

  function hasConflict(idx, val) {
    var row = Math.floor(idx / 9);
    var col = idx % 9;
    var boxR = Math.floor(row / 3) * 3;
    var boxC = Math.floor(col / 3) * 3;

    for (var i = 0; i < 9; i++) {
      // Row check
      var ri = row * 9 + i;
      if (ri !== idx && state.grid[ri] === val) return true;
      // Col check
      var ci = i * 9 + col;
      if (ci !== idx && state.grid[ci] === val) return true;
      // Box check
      var br = boxR + Math.floor(i / 3);
      var bc = boxC + (i % 3);
      var bi = br * 9 + bc;
      if (bi !== idx && state.grid[bi] === val) return true;
    }
    return false;
  }

  // ── Number pad state ─────────────────────────────────────
  function updateNumpadState() {
    var counts = {};
    for (var n = 1; n <= 9; n++) counts[n] = 0;
    for (var i = 0; i < 81; i++) {
      if (state.grid[i] !== 0) counts[state.grid[i]]++;
    }

    var activeNum = 0;
    if (state.selected >= 0) {
      activeNum = state.grid[state.selected];
    }

    var btns = dom.numpad.querySelectorAll('.sdk-num-btn[data-num]');
    for (var j = 0; j < btns.length; j++) {
      var num = parseInt(btns[j].dataset.num, 10);
      if (num >= 1 && num <= 9) {
        btns[j].disabled = counts[num] >= 9 && !state.pencilMode;
        if (num === activeNum && activeNum !== 0) {
          btns[j].classList.add('sdk-num-active');
        } else {
          btns[j].classList.remove('sdk-num-active');
        }
      }
    }
  }

  // ── Input handling ───────────────────────────────────────
  function selectCell(idx) {
    if (state.completed || state.paused) return;
    state.selected = idx;
    renderBoard();
    updateNumpadState();
  }

  function enterNumber(num) {
    if (state.completed || state.paused || state.selected < 0) return;
    var idx = state.selected;
    if (state.puzzle.charAt(idx) !== '0') return; // can't edit given

    if (state.pencilMode) {
      // Pencil mark toggle
      var prevPencil = new Set(state.pencil[idx]);
      if (num === 0) {
        state.pencil[idx] = new Set();
      } else {
        if (state.pencil[idx].has(num)) {
          state.pencil[idx].delete(num);
        } else {
          state.pencil[idx].add(num);
        }
      }
      state.history.push({ index: idx, prevValue: state.grid[idx], prevPencil: prevPencil });
    } else {
      // Normal entry
      var prevVal = state.grid[idx];
      var prevPencil2 = new Set(state.pencil[idx]);

      if (num === 0) {
        state.grid[idx] = 0;
      } else {
        state.grid[idx] = num;
        state.pencil[idx] = new Set();
        // Remove pencil marks for this number from peers
        removePeerPencilMarks(idx, num);
      }
      state.history.push({ index: idx, prevValue: prevVal, prevPencil: prevPencil2 });
    }

    renderBoard();
    updateNumpadState();
    saveState();
    checkCompletion();
  }

  function removePeerPencilMarks(idx, num) {
    var row = Math.floor(idx / 9);
    var col = idx % 9;
    var boxR = Math.floor(row / 3) * 3;
    var boxC = Math.floor(col / 3) * 3;

    for (var i = 0; i < 9; i++) {
      state.pencil[row * 9 + i].delete(num);
      state.pencil[i * 9 + col].delete(num);
      var br = boxR + Math.floor(i / 3);
      var bc = boxC + (i % 3);
      state.pencil[br * 9 + bc].delete(num);
    }
  }

  function undo() {
    if (state.completed || state.paused || state.history.length === 0) return;
    var entry = state.history.pop();
    state.grid[entry.index] = entry.prevValue;
    state.pencil[entry.index] = entry.prevPencil;
    renderBoard();
    updateNumpadState();
    saveState();
  }

  function checkErrors() {
    if (state.completed || state.paused) return;
    var cells = dom.board.children;
    var hasError = false;

    for (var i = 0; i < 81; i++) {
      cells[i].classList.remove('sdk-error');
      if (state.puzzle.charAt(i) === '0' && state.grid[i] !== 0) {
        if (state.grid[i] !== parseInt(state.solution.charAt(i), 10)) {
          cells[i].classList.add('sdk-error');
          hasError = true;
        }
      }
    }

    if (!hasError) {
      // Flash the board briefly to indicate all correct so far
      dom.board.style.borderColor = 'var(--accent)';
      setTimeout(function () {
        dom.board.style.borderColor = '';
      }, 600);
    }
  }

  // ── Auto-pencil fill ─────────────────────────────────────
  function autoPencilFill() {
    if (state.completed || state.paused) return;

    for (var i = 0; i < 81; i++) {
      if (state.grid[i] !== 0) continue;

      var row = Math.floor(i / 9);
      var col = i % 9;
      var boxR = Math.floor(row / 3) * 3;
      var boxC = Math.floor(col / 3) * 3;

      var used = new Set();
      for (var j = 0; j < 9; j++) {
        if (state.grid[row * 9 + j] !== 0) used.add(state.grid[row * 9 + j]);
        if (state.grid[j * 9 + col] !== 0) used.add(state.grid[j * 9 + col]);
        var br = boxR + Math.floor(j / 3);
        var bc = boxC + (j % 3);
        if (state.grid[br * 9 + bc] !== 0) used.add(state.grid[br * 9 + bc]);
      }

      var marks = new Set();
      for (var n = 1; n <= 9; n++) {
        if (!used.has(n)) marks.add(n);
      }
      state.pencil[i] = marks;
    }

    renderBoard();
    saveState();
  }

  // ── Tab to next empty cell ───────────────────────────────
  function tabToNextEmpty(reverse) {
    if (state.completed || state.paused) return;
    var start = state.selected >= 0 ? state.selected : -1;
    var step = reverse ? -1 : 1;
    for (var count = 0; count < 81; count++) {
      start = (start + step + 81) % 81;
      if (state.grid[start] === 0 && state.puzzle.charAt(start) === '0') {
        selectCell(start);
        return;
      }
    }
  }

  // ── Completion ───────────────────────────────────────────
  function checkCompletion() {
    // Check if grid matches solution
    for (var i = 0; i < 81; i++) {
      if (state.grid[i] !== parseInt(state.solution.charAt(i), 10)) return;
    }

    // Puzzle complete!
    state.completed = true;
    stopTimer();
    clearSavedState();

    // Update stats
    var diff = state.difficulty;
    stats[diff].solved++;
    if (stats[diff].best === null || state.timerSeconds < stats[diff].best) {
      stats[diff].best = state.timerSeconds;
    }
    saveStats();
    renderStats();

    // Show completion message
    dom.completeMsgTime.textContent = formatTime(state.timerSeconds);
    dom.completeMsg.style.display = '';

    // Celebration animation
    dom.board.classList.add('sdk-complete');
    var cells = dom.board.children;
    for (var j = 0; j < 81; j++) {
      (function (idx) {
        var row = Math.floor(idx / 9);
        var col = idx % 9;
        var delay = (row + col) * 40;
        setTimeout(function () {
          cells[idx].classList.add('sdk-ripple');
        }, delay);
      })(j);
    }
  }

  // ── Keyboard navigation ──────────────────────────────────
  function handleKeydown(e) {
    if (state.completed) return;

    var key = e.key;

    // Tab to next empty cell
    if (key === 'Tab') {
      e.preventDefault();
      tabToNextEmpty(e.shiftKey);
      return;
    }

    if (state.paused) return;

    // Arrow navigation
    if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
      e.preventDefault();
      if (state.selected < 0) { selectCell(0); return; }
      var row = Math.floor(state.selected / 9);
      var col = state.selected % 9;
      if (key === 'ArrowUp' && row > 0) selectCell((row - 1) * 9 + col);
      if (key === 'ArrowDown' && row < 8) selectCell((row + 1) * 9 + col);
      if (key === 'ArrowLeft' && col > 0) selectCell(row * 9 + (col - 1));
      if (key === 'ArrowRight' && col < 8) selectCell(row * 9 + (col + 1));
      return;
    }

    // Number input
    if (key >= '1' && key <= '9') {
      e.preventDefault();
      enterNumber(parseInt(key, 10));
      return;
    }

    // Erase
    if (key === 'Backspace' || key === 'Delete' || key === '0') {
      e.preventDefault();
      enterNumber(0);
      return;
    }

    // Pencil toggle
    if (key === 'p' || key === 'P') {
      e.preventDefault();
      togglePencil();
      return;
    }

    // Undo
    if ((e.ctrlKey || e.metaKey) && key === 'z') {
      e.preventDefault();
      undo();
      return;
    }
  }

  function togglePencil() {
    state.pencilMode = !state.pencilMode;
    dom.pencilBtn.textContent = 'Pencil: ' + (state.pencilMode ? 'ON' : 'OFF');
    if (state.pencilMode) {
      dom.pencilBtn.classList.add('sdk-active');
    } else {
      dom.pencilBtn.classList.remove('sdk-active');
    }
    updateNumpadState();
    saveState();
  }

  // ── Event listeners ──────────────────────────────────────
  dom.board.addEventListener('click', function (e) {
    var cell = e.target.closest('.sdk-cell');
    if (cell) selectCell(parseInt(cell.dataset.index, 10));
  });

  dom.numpad.addEventListener('click', function (e) {
    var btn = e.target.closest('.sdk-num-btn');
    if (btn && !btn.disabled) enterNumber(parseInt(btn.dataset.num, 10));
  });

  dom.pencilBtn.addEventListener('click', togglePencil);
  dom.autoPencilBtn.addEventListener('click', autoPencilFill);
  dom.undoBtn.addEventListener('click', undo);
  dom.checkBtn.addEventListener('click', checkErrors);
  dom.pauseBtn.addEventListener('click', togglePause);

  dom.newBtn.addEventListener('click', function () {
    clearSavedState();
    loadNewPuzzle();
  });

  dom.completeNewBtn.addEventListener('click', function () {
    clearSavedState();
    loadNewPuzzle();
  });

  dom.difficulty.addEventListener('change', function () {
    clearSavedState();
    loadNewPuzzle();
  });

  dom.resetStats.addEventListener('click', function () {
    if (confirm('Reset all Sudoku stats?')) {
      stats = defaultStats();
      saveStats();
      renderStats();
    }
  });

  document.addEventListener('keydown', handleKeydown);

  // ── Init ─────────────────────────────────────────────────
  renderStats();
  var saved = loadSavedState();
  if (saved) {
    restoreState(saved.entry, saved.saved);
  } else {
    loadNewPuzzle();
  }
})();
