(function () {
  var filters = document.getElementById("review-filters");
  if (!filters) return;

  var list = document.getElementById("review-list");
  var items = list.querySelectorAll("li[data-categories]");
  var active = { category: "all", tag: "all" };

  filters.addEventListener("click", function (e) {
    var btn = e.target.closest(".filter-btn");
    if (!btn) return;

    var group = btn.getAttribute("data-group");
    var value = btn.getAttribute("data-filter");
    active[group] = value;

    // Update active button state within this group
    filters
      .querySelectorAll('.filter-btn[data-group="' + group + '"]')
      .forEach(function (b) {
        b.classList.toggle("active", b === btn);
      });

    // Filter review cards
    items.forEach(function (li) {
      var cats = li.getAttribute("data-categories");
      var tags = li.getAttribute("data-tags");

      var matchCat =
        active.category === "all" || cats.indexOf(active.category) !== -1;
      var matchTag =
        active.tag === "all" || tags.indexOf(active.tag) !== -1;

      li.classList.toggle("hidden", !(matchCat && matchTag));
    });
  });
})();
