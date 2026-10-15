// Seasonal branding follows the UK calendar, regardless of the viewer's timezone.
(function (root) {
  const monthFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', month: 'numeric' });
  function current(date = new Date(), theme = root.document?.documentElement.dataset.theme || 'light') {
    const month = Number(monthFormatter.format(date));
    const dark = theme === 'dark';
    if (month === 6) return { season: 'pride', src: dark ? 'assets/revisie-logo-pride-dark.png?v=2' : 'assets/revisie-logo-pride.png?v=1', alt: 'REVISIÉ — Pride Month' };
    if (month === 10) return { season: 'black-history', src: dark ? 'assets/revisie-logo-black-history-dark.png?v=2' : 'assets/revisie-logo-black-history.png?v=1', alt: 'REVISIÉ — Black History Month' };
    return { season: 'standard', src: dark ? 'assets/revisie-logo-dark.png?v=2' : 'assets/revisie-logo.png?v=2', alt: 'REVISIÉ' };
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { current }; return; }
  function apply() {
    const brand = current();
    document.documentElement.dataset.brandSeason = brand.season;
    for (const logo of document.querySelectorAll('.brand-logo img, .auth-logo img')) {
      if (logo.getAttribute('src') !== brand.src) logo.setAttribute('src', brand.src);
      logo.alt = brand.alt;
    }
  }
  root.revisieBrand = { current, apply };
  apply();
  document.addEventListener('DOMContentLoaded', apply);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') apply(); });
  root.addEventListener('pageshow', apply);
  // An open tab updates within a minute of the month changing; returning tabs update immediately.
  root.setInterval(apply, 60000);
})(typeof window !== 'undefined' ? window : globalThis);
