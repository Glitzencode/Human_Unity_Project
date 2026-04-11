// ── NETLIFY IDENTITY TOKEN INTERCEPT ──
// Invite and password recovery links from Netlify land at the site root (/#invite_token=...)
// This intercepts those tokens on any page and forwards to the correct members page.
(function interceptIdentityTokens() {
  if (!window.location.hash) return;
  const params = new URLSearchParams(window.location.hash.substring(1));
  const inviteToken   = params.get('invite_token');
  const recoveryToken = params.get('recovery_token');
  if (inviteToken) {
    window.location.replace('/members/welcome.html#invite_token=' + inviteToken);
  } else if (recoveryToken) {
    window.location.replace('/members/login.html#recovery_token=' + recoveryToken);
  }
})();

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

// ── LIVE MEMBER COUNTER — pulls real count from Mailchimp via Netlify function ──
const counterEl = document.getElementById('counter-num');
function updateCounterDisplay(n) {
  if (counterEl) counterEl.textContent = Number(n).toLocaleString();
}

if (counterEl) {
  fetch('/.netlify/functions/member-count')
    .then(r => {
      if (!r.ok) throw new Error('Function error: ' + r.status);
      return r.json();
    })
    .then(d => updateCounterDisplay(d.count || 1))
    .catch(err => {
      console.warn('Member count fetch failed:', err.message);
      updateCounterDisplay(1);
    });
}

// ── MEMBER AREA NAV LINK ──
// Adds a "Member area" link to the nav.
// Shows "Dashboard" if already logged in, "Member area" if not.
// Uses Netlify Identity to check auth state.
(function initMemberNavLink() {
  // Load Netlify Identity widget script if not already present
  if (!window.netlifyIdentity) {
    const s = document.createElement('script');
    s.src = 'https://identity.netlify.com/v1/netlify-identity-widget.js';
    s.onload = setupMemberLink;
    document.head.appendChild(s);
  } else {
    setupMemberLink();
  }

  function setupMemberLink() {
    // Wait for Identity to init
    netlifyIdentity.on('init', user => {
      const navRight = document.querySelector('.wrap.nav-inner > div');
      if (!navRight) return;

      // Remove existing member link if any (prevent duplicates)
      const existing = document.getElementById('nav-member-link');
      if (existing) existing.remove();

      const link = document.createElement('a');
      link.id = 'nav-member-link';

      if (user) {
        link.href = '/members/dashboard.html';
        link.textContent = 'Dashboard →';
        link.className = 'btn btn-outline btn-sm';
        link.style.cssText = 'border-color:var(--teal);color:var(--teal);';
      } else {
        link.href = '/members/login.html';
        link.textContent = 'Member area';
        link.style.cssText = 'font-size:14px;color:var(--ink-light);text-decoration:none;font-weight:500;transition:color 0.15s;';
        link.onmouseover = () => link.style.color = 'var(--teal)';
        link.onmouseout  = () => link.style.color = 'var(--ink-light)';
      }

      // Insert before the "Join the project" button
      const joinBtn = navRight.querySelector('.btn-primary');
      if (joinBtn) {
        navRight.insertBefore(link, joinBtn);
      } else {
        navRight.prepend(link);
      }
    });

    netlifyIdentity.init();
  }
})();

// ── JOIN FORM — routes through /signup function ──
// Replaces direct Mailchimp POST with our unified signup function
// which handles Mailchimp + Netlify Identity invite + welcome email

function initJoinForm(formEl) {
  if (!formEl) return;

  // Create inline message element
  const msgEl = document.createElement('div');
  msgEl.style.cssText = 'font-size:14px;margin-top:0.75rem;display:none;';
  formEl.parentNode.insertBefore(msgEl, formEl.nextSibling);

  formEl.addEventListener('submit', async function(e) {
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
    if (btn) { btn.textContent = 'Joining...'; btn.disabled = true; }
    msgEl.style.display = 'none';

    const payload = {
      email:         formEl.querySelector('[name="EMAIL"]')?.value?.trim(),
      firstName:     formEl.querySelector('[name="FNAME"]')?.value?.trim(),
      birthdayMonth: formEl.querySelector('[name="BIRTHDAY[month]"]')?.value?.trim(),
      birthdayDay:   formEl.querySelector('[name="BIRTHDAY[day]"]')?.value?.trim(),
      birthYear:     formEl.querySelector('[name="MMERGE8"]')?.value?.trim(),
    };

    if (!payload.email || !payload.firstName) {
      if (btn) { btn.textContent = originalText; btn.disabled = false; }
      msgEl.style.cssText = 'font-size:13px;margin-top:0.75rem;display:block;color:#D85A30;';
      msgEl.textContent = 'Please fill in all required fields.';
      return;
    }

    try {
      const res = await fetch('/.netlify/functions/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        // Refresh member counter
        fetch('/.netlify/functions/member-count')
          .then(r => r.json())
          .then(d => updateCounterDisplay(d.count))
          .catch(() => {});

        // Show success
        formEl.style.display = 'none';
        msgEl.style.cssText = 'font-size:15px;margin-top:0.75rem;display:flex;align-items:center;gap:8px;color:#1D9E75;font-weight:500;';
        msgEl.innerHTML = '&#10003; You\'re in. Check your email to set up your member account.';
      } else {
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
        msgEl.style.cssText = 'font-size:13px;margin-top:0.75rem;display:block;color:#D85A30;';
        msgEl.textContent = data.message || 'Something went wrong. Please try again.';
      }

    } catch (err) {
      if (btn) { btn.textContent = originalText; btn.disabled = false; }
      msgEl.style.cssText = 'font-size:13px;margin-top:0.75rem;display:block;color:#D85A30;';
      msgEl.textContent = 'Network error. Please try again.';
    }
  });
}

// Attach to every join form on the page.
// Catches both legacy Mailchimp forms (action*="list-manage.com")
// and new signup forms (id contains "signup-form").
const joinForms = new Set([
  ...document.querySelectorAll('form[action*="list-manage.com"]'),
  ...document.querySelectorAll('form[id*="signup-form"]'),
]);
joinForms.forEach(f => initJoinForm(f));

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
