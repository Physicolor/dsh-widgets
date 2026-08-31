/**
 * dsh-widgets showcase — app shell: language + theme init, nav (sticky glass,
 * scrollspy, mobile burger), reveal-on-scroll, copy-to-clipboard, toast.
 */
(function () {
  'use strict';

  window.DASH_UI = {
    copy: function (text, btn, copiedLabel) {
      var done = function () {
        if (!btn) return;
        var original = btn.textContent;
        btn.textContent = copiedLabel || window.DASH_I18N.t('copied');
        btn.classList.add('is-copied');
        setTimeout(function () {
          btn.textContent = original;
          btn.classList.remove('is-copied');
        }, 1600);
      };
      var fail = function () {
        try {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          var ok = document.execCommand('copy');
          document.body.removeChild(ta);
          if (ok) return done();
        } catch (_) {
          /* ignore */
        }
        window.DASH_UI.toast(window.DASH_I18N.t('copyFailed'));
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fail);
      } else {
        fail();
      }
    },

    toast: function (msg) {
      var el = document.getElementById('toast');
      if (!el) return;
      el.textContent = msg;
      el.hidden = false;
      clearTimeout(window.__dashToastTimer);
      window.__dashToastTimer = setTimeout(function () { el.hidden = true; }, 2200);
    }
  };

  /* ── Nav ────────────────────────────────────────────────────── */
  function initNav() {
    var header = document.getElementById('top-nav');
    var burger = document.getElementById('nav-burger');
    var links = document.getElementById('nav-links');

    if (header) {
      var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 24); };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    if (burger && links) {
      burger.addEventListener('click', function () {
        var open = links.classList.toggle('open');
        burger.setAttribute('aria-expanded', String(open));
      });
      links.addEventListener('click', function (e) {
        if (e.target.closest('a')) {
          links.classList.remove('open');
          burger.setAttribute('aria-expanded', 'false');
        }
      });
    }

    var navAnchors = Array.prototype.slice.call(document.querySelectorAll('.nav-link[href^="#"]'));
    if (navAnchors.length && 'IntersectionObserver' in window) {
      var sectionIds = navAnchors.map(function (a) { return a.getAttribute('href').slice(1); })
        .filter(function (id) { return document.getElementById(id); });
      var visible = {};
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
        var current = sectionIds
          .filter(function (id) { return visible[id]; })
          .sort(function (a, b) {
            return document.getElementById(a).getBoundingClientRect().top - document.getElementById(b).getBoundingClientRect().top;
          })[0];
        navAnchors.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + current);
        });
      }, { rootMargin: '-38% 0px -55% 0px' });
      sectionIds.forEach(function (id) { io.observe(document.getElementById(id)); });
    }
  }

  /* ── Reveal on scroll ───────────────────────────────────────── */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ── Install copy ───────────────────────────────────────────── */
  function initInstallCopy() {
    var btn = document.getElementById('copy-install');
    if (!btn) return;
    var cmd = (window.DASH_WIDGETS && window.DASH_WIDGETS.installCmd) || '';
    btn.addEventListener('click', function () {
      window.DASH_UI.copy(cmd, btn, window.DASH_I18N.t('copied'));
    });
  }

  /* ── Language + theme wiring ────────────────────────────────── */
  function initI18n() {
    window.DASH_I18N.applyText();
    var toggle = document.getElementById('lang-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        window.DASH_I18N.setLang(window.DASH_I18N.lang() === 'zh' ? 'en' : 'zh');
      });
    }
  }

  /* ── Boot ───────────────────────────────────────────────────── */
  function boot() {
    initI18n();
    initNav();
    initReveal();
    initInstallCopy();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();