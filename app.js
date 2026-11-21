/* FreeRTOS Field Guide — course runtime: routing, progress, quizzes, responsive nav. */
(function () {
  "use strict";

  var COURSE = window.COURSE;
  var modules = COURSE.modules;
  var byId = new Map(modules.map(function (m) { return [m.id, m]; }));
  var STORE = "freertos-field-guide-v1";
  var THEME_KEY = "freertos-field-guide-theme";
  var LETTERS = ["A", "B", "C", "D", "E"];

  var els = {
    sidebar: document.getElementById("sidebar"),
    scrim: document.getElementById("scrim"),
    menuBtn: document.getElementById("menuBtn"),
    closeBtn: document.getElementById("closeBtn"),
    search: document.getElementById("search"),
    moduleList: document.getElementById("moduleList"),
    emptyFilter: document.getElementById("emptyFilter"),
    ring: document.getElementById("ring"),
    ringLabel: document.getElementById("ringLabel"),
    doneCount: document.getElementById("doneCount"),
    doneHint: document.getElementById("doneHint"),
    topBarFill: document.getElementById("topBarFill"),
    topPct: document.getElementById("topPct"),
    readBar: document.getElementById("readBar"),
    crumbModule: document.getElementById("crumbModule"),
    lesson: document.getElementById("lesson"),
    main: document.getElementById("main"),
    resetBtn: document.getElementById("resetBtn"),
    themeBtn: document.getElementById("themeBtn"),
    toast: document.getElementById("toast")
  };

  var state = loadState();
  var renderToken = 0;
  var toastTimer = null;

  /* ---------------- Persistence ---------------- */

  function loadState() {
    var base = { completed: [], quiz: {}, current: modules[0].id };
    try {
      var raw = localStorage.getItem(STORE);
      if (!raw) return base;
      var parsed = JSON.parse(raw);
      var completed = Array.isArray(parsed.completed)
        ? parsed.completed.filter(function (id) { return byId.has(id); })
        : [];
      return {
        completed: completed,
        quiz: parsed.quiz && typeof parsed.quiz === "object" ? parsed.quiz : {},
        current: byId.has(parsed.current) ? parsed.current : base.current
      };
    } catch (err) {
      return base;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORE, JSON.stringify(state));
    } catch (err) {
      /* Private mode or quota: progress simply does not persist. */
    }
  }

  function isDone(id) {
    return state.completed.indexOf(id) !== -1;
  }

  /* ---------------- Progress UI ---------------- */

  function updateProgressUI() {
    var done = state.completed.length;
    var total = modules.length;
    var pct = Math.round((done / total) * 100);

    els.ring.style.setProperty("--pct", pct);
    els.ring.setAttribute("aria-label", "Course progress: " + pct + " percent");
    els.ringLabel.textContent = pct + "%";
    els.doneCount.textContent = done + " of " + total + " modules";
    els.doneHint.textContent = done === 0
      ? "Start with Module 1"
      : done === total
        ? "Course complete. Ship something."
        : done + " module" + (done === 1 ? "" : "s") + " to go";
    els.topBarFill.style.width = pct + "%";
    els.topPct.textContent = pct + "%";

    Array.prototype.forEach.call(els.moduleList.querySelectorAll(".module-item"), function (btn) {
      var id = btn.getAttribute("data-id");
      btn.classList.toggle("is-done", isDone(id));
      btn.setAttribute("aria-label", byId.get(id).title + (isDone(id) ? " — completed" : ""));
    });
  }

  /* ---------------- Sidebar nav ---------------- */

  var GROUPS = [
    { label: "Foundations", from: 0, to: 3 },
    { label: "Core primitives", from: 4, to: 9 },
    { label: "Engineering", from: 10, to: 11 },
    { label: "Delivery", from: 12, to: 13 },
    { label: "Hands-on lab", from: 14, to: modules.length - 1 }
  ];

  function buildNav() {
    els.moduleList.innerHTML = "";
    GROUPS.forEach(function (group) {
      var label = document.createElement("p");
      label.className = "module-group";
      label.textContent = group.label;
      els.moduleList.appendChild(label);

      modules.slice(group.from, group.to + 1).forEach(function (mod) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "module-item";
        btn.setAttribute("data-id", mod.id);
        btn.innerHTML =
          '<span class="module-num">' + String(mod.num).padStart(2, "0") + "</span>" +
          '<span class="module-text"><span class="module-title"></span>' +
          '<span class="module-meta">' + mod.minutes + " min · " + escapeHtml(mod.short) + "</span></span>" +
          '<span class="module-tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg></span>';
        btn.querySelector(".module-title").textContent = mod.title;
        btn.addEventListener("click", function () { navigate(mod.id); });
        els.moduleList.appendChild(btn);
      });
    });
    updateProgressUI();
  }

  function setActive(id) {
    Array.prototype.forEach.call(els.moduleList.querySelectorAll(".module-item"), function (btn) {
      var active = btn.getAttribute("data-id") === id;
      btn.classList.toggle("is-active", active);
      if (active) {
        btn.setAttribute("aria-current", "page");
        btn.scrollIntoView({ block: "nearest" });
      } else {
        btn.removeAttribute("aria-current");
      }
    });
  }

  function filterNav() {
    var term = els.search.value.trim().toLowerCase();
    var visible = 0;
    Array.prototype.forEach.call(els.moduleList.querySelectorAll(".module-item"), function (btn) {
      var mod = byId.get(btn.getAttribute("data-id"));
      var hay = [mod.title, mod.short, mod.tags.join(" "), mod.objectives.join(" ")]
        .join(" ").toLowerCase();
      var show = !term || hay.indexOf(term) !== -1;
      btn.hidden = !show;
      if (show) visible++;
    });
    Array.prototype.forEach.call(els.moduleList.querySelectorAll(".module-group"), function (label) {
      var any = false;
      var node = label.nextElementSibling;
      while (node && node.classList.contains("module-item")) {
        if (!node.hidden) any = true;
        node = node.nextElementSibling;
      }
      label.hidden = !any;
    });
    els.emptyFilter.hidden = visible > 0;
  }

  /* ---------------- Routing ---------------- */

  function navigate(id) {
    var target = "#/" + id;
    if (location.hash === target) {
      show(id);
    } else {
      location.hash = target;
    }
    closeMenu();
  }

  function route() {
    var match = location.hash.match(/^#\/?(m\d{2})$/);
    var id = match && byId.has(match[1]) ? match[1] : modules[0].id;
    show(id);
  }

  function show(id) {
    var mod = byId.get(id);
    if (!mod) return;
    var token = ++renderToken;

    state.current = id;
    saveState();
    setActive(id);
    els.crumbModule.textContent = mod.title;
    document.title = mod.title + " · " + COURSE.title;

    els.lesson.innerHTML =
      '<div class="skeleton" aria-label="Loading lesson">' +
      '<div class="sk tall"></div><div class="sk"></div><div class="sk"></div>' +
      '<div class="sk short"></div><div class="sk"></div><div class="sk"></div>' +
      "</div>";

    fetch(mod.file, { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (html) {
        if (token !== renderToken) return;
        els.lesson.innerHTML = html;
        decorate(mod);
        els.main.scrollTop = 0;
        updateReadingBar();
      })
      .catch(function (err) {
        if (token !== renderToken) return;
        els.lesson.innerHTML =
          '<div class="error-card"><h2>This lesson could not load</h2>' +
          "<p>" + escapeHtml(String(err.message || err)) + " while fetching <code>" +
          escapeHtml(mod.file) + "</code>.</p>" +
          "<p>If you opened this file directly, serve the folder over HTTP instead " +
          "(for example <code>python3 -m http.server</code>) and reload.</p></div>";
      });
  }

  /* ---------------- Lesson decoration ---------------- */

  function decorate(mod) {
    enhanceCode();
    enhanceTables();
    els.lesson.appendChild(buildQuiz(mod));
    els.lesson.appendChild(buildFooter(mod));
  }

  function enhanceCode() {
    Array.prototype.forEach.call(els.lesson.querySelectorAll("pre"), function (pre) {
      if (pre.parentElement && pre.parentElement.classList.contains("code-block")) return;
      var wrap = document.createElement("div");
      wrap.className = "code-block";
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy";
      btn.textContent = "Copy";
      btn.setAttribute("aria-label", "Copy code to clipboard");
      btn.addEventListener("click", function () {
        var text = pre.textContent || "";
        copyText(text).then(function () {
          btn.textContent = "Copied";
          setTimeout(function () { btn.textContent = "Copy"; }, 1600);
        }, function () {
          btn.textContent = "Failed";
          setTimeout(function () { btn.textContent = "Copy"; }, 1600);
        });
      });
      wrap.appendChild(btn);
    });
  }

  function enhanceTables() {
    Array.prototype.forEach.call(els.lesson.querySelectorAll("table"), function (table) {
      if (table.parentElement && table.parentElement.classList.contains("table-wrap")) return;
      var wrap = document.createElement("div");
      wrap.className = "table-wrap";
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(area);
        ok ? resolve() : reject(new Error("copy failed"));
      } catch (err) {
        reject(err);
      }
    });
  }

  /* ---------------- Quiz ---------------- */

  function quizState(id) {
    var record = state.quiz[id];
    if (!record || !Array.isArray(record.solved)) {
      record = { solved: [] };
      state.quiz[id] = record;
    }
    return record;
  }

  function buildQuiz(mod) {
    var record = quizState(mod.id);
    var section = document.createElement("section");
    section.className = "quiz";
    section.setAttribute("aria-labelledby", "quiz-title-" + mod.id);

    var title = document.createElement("h2");
    title.id = "quiz-title-" + mod.id;
    title.textContent = "Checkpoint";
    var intro = document.createElement("p");
    intro.className = "quiz-intro";
    intro.textContent = "Answer every question to mark this module complete. Wrong answers can be retried.";
    section.appendChild(title);
    section.appendChild(intro);

    var banner = document.createElement("div");
    banner.className = "quiz-banner";
    banner.hidden = true;
    banner.textContent = "Checkpoint passed — module complete.";

    mod.quiz.forEach(function (question, qi) {
      var card = document.createElement("div");
      card.className = "q";

      var heading = document.createElement("h3");
      heading.textContent = (qi + 1) + ". " + question.q;
      card.appendChild(heading);

      var opts = document.createElement("div");
      opts.className = "opts";
      opts.setAttribute("role", "group");
      opts.setAttribute("aria-label", "Question " + (qi + 1) + " options");

      question.options.forEach(function (text, oi) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "opt";
        btn.innerHTML = '<span class="key">' + LETTERS[oi] + "</span><span>" + escapeHtml(text) + "</span>";
        btn.addEventListener("click", function () {
          if (record.solved.indexOf(qi) !== -1) return;
          if (oi === question.answer) {
            btn.classList.add("correct");
            lockQuestion(opts, question.answer);
            explain.hidden = false;
            explain.textContent = question.why;
            record.solved.push(qi);
            saveState();
            if (record.solved.length === mod.quiz.length) {
              banner.hidden = false;
              markComplete(mod.id, true);
            }
          } else {
            btn.classList.add("wrong");
            btn.disabled = true;
            explain.hidden = false;
            explain.textContent = "Not quite — try again.";
          }
        });
        opts.appendChild(btn);
      });

      var explain = document.createElement("p");
      explain.className = "q-explain";
      explain.hidden = true;

      card.appendChild(opts);
      card.appendChild(explain);
      section.appendChild(card);

      if (record.solved.indexOf(qi) !== -1) {
        var buttons = opts.querySelectorAll(".opt");
        buttons.forEach(function (b, i) {
          b.disabled = true;
          if (i === question.answer) b.classList.add("correct");
        });
        explain.hidden = false;
        explain.textContent = question.why;
      }
    });

    section.appendChild(banner);
    if (record.solved.length === mod.quiz.length) banner.hidden = false;

    return section;
  }

  function lockQuestion(opts, answerIndex) {
    var buttons = opts.querySelectorAll(".opt");
    buttons.forEach(function (btn, i) {
      btn.disabled = true;
      if (i === answerIndex) btn.classList.add("correct");
      else btn.classList.add("dimmed");
    });
  }

  /* ---------------- Completion + footer ---------------- */

  function markComplete(id, auto) {
    if (isDone(id)) return;
    state.completed.push(id);
    saveState();
    updateProgressUI();
    if (auto) toast("Module complete — progress saved.");
    if (state.completed.length === modules.length && auto) {
      toast("Course complete. Go build the capstone.");
    }
  }

  function buildFooter(mod) {
    var index = modules.indexOf(mod);
    var foot = document.createElement("div");
    foot.className = "lesson-foot";

    var prev = document.createElement("a");
    prev.className = "btn prev";
    prev.textContent = "← Previous";
    if (index === 0) {
      prev.setAttribute("aria-disabled", "true");
      prev.href = "#/" + mod.id;
      prev.addEventListener("click", function (e) { e.preventDefault(); });
    } else {
      prev.href = "#/" + modules[index - 1].id;
    }

    var complete = document.createElement("button");
    complete.type = "button";
    complete.className = "btn primary";
    if (isDone(mod.id)) {
      complete.classList.add("done");
      complete.textContent = "✓ Module complete";
      complete.disabled = true;
    } else {
      complete.textContent = "Mark complete & continue";
      complete.addEventListener("click", function () {
        markComplete(mod.id, false);
        toast("Module complete — progress saved.");
        complete.classList.add("done");
        complete.textContent = "✓ Module complete";
        complete.disabled = true;
        var nextMod = modules[index + 1];
        setTimeout(function () {
          if (nextMod) navigate(nextMod.id);
        }, 420);
      });
    }

    var next = document.createElement("a");
    next.className = "btn next";
    next.textContent = index === modules.length - 1 ? "Back to start →" : "Next →";
    next.href = "#/" + (modules[index + 1] ? modules[index + 1].id : modules[0].id);

    foot.appendChild(prev);
    foot.appendChild(complete);
    foot.appendChild(next);
    return foot;
  }

  /* ---------------- Reading progress ---------------- */

  function updateReadingBar() {
    var max = els.main.scrollHeight - els.main.clientHeight;
    var pct = max > 0 ? Math.min(100, Math.max(0, (els.main.scrollTop / max) * 100)) : 0;
    els.readBar.style.width = pct + "%";
  }

  els.main.addEventListener("scroll", updateReadingBar, { passive: true });
  window.addEventListener("resize", updateReadingBar);

  /* ---------------- Mobile drawer ---------------- */

  function openMenu() {
    els.sidebar.classList.add("open");
    els.scrim.hidden = false;
    els.menuBtn.setAttribute("aria-expanded", "true");
    els.closeBtn.focus();
  }

  function closeMenu() {
    if (!els.sidebar.classList.contains("open")) return;
    els.sidebar.classList.remove("open");
    els.scrim.hidden = true;
    els.menuBtn.setAttribute("aria-expanded", "false");
    els.menuBtn.focus();
  }

  els.menuBtn.addEventListener("click", openMenu);
  els.closeBtn.addEventListener("click", closeMenu);
  els.scrim.addEventListener("click", closeMenu);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });

  /* ---------------- Misc events ---------------- */

  els.search.addEventListener("input", filterNav);
  els.resetBtn.addEventListener("click", function () {
    var ok = window.confirm("Reset all module completion and quiz answers for this course?");
    if (!ok) return;
    state = { completed: [], quiz: {}, current: modules[0].id };
    saveState();
    updateProgressUI();
    toast("Progress reset.");
    navigate(modules[0].id);
  });

  var lastToast = 0;
  function toast(message) {
    var now = Date.now();
    lastToast = now;
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      if (lastToast === now) els.toast.classList.remove("show");
    }, 2600);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---------------- Theme ---------------- */

  function storedTheme() {
    try {
      var value = localStorage.getItem(THEME_KEY);
      return value === "dark" || value === "light" ? value : null;
    } catch (err) {
      return null;
    }
  }

  function systemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function applyTheme(theme, persist) {
    var dark = theme === "dark";
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    els.themeBtn.setAttribute("aria-pressed", dark ? "true" : "false");
    var label = dark ? "Switch to light theme" : "Switch to dark theme";
    els.themeBtn.setAttribute("aria-label", label);
    els.themeBtn.title = label;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0d1220" : "#f4f6f9");
    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
      } catch (err) {
        /* Private mode: the choice applies for this session only. */
      }
    }
  }

  els.themeBtn.addEventListener("click", function () {
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next, true);
  });

  applyTheme(storedTheme() || systemTheme(), false);

  if (window.matchMedia) {
    var themeMedia = window.matchMedia("(prefers-color-scheme: dark)");
    var onSystemThemeChange = function (event) {
      if (!storedTheme()) applyTheme(event.matches ? "dark" : "light", false);
    };
    if (themeMedia.addEventListener) themeMedia.addEventListener("change", onSystemThemeChange);
    else if (themeMedia.addListener) themeMedia.addListener(onSystemThemeChange);
  }

  /* ---------------- Boot ---------------- */

  buildNav();
  window.addEventListener("hashchange", route);
  if (!location.hash) {
    history.replaceState(null, "", "#/" + state.current);
  }
  route();
})();
