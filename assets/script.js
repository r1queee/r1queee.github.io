// Optional: manual theme toggle. Uses data-theme on <html>.
// If you don't want a button, you can remove it from HTML and keep CSS-only.

(function () {
  const root = document.documentElement;
  const btn = document.querySelector('[data-theme-toggle]');

  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;

  // If user toggles, override prefers-color-scheme by forcing variables via data-theme
  // We'll do it by adding a class-like hook and defining CSS vars inline:
  function applyTheme(mode) {
    root.dataset.theme = mode;
    localStorage.setItem('theme', mode);
  }

  function currentTheme() {
    // If explicitly set:
    if (root.dataset.theme) return root.dataset.theme;
    // Else infer from media
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function toggle() {
    const now = currentTheme();
    applyTheme(now === 'dark' ? 'light' : 'dark');
  }

  if (btn) btn.addEventListener('click', toggle);
})();
