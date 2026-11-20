(function () {
  'use strict';

  var doc = document;

  // Current year in the footer (the build writes one as a fallback).
  var year = String(new Date().getFullYear());
  doc.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = year;
  });

  // Remember an explicit language choice so "/" opens it next time.
  doc.querySelectorAll('a[data-lang]').forEach(function (link) {
    link.addEventListener('click', function () {
      try {
        localStorage.setItem('qa-lang', link.getAttribute('data-lang'));
      } catch (e) {
        /* storage unavailable: nothing to remember */
      }
    });
  });

  // Header border once the page scrolls.
  var header = doc.querySelector('[data-header]');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 4);
    };
    // First check on the next frame: reading scroll position now would force
    // a layout while the page is still loading.
    window.requestAnimationFrame(onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Mobile menu: a <details> disclosure, enhanced here.
  var menu = doc.querySelector('[data-mobile-menu]');
  if (menu) {
    var summary = menu.querySelector('summary');
    var syncLabel = function () {
      summary.setAttribute(
        'aria-label',
        summary.getAttribute(menu.open ? 'data-label-close' : 'data-label-open')
      );
    };
    menu.addEventListener('toggle', syncLabel);
    doc.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menu.open) {
        menu.open = false;
        summary.focus();
      }
    });
    doc.addEventListener('click', function (event) {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
    menu.querySelectorAll('.mobile-panel a').forEach(function (link) {
      link.addEventListener('click', function () {
        menu.open = false;
      });
    });
    window.matchMedia('(min-width: 1040px)').addEventListener('change', function (mq) {
      if (mq.matches) menu.open = false;
    });
  }

  // In-page links: move keyboard focus to the target section.
  doc.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function () {
      var id = link.getAttribute('href').slice(1);
      var target = id && doc.getElementById(id);
      if (!target) return;
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      window.setTimeout(function () {
        target.focus({ preventScroll: true });
      }, 0);
    });
  });

  // Features page: highlight the group being read.
  var jumpLinks = doc.querySelectorAll('.feature-jump a');
  if (jumpLinks.length && 'IntersectionObserver' in window) {
    var byId = {};
    jumpLinks.forEach(function (link) {
      byId[link.getAttribute('href').slice(1)] = link;
    });
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          jumpLinks.forEach(function (link) {
            link.removeAttribute('aria-current');
          });
          var active = byId[entry.target.id];
          if (active) active.setAttribute('aria-current', 'true');
        });
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    doc.querySelectorAll('.feature-group').forEach(function (section) {
      observer.observe(section);
    });
  }
})();
