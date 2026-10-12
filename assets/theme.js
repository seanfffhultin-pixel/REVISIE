// Apply the saved appearance before styles load, so navigation keeps its theme.
(() => {
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = () => {
    let preference = 'system';
    try { preference = JSON.parse(localStorage.getItem('revisie-settings') || '{}').theme || 'system'; } catch {}
    const dark = preference === 'dark' || (preference !== 'light' && system.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  };
  window.revisieTheme = { apply };
  apply();
  system.addEventListener('change', apply);
  window.addEventListener('storage', event => {
    if (event.key === 'revisie-settings' || event.key === null) apply();
  });
})();
