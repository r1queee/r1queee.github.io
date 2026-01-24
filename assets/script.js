/* =========================================================
   script.js (no dependencies)
   - Theme toggle (localStorage)
   - Reveal on scroll (.reveal)
   - Timeline: one active project at a time (.tl-item)
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // ---------------------------
  // Theme Toggle
  // ---------------------------
  const root = document.documentElement;
  const btn = document.querySelector("[data-theme-toggle]");

  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") {
    root.dataset.theme = saved; // overrides prefers-color-scheme
  }

  const prefersDark = () =>
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const currentTheme = () => {
    if (root.dataset.theme) return root.dataset.theme;
    return prefersDark() ? "dark" : "light";
  };

  const applyTheme = (mode) => {
    root.dataset.theme = mode;
    localStorage.setItem("theme", mode);
  };

  const toggleTheme = () => {
    const now = currentTheme();
    applyTheme(now === "dark" ? "light" : "dark");
  };

  if (btn) btn.addEventListener("click", toggleTheme);

  // ---------------------------
  // Reveal on Scroll
  // ---------------------------
  const revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    const revealIO = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) e.target.classList.add("is-visible");
        }
      },
      { threshold: 0.12 }
    );

    revealEls.forEach((el) => revealIO.observe(el));
  }

  // ---------------------------
  // Timeline Active Item
  // (one project fully active at a time)
  // ---------------------------
  const items = document.querySelectorAll(".tl-item");
  if (items.length) {
    const setActive = (el) => {
      items.forEach((i) => i.classList.remove("is-active"));
      el.classList.add("is-active");
    };

    // default first
    setActive(items[0]);

    const tlIO = new IntersectionObserver(
      (entries) => {
        // choose the most visible intersecting item
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]) setActive(visible[0].target);
      },
      {
        threshold: [0.12, 0.25, 0.4, 0.6],
        // aims to activate the section that sits around the center
        rootMargin: "-35% 0px -45% 0px",
      }
    );

    items.forEach((i) => tlIO.observe(i));
  }
});
