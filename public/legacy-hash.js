/*
 * Before the site had separate pages, everything lived on / with a hash:
 * /#map/<id>, /#sources, /#contact. Send those links to their new pages.
 * A classic script in <head> (no module, no inline code for the CSP), so it
 * runs before the homepage is drawn. The hashchange listener catches #map
 * links on the homepage itself (e.g. the caption of the hero map).
 */
(function () {
  function redirect() {
    var hash = window.location.hash;
    if (/^#map([/?]|$)/.test(hash)) {
      window.location.replace('/map' + hash);
    } else if (hash === '#sources') {
      window.location.replace('/sources');
    } else if (hash === '#contact') {
      window.location.replace('/about#contact');
    } else if (hash === '#home') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }
  redirect();
  window.addEventListener('hashchange', redirect);
})();
