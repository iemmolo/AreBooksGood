(function() {
  'use strict';

  var app = document.getElementById('gig-app');
  if (!app) return;

  var raw = app.getAttribute('data-gigs');
  if (!raw) {
    document.getElementById('gig-no-data').style.display = 'block';
    return;
  }

  var data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    document.getElementById('gig-no-data').style.display = 'block';
    return;
  }

  if (!data.events || data.events.length === 0) {
    document.getElementById('gig-no-data').style.display = 'block';
    return;
  }

  // Elements
  var searchEl = document.getElementById('gig-search');
  var categoryEl = document.getElementById('gig-category');
  var priceEl = document.getElementById('gig-price');
  var dateEl = document.getElementById('gig-date');
  var countEl = document.getElementById('gig-count');
  var clearBtn = document.getElementById('gig-clear');
  var listEl = document.getElementById('gig-list');
  var emptyEl = document.getElementById('gig-empty');
  var emptyClearBtn = document.getElementById('gig-empty-clear');
  var updatedEl = document.getElementById('gig-updated');
  var locationEl = app.querySelector('.gig-location');

  // Build categories from actual events (API top-level cats don't match event cats)
  var catSet = {};
  for (var ci = 0; ci < data.events.length; ci++) {
    var eCat = data.events[ci].category;
    if (eCat && !catSet[eCat]) catSet[eCat] = true;
  }
  var catKeys = Object.keys(catSet).sort();
  for (var ck = 0; ck < catKeys.length; ck++) {
    var opt = document.createElement('option');
    opt.value = catKeys[ck];
    opt.textContent = catKeys[ck];
    categoryEl.appendChild(opt);
  }

  // Populate individual day options in date filter
  var daySet = {};
  var now = new Date();
  for (var d = 0; d < data.events.length; d++) {
    var evDate = new Date(data.events[d].datetime_start);
    if (evDate >= now) {
      var dayKey = evDate.toISOString().slice(0, 10);
      if (!daySet[dayKey]) {
        daySet[dayKey] = evDate;
      }
    }
  }
  var dayKeys = Object.keys(daySet).sort();
  for (var dk = 0; dk < dayKeys.length; dk++) {
    var dOpt = document.createElement('option');
    dOpt.value = 'day:' + dayKeys[dk];
    dOpt.textContent = formatDayShort(daySet[dayKeys[dk]]);
    dateEl.appendChild(dOpt);
  }

  // Filter past events and sort by date
  var events = [];
  for (var i = 0; i < data.events.length; i++) {
    var ev = data.events[i];
    var end = new Date(ev.datetime_end || ev.datetime_start);
    if (end >= now) {
      events.push(ev);
    }
  }
  events.sort(function(a, b) {
    return new Date(a.datetime_start) - new Date(b.datetime_start);
  });

  // Footer
  if (data.fetched_at) {
    updatedEl.textContent = 'Updated ' + relativeTime(new Date(data.fetched_at));
  }
  if (data.location) {
    locationEl.textContent = data.location + ' (' + (data.radius_km || 10) + 'km)';
  }

  // Initial render
  render();

  // Event listeners
  searchEl.addEventListener('input', render);
  categoryEl.addEventListener('change', render);
  priceEl.addEventListener('change', render);
  dateEl.addEventListener('change', render);
  clearBtn.addEventListener('click', clearFilters);
  emptyClearBtn.addEventListener('click', clearFilters);

  function clearFilters() {
    searchEl.value = '';
    categoryEl.value = '';
    priceEl.value = '';
    dateEl.value = '';
    render();
  }

  function render() {
    var query = searchEl.value.toLowerCase();
    var cat = categoryEl.value;
    var price = priceEl.value;
    var dateFilter = dateEl.value;
    var hasFilters = query || cat || price || dateFilter;

    clearBtn.style.display = hasFilters ? '' : 'none';

    var filtered = [];
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];

      // Text search
      if (query) {
        var haystack = (ev.name + ' ' + ev.venue + ' ' + (ev.description || '')).toLowerCase();
        if (haystack.indexOf(query) === -1) continue;
      }

      // Category
      if (cat && ev.category !== cat) continue;

      // Price
      if (price === 'free' && !ev.is_free) continue;
      if (price === 'paid' && ev.is_free) continue;

      // Date
      if (dateFilter && !matchDate(ev, dateFilter)) continue;

      filtered.push(ev);
    }

    // Update count
    countEl.textContent = filtered.length + ' event' + (filtered.length !== 1 ? 's' : '');

    // Render
    if (filtered.length === 0) {
      listEl.innerHTML = '';
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';

    var html = '';
    var lastDateKey = '';
    for (var j = 0; j < filtered.length; j++) {
      var e = filtered[j];
      var start = new Date(e.datetime_start);
      var dateKey = start.toISOString().slice(0, 10);

      // Date group heading
      if (dateKey !== lastDateKey) {
        html += '<div class="gig-date-group">' + formatDateHeading(start) + '</div>';
        lastDateKey = dateKey;
      }

      var isCancelled = e.status === 'cancelled';
      html += '<div class="gig-card' + (isCancelled ? ' gig-card-cancelled' : '') + '">';
      html += '<div class="gig-card-header">';
      html += '<a href="' + escHtml(e.url) + '" target="_blank" rel="noopener" class="gig-card-name">' + escHtml(e.name) + '</a>';
      html += '<span class="gig-badges">';
      if (isCancelled) {
        html += '<span class="gig-badge gig-badge-cancelled">Cancelled</span>';
      } else if (e.is_free) {
        html += '<span class="gig-badge gig-badge-free">Free</span>';
      }
      html += '</span>';
      html += '</div>';

      html += '<div class="gig-card-details">';
      html += '<div class="gig-card-detail"><span class="gig-card-detail-label">when</span><span>' + formatTime(start) + '</span></div>';
      html += '<div class="gig-card-detail"><span class="gig-card-detail-label">where</span><span>' + escHtml(e.venue) + '</span></div>';
      if (e.category) {
        html += '<div class="gig-card-detail"><span class="gig-card-detail-label">type</span><span>' + escHtml(e.category) + '</span></div>';
      }
      if (!e.is_free && e.price) {
        html += '<div class="gig-card-detail"><span class="gig-card-detail-label">price</span><span>' + escHtml(e.price) + '</span></div>';
      }
      if (e.age_restriction) {
        html += '<div class="gig-card-detail"><span class="gig-card-detail-label">age</span><span>' + escHtml(e.age_restriction) + '</span></div>';
      }
      html += '</div>';

      if (e.description) {
        html += '<div class="gig-card-desc">' + escHtml(e.description) + '</div>';
      }

      html += '</div>';
    }

    listEl.innerHTML = html;
  }

  function matchDate(ev, filter) {
    var start = new Date(ev.datetime_start);
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filter === 'today') {
      var tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return start >= today && start < tomorrow;
    }
    if (filter === 'tomorrow') {
      var tom = new Date(today);
      tom.setDate(tom.getDate() + 1);
      var dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);
      return start >= tom && start < dayAfter;
    }
    if (filter === 'weekend') {
      var day = today.getDay();
      var satOffset = (6 - day + 7) % 7;
      var sat = new Date(today);
      sat.setDate(sat.getDate() + satOffset);
      var mon = new Date(sat);
      mon.setDate(mon.getDate() + 2);
      return start >= sat && start < mon;
    }
    if (filter === 'week') {
      var weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return start >= today && start < weekEnd;
    }
    if (filter.indexOf('day:') === 0) {
      var dayStr = filter.slice(4);
      return start.toISOString().slice(0, 10) === dayStr;
    }
    return true;
  }

  function formatDateHeading(d) {
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()];
  }

  function formatDayShort(d) {
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()];
  }

  function formatTime(d) {
    var h = d.getHours();
    var m = d.getMinutes();
    var ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return h + (m > 0 ? ':' + (m < 10 ? '0' : '') + m : '') + ampm;
  }

  function relativeTime(d) {
    var diff = Math.floor((new Date() - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();
