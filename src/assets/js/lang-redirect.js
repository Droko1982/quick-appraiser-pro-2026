(function () {
  'use strict';
  // "/" has no content of its own: send the visitor to /en/ or /fr/.
  // An explicit earlier choice wins; otherwise the browser's languages decide.
  var base = document.documentElement.getAttribute('data-base') || '/';
  var choice = null;
  try {
    choice = localStorage.getItem('qa-lang');
  } catch (e) {
    choice = null;
  }
  if (choice !== 'en' && choice !== 'fr') {
    var langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];
    choice = 'en';
    for (var i = 0; i < langs.length; i += 1) {
      var code = String(langs[i]).toLowerCase();
      if (code.indexOf('fr') === 0) {
        choice = 'fr';
        break;
      }
      if (code.indexOf('en') === 0) break;
    }
  }
  window.location.replace(base + choice + '/' + window.location.search + window.location.hash);
})();
