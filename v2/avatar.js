/*
  کاراکتر دوبعدی صفحه‌ی اول
  - حالت ایستاده: کل بدن با تصاویر ترن‌اراند به سمت نشانگر ماوس (یا لمس) می‌چرخد
  - بارگذاری صفحه و رفتن ماوس روی کاراکتر: دست تکان می‌دهد
  - کلیک / لمس: می‌پرد و خوشحالی می‌کند
  - چند ثانیه بی‌حرکتی ماوس: حالت فکر کردن
  همه‌ی اندازه‌ها بر حسب «واحد» است؛ هر واحد = عرض کادر ÷ BOX_W
*/
(function () {
  const avatar = document.getElementById("avatar");
  const rig = document.getElementById("avRig");
  if (!avatar || !rig) return;

  const SRC = "../media/avatar/";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const BOX_W = 260, ANCHOR_X = 130, GROUND = 6;
  const POSE_S = 1.52;          // motion-sheet poses → turnaround scale
  const JUMP_S = POSE_S * 1.18; // jump row is drawn smaller on the sheet
  // w/h: sprite size, cx: lower-body centre, lift: height above ground (sprite px), flip: mirrored copy
  const SPRITES = {
    front: { file: "turn-front",  w: 154, h: 387, cx: 75.3, s: 1 },
    qr:    { file: "turn-q",      w: 136, h: 397, cx: 64.3, s: 1 },
    ql:    { file: "turn-q",      w: 136, h: 397, cx: 64.3, s: 1, flip: true },
    sr:    { file: "turn-side-r", w: 88,  h: 388, cx: 41.9, s: 1 },
    sl:    { file: "turn-side-l", w: 92,  h: 387, cx: 47.6, s: 1 },
    wave:  { file: "wave",  w: 127, h: 249, cx: 70.9, s: POSE_S },
    think: { file: "think", w: 113, h: 257, cx: 48.2, s: POSE_S },
    cheer: { file: "cheer", w: 155, h: 251, cx: 70.2, s: POSE_S },
    jump1: { file: "jump1", w: 150, h: 164, cx: 79.0, s: JUMP_S },
    jump2: { file: "jump2", w: 115, h: 211, cx: 42.5, s: JUMP_S },
    jump3: { file: "jump3", w: 168, h: 186, cx: 62.9, s: JUMP_S, lift: 42 },
    jump4: { file: "jump4", w: 161, h: 168, cx: 53.3, s: JUMP_S },
  };
  const TURN = ["sl", "ql", "front", "qr", "sr"];

  /* ---------- build sprites ---------- */
  const els = {};
  Object.entries(SPRITES).forEach(([key, p]) => {
    const img = new Image();
    img.src = SRC + p.file + ".webp";
    img.alt = "";
    img.draggable = false;
    img.className = "av-pose" + (p.flip ? " flip" : "");
    const w = p.w * p.s, cx = p.cx * p.s;
    // a mirrored sprite keeps its lower-body centre on the anchor
    const left = p.flip ? ANCHOR_X - (w - cx) : ANCHOR_X - cx;
    img.style.left = `calc(var(--u) * ${left})`;
    img.style.bottom = `calc(var(--u) * ${GROUND + (p.lift || 0) * p.s})`;
    img.style.width = `calc(var(--u) * ${w})`;
    rig.appendChild(img);
    els[key] = img;
  });

  const sizeUnits = () => avatar.style.setProperty("--u", avatar.clientWidth / BOX_W + "px");
  sizeUnits();
  if ("ResizeObserver" in window) new ResizeObserver(sizeUnits).observe(avatar);
  else addEventListener("resize", sizeUnits);

  /* ---------- state ---------- */
  let shown = "";
  function show(key) {
    if (shown === key) return;
    shown = key;
    Object.entries(els).forEach(([k, el]) => el.classList.toggle("on", k === key));
  }
  let mode = "idle"; // idle | action | think
  let facing = "front";
  let lastMove = performance.now();

  let run = 0;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function play(seq, force) {
    if (mode === "action" && !force) return;
    const id = ++run;
    mode = "action";
    for (const [key, ms, cls] of seq) {
      if (id !== run) return;
      show(key);
      avatar.classList.toggle("air", cls === "air");
      await wait(ms);
    }
    if (id !== run) return;
    avatar.classList.remove("air");
    mode = "idle";
    show(facing);
    lastMove = performance.now();
  }
  const WAVE = [["wave", 1700]];
  const JUMP = [["jump1", 140], ["jump2", 110], ["jump3", 360, "air"], ["jump4", 170], ["cheer", 950]];

  /* ---------- turn toward the pointer ---------- */
  let tx = 0, ty = 0, ax = 0, ay = 0;
  let pointerSeen = false;

  function aim(clientX, clientY) {
    const r = avatar.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height * 0.18;
    tx = Math.max(-1, Math.min(1, (clientX - cx) / (innerWidth * 0.42)));
    ty = Math.max(-1, Math.min(1, (clientY - cy) / (innerHeight * 0.6)));
    lastMove = performance.now();
    pointerSeen = true;
    if (mode === "think") { mode = "idle"; show(facing); }
  }
  addEventListener("pointermove", (e) => aim(e.clientX, e.clientY), { passive: true });
  addEventListener("touchstart", (e) => e.touches[0] && aim(e.touches[0].clientX, e.touches[0].clientY), { passive: true });

  // index into TURN with hysteresis so it doesn't flicker on the boundaries
  const EDGES = [-0.62, -0.2, 0.2, 0.62];
  let idx = 2;
  function pickTurn(v) {
    const pad = 0.05;
    while (idx < 4 && v > EDGES[idx] + pad) idx++;
    while (idx > 0 && v < EDGES[idx - 1] - pad) idx--;
    return TURN[idx];
  }

  function tick(now) {
    if (!canHover && now - lastMove > 2400) {
      // touch devices: look around on its own until touched
      const k = Math.floor(now / 2400) % 4;
      tx = [0, 0.45, 0, -0.45][k];
      ty = 0;
    }
    if (canHover && pointerSeen && mode === "idle" && now - lastMove > 7000) { mode = "think"; show("think"); }

    ax += (tx - ax) * 0.14;
    ay += (ty - ay) * 0.1;
    facing = pickTurn(ax);
    if (mode === "idle") show(facing);
    // tiny lean toward the pointer, pivoting on the feet
    rig.style.setProperty("--lean", (ax * 1.6 + ay * ax * 1.2).toFixed(2) + "deg");
    requestAnimationFrame(tick);
  }

  /* ---------- interactions ---------- */
  avatar.addEventListener("click", () => {
    if (!/^jump[123]$/.test(shown)) play(JUMP, true);
  });
  let waveCooldown = 0;
  if (canHover) {
    avatar.addEventListener("pointerenter", () => {
      const now = performance.now();
      if (now > waveCooldown && mode !== "action") { waveCooldown = now + 5000; play(WAVE); }
    });
  }

  show("front");
  if (reduce) { avatar.classList.add("ready"); return; }
  requestAnimationFrame(tick);
  const ready = [...rig.querySelectorAll("img")].map((i) => (i.complete ? Promise.resolve() : new Promise((r) => (i.onload = i.onerror = r))));
  Promise.all(ready).then(() => { avatar.classList.add("ready"); setTimeout(() => play(WAVE), 500); });
})();
