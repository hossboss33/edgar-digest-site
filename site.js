
(function () {
  var KEY = "fd_watchlist";
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }
  function save(list) { localStorage.setItem(KEY, JSON.stringify(list)); }
  function toggle(t) {
    var list = load(), i = list.indexOf(t);
    if (i >= 0) list.splice(i, 1); else list.push(t);
    save(list); render();
  }
  function render() {
    var list = load();
    document.querySelectorAll("[data-star]").forEach(function (btn) {
      var on = list.indexOf(btn.dataset.star) >= 0;
      btn.classList.toggle("star-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.title = on ? "Remove from your watchlist" : "Add to your watchlist";
    });
    var strip = document.getElementById("mywatch");
    if (strip) {
      var root = strip.dataset.root || "";
      if (list.length) {
        strip.hidden = false;
        strip.querySelector(".mywatch-chips").innerHTML = list.map(function (t) {
          return '<a href="' + root + "companies/" + t + '.html">' + t + "</a>";
        }).join("");
      } else { strip.hidden = true; }
    }
    var only = document.getElementById("only-follow");
    if (only) filterRows();
  }
  function filterRows() {
    var q = (document.getElementById("co-search") || {}).value || "";
    q = q.trim().toUpperCase();
    var onlyFollow = (document.getElementById("only-follow") || {}).checked;
    var list = load();
    var n = 0;
    document.querySelectorAll(".corow").forEach(function (row) {
      var hay = row.dataset.hay || "";
      var hit = !q || hay.indexOf(q) >= 0;
      if (onlyFollow) hit = hit && list.indexOf(row.dataset.ticker) >= 0;
      row.hidden = !hit;
      if (hit) n++;
    });
    var count = document.getElementById("co-count");
    if (count) count.textContent = n + " compan" + (n === 1 ? "y" : "ies");
  }
  document.addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-star]");
    if (btn) { ev.preventDefault(); toggle(btn.dataset.star); }
  });
  document.addEventListener("input", function (ev) {
    if (ev.target.id === "co-search") filterRows();
  });
  document.addEventListener("change", function (ev) {
    if (ev.target.id === "only-follow") filterRows();
  });
  document.addEventListener("DOMContentLoaded", render);
})();
