/* Portfolio component — shared by /portfolio/ and the homepage Builds section.
   Usage: <div data-portfolio data-src="/portfolio/projects.json" data-hash></div>
          <script src="/portfolio/portfolio.js" defer></script>
   data-hash: sync the active filter and open project to the URL hash (standalone page only). */
(function(){
  "use strict";

  var STATUS_ORDER = ["in-use", "playable", "delivered", "in-dev", "concept"];

  function el(tag, cls, text){
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function slug(s){ return String(s).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function initials(name){
    return name.replace(/&/g, " ").split(/\s+/).filter(Boolean).slice(0, 2).map(function(w){ return w[0]; }).join("").toUpperCase();
  }

  function mount(root){
    var src = root.getAttribute("data-src") || "projects.json";
    var useHash = root.hasAttribute("data-hash");
    var base = new URL(src, location.href);
    var data, projects, active = null; // active = { key: "status"|"type", id: "..." }

    function abs(u){ return new URL(u, base).href; }
    function imagesOf(p){
      var list = Array.isArray(p.images) ? p.images : (p.image ? [p.image] : []);
      return list.filter(Boolean).map(abs);
    }
    function statusOf(p){ return data.statuses[p.status] || { label: p.status, tone: "done" }; }
    function typeLabel(p){ return data.types[p.type] || p.type; }

    /* ----- skeleton ----- */
    var filters = el("div", "pf-filters");
    filters.setAttribute("role", "group");
    filters.setAttribute("aria-label", "Filter projects (one at a time)");
    var gStatus = el("div", "pf-group"); gStatus.appendChild(el("span", "pf-group__label", "Status"));
    var gType = el("div", "pf-group"); gType.appendChild(el("span", "pf-group__label", "Type"));
    var foot = el("div", "pf-foot");
    var count = el("span", "pf-count"); count.setAttribute("aria-live", "polite");
    var clear = el("button", "pf-clear", "Show all"); clear.type = "button"; clear.hidden = true;
    foot.append(count, clear);
    filters.append(gStatus, gType, foot);
    var grid = el("div", "pf-grid");
    root.append(filters, grid);

    /* ----- overlay ----- */
    var modal = el("dialog", "pf-modal");
    modal.setAttribute("aria-labelledby", "pf-modal-title");
    document.body.appendChild(modal);
    var lastFocus = null;

    function closeModal(){ if (modal.open) modal.close(); }
    modal.addEventListener("close", function(){
      document.documentElement.classList.remove("pf-locked");
      modal.replaceChildren();
      if (useHash) writeHash(null);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    });
    modal.addEventListener("click", function(e){ if (e.target === modal) closeModal(); }); // backdrop

    function buildReel(p, imgs){
      var wrap = el("div", "pf-reel");
      var track = el("div", "pf-reel__track");
      track.tabIndex = 0;
      track.setAttribute("role", "region");
      track.setAttribute("aria-label", p.name + " screenshots");
      imgs.forEach(function(s, i){
        var img = el("img");
        img.src = s; img.decoding = "async"; if (i > 0) img.loading = "lazy";
        img.alt = p.name + " screenshot " + (i + 1) + " of " + imgs.length;
        track.appendChild(img);
      });
      wrap.appendChild(track);
      if (imgs.length < 2) return wrap;

      var prev = el("button", "pf-reel__btn pf-reel__btn--prev", "‹");
      var next = el("button", "pf-reel__btn pf-reel__btn--next", "›");
      prev.type = next.type = "button";
      prev.setAttribute("aria-label", "Previous screenshot");
      next.setAttribute("aria-label", "Next screenshot");
      var dots = el("div", "pf-reel__dots");
      imgs.forEach(function(){ dots.appendChild(el("span")); });
      var n = el("span", "pf-reel__count");
      wrap.append(prev, next, dots, n);

      function idx(){ return Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); }
      function go(i){ track.scrollTo({ left: Math.max(0, Math.min(imgs.length - 1, i)) * track.clientWidth, behavior: "smooth" }); }
      function sync(){
        var i = idx();
        Array.prototype.forEach.call(dots.children, function(d, j){ d.className = j === i ? "on" : ""; });
        prev.disabled = i === 0; next.disabled = i === imgs.length - 1;
        n.textContent = (i + 1) + " / " + imgs.length;
      }
      prev.addEventListener("click", function(){ go(idx() - 1); });
      next.addEventListener("click", function(){ go(idx() + 1); });
      modal.onkeydown = function(e){
        if (e.key === "ArrowLeft"){ e.preventDefault(); go(idx() - 1); }
        if (e.key === "ArrowRight"){ e.preventDefault(); go(idx() + 1); }
      };
      var t; track.addEventListener("scroll", function(){ clearTimeout(t); t = setTimeout(sync, 60); }, { passive: true });
      requestAnimationFrame(sync);
      return wrap;
    }

    function openModal(p, opener){
      lastFocus = opener || document.activeElement;
      modal.onkeydown = null;
      modal.replaceChildren();
      var st = statusOf(p), imgs = imagesOf(p);

      var close = el("button", "pf-modal__close", "✕");
      close.type = "button"; close.setAttribute("aria-label", "Close");
      close.addEventListener("click", closeModal);
      modal.appendChild(close);

      if (imgs.length){
        modal.appendChild(buildReel(p, imgs));
      } else {
        var blank = el("div", "pf-shot pf-shot--blank"); blank.setAttribute("aria-hidden", "true");
        blank.appendChild(el("span", "pf-mono", initials(p.name)));
        modal.appendChild(blank);
      }

      var body = el("div", "pf-modal__body");
      var h = el("h2", "pf-modal__title", p.name); h.id = "pf-modal-title";
      var pills = el("div", "pf-pills");
      pills.append(el("span", "pf-pill pf-pill--" + st.tone, st.label), el("span", "pf-pill", typeLabel(p)));
      body.append(h, pills);
      if (p.blurb) body.appendChild(el("p", "pf-modal__blurb", p.blurb));

      var f = el("div", "pf-modal__foot");
      f.appendChild(el("p", "pf-stack", p.stack || ""));
      if (p.url){
        var a = el("a", "pf-go", p.type === "game" ? "Play " + p.name : "Open " + p.name);
        a.href = p.url;
        if (!/^https:\/\/justbost\.com\//.test(p.url)){ a.target = "_blank"; a.rel = "noopener"; }
        f.appendChild(a);
      } else {
        f.appendChild(el("span", "pf-note", "Private tool · not publicly hosted"));
      }
      body.appendChild(f);
      modal.appendChild(body);

      document.documentElement.classList.add("pf-locked");
      modal.showModal();
      close.focus();
      if (useHash) writeHash(slug(p.name));
    }

    /* ----- cards ----- */
    function card(p){
      var st = statusOf(p), imgs = imagesOf(p);
      var root = el("article", "pf-card");
      var shot;
      if (imgs.length){
        shot = el("div", "pf-shot");
        var img = el("img"); img.src = imgs[0]; img.loading = "lazy"; img.decoding = "async"; img.alt = "";
        img.addEventListener("error", function(){
          shot.className = "pf-shot pf-shot--blank";
          shot.replaceChildren(el("span", "pf-mono", initials(p.name)));
        });
        shot.appendChild(img);
        if (imgs.length > 1) shot.appendChild(el("span", "pf-shot__n", imgs.length + " shots"));
      } else {
        shot = el("div", "pf-shot pf-shot--blank");
        shot.appendChild(el("span", "pf-mono", initials(p.name)));
      }
      shot.setAttribute("aria-hidden", "true");
      root.appendChild(shot);

      var body = el("div", "pf-body");
      var h = el("h3", "pf-title");
      var btn = el("button", "pf-open", p.name);
      btn.type = "button";
      btn.setAttribute("aria-haspopup", "dialog");
      btn.addEventListener("click", function(){ openModal(p, btn); });
      h.appendChild(btn);
      var pills = el("div", "pf-pills");
      pills.append(el("span", "pf-pill pf-pill--" + st.tone, st.label), el("span", "pf-pill", typeLabel(p)));
      body.append(h, pills);
      if (p.blurb) body.appendChild(el("p", "pf-blurb", p.blurb));
      if (p.stack) body.appendChild(el("p", "pf-stack", p.stack));
      root.appendChild(body);
      return root;
    }

    /* ----- filters ----- */
    function buildChips(group, key, dict){
      Object.keys(dict).forEach(function(id){
        var n = projects.filter(function(p){ return p[key] === id; }).length;
        if (!n) return;
        var label = typeof dict[id] === "string" ? dict[id] : dict[id].label;
        var b = el("button", "pf-chip", label);
        b.type = "button"; b.dataset.key = key; b.dataset.id = id;
        b.appendChild(el("span", "pf-chip__n", String(n)));
        b.addEventListener("click", function(){
          active = (active && active.key === key && active.id === id) ? null : { key: key, id: id };
          render();
        });
        group.appendChild(b);
      });
    }

    function render(){
      Array.prototype.forEach.call(filters.querySelectorAll(".pf-chip"), function(c){
        var on = !!active && active.key === c.dataset.key && active.id === c.dataset.id;
        c.setAttribute("aria-pressed", on ? "true" : "false");
      });
      var shown = active ? projects.filter(function(p){ return p[active.key] === active.id; }) : projects;
      grid.replaceChildren.apply(grid, shown.map(card));
      if (!shown.length) grid.appendChild(el("p", "pf-empty", "Nothing matches that filter yet."));
      var total = projects.length;
      count.textContent = shown.length === total ? total + " projects" : shown.length + " of " + total + " projects";
      clear.hidden = !active;
      if (useHash) writeHash(modal.open ? undefined : null);
    }
    clear.addEventListener("click", function(){ active = null; render(); });

    /* ----- hash (standalone page) ----- */
    function writeHash(project){
      var q = new URLSearchParams();
      if (active) q.set("filter", active.key + ":" + active.id);
      var cur = new URLSearchParams(location.hash.slice(1)).get("project");
      var pr = project === undefined ? cur : project;
      if (pr) q.set("project", pr);
      var h = q.toString();
      history.replaceState(null, "", h ? "#" + h : location.pathname + location.search);
    }
    function readHash(){
      var q = new URLSearchParams(location.hash.slice(1));
      var f = (q.get("filter") || "").split(":");
      if (f.length === 2 && (f[0] === "status" || f[0] === "type")) active = { key: f[0], id: f[1] };
      return q.get("project");
    }

    fetch(src, { cache: "no-cache" })
      .then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function(json){
        data = json;
        projects = data.projects.map(function(p, i){ return { p: p, i: i }; })
          .sort(function(a, b){
            var sa = STATUS_ORDER.indexOf(a.p.status), sb = STATUS_ORDER.indexOf(b.p.status);
            if (sa < 0) sa = 99; if (sb < 0) sb = 99;
            return sa - sb || a.i - b.i;
          })
          .map(function(x){ return x.p; });
        var sorted = {};
        STATUS_ORDER.forEach(function(k){ if (data.statuses[k]) sorted[k] = data.statuses[k]; });
        Object.keys(data.statuses).forEach(function(k){ if (!sorted[k]) sorted[k] = data.statuses[k]; });
        var want = useHash ? readHash() : null;
        buildChips(gStatus, "status", sorted);
        buildChips(gType, "type", data.types);
        render();
        if (want){
          var hit = projects.filter(function(p){ return slug(p.name) === want; })[0];
          if (hit) openModal(hit);
        }
      })
      .catch(function(){
        grid.appendChild(el("p", "pf-empty", "Projects didn’t load. Refresh to try again."));
      });
  }

  function init(){ Array.prototype.forEach.call(document.querySelectorAll("[data-portfolio]"), mount); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
