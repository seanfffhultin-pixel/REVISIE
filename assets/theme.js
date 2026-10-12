// Apply interface preferences before styles load to avoid flashes and unwanted motion.
(() => {
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const apply = () => {
    let settings = {};
    try { settings = JSON.parse(localStorage.getItem('revisie-settings') || '{}') || {}; } catch {}
    const preference = settings.theme || 'system';
    const reduceMotion = typeof settings.reduceMotion === 'boolean' ? settings.reduceMotion : motion.matches;
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
    const dark = preference === 'dark' || (preference !== 'light' && system.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  };
  window.revisieTheme = { apply };
  apply();
  system.addEventListener('change', apply);
  motion.addEventListener('change', apply);
  window.addEventListener('storage', event => {
    if (event.key === 'revisie-settings' || event.key === null) apply();
  });
})();
