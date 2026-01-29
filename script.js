function toggleMenu() {
  const menu = document.querySelector(".menu-links");
  const icon = document.querySelector(".hamburger-icon");
  if (!menu || !icon) return;
  menu.classList.toggle("open");
  icon.classList.toggle("open");
}

document.addEventListener("DOMContentLoaded", () => {
  const root = document.documentElement;
  const slides = document.querySelector(".slides");
  const sections = Array.from(document.querySelectorAll(".page-section"));

  if (!slides || sections.length === 0) return;

  // ===== helpers =====
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function parseCssTimeToMs(value) {
    const v = (value || "").trim();
    if (!v) return 600;
    if (v.endsWith("ms")) return Number(v.replace("ms", "").trim()) || 600;
    if (v.endsWith("s")) return (Number(v.replace("s", "").trim()) || 0.6) * 1000;
    return Number(v) || 600;
  }

  const cssSlideMs = parseCssTimeToMs(getComputedStyle(root).getPropertyValue("--slide-ms"));
  const SLIDE_MS = reduceMotion ? 0 : cssSlideMs;

  // pausa extra para não “engolir” vários scrolls seguidos
  const COOLDOWN_MS = reduceMotion ? 0 : 350;

  let index = 0;
  let locked = false;
  let cooldownUntil = 0;

  // spotlight
  window.addEventListener("mousemove", (e) => {
    root.style.setProperty("--mx", `${e.clientX}px`);
    root.style.setProperty("--my", `${e.clientY}px`);
  });

  function setHash(id) {
    if (!id) return;
    history.replaceState(null, "", `#${id}`);
  }

  function applyTransform(i, immediate = false) {
    const offset = i * window.innerHeight;
    if (immediate) slides.style.transition = "none";
    slides.style.transform = `translate3d(0, -${offset}px, 0)`;
    if (immediate) {
      requestAnimationFrame(() => {
        slides.style.transition = "";
      });
    }
  }

  function getActiveScrollBox() {
    const active = sections[index];
    if (!active || !active.classList.contains("scrollable")) return null;

    const box = active.querySelector(".section-inner");
    if (!box) return null;

    // só se houver scroll real
    const hasScroll = box.scrollHeight > box.clientHeight + 2;
    return hasScroll ? box : null;
  }

  function isAtTop(el) {
    return el.scrollTop <= 0;
  }

  function isAtBottom(el) {
    return el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
  }

  function normalizeDeltaY(e) {
    // deltaMode: 0=pixels, 1=lines, 2=pages
    if (e.deltaMode === 1) return e.deltaY * 16;
    if (e.deltaMode === 2) return e.deltaY * window.innerHeight;
    return e.deltaY;
  }

  // ===== hardware carousel (lateral) =====
  // Quando a secção ativa é #hardware:
  // - scroll (wheel) troca de componente (1 "step" = 1 componente)
  // - só muda de secção depois do último / antes do primeiro
  let hwGestureConsumed = false;

  function createHardwareCarousel() {
    const section = document.getElementById("hardware");
    if (!section) return null;

    const carousel = section.querySelector("[data-hw-carousel]");
    if (!carousel) return null;

    const track = carousel.querySelector(".hw-track");
    const slidesHw = Array.from(carousel.querySelectorAll(".hw-slide"));
    const dotsWrap = carousel.querySelector(".hw-dots");
    const viewport = carousel.querySelector(".hw-viewport");

    if (!track || slidesHw.length === 0 || !dotsWrap) return null;

    let subIndex = 0;
    const dots = [];

    function apply(immediate = false) {
      if (immediate) track.style.transition = "none";
      track.style.transform = `translate3d(-${subIndex * 100}%, 0, 0)`;
      if (immediate) requestAnimationFrame(() => (track.style.transition = ""));

      dots.forEach((btn, i) => {
        const active = i === subIndex;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-selected", active ? "true" : "false");
        btn.tabIndex = active ? 0 : -1;
      });
    }

    function set(i, immediate = false) {
      subIndex = Math.max(0, Math.min(slidesHw.length - 1, i));
      apply(immediate);
    }

    function canStep(dir) {
      return dir > 0 ? subIndex < slidesHw.length - 1 : subIndex > 0;
    }

    function step(dir) {
      if (!canStep(dir)) return false;
      subIndex += dir;
      apply(false);
      return true;
    }

    function reset(immediate = true) {
      subIndex = 0;
      apply(immediate);
    }

    // Dots (gerados automaticamente)
    dotsWrap.innerHTML = "";
    slidesHw.forEach((slide, i) => {
      const title = slide.dataset.hwTitle || `Componente ${i + 1}`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hw-dot" + (i === 0 ? " is-active" : "");
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-label", title);
      btn.setAttribute("aria-selected", i === 0 ? "true" : "false");
      btn.tabIndex = i === 0 ? 0 : -1;

      btn.addEventListener("click", () => set(i, false));

      dotsWrap.appendChild(btn);
      dots.push(btn);
    });

    // Swipe horizontal no mobile/tablet (não muda a secção)
    if (viewport) {
      let sx = null, sy = null;

      viewport.addEventListener(
        "touchstart",
        (e) => {
          const t = e.touches?.[0];
          if (!t) return;
          sx = t.clientX;
          sy = t.clientY;
        },
        { passive: true }
      );

      viewport.addEventListener(
        "touchend",
        (e) => {
          if (sx === null || sy === null) return;
          const t = e.changedTouches?.[0];
          if (!t) return;

          const dx = t.clientX - sx;
          const dy = t.clientY - sy;

          sx = null;
          sy = null;

          // só se for swipe horizontal "claro"
          if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;

          const dir = dx < 0 ? 1 : -1;
          if (step(dir)) {
            hwGestureConsumed = true;
            cooldownUntil = Date.now() + SLIDE_MS + COOLDOWN_MS;
          }
        },
        { passive: true }
      );
    }

    apply(true);

    return {
      section,
      reset,
      set,
      step,
      canStep,
      get index() {
        return subIndex;
      },
      get length() {
        return slidesHw.length;
      },
    };
  }

  const hwCarousel = createHardwareCarousel();

  function isHardwareActive() {
    return !!hwCarousel && sections[index] === hwCarousel.section;
  }

  function goTo(next, dir) {
    next = Math.max(0, Math.min(sections.length - 1, next));

    if (locked || Date.now() < cooldownUntil) return;
    if (next === index) return;

    locked = true;
    cooldownUntil = Date.now() + SLIDE_MS + COOLDOWN_MS;

    const current = sections[index];
    const target = sections[next];

    // reset do scroll interno da secção alvo (para entrar sempre “limpa”)
    const targetBox = target.querySelector(".section-inner");
    if (targetBox) targetBox.scrollTop = 0;

    // ao entrar no hardware, começa sempre no 1º componente
    if (hwCarousel && target === hwCarousel.section) hwCarousel.reset(true);

    current.classList.add(dir > 0 ? "leaving-up" : "leaving-down");

    if (dir < 0) target.classList.add("from-above");
    else target.classList.remove("from-above");

    void target.offsetWidth;

    requestAnimationFrame(() => {
      target.classList.add("is-active");
      applyTransform(next);

      window.setTimeout(() => {
        current.classList.remove("is-active", "leaving-up", "leaving-down");
        target.classList.remove("from-above");

        index = next;
        setHash(target.id);

        locked = false;
      }, SLIDE_MS);
    });
  }

  // ===== init por hash =====
  function initFromHash() {
    const hash = (location.hash || "").replace("#", "");
    const idx = hash ? sections.findIndex((s) => s.id === hash) : -1;
    index = idx >= 0 ? idx : 0;

    sections.forEach((s, i) => {
      s.classList.toggle("is-active", i === index);
      if (i !== index) s.classList.remove("leaving-up", "leaving-down", "from-above");
    });

    // garante scroll interno no topo da secção inicial
    const box = sections[index].querySelector(".section-inner");
    if (box) box.scrollTop = 0;

    // se começa no hardware por hash, garante o 1º componente
    if (hwCarousel && sections[index] === hwCarousel.section) hwCarousel.reset(true);

    applyTransform(index, true);
    setHash(sections[index].id);
  }

  initFromHash();

  // ===== wheel (scroll interno primeiro; só muda na ponta) =====
  let wheelAcc = 0;
  let wheelTimer = null;

  let hwWheelAcc = 0;
  let hwWheelTimer = null;

  const WHEEL_THRESHOLD = 110;

  window.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();

      if (document.body.classList.contains("modal-open")) {
        return;
      }

      if (locked || Date.now() < cooldownUntil) {
        wheelAcc = 0;
        return;
      }

      const box = getActiveScrollBox();
      const dy = normalizeDeltaY(e);
      const dir = Math.sign(dy);

      // hardware: scroll troca de componente antes de mudar de secção
      if (isHardwareActive()) {
        // se o gesto foi 100% horizontal (trackpad), usa deltaX (quando disponível)
        const dx = Math.abs(e.deltaX || 0) > Math.abs(dy) ? e.deltaX : 0;
        const primary = dx !== 0 ? dx : dy;

        hwWheelAcc += primary;

        clearTimeout(hwWheelTimer);
        hwWheelTimer = setTimeout(() => (hwWheelAcc = 0), 140);

        if (Math.abs(hwWheelAcc) < WHEEL_THRESHOLD) return;

        const stepDir = hwWheelAcc > 0 ? 1 : -1;
        hwWheelAcc = 0;
        wheelAcc = 0;

        if (hwCarousel && hwCarousel.canStep(stepDir)) {
          hwCarousel.step(stepDir);
          cooldownUntil = Date.now() + SLIDE_MS + COOLDOWN_MS;
          return;
        }

        // já está no 1º/último -> muda de secção como normal
        goTo(index + stepDir, stepDir);
        return;
      }

      // se há scroll interno e NÃO estás na ponta -> faz scroll interno e não muda secção
      if (box) {
        if (dir > 0 && !isAtBottom(box)) {
          box.scrollTop += dy;
          wheelAcc = 0;
          return;
        }
        if (dir < 0 && !isAtTop(box)) {
          box.scrollTop += dy;
          wheelAcc = 0;
          return;
        }
        // se está na ponta (topo ou fundo), cai para a lógica de mudar secção
      }

      // lógica normal 1-scroll = 1-secção
      wheelAcc += dy;

      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => (wheelAcc = 0), 140);

      if (Math.abs(wheelAcc) < WHEEL_THRESHOLD) return;

      const stepDir = wheelAcc > 0 ? 1 : -1;
      wheelAcc = 0;

      goTo(index + stepDir, stepDir);
    },
    { passive: false }
  );

  // ===== teclado (respeita scroll interno) =====
  window.addEventListener("keydown", (e) => {
    if (document.body.classList.contains("modal-open")) return;
    if (locked || Date.now() < cooldownUntil) return;

    const box = getActiveScrollBox();

    // hardware: usa teclas para trocar de componente
    if (isHardwareActive()) {
      const forwardKeys = new Set(["ArrowDown", "PageDown", " ", "ArrowRight"]);
      const backKeys = new Set(["ArrowUp", "PageUp", "ArrowLeft"]);

      if (forwardKeys.has(e.key)) {
        e.preventDefault();
        if (hwCarousel && hwCarousel.canStep(1)) {
          hwCarousel.step(1);
          cooldownUntil = Date.now() + SLIDE_MS + COOLDOWN_MS;
          return;
        }
        return goTo(index + 1, 1);
      }

      if (backKeys.has(e.key)) {
        e.preventDefault();
        if (hwCarousel && hwCarousel.canStep(-1)) {
          hwCarousel.step(-1);
          cooldownUntil = Date.now() + SLIDE_MS + COOLDOWN_MS;
          return;
        }
        return goTo(index - 1, -1);
      }
    }

    const scrollBox = (amount) => {
      if (!box) return false;
      box.scrollBy({ top: amount, behavior: "smooth" });
      return true;
    };

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (box && !isAtBottom(box)) return void scrollBox(120);
      goTo(index + 1, 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (box && !isAtTop(box)) return void scrollBox(-120);
      goTo(index - 1, -1);
    } else if (e.key === "PageDown" || e.key === " ") {
      e.preventDefault();
      if (box && !isAtBottom(box)) return void scrollBox(box.clientHeight * 0.85);
      goTo(index + 1, 1);
    } else if (e.key === "PageUp") {
      e.preventDefault();
      if (box && !isAtTop(box)) return void scrollBox(-(box.clientHeight * 0.85));
      goTo(index - 1, -1);
    } else if (e.key === "Home") {
      e.preventDefault();
      if (box && !isAtTop(box)) return box.scrollTo({ top: 0, behavior: "smooth" });
      goTo(0, -1);
    } else if (e.key === "End") {
      e.preventDefault();
      if (box && !isAtBottom(box)) return box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
      goTo(sections.length - 1, 1);
    }
  });

  // ===== touch (não troca secção se a pessoa estiver a scrollar conteúdo) =====
  let touchY = null;
  let touchStartScrollTop = null;

  window.addEventListener(
    "touchstart",
    (e) => {
      touchY = e.touches?.[0]?.clientY ?? null;
      const box = getActiveScrollBox();
      touchStartScrollTop = box ? box.scrollTop : null;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchend",
    (e) => {
      if (locked || Date.now() < cooldownUntil || touchY === null) return;

      if (isHardwareActive() && hwGestureConsumed) {
        hwGestureConsumed = false;
        return;
      }

      const box = getActiveScrollBox();
      if (box && touchStartScrollTop !== null && box.scrollTop !== touchStartScrollTop) {
        // houve scroll interno -> não mudar secção
        touchY = null;
        touchStartScrollTop = null;
        return;
      }

      const endY = e.changedTouches?.[0]?.clientY ?? touchY;
      const dy = touchY - endY;
      touchY = null;
      touchStartScrollTop = null;

      if (Math.abs(dy) < 55) return;

      // se houver scroll interno e não estás na ponta, deixa o scroll interno “ganhar”
      if (box) {
        if (dy > 0 && !isAtBottom(box)) return;
        if (dy < 0 && !isAtTop(box)) return;
      }

      const dir = dy > 0 ? 1 : -1;
      goTo(index + dir, dir);
    },
    { passive: true }
  );

  // ===== nav links =====
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href) return;

      const id = href.replace("#", "");
      const idx = sections.findIndex((s) => s.id === id);
      if (idx < 0) return;

      e.preventDefault();

      const menu = document.querySelector(".menu-links");
      const icon = document.querySelector(".hamburger-icon");
      if (menu?.classList.contains("open")) {
        menu.classList.remove("open");
        icon?.classList.remove("open");
      }

      const dir = idx > index ? 1 : -1;
      goTo(idx, dir);
    });
  });

  window.addEventListener("resize", () => {
    applyTransform(index, true);
    if (hwCarousel) hwCarousel.set(hwCarousel.index, true);
  });

  window.addEventListener("hashchange", () => {
    const hash = (location.hash || "").replace("#", "");
    const idx = hash ? sections.findIndex((s) => s.id === hash) : -1;
    if (idx >= 0 && idx !== index && !locked && Date.now() >= cooldownUntil) {
      const dir = idx > index ? 1 : -1;
      goTo(idx, dir);
    }
  });

  // ===== Lightbox (imagem grande + botão frente/trás no PCB) =====
  function openLightbox({ title = "", src, front, back }) {
  const overlay = document.createElement("div");
  overlay.className = "lightbox";

  const hasToggle = !!(front && back);
  let showing = "front";

  const initialSrc = src || front || "";

  overlay.innerHTML = `
    <div class="lightbox__panel" role="dialog" aria-modal="true">
      <img class="lightbox__img" src="${initialSrc}" alt="${title || ""}">
      
      <div class="lightbox__bar">
        <div class="lightbox__title">${title || ""}</div>
        <div class="lightbox__actions">
          ${hasToggle ? `<button class="lightbox__btn" type="button" data-toggle>Ver trás</button>` : ""}
          <button class="lightbox__btn" type="button" data-close>Fechar (ESC)</button>
        </div>
      </div>
    </div>
  `;

  const img = overlay.querySelector(".lightbox__img");
  const btnToggle = overlay.querySelector("[data-toggle]");
  const btnClose = overlay.querySelector("[data-close]");

  function close() {
    document.body.classList.remove("modal-open");
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  }

  function toggle() {
    if (!hasToggle) return;
    if (showing === "front") {
      showing = "back";
      img.src = back;
      btnToggle.textContent = "Ver frente";
    } else {
      showing = "front";
      img.src = front;
      btnToggle.textContent = "Ver trás";
    }
  }

  function onKey(e) {
    if (e.key === "Escape") close();
    if (hasToggle && (e.key === "ArrowLeft" || e.key === "ArrowRight")) toggle();
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close(); // clicar fora fecha
  });

  btnClose.addEventListener("click", close);
  if (btnToggle) btnToggle.addEventListener("click", toggle);

  document.addEventListener("keydown", onKey);
  document.body.classList.add("modal-open");
  document.body.appendChild(overlay);
}

  // usar os links .media-open para abrir lightbox (com toggle se houver data-front/data-back)
  document.querySelectorAll("a.media-open").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();

      const title = a.dataset.title || "";
      const front = a.dataset.front;
      const back = a.dataset.back;

      // se houver frente/trás -> usa toggle
      if (front && back) {
        openLightbox({ title, front, back });
        return;
      }

      // caso normal -> usa href como imagem única
      const src = a.getAttribute("href");
      if (!src) return;
      openLightbox({ title, src });
    });
  });

});



