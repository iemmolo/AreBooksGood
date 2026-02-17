// Data wipe: bump this number to force all users to start fresh
(function() {
  var WIPE_VERSION = 1;
  var stored = localStorage.getItem('arebooksgood-wipe-version');
  if (!stored || parseInt(stored, 10) < WIPE_VERSION) {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf('arebooksgood-') === 0) keys.push(k);
    }
    for (var j = 0; j < keys.length; j++) {
      localStorage.removeItem(keys[j]);
    }
    localStorage.setItem('arebooksgood-wipe-version', String(WIPE_VERSION));
  }
})();

(function() {
  var select = document.getElementById('theme-select');
  if (!select) return;

  select.addEventListener('change', function() {
    document.documentElement.setAttribute('data-theme', this.value);
    localStorage.setItem('theme', this.value);
  });
})();
