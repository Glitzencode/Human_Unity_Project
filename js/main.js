// ── NAV SCROLL BEHAVIOR ──
const nav = document.querySelector('nav');
const navLinks = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
  nav && nav.classList.toggle('scrolled', window.scrollY > 20);
  // Scrollspy
  navLinks.forEach(link => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      const rect = target.getBoundingClientRect();
      link.classList.toggle('active', rect.top <= 100 && rect.bottom > 100);
    }
  });
});

// ── MOBILE NAV ──
const mobileToggle = document.querySelector('.nav-mobile');
const navLinksEl = document.querySelector('.nav-links');
if (mobileToggle && navLinksEl) {
  mobileToggle.addEventListener('click', () => {
    navLinksEl.classList.toggle('open');
  });
  navLinksEl.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => navLinksEl.classList.remove('open'));
  });
}

// ── LIVE MEMBER COUNTER ──
const counterEl = document.getElementById('counter-num');
if (counterEl) {
  let count = 1;
  counterEl.textContent = count.toLocaleString();
}


// ── CHAPTER FINDER ──
const CHAPTERS = [
  { city: 'Waterville', state: 'OH', members: 1, status: 'new', focus: 'All initiatives' },
];

function initChapterFinder() {
  const searchInput = document.getElementById('chapter-search');
  const statusFilter = document.getElementById('chapter-status');
  const resultsEl = document.getElementById('chapter-results');
  if (!searchInput || !resultsEl) return;

  function renderChapters(list) {
    if (list.length === 0) {
      resultsEl.innerHTML = `<div class="no-results"><p>No chapters found in that area yet — <a href="start-a-chapter.html" style="color:var(--teal)">start one</a>.</p></div>`;
      return;
    }
    resultsEl.innerHTML = list.map(c => `
      <div class="chapter-card">
        <div class="chapter-info">
          <h4>${c.city}, ${c.state}</h4>
          <p>${c.members} members &middot; Focus: ${c.focus}</p>
        </div>
        <div style="display:flex;gap:0.75rem;align-items:center;flex-shrink:0">
          <span class="chapter-badge badge-${c.status}">${c.status === 'new' ? 'Just started' : c.status === 'forming' ? 'Forming' : 'Active'}</span>
          <a href="get-involved.html" class="btn btn-outline btn-sm">Connect</a>
        </div>
      </div>
    `).join('');
  }

  function filter() {
    const query = searchInput.value.toLowerCase();
    const status = statusFilter ? statusFilter.value : 'all';
    let list = CHAPTERS;
    if (query) list = list.filter(c => c.city.toLowerCase().includes(query) || c.state.toLowerCase().includes(query));
    if (status !== 'all') list = list.filter(c => c.status === status);
    renderChapters(list);
  }

  searchInput.addEventListener('input', filter);
  if (statusFilter) statusFilter.addEventListener('change', filter);
  renderChapters(CHAPTERS);
}

initChapterFinder();

// ── SMOOTH ANCHOR SCROLL ──
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// ── FADE IN ON SCROLL ──
const fadeEls = document.querySelectorAll('.fade-in');
if ('IntersectionObserver' in window && fadeEls.length) {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  fadeEls.forEach(el => obs.observe(el));
}
