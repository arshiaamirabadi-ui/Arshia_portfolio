/*
  سر سه‌بعدی صفحه‌ی اول که با نشانگر ماوس (یا لمس) می‌چرخد.
  فریم‌ها از ویدیوی چرخش سر برداشته شده‌اند؛ برای هر فریم جهت نگاه (زاویه و شدت) مشخص است
  و در هر لحظه فریمی که نزدیک‌ترین جهت را به نشانگر دارد نمایش داده می‌شود.
*/
(function () {
  const canvas = document.getElementById("headCv");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const stage = document.getElementById("headStage");
  const SRC = "../media/head/h";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // gaze per frame: angle in degrees (0 = right, 90 = up, screen space), mag 0 = straight ahead
  const ANCHORS = [
    [24, 90, 0.35], [28, 90, 0.7], [32, 90, 1], [44, 135, 1], [54, 160, 1], [60, 180, 1],
    [68, 210, 1], [78, 255, 1], [84, 270, 1], [90, 300, 1], [96, 330, 1], [100, 360, 1],
    [104, 385, 1], [110, 420, 1], [120, 450, 1], [126, 450, 0.8], [132, 450, 0.45],
  ];
  const FRONT = [6, 8, 10, 12, 14, 138, 141, 144, 147, 150, 153, 156];
  const BLINK = [14, 16, 17, 18, 19, 20, 21, 22, 23, 14];
  const CIRCLE = [];
  for (let n = 24; n <= 132; n += 2) CIRCLE.push(n);

  function gaze(n) {
    for (let i = 0; i < ANCHORS.length - 1; i++) {
      const [f0, a0, m0] = ANCHORS[i], [f1, a1, m1] = ANCHORS[i + 1];
      if (n >= f0 && n <= f1) {
        const t = (n - f0) / (f1 - f0);
        return [a0 + (a1 - a0) * t, m0 + (m1 - m0) * t];
      }
    }
    return [90, 0];
  }
  // pool of frames with their gaze vector
  const POOL = CIRCLE.map((n) => {
    const [a, m] = gaze(n);
    const r = (a * Math.PI) / 180;
    return { n, x: Math.cos(r) * m, y: Math.sin(r) * m };
  });
  POOL.push({ n: 12, x: 0, y: 0 });

  /* ---------- load frames ---------- */
  const frames = {};
  const all = [...new Set([...CIRCLE, ...FRONT, ...BLINK])];
  let loaded = 0;
  const ready = new Promise((res) => {
    all.forEach((n) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = img.onerror = () => { if (++loaded === all.length) res(); };
      img.src = SRC + String(n).padStart(3, "0") + ".webp";
      frames[n] = img;
    });
  });

  let current = -1;
  function draw(n) {
    if (n === current) return;
    const img = frames[n];
    if (!img || !img.complete || !img.naturalWidth) return;
    current = n;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }

  /* ---------- pointer ---------- */
  let tx = 0, ty = 0, sx = 0, sy = 0;
  let lastMove = 0;
  function aim(cx, cy) {
    const r = canvas.getBoundingClientRect();
    const hx = r.left + r.width / 2, hy = r.top + r.height * 0.45;
    const R = Math.min(innerWidth, innerHeight * 1.3) * 0.38;
    let x = (cx - hx) / R, y = -(cy - hy) / R;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    tx = x; ty = y;
    lastMove = performance.now();
  }
  addEventListener("pointermove", (e) => aim(e.clientX, e.clientY), { passive: true });
  addEventListener("touchstart", (e) => e.touches[0] && aim(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  addEventListener("touchmove", (e) => e.touches[0] && aim(e.touches[0].clientX, e.touches[0].clientY), { passive: true });

  function nearest(x, y) {
    const m = Math.hypot(x, y);
    if (m < 0.18) return 12;
    // reach the full turn well before the pointer is far away
    const k = Math.min(1, 0.45 + m * 1.1) / m;
    x *= k; y *= k;
    let best = POOL[0], bd = Infinity;
    for (const p of POOL) {
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bd) { bd = d; best = p; }
    }
    return best.n;
  }

  /* ---------- blink ---------- */
  let blinkAt = performance.now() + 2500, blinkStep = -1, blinkTime = 0;

  function tick(now) {
    // without a pointer (phones, or before the mouse moves) look around slowly
    if (now - lastMove > (canHover ? 6000 : 2200)) {
      const t = now / 2600;
      const k = Math.floor(t) % 6;
      const look = [[0, 0], [0.7, 0.35], [0, 0], [-0.8, 0.1], [0, -0.6], [0, 0]][k];
      tx = look[0]; ty = look[1];
    }
    sx += (tx - sx) * 0.12;
    sy += (ty - sy) * 0.12;
    const n = nearest(sx, sy);

    if (n === 12 && blinkStep < 0 && now > blinkAt) { blinkStep = 0; blinkTime = now; }
    if (blinkStep >= 0) {
      if (n !== 12) blinkStep = -1;
      else {
        blinkStep = Math.floor((now - blinkTime) / 42);
        if (blinkStep >= BLINK.length) { blinkStep = -1; blinkAt = now + 2500 + Math.random() * 3500; }
        else { draw(BLINK[blinkStep]); requestAnimationFrame(tick); return; }
      }
    }
    draw(n);
    requestAnimationFrame(tick);
  }

  /* ---------- tap / click: little bounce ---------- */
  canvas.addEventListener("click", () => {
    stage.classList.remove("boing");
    void stage.offsetWidth;
    stage.classList.add("boing");
    blinkAt = 0;
  });

  ready.then(() => {
    draw(12);
    stage.classList.add("ready");
    if (!reduce) requestAnimationFrame(tick);
  });
})();
