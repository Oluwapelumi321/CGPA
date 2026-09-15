/* home.js — Homepage interactions */
'use strict';

document.addEventListener('DOMContentLoaded', () => {

  // ── Navbar scroll effect ───────────────────────────────────
  const navbar = document.querySelector('.navbar');
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  // ── Mobile nav toggle ──────────────────────────────────────
  const navToggle = document.getElementById('navToggle');
  const navMenu   = document.getElementById('navMenu');
  navToggle?.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    navMenu.classList.toggle('open', !expanded);
  });

  // Close nav when a link is clicked
  navMenu?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.setAttribute('aria-expanded', 'false');
      navMenu.classList.remove('open');
    });
  });

  // ── CGPA hero counter animation ────────────────────────────
  const counterEl = document.getElementById('heroCounter');
  if (counterEl) {
    const target   = 3.85;
    const duration = 2200;
    const start    = performance.now();
    const animate  = (now) => {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      counterEl.textContent = (eased * target).toFixed(2);
      if (progress < 1) requestAnimationFrame(animate);
    };
    // Start counter when hero is in view
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        requestAnimationFrame(animate);
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    observer.observe(counterEl);
  }

  // ── Scroll-reveal for sections ─────────────────────────────
  const revealEls = document.querySelectorAll(
    '.concept-card, .feature-item, .step-item, .grade-table'
  );
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      el.style.transition = `opacity 0.5s ease ${i * 0.06}s, transform 0.5s ease ${i * 0.06}s`;
      revealObserver.observe(el);
    });
  }

  // ── Footer year ────────────────────────────────────────────
  const yearEl = document.getElementById('currentYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ── Active nav link on scroll ──────────────────────────────
  const sections = document.querySelectorAll('section[id], footer[id]');
  const navLinks  = document.querySelectorAll('.nav-link');
  const activateLink = () => {
    let current = '';
    sections.forEach(s => {
      if (window.scrollY >= s.offsetTop - 100) current = s.id;
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  };
  window.addEventListener('scroll', activateLink, { passive: true });
});
