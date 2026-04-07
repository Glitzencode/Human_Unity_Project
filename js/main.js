// ── NAV SCROLL BEHAVIOR ──
const nav = document.querySelector('nav');
const navLinks = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
  nav && nav.classList.toggle('scrolled', window.scrollY > 20);
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

// ── COUNTAPI — persists member count across all visitors ──
// To reset or set a custom value: https://api.countapi.xyz/set/humanunity.us/members?value=NUMBER
const COUNT_GET = 'https://api.countapi.xyz/get/humanunity.us/members';
const COUNT_HIT = 'https://api.countapi.xyz/hit/humanunity.us/members';

const counterEl = document.getElementById('counter-num');
function updateCounterDisplay(n) {
  if (counterEl) counterEl.textContent = Number(n).toLocaleString();
}

if (counterEl) {
  fetch(COUNT_GET)
    .then(r => r.json())
    .then(d => updateCounterDisplay(d.value || 1))
    .catch(() => updateCounterDisplay(1));
}

// ── MAILCHIMP JSONP SUBMISSION ──
// Submits without page redirect — only increments counter on confirmed success
const MC_ACTION = 'https://humanunity.us6.list-manage.com/subscribe/post-json?u=2b32405c64d33eb7405ab0e47&id=91d3047cd1&f_id=000dc2e1f0';

function submitToMailchimp(form, onSuccess, onError) {
  const params = new URLSearchParams(new FormData(form));
  const cbName = 'mcCb_' + Date.now();
  params.set('c', cbName);

  window[cbName] = function(response) {
    delete window[cbName];
    const s = document.getElementById(cbName);
    if (s) s.remove();
    if (response.result === 'success') {
      onSuccess();
    } else {
      onError(response.msg || 'Something went wrong. Please try again.');
    }
  };

  const script = document.createElement('script');
  script.id = cbName;
  script.src = MC_ACTION + '&' + params.toString();
  document.body.appendChild(script);

  setTimeout(() => {
    if (window[cbName]) {
      delete window[cbName];
      onError('Request timed out. Please try again.');
    }
  }, 8000);
}

function initMailchimpForm(formEl) {
  if (!formEl) return;

  // Create inline message element
  const msgEl = document.createElement('div');
  msgEl.style.cssText = 'font-size:14px;margin-top:0.75rem;display:none;';
  formEl.parentNode.insertBefore(msgEl, formEl.nextSibling);

  formEl.addEventListener('submit', function(e) {
    e.preventDefault();

    // Age check
    const yearInput = formEl.querySelector('[name="MMERGE8"]');
    if (yearInput && yearInput.value) {
      const age = new Date().getFullYear() - parseInt(yearInput.value);
      if (age < 13) {
        alert('You must be 13 or older to join the Human Unity network.');
        return;
      }
    }

    const btn = formEl.querySelector('button[type="submit"]');
    const originalText = btn ? btn.textContent : '';
    if (btn) { btn.textContent = 'Sending...'; btn.disabled = true; }
    msgEl.style.display = 'none';

    submitToMailchimp(formEl,
      function onSuccess() {
        // Increment counter on confirmed Mailchimp success
        fetch(COUNT_HIT)
          .then(r => r.json())
          .then(d => updateCounterDisplay(d.value))
          .catch(() => {});

        // Show inline success — no redirect
        formEl.style.display = 'none';
        msgEl.style.cssText = 'font-size:15px;margin-top:0.75rem;display:flex;align-items:center;gap:8px;color:#1D9E75;font-weight:500;';
        msgEl.innerHTML = '&#10003; You\'re in. Welcome to the project.';
      },
      function onError(msg) {
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
        const clean = msg.replace(/<[^>]+>/g, '');
        msgEl.style.cssText = 'font-size:13px;margin-top:0.75rem;display:block;color:#D85A30;';
        msgEl.textContent = clean;
      }
    );
  });
}

// Attach to every Mailchimp form on the page
document.querySelectorAll('form[action*="list-manage.com"]').forEach(f => initMailchimpForm(f));

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
      resultsEl.innerHTML = '<div class="no-results"><p>No chapters found in that area yet — <a href="start-a-chapter.html" style="color:var(--teal)">start one</a>.</p></div>';
      return;
    }
    resultsEl.innerHTML = list.map(c => `
      <div class="chapter-card">
        <div class="chapter-info">
          <h4>${c.city}, ${c.state}</h4>
          <p>${c.members} member${c.members !== 1 ? 's' : ''} &middot; Focus: ${c.focus}</p>
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
