// Shared nav HTML — injected by each page
const NAV_HTML = `
<nav>
  <div class="wrap nav-inner">
    <a href="index.html" class="nav-logo">Human Unity</a>
    <div class="nav-links">
      <a href="problem.html">The problem</a>
      <a href="framework.html">Framework</a>
      <a href="initiatives.html">Initiatives</a>
      <a href="get-involved.html">Get involved</a>
      <a href="resources.html">Resources</a>
      <a href="vision.html">Vision</a>
      <a href="about.html">About</a>
    </div>
    <div style="display:flex;align-items:center;gap:1rem">
      <a href="members/login.html" id="nav-member-link" style="font-size:14px;color:var(--ink-light);text-decoration:none;font-weight:500;">Member area</a>
      <a href="get-involved.html" class="btn btn-primary btn-sm">Join the project</a>
      <div class="nav-mobile" onclick="this.closest('nav').querySelector('.nav-links').classList.toggle('open')">
        <span></span><span></span><span></span>
      </div>
    </div>
  </div>
</nav>`;

const TICKER_HTML = `
<div class="ticker-wrap">
  <div class="ticker-inner">
    <span class="ticker-item">Heal the commons</span>
    <span class="ticker-item">·</span>
    <span class="ticker-item">Redirect the energy</span>
    <span class="ticker-item">·</span>
    <span class="ticker-item">Build what's missing</span>
    <span class="ticker-item">·</span>
    <span class="ticker-item">Lead from where you are</span>
    <span class="ticker-item">·</span>
    <span class="ticker-item">Trust is infrastructure</span>
    <span class="ticker-item">·</span>
    <span class="ticker-item">Local action scales</span>
    <span class="ticker-item">·</span>
    <span class="ticker-item">Cynicism is a choice — so is construction</span>
    <span class="ticker-item">·</span>
    <span class="ticker-item">Heal the commons</span>
    <span class="ticker-item">·</span>
    <span class="ticker-item">Redirect the energy</span>
    <span class="ticker-item">·</span>
    <span class="ticker-item">Build what's missing</span>
    <span class="ticker-item">·</span>
    <span class="ticker-item">Lead from where you are</span>
    <span class="ticker-item">·</span>
    <span class="ticker-item">Trust is infrastructure</span>
    <span class="ticker-item">·</span>
    <span class="ticker-item">Local action scales</span>
    <span class="ticker-item">·</span>
    <span class="ticker-item">Cynicism is a choice — so is construction</span>
    <span class="ticker-item">·</span>
  </div>
</div>`;

const FOOTER_HTML = `
<footer>
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand">
        <div class="footer-logo">Human Unity</div>
        <p>A framework for redirecting social energy toward collective construction. Not a political party. Not an ideology. A system.</p>
        <div style="margin-top:1.5rem">
          <form id="signup-form-footer" style="display:flex;flex-direction:column;gap:0.5rem;max-width:380px">
            <div style="display:flex;gap:0">
              <input type="email" name="EMAIL" placeholder="Your email" required style="flex:1;padding:11px 16px;font-size:14px;font-family:var(--font-body);border:1px solid rgba(255,255,255,0.15);border-right:none;border-radius:100px 0 0 100px;background:rgba(255,255,255,0.08);color:white;outline:none">
              <button type="submit" style="padding:11px 20px;background:var(--teal);color:white;border:none;border-radius:0 100px 100px 0;font-size:13px;font-weight:500;font-family:var(--font-body);cursor:pointer;white-space:nowrap">Stay informed</button>
            </div>
            <input type="text" name="FNAME" placeholder="First name *" required style="padding:9px 14px;font-size:13px;font-family:var(--font-body);border:1px solid rgba(255,255,255,0.15);border-radius:100px;background:rgba(255,255,255,0.08);color:white;outline:none">
            <div style="display:flex;gap:0.4rem;align-items:center">
              <input type="text" name="BIRTHDAY[month]" placeholder="MM" maxlength="2" pattern="[0-9]*" required style="width:52px;padding:9px 6px;font-size:13px;font-family:var(--font-body);border:1px solid rgba(255,255,255,0.15);border-radius:6px;background:rgba(255,255,255,0.08);color:white;outline:none;text-align:center">
              <span style="color:rgba(255,255,255,0.3);font-size:13px">/</span>
              <input type="text" name="BIRTHDAY[day]" placeholder="DD" maxlength="2" pattern="[0-9]*" required style="width:52px;padding:9px 6px;font-size:13px;font-family:var(--font-body);border:1px solid rgba(255,255,255,0.15);border-radius:6px;background:rgba(255,255,255,0.08);color:white;outline:none;text-align:center">
              <span style="color:rgba(255,255,255,0.3);font-size:13px">/</span>
              <input type="number" name="MMERGE8" placeholder="YYYY" min="1900" max="2025" required style="width:72px;padding:9px 6px;font-size:13px;font-family:var(--font-body);border:1px solid rgba(255,255,255,0.15);border-radius:6px;background:rgba(255,255,255,0.08);color:white;outline:none;text-align:center">
            </div>
            <p style="font-size:11px;color:rgba(255,255,255,0.3);line-height:1.4">Birthday required to protect minors from age-restricted content.</p>
          </form>
        </div>
      </div>
      <div class="footer-col">
        <h5>The work</h5>
        <a href="problem.html">The problem</a>
        <a href="framework.html">The framework</a>
        <a href="initiatives.html">Initiatives</a>
        <a href="vision.html">Vision</a>
      </div>
      <div class="footer-col">
        <h5>Participate</h5>
        <a href="get-involved.html">Get involved</a>
        <a href="get-involved.html#chapters">Find a chapter</a>
        <a href="start-a-chapter.html">Start a chapter</a>
        <a href="get-involved.html#skills">Offer skills</a>
      </div>
      <div class="footer-col">
        <h5>Learn</h5>
        <a href="resources.html">Resources</a>
        <a href="about.html">About</a>
        <a href="about.html#philosophy">Philosophy</a>
        <a href="about.html#faq">FAQ</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2025 Litzenberg &amp; Associates LLC. All rights reserved.</span>
      <div style="display:flex;gap:1.5rem">
        <a href="privacy.html">Privacy</a>
        <a href="sms-terms.html">SMS terms</a>
        <a href="mailto:hello@humanunity.us">Contact</a>
      </div>
    </div>
  </div>
</footer>`;

// Inject into page
document.getElementById('nav-placeholder') && (document.getElementById('nav-placeholder').innerHTML = NAV_HTML);
document.getElementById('ticker-placeholder') && (document.getElementById('ticker-placeholder').innerHTML = TICKER_HTML);
document.getElementById('footer-placeholder') && (document.getElementById('footer-placeholder').innerHTML = FOOTER_HTML);
