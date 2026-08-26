(() => {
  const frame = document.getElementById("frame");
  const track = document.getElementById("track");
  const panels = Array.from(track.querySelectorAll(".panel"));
  const dotsWrap = document.getElementById("dots");
  const counterCurrent = document.getElementById("counterCurrent");
  const counterTotal = document.getElementById("counterTotal");
  const nextBtn = document.getElementById("nextBtn");
  const edgeLineFill = document.querySelector(".edge-line-fill");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let current = 0;
  let locked = false;
  let accumulator = 0;
  let accumulatorTimer = null;
  let ticking = false;

  counterTotal.textContent = String(panels.length).padStart(2, "0");

  function splitChars() {
    document.querySelectorAll("[data-split]").forEach((el) => {
      const words = el.textContent.trim().split(/\s+/);
      let index = 0;
      el.textContent = "";
      words.forEach((word, wi) => {
        const wordSpan = document.createElement("span");
        wordSpan.className = "w";
        wordSpan.setAttribute("aria-hidden", "true");
        for (const char of word) {
          const charSpan = document.createElement("span");
          charSpan.className = "c";
          charSpan.style.setProperty("--i", index);
          charSpan.textContent = char;
          wordSpan.appendChild(charSpan);
          index++;
        }
        el.appendChild(wordSpan);
        if (wi < words.length - 1) {
          el.appendChild(document.createTextNode(" "));
        }
      });
      const srText = document.createElement("span");
      srText.className = "sr-only";
      srText.textContent = words.join(" ");
      el.appendChild(srText);
    });
  }

  const style = document.createElement("style");
  style.textContent = ".sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;}";
  document.head.appendChild(style);

  function buildDots() {
    panels.forEach((panel, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "dot";
      dot.setAttribute("aria-label", `Go to section ${i + 1}: ${panel.getAttribute("aria-label")}`);
      dot.addEventListener("click", () => goTo(i));
      dotsWrap.appendChild(dot);
    });
  }

  function goTo(index, instant = false) {
    const clamped = Math.max(0, Math.min(panels.length - 1, index));
    current = clamped;
    track.scrollTo({
      left: clamped * track.clientWidth,
      behavior: instant || reducedMotion ? "auto" : "smooth"
    });
  }

  function update() {
    const maxScroll = track.scrollWidth - track.clientWidth;
    const progress = maxScroll > 0 ? track.scrollLeft / maxScroll : 0;
    frame.style.setProperty("--progress", progress.toFixed(4));

    const index = Math.round(track.scrollLeft / track.clientWidth);
    if (index !== current) {
      current = index;
    }
    counterCurrent.textContent = String(current + 1).padStart(2, "0");
    nextBtn.classList.toggle("is-hidden", current === panels.length - 1);

    panels.forEach((panel, i) => {
      panel.classList.toggle("is-active", i === current);
    });

    Array.from(dotsWrap.children).forEach((dot, i) => {
      dot.classList.toggle("is-active", i === current);
    });

    if (!reducedMotion) {
      panels.forEach((panel) => {
        const rel = track.scrollLeft - panel.offsetLeft;
        if (Math.abs(rel) < track.clientWidth * 1.2) {
          panel.querySelectorAll("[data-depth]").forEach((el) => {
            const depth = parseFloat(el.dataset.depth);
            el.style.transform = `translateX(${(rel * depth).toFixed(2)}px)`;
          });
        }
      });
    }

    ticking = false;
  }

  track.addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  });

  frame.addEventListener(
    "wheel",
    (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (locked) return;
      accumulator += e.deltaY;
      clearTimeout(accumulatorTimer);
      accumulatorTimer = setTimeout(() => {
        accumulator = 0;
      }, 180);
      if (Math.abs(accumulator) >= 50) {
        const dir = accumulator > 0 ? 1 : -1;
        accumulator = 0;
        if (current === aboutIndex) {
          const result = stepPhoto(dir);
          if (result === "step") {
            locked = true;
            setTimeout(() => {
              locked = false;
            }, 320);
            return;
          }
          if (result === "full") {
            locked = true;
            setTimeout(() => {
              locked = false;
            }, 450);
            return;
          }
        }
        goTo(current + dir);
        locked = true;
        setTimeout(() => {
          locked = false;
        }, 750);
      }
    },
    { passive: false }
  );

  window.addEventListener("keydown", (e) => {
    const target = e.target;
    if (target.tagName === "A" || target.tagName === "BUTTON") {
      if (e.key === " " || e.key === "Enter") return;
    }
    switch (e.key) {
      case "ArrowRight":
      case "PageDown":
        e.preventDefault();
        goTo(current + 1);
        break;
      case "ArrowLeft":
      case "PageUp":
        e.preventDefault();
        goTo(current - 1);
        break;
      case "Home":
        e.preventDefault();
        goTo(0);
        break;
      case "End":
        e.preventDefault();
        goTo(panels.length - 1);
        break;
    }
  });

  nextBtn.addEventListener("click", () => goTo(current + 1));

  document.querySelectorAll("[data-goto]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      goTo(parseInt(el.dataset.goto, 10));
    });
  });

  window.addEventListener("resize", () => {
    goTo(current, true);
    applyPhotoProgress();
  });

  splitChars();
  buildDots();

  function initAccordion(row, defaultIndex) {
    if (!row) return;
    const cards = Array.from(row.querySelectorAll(":scope > .slat, :scope > .project-card"));
    if (!cards.length) return;
    const setActive = (index) => {
      cards.forEach((card, i) => card.classList.toggle("is-open", i === index));
    };
    cards.forEach((card, i) => {
      card.addEventListener("mouseenter", () => setActive(i));
    });
    row.addEventListener("focusin", (e) => {
      const i = cards.findIndex((c) => c.contains(e.target));
      if (i > -1) setActive(i);
    });
    setActive(defaultIndex);
  }

  initAccordion(document.querySelector(".projects-row"), 0);
  initAccordion(document.querySelector(".panel--hero .slats"), 1);
  initAccordion(document.querySelector(".panel--contact .slats"), 2);

  const heroPanel = document.querySelector(".panel--hero");
  if (heroPanel) {
    heroPanel.querySelectorAll(".slat").forEach((slat) => {
      slat.addEventListener(
        "mouseenter",
        () => heroPanel.classList.add("hint-seen"),
        { once: true }
      );
    });
  }

  const aboutExpand = document.getElementById("aboutExpand");
  const aboutPhoto = document.querySelector(".about-photo");
  const aboutScrim = document.querySelector(".about-expand-scrim");
  const aboutIndex = panels.indexOf(document.getElementById("about"));
  let photoTarget = 0;
  let photoCurrent = 0;
  let photoAnimating = false;

  function applyPhotoProgress() {
    if (!aboutExpand || !aboutPhoto || !aboutScrim) return;
    const trackRect = track.getBoundingClientRect();
    const photoRect = aboutPhoto.getBoundingClientRect();
    const p = photoCurrent;
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    const t = (photoRect.top - trackRect.top) * (1 - e);
    const l = (photoRect.left - trackRect.left) * (1 - e);
    const r = (trackRect.right - photoRect.right) * (1 - e);
    const b = (trackRect.bottom - photoRect.bottom) * (1 - e);
    const rad = 12 * (1 - e);
    aboutExpand.style.clipPath = `inset(${t.toFixed(1)}px ${r.toFixed(1)}px ${b.toFixed(1)}px ${l.toFixed(1)}px round ${rad.toFixed(1)}px)`;
    aboutExpand.style.opacity = e > 0.002 ? 1 : 0;
    aboutScrim.style.opacity = (e * 0.9).toFixed(3);
  }

  function photoTick() {
    const diff = photoTarget - photoCurrent;
    if (Math.abs(diff) > 0.0008) {
      photoCurrent += diff * (reducedMotion ? 1 : 0.14);
      applyPhotoProgress();
      requestAnimationFrame(photoTick);
    } else {
      photoCurrent = photoTarget;
      applyPhotoProgress();
      photoAnimating = false;
    }
  }

  function kickPhoto() {
    if (!photoAnimating) {
      photoAnimating = true;
      requestAnimationFrame(photoTick);
    }
  }

  function stepPhoto(dir) {
    const before = photoTarget;
    photoTarget = Math.min(1, Math.max(0, photoTarget + dir * 0.34));
    if (photoTarget === before) return "edge";
    kickPhoto();
    return dir > 0 && photoTarget === 1 ? "full" : "step";
  }

  applyPhotoProgress();

  const loader = document.getElementById("loader");
  let loaderDone = false;
  const loaderStart = Date.now();

  function finishLoader() {
    if (loaderDone) return;
    loaderDone = true;
    loader.classList.add("is-done");
    requestAnimationFrame(update);
  }

  if (document.readyState === "complete") {
    setTimeout(finishLoader, Math.max(0, 1000 - (Date.now() - loaderStart)));
  } else {
    window.addEventListener("load", () => {
      setTimeout(finishLoader, Math.max(0, 1000 - (Date.now() - loaderStart)));
    });
  }
  setTimeout(finishLoader, 3000);
})();
