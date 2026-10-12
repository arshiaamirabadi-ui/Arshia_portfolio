(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover)").matches;
  const fa = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
  const pad2 = (n) => String(n).padStart(2, "0");

  /* ---------- marquee + image strip ---------- */
  const names = CLIENTS.map((c) => `<span>${c}</span>`).join("");
  document.getElementById("marquee").innerHTML = names + names;
  const pics = WORKS.map((w) => `<img src="../media/${w.id}.jpg" alt="" loading="lazy">`).join("");
  document.getElementById("strip").innerHTML = pics + pics;

  /* ---------- project stack ---------- */
  const stack = document.getElementById("stack");
  CATEGORIES.forEach((cat, i) => {
    const items = WORKS.filter((w) => w.c === cat.key);
    if (!items.length) return;
    const card = document.createElement("article");
    card.className = "pcard";
    card.style.setProperty("--i", i);
    card.innerHTML = `
      <div class="pcard-head">
        <span class="pcard-num" dir="ltr">${pad2(i + 1)}</span>
        <div class="pcard-title">
          <span class="pcard-en" dir="ltr">${cat.en}</span>
          <h3>${cat.title}</h3>
          <p>${cat.desc}</p>
        </div>
        <span class="pcard-count">${fa(items.length)} کار</span>
        <button class="view-btn" data-at="${items[0].at}" data-label="${cat.title}">پخش در ریل ▶</button>
      </div>
      <div class="pgrid n${items.length}">
        ${items
          .map((w) => {
            const head = w.t === cat.title ? w.m : w.t;
            const sub = w.t === cat.title ? "" : w.m;
            return `
          <button class="tile" data-at="${w.at}" data-label="${w.t} · ${w.m}" aria-label="${w.t}، ${w.m}؛ پخش در دمو ریل">
            <img src="../media/${w.id}.jpg" alt="${w.t}" loading="lazy">
            ${w.clip ? `<video muted loop playsinline preload="none" data-src="../media/clip-${w.id}.mp4"></video><span class="live">در حال پخش</span>` : ""}
            <span class="tile-cap"><b>${head}</b>${sub ? `<small>${sub}</small>` : ""}</span>
            ${w.code ? `<span class="tile-code" dir="ltr">${w.code}</span>` : ""}
          </button>`;
          })
          .join("")}
      </div>`;
    stack.appendChild(card);
  });

  function play(tile) {
    const v = tile.querySelector("video");
    if (!v || reduce) return;
    if (!v.src) v.src = v.dataset.src;
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
    tile.classList.add("playing");
  }
  function stop(tile) {
    const v = tile.querySelector("video");
    if (!v) return;
    v.pause();
    tile.classList.remove("playing");
  }
  const tiles = stack.querySelectorAll(".tile");
  if (canHover) {
    tiles.forEach((t) => {
      t.addEventListener("mouseenter", () => play(t));
      t.addEventListener("mouseleave", () => stop(t));
      t.addEventListener("focus", () => play(t));
      t.addEventListener("blur", () => stop(t));
    });
  } else if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => (e.intersectionRatio > 0.7 ? play(e.target) : stop(e.target))),
      { threshold: [0, 0.7, 1] }
    );
    tiles.forEach((t) => t.querySelector("video") && io.observe(t));
  }

  /* ---------- reel lightbox ---------- */
  const lightbox = document.getElementById("lightbox");
  const reel = document.getElementById("reel");
  const lbLabel = document.getElementById("lbLabel");
  function openReel(t, label) {
    if (!reel.getAttribute("src")) {
      reel.poster = HERO_POSTER;
      reel.src = REEL;
    }
    lbLabel.textContent = label || "";
    lightbox.showModal();
    document.body.style.overflow = "hidden";
    const go = () => {
      try { reel.currentTime = t || 0; } catch (e) {}
      const p = reel.play();
      if (p && p.catch) p.catch(() => {});
    };
    if (reel.readyState >= 1) go();
    else reel.addEventListener("loadedmetadata", go, { once: true });
  }
  lightbox.addEventListener("close", () => {
    reel.pause();
    document.body.style.overflow = "";
  });
  lightbox.querySelector(".close").addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("click", (e) => { if (e.target === lightbox) lightbox.close(); });
  document.querySelectorAll("[data-reel]").forEach((b) => b.addEventListener("click", () => openReel(0)));
  document.querySelectorAll("[data-at]").forEach((b) =>
    b.addEventListener("click", () => openReel(+b.dataset.at, b.dataset.label))
  );

  /* ---------- dope sheet ---------- */
  const LV = ["", "مقدماتی", "متوسط", "پیشرفته"];
  const dope = document.getElementById("dope");
  TOOLS.forEach(([n, s, l]) => {
    const r = document.createElement("div");
    r.className = "row";
    let keys = "";
    for (let k = 1; k <= l; k++) keys += `<i style="inset-inline-start:${((k - 0.5) / 3) * 100}%"></i>`;
    r.innerHTML =
      `<div class="n">${n}${s ? `<small>${s}</small>` : ""}</div>` +
      `<div class="track-cell"><div class="track"><span class="bar" data-w="${((l - 0.5) / 3) * 100}"></span>${keys}</div></div>` +
      `<div class="lvl">${LV[l]}</div>`;
    dope.appendChild(r);
  });
  function fillDope() {
    dope.classList.add("go");
    dope.querySelectorAll(".bar").forEach((b) => (b.style.width = b.dataset.w + "%"));
  }

  /* ---------- graph editor (mocap cleanup driven by scroll) ---------- */
  const cv = document.getElementById("graph");
  const ctx = cv.getContext("2d");
  const geMeter = document.getElementById("geMeter");
  const gePct = document.getElementById("gePct");
  const geState = document.getElementById("geState");
  const steps = [...document.querySelectorAll(".step")];
  const N = 220;
  // deterministic pseudo-random so every viewer sees the same "take"
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const base = [
    (x) => 0.52 + 0.22 * Math.sin(x * 5.2 + 0.3) + 0.06 * Math.sin(x * 13),
    (x) => 0.44 + 0.16 * Math.sin(x * 3.1 + 1.6) - 0.08 * Math.cos(x * 9.4),
    (x) => 0.58 + 0.12 * Math.cos(x * 4.3 + 0.8) + 0.07 * Math.sin(x * 7.7 + 2),
  ];
  const noise = base.map(() => {
    const a = [];
    let drift = 0;
    for (let i = 0; i < N; i++) {
      drift = drift * 0.8 + (rnd() - 0.5) * 0.05;
      let v = drift + (rnd() - 0.5) * 0.05;
      if (rnd() < 0.025) v += (rnd() < 0.5 ? -1 : 1) * (0.08 + rnd() * 0.1); // marker pops
      a.push(v);
    }
    return a;
  });
  const cssVar = (k) => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
  const C = { x: cssVar("--cx"), y: cssVar("--cy"), z: cssVar("--cz"), line: cssVar("--ge-line"), faint: cssVar("--muted"), ph: cssVar("--playhead"), panel: cssVar("--ge-bg") };
  let shown = -1, W = 0, H = 0, dpr = 1;

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = cv.getBoundingClientRect();
    W = r.width;
    H = r.height;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    shown = -1;
  }
  function draw(p) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.direction = "ltr";
    ctx.textAlign = "left";
    ctx.clearRect(0, 0, W, H);
    const padL = 34, padR = 14, padT = 16, padB = 24;
    const gw = W - padL - padR, gh = H - padT - padB;
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.font = '11px Vazirmatn, Tahoma, sans-serif';
    ctx.fillStyle = C.faint;
    for (let i = 0; i <= 10; i++) {
      const x = padL + (gw * i) / 10;
      ctx.beginPath(); ctx.moveTo(x + 0.5, padT); ctx.lineTo(x + 0.5, padT + gh); ctx.stroke();
      ctx.fillText(String(i * 24), x - 6, H - 8);
    }
    for (let j = 0; j <= 4; j++) {
      const y = padT + (gh * j) / 4;
      ctx.beginPath(); ctx.moveTo(padL, y + 0.5); ctx.lineTo(padL + gw, y + 0.5); ctx.stroke();
      ctx.fillText((1 - j / 2).toFixed(1), 4, y + 3);
    }
    const ease = p * p * (3 - 2 * p);
    const amt = 1 - ease;
    const colors = [C.x, C.y, C.z];
    base.forEach((f, k) => {
      ctx.strokeStyle = colors[k];
      ctx.lineWidth = 1.8;
      ctx.globalAlpha = 0.95;
      ctx.shadowColor = colors[k];
      ctx.shadowBlur = 6 * ease;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1);
        const v = f(u) + noise[k][i] * amt;
        const x = padL + gw * u, y = padT + gh * (1 - v);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      // keys appear once the curve is clean
      const ka = Math.max(0, (p - 0.62) / 0.38);
      if (ka > 0) {
        ctx.globalAlpha = ka;
        for (let q = 0; q <= 8; q++) {
          const u = q / 8, v = f(u);
          const x = padL + gw * u, y = padT + gh * (1 - v);
          ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
          ctx.fillStyle = C.panel; ctx.fillRect(-3.5, -3.5, 7, 7);
          ctx.strokeStyle = colors[k]; ctx.lineWidth = 1.4; ctx.strokeRect(-3.5, -3.5, 7, 7);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
    });
    const phx = padL + gw * (0.08 + 0.84 * p);
    ctx.strokeStyle = C.ph;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(phx, padT); ctx.lineTo(phx, padT + gh); ctx.stroke();
  }
  function setProg(p) {
    const pct = Math.round(p * 100);
    geMeter.style.width = pct + "%";
    gePct.textContent = fa(pct) + "٪";
    geState.textContent = p < 0.3 ? "داده‌ی خام موشن‌کپچر" : p < 0.7 ? "در حال پاک‌سازی" : "منحنی تمیز با کلید";
    steps.forEach((s, i) => {
      const next = steps[i + 1];
      s.classList.toggle("on", p >= +s.dataset.at && (!next || p < +next.dataset.at));
    });
    if (Math.abs(p - shown) > 0.002) { draw(p); shown = p; }
  }
  function geProgress() {
    const r = document.getElementById("ge").getBoundingClientRect();
    const vh = window.innerHeight;
    const span = Math.max(r.height - vh * 0.35, vh * 0.6);
    return Math.min(1, Math.max(0, (vh * 0.55 - r.top) / span));
  }

  /* ---------- header time slider ---------- */
  const nav = document.getElementById("nav");
  const ph = document.getElementById("ph");
  const frameEl = document.getElementById("frame");
  const skeys = document.getElementById("skeys");
  const secs = ["top", "process", "work", "experience", "tools", "contact"];
  const navLinks = [...document.querySelectorAll(".menu a")];
  function placeKeys() {
    const max = document.documentElement.scrollHeight - innerHeight;
    skeys.innerHTML = "";
    secs.forEach((id) => {
      const el = document.getElementById(id);
      if (!el || max <= 0) return;
      const y = Math.min(max, Math.max(0, el.getBoundingClientRect().top + scrollY - 70));
      const i = document.createElement("i");
      i.style.left = (y / max) * 100 + "%";
      skeys.appendChild(i);
    });
  }

  /* ---------- reveal on scroll ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    const ro = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); ro.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    reveals.forEach((el) => ro.observe(el));
    setTimeout(() => reveals.forEach((el) => el.classList.add("in")), 8000);
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }
  if ("IntersectionObserver" in window) {
    const dio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { fillDope(); dio.disconnect(); } }), { threshold: 0.25 });
    dio.observe(dope);
  } else fillDope();

  /* ---------- scroll loop ---------- */
  const stage = document.getElementById("headStage");
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? scrollY / max : 0;
      nav.classList.toggle("scrolled", scrollY > 20);
      ph.style.transform = `translateX(${p * (ph.parentElement.clientWidth - 2)}px)`;
      frameEl.textContent = fa(String(Math.max(1, Math.round(p * 750))).padStart(4, "0"));
      if (!reduce) {
        const h = Math.min(1, scrollY / innerHeight);
        stage.style.transform = `translateY(${h * 60}px) scale(${1 - h * 0.06})`;
      }
      setProg(geProgress());
      let cur = null;
      secs.forEach((id) => { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top < innerHeight * 0.4) cur = id; });
      navLinks.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + cur));
    });
  }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", () => { size(); placeKeys(); onScroll(); });
  size(); draw(0); setProg(geProgress()); onScroll();
  addEventListener("load", () => { size(); placeKeys(); onScroll(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { size(); placeKeys(); shown = -1; onScroll(); });

  /* ---------- copy buttons ---------- */
  document.querySelectorAll("button[data-copy]").forEach((b) =>
    b.addEventListener("click", () => {
      const done = () => { const o = b.textContent; b.textContent = "کپی شد"; setTimeout(() => (b.textContent = o), 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(b.dataset.copy).then(done).catch(() => {});
    })
  );
})();
