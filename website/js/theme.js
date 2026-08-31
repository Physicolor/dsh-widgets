/**
 * dsh-widgets showcase — theme toggle.
 * FIRST VISIT DEFAULTS TO LIGHT. An explicit user choice (dark or light) is
 * persisted and respected on later visits.
 */
(function () {
  'use strict';

  var KEY = 'dsh-widgets-site-theme';

  function apply(theme) {
    var root = document.documentElement;
    root.setAttribute('data-theme', theme);
    var toggle = document.getElementById('theme-toggle');
    if (toggle) {
      var label = theme === 'dark' ? 'themeToLight' : 'themeToDark';
      toggle.setAttribute('aria-label', window.DASH_I18N.t(label));
      toggle.setAttribute('title', window.DASH_I18N.t(label));
      toggle.setAttribute('aria-pressed', String(theme === 'light'));
    }
  }

  function init() {
    var stored = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch (_) {
      /* storage unavailable */
    }
    var theme = stored === 'dark' || stored === 'light' ? stored : 'light';
    apply(theme);

    var toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(next);
      try {
        localStorage.setItem(KEY, next);
      } catch (_) {
        /* ignore */
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();