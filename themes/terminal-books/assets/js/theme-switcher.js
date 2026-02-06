(function() {
  var select = document.getElementById('theme-select');
  if (!select) return;

  select.addEventListener('change', function() {
    document.documentElement.setAttribute('data-theme', this.value);
    localStorage.setItem('theme', this.value);
  });
})();
