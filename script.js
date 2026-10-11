(function () {
  const grid = document.getElementById("grid");
  const filters = document.getElementById("filters");
  const lightbox = document.getElementById("lightbox");
  const lbMedia = lightbox.querySelector(".lb-media");

  function embedHTML(item, autoplay) {
    const ap = autoplay ? 1 : 0;
    if (item.youtube) {
      return `<iframe src="https://www.youtube.com/embed/${item.youtube}?autoplay=${ap}&rel=0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    }
    if (item.aparat) {
      return `<iframe src="https://www.aparat.com/video/video/embed/videohash/${item.aparat}/vt/frame" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    }
    if (item.vimeo) {
      return `<iframe src="https://player.vimeo.com/video/${item.vimeo}?autoplay=${ap}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    }
    if (item.video) {
      return `<video src="${item.video}" controls playsinline ${autoplay ? "autoplay" : ""} ${item.thumb ? `poster="${item.thumb}"` : ""}></video>`;
    }
    if (item.image) {
      return `<img src="${item.image}" alt="${item.title || ""}">`;
    }
    return "";
  }

  function isVideo(w) {
    return !!(w.youtube || w.aparat || w.vimeo || w.video);
  }

  function coverFor(w) {
    if (w.thumb) return `<img src="${w.thumb}" alt="" loading="lazy">`;
    if (w.image) return `<img src="${w.image}" alt="" loading="lazy">`;
    if (w.youtube) return `<img src="https://img.youtube.com/vi/${w.youtube}/hqdefault.jpg" alt="" loading="lazy">`;
    if (w.video) return `<video src="${w.video}#t=0.5" muted preload="metadata"></video>`;
    return `<div class="placeholder"><span>${w.title}</span></div>`;
  }

  function hasMedia(w) {
    return isVideo(w) || !!w.image;
  }

  function render(category) {
    grid.innerHTML = "";
    WORKS.filter((w) => category === "همه" || w.category === category).forEach((w) => {
      const card = document.createElement(hasMedia(w) ? "button" : "div");
      card.className = "work" + (hasMedia(w) ? "" : " soon");
      card.innerHTML = `
        <div class="cover">
          ${coverFor(w)}
          ${isVideo(w) ? '<span class="play" aria-hidden="true">▶</span>' : ""}
          ${hasMedia(w) ? "" : '<span class="badge">به‌زودی</span>'}
        </div>
        <div class="meta">
          <h3>${w.title}</h3>
          <p>${w.desc || ""}</p>
          <span class="tag">${w.category}</span>
        </div>`;
      if (hasMedia(w)) card.addEventListener("click", () => open(w));
      grid.appendChild(card);
    });
  }

  function open(w) {
    lbMedia.innerHTML = embedHTML(w, true);
    lightbox.querySelector("h3").textContent = w.title;
    lightbox.querySelector("p").textContent = w.desc || "";
    lightbox.showModal();
  }

  function close() {
    lightbox.close();
  }
  lightbox.addEventListener("close", () => (lbMedia.innerHTML = ""));
  lightbox.querySelector(".close").addEventListener("click", close);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });

  ["همه", ...CATEGORIES].forEach((c, i) => {
    const b = document.createElement("button");
    b.textContent = c;
    b.className = "chip" + (i === 0 ? " active" : "");
    b.addEventListener("click", () => {
      filters.querySelectorAll(".chip").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      render(c);
    });
    filters.appendChild(b);
  });
  render("همه");

  if (typeof SHOWREEL !== "undefined" && isVideo(SHOWREEL)) {
    const el = document.getElementById("showreel");
    el.innerHTML = embedHTML(SHOWREEL, false);
    el.hidden = false;
  }
})();
