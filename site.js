
(function () {
  "use strict";
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.body.dataset.root || "";

  /* ---- theme ---- */
  var toggle = document.getElementById("theme-toggle");
  if (toggle) toggle.addEventListener("click", function () {
    var cur = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = cur;
    try { localStorage.setItem("fd_theme", cur); } catch (e) {}
  });

  /* ---- watchlist ---- */
  var KEY = "fd_watchlist";
  function wl() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function wlSave(l) { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} }
  function wlToggle(t) {
    var l = wl(), i = l.indexOf(t);
    if (i >= 0) l.splice(i, 1); else l.push(t);
    wlSave(l); wlRender();
  }
  function wlRender() {
    var l = wl();
    document.querySelectorAll("[data-star]").forEach(function (b) {
      var on = l.indexOf(b.dataset.star) >= 0;
      b.classList.toggle("star-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    var strip = document.getElementById("mywatch");
    if (strip) {
      if (l.length) {
        strip.hidden = false;
        strip.querySelector(".mywatch-chips").innerHTML = l.map(function (t) {
          return '<a href="' + root + "companies/" + t + '.html">' + t + "</a>";
        }).join("");
      } else strip.hidden = true;
    }
    filterRows();
  }
  function filterRows() {
    var input = document.getElementById("co-search");
    if (!input) return;
    var q = input.value.trim().toUpperCase();
    var only = (document.getElementById("only-follow") || {}).checked;
    var l = wl(), n = 0;
    document.querySelectorAll(".corow").forEach(function (r) {
      var hit = (!q || (r.dataset.hay || "").indexOf(q) >= 0)
        && (!only || l.indexOf(r.dataset.ticker) >= 0);
      r.hidden = !hit;
      if (hit) n++;
    });
    var c = document.getElementById("co-count");
    if (c) c.textContent = n + " compan" + (n === 1 ? "y" : "ies");
  }
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-star]");
    if (b) { ev.preventDefault(); wlToggle(b.dataset.star); }
  });
  document.addEventListener("input", function (ev) {
    if (ev.target.id === "co-search") filterRows();
  });
  document.addEventListener("change", function (ev) {
    if (ev.target.id === "only-follow") filterRows();
  });

  /* ---- scroll reveals ---- */
  var revealEls = document.querySelectorAll(".reveal");
  if (!reduce && "IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- count-up stats ---- */
  var counts = document.querySelectorAll("[data-count]");
  if (counts.length) {
    var fmt = function (x) { return x.toLocaleString("en-US"); };
    if (reduce || !("IntersectionObserver" in window)) {
      counts.forEach(function (el) { el.textContent = fmt(+el.dataset.count); });
    } else {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          cio.unobserve(en.target);
          var target = +en.target.dataset.count, t0 = null;
          var dur = 700;
          function tick(ts) {
            if (!t0) t0 = ts;
            var p = Math.min(1, (ts - t0) / dur);
            p = 1 - Math.pow(1 - p, 3);
            en.target.textContent = fmt(Math.round(target * p));
            if (p < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
      }, { threshold: 0.4 });
      counts.forEach(function (el) { el.textContent = "0"; cio.observe(el); });
    }
  }

  /* ---- reading progress ---- */
  var bar = document.querySelector(".progress-bar");
  if (bar && document.body.classList.contains("has-progress")) {
    var ticking = false;
    function paint() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? h.scrollTop / max : 0;
      bar.style.transform = "scaleX(" + p + ")";
      ticking = false;
    }
    addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(paint); }
    }, { passive: true });
    paint();
  } else if (bar) {
    bar.parentElement.style.display = "none";
  }

  /* ---- read aloud ---- */
  var canSpeak = "speechSynthesis" in window;
  if (!canSpeak) {
    document.querySelectorAll("[data-speak], #listen-issue").forEach(function (b) {
      b.style.display = "none";
    });
  } else {
    var speaking = null;
    function stopSpeak() {
      speechSynthesis.cancel();
      if (speaking) speaking.classList.remove("speaking");
      speaking = null;
    }
    function noteText(art) {
      var parts = [];
      var co = art.querySelector(".entry-co");
      if (co) parts.push(co.textContent + ".");
      var hl = art.querySelector(".entry-headline");
      if (hl) parts.push(hl.textContent);
      art.querySelectorAll(".point").forEach(function (p) { parts.push(p.textContent); });
      return parts.join(" ");
    }
    function speak(text, btn) {
      stopSpeak();
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 1.02;
      u.onend = u.onerror = stopSpeak;
      speaking = btn;
      if (btn) btn.classList.add("speaking");
      speechSynthesis.speak(u);
    }
    document.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-speak]");
      if (b) {
        if (speaking === b) return stopSpeak();
        var art = document.querySelector('[data-note="' + b.dataset.speak + '"]');
        if (art) speak(noteText(art), b);
      }
      var li = ev.target.closest("#listen-issue");
      if (li) {
        if (speaking === li) return stopSpeak();
        var chunks = [];
        document.querySelectorAll(".entry[data-note]").forEach(function (a) {
          chunks.push(noteText(a));
        });
        if (chunks.length) speak(chunks.join(" Next note. "), li);
      }
    });
    addEventListener("pagehide", stopSpeak);
  }

  /* ---- copy link ---- */
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-copylink]");
    if (!b) return;
    var url = location.origin + location.pathname + "#" + b.dataset.copylink;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
      .then(function () {
        b.classList.add("copied");
        setTimeout(function () { b.classList.remove("copied"); }, 1200);
      }).catch(function () { prompt("Copy link:", url); });
  });

  /* ---- command palette ---- */
  var pal = document.getElementById("palette");
  var palInput = document.getElementById("palette-input");
  var palList = document.getElementById("palette-list");
  var palSel = 0, palItems = [];
  function palOpen() {
    if (!pal) return;
    pal.hidden = false;
    document.body.classList.add("pal-open");
    palInput.value = "";
    palRender("");
    setTimeout(function () { palInput.focus(); }, 10);
  }
  function palClose() {
    if (!pal) return;
    pal.hidden = true;
    document.body.classList.remove("pal-open");
  }
  function palRender(q) {
    var data = window.FD_COMPANIES || [];
    q = q.trim().toUpperCase();
    var starred = wl();
    var scored = [];
    for (var i = 0; i < data.length; i++) {
      var it = data[i];
      var hay = (it.t + " " + it.n).toUpperCase();
      var idx = hay.indexOf(q);
      if (!q) idx = starred.indexOf(it.t) >= 0 ? 0 : 1;
      if (idx < 0) continue;
      scored.push([idx === 0 ? 0 : 1, it]);
      if (scored.length > 400) break;
    }
    scored.sort(function (a, b) { return a[0] - b[0]; });
    palItems = scored.slice(0, 10).map(function (s) { return s[1]; });
    palSel = 0;
    palList.innerHTML = palItems.map(function (it, i) {
      return '<li class="' + (i === palSel ? "sel" : "") + '" data-i="' + i + '">'
        + '<span class="tick">' + it.t + "</span><span>" + it.n + "</span>"
        + (starred.indexOf(it.t) >= 0 ? '<span class="pal-star">&#9733;</span>' : "")
        + "</li>";
    }).join("") || '<li class="pal-empty">No matches</li>';
  }
  function palGo() {
    var it = palItems[palSel];
    if (it) location.href = root + "companies/" + it.t + ".html";
  }
  if (pal) {
    var opener = document.getElementById("palette-open");
    if (opener) opener.addEventListener("click", palOpen);
    document.addEventListener("keydown", function (ev) {
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "k") {
        ev.preventDefault(); pal.hidden ? palOpen() : palClose();
      } else if (!pal.hidden) {
        if (ev.key === "Escape") palClose();
        else if (ev.key === "ArrowDown") { ev.preventDefault(); palSel = Math.min(palSel + 1, palItems.length - 1); palPaint(); }
        else if (ev.key === "ArrowUp") { ev.preventDefault(); palSel = Math.max(palSel - 1, 0); palPaint(); }
        else if (ev.key === "Enter") { ev.preventDefault(); palGo(); }
      }
    });
    function palPaint() {
      palList.querySelectorAll("li").forEach(function (li, i) {
        li.classList.toggle("sel", i === palSel);
      });
    }
    palInput.addEventListener("input", function () { palRender(palInput.value); });
    palList.addEventListener("click", function (ev) {
      var li = ev.target.closest("li[data-i]");
      if (li) { palSel = +li.dataset.i; palGo(); }
    });
    pal.querySelector(".palette-back").addEventListener("click", palClose);
  }

  /* ---- masthead scroll state + back-to-top + sea parallax ---- */
  var mast = document.querySelector(".masthead");
  var backtop = document.getElementById("backtop");
  var sea = document.querySelector(".sea[data-parallax] .ship");
  var sTick = false;
  function onScroll() {
    var y = window.scrollY || 0;
    if (mast) mast.classList.toggle("scrolled", y > 8);
    if (backtop) backtop.classList.toggle("show", y > 600);
    if (sea && !reduce) sea.style.transform = "translateY(" + Math.min(40, y * 0.08) + "px)";
    sTick = false;
  }
  addEventListener("scroll", function () {
    if (!sTick) { sTick = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
  if (backtop) backtop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  });

  /* ---- 3D tilt on cards and modules (decorative; fine pointers only) ---- */
  if (!reduce && matchMedia("(hover:hover) and (pointer:fine)").matches) {
    var tiltEls = document.querySelectorAll(".card, .module");
    tiltEls.forEach(function (el) {
      var raf = null;
      el.addEventListener("pointermove", function (ev) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          var r = el.getBoundingClientRect();
          var px = (ev.clientX - r.left) / r.width - 0.5;
          var py = (ev.clientY - r.top) / r.height - 0.5;
          el.style.transform = "perspective(700px) rotateX(" + (-py * 3.4).toFixed(2)
            + "deg) rotateY(" + (px * 3.4).toFixed(2) + "deg) translateY(-2px)";
          raf = null;
        });
      });
      el.addEventListener("pointerleave", function () {
        el.style.transform = "";
      });
    });
  }

  /* ---- share ---- */
  var shareBtn = document.getElementById("share-issue");
  if (shareBtn) {
    if (navigator.share) {
      shareBtn.hidden = false;
      shareBtn.addEventListener("click", function () {
        navigator.share({ title: document.title, url: location.href }).catch(function () {});
      });
    } else if (navigator.clipboard) {
      shareBtn.hidden = false;
      shareBtn.addEventListener("click", function () {
        navigator.clipboard.writeText(location.href).then(function () {
          var old = shareBtn.innerHTML;
          shareBtn.innerHTML = "Link copied";
          setTimeout(function () { shareBtn.innerHTML = old; }, 1200);
        });
      });
    }
  }

  wlRender();
})();
