(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover)").matches;
  const fa = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
  const pad2 = (n) => String(n).padStart(2, "0");

  /* ---------- nav background on scroll ---------- */
  const nav = document.getElementById("nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- hero video ---------- */
  const heroVid = document.getElementById("heroVid");
  heroVid.poster = HERO_POSTER;
  if (reduce) heroVid.removeAttribute("autoplay");
  heroVid.src = HERO_VIDEO;

  /* ---------- marquee + image strip ---------- */
  const marquee = document.getElementById("marquee");
  const names = CLIENTS.map((c) => `<span>${c}</span>`).join("");
  marquee.innerHTML = names + names;

  const strip = document.getElementById("strip");
  const pics = WORKS.map((w) => `<img src="media/${w.id}.jpg" alt="" loading="lazy">`).join("");
  strip.innerHTML = pics + pics;

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
          .map(
            (w) => `
          <button class="tile" data-at="${w.at}" data-label="${w.t}" aria-label="${w.t}، پخش در دمو ریل">
            <img src="media/${w.id}.jpg" alt="${w.t}" loading="lazy">
            ${w.clip ? `<video muted loop playsinline preload="none" data-src="media/clip-${w.id}.mp4"></video>` : ""}
            <span class="tile-cap"><b>${w.t}</b><small>${w.m}</small></span>
            ${w.code ? `<span class="tile-code" dir="ltr">${w.code}</span>` : ""}
          </button>`
          )
          .join("")}
      </div>`;
    stack.appendChild(card);
  });

  /* clip playback: hover on desktop, in-view on touch */
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
    heroVid.pause();
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
    if (!reduce) heroVid.play().catch(() => {});
  });
  lightbox.querySelector(".close").addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("click", (e) => { if (e.target === lightbox) lightbox.close(); });

  document.querySelectorAll("[data-reel]").forEach((b) => b.addEventListener("click", () => openReel(0)));
  document.querySelectorAll("[data-at]").forEach((b) =>
    b.addEventListener("click", () => openReel(+b.dataset.at, b.dataset.label))
  );

  /* ---------- reveal on scroll ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    const ro = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); ro.unobserve(e.target); } }),
      { threshold: 0.15 }
    );
    reveals.forEach((el) => ro.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }
})();
