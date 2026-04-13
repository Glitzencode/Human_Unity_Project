// giving.js — all logic for /members/giving.html

var _user = null;
var _chapters = [], _donations = [], _events = [], _dues = [], _goals = [];

netlifyIdentity.on('init', function(user) {
  window.HULoading && window.HULoading.dismiss();
  if (!user) { window.location.href = '/members/login.html'; return; }
  _user = user;
  document.getElementById('nav-email').textContent = user.email;
  initGiving();
});
netlifyIdentity.on('logout', function() { window.location.href = '/members/login.html'; });
netlifyIdentity.init({ logo: false });

function signOut() { netlifyIdentity.logout(); }

async function initGiving() {
  try {
    const [chapRes, donRes, evtRes, duesRes, goalsRes] = await Promise.all([
      fetch('/data/chapters.json'),
      fetch('/data/donations.json'),
      fetch('/data/events.json'),
      fetch('/data/dues.json'),
      fetch('/data/fund-goals.json'),
    ]);
    _chapters = await chapRes.json();
    _donations = await donRes.json();
    _events    = await evtRes.json();
    _dues      = await duesRes.json();
    _goals     = await goalsRes.json();

    document.getElementById('giving-content').style.display = 'block';

    renderTargets();
    renderDues();
    renderHistory();
    renderStats();
    renderCharts();
  } catch (err) { console.error(err); }
}

function myDonations() {
  return _donations.filter(function(d) { return d.donorEmail === _user.email; });
}

function raisedFor(targetId) {
  return _donations.filter(function(d) { return d.targetId === targetId; })
    .reduce(function(s, d) { return s + (d.amount || 0); }, 0);
}

function goalFor(targetId) {
  return _goals.find(function(g) { return g.targetId === targetId && g.status === 'active'; });
}

function renderTargets() {
  const container = document.getElementById('giving-targets');
  const myChapters = _chapters.filter(function(c) {
    return (c.memberEmails || []).includes(_user.email);
  });
  const myEvents = _events.filter(function(e) {
    return myChapters.some(function(c) { return c.id === e.chapterId; }) && e.status === 'approved';
  });

  if (!myChapters.length) {
    container.innerHTML = '<div class="empty-state"><p>You are not yet a member of any chapter.</p></div>';
    return;
  }

  var html = '';

  myChapters.forEach(function(c) {
    const raised = raisedFor(c.id);
    const goal   = goalFor(c.id);
    const goalAmt = goal ? goal.goalAmount : 0;
    const pct = goalAmt > 0 ? Math.min(100, (raised / goalAmt) * 100).toFixed(1) : 0;
    html += '<div class="give-card">' +
      '<div class="give-card-header">' +
        '<div style="display:flex;align-items:center;gap:0.5rem">' +
          '<span class="give-tag give-tag-chapter">Chapter</span>' +
          '<span class="give-card-title">' + c.name + ', ' + c.state + '</span>' +
        '</div>' +
        '<button class="btn-donate" disabled title="Coming soon">Donate</button>' +
      '</div>' +
      '<div class="give-card-body">' +
        '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-mid)">' +
          '<span>$' + raised.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' raised</span>' +
          (goalAmt > 0 ? '<span>Goal: $' + goalAmt.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) + '</span>' : '<span style="color:var(--amber)">No goal set</span>') +
        '</div>' +
        '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
      '</div>' +
    '</div>';
  });

  myEvents.forEach(function(ev) {
    const raised = raisedFor(ev.id);
    const goal   = goalFor(ev.id);
    const goalAmt = goal ? goal.goalAmount : 0;
    const pct = goalAmt > 0 ? Math.min(100, (raised / goalAmt) * 100).toFixed(1) : 0;
    html += '<div class="give-card">' +
      '<div class="give-card-header">' +
        '<div style="display:flex;align-items:center;gap:0.5rem">' +
          '<span class="give-tag give-tag-event">Event</span>' +
          '<span class="give-card-title">' + ev.title + '</span>' +
        '</div>' +
        '<button class="btn-donate" disabled title="Coming soon">Donate</button>' +
      '</div>' +
      '<div class="give-card-body">' +
        '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--ink-mid)">' +
          '<span>$' + raised.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' raised</span>' +
          '<span style="color:var(--ink-light)">' + ev.date + '</span>' +
        '</div>' +
        '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '" style="background:var(--purple)"></div></div>' +
      '</div>' +
    '</div>';
  });

  container.innerHTML = html;
}

function renderDues() {
  const container = document.getElementById('dues-container');
  const myChapters = _chapters.filter(function(c) {
    return (c.memberEmails || []).includes(_user.email);
  });

  if (!myChapters.length) {
    container.innerHTML = '<div class="give-card"><div class="give-card-body"><p style="font-size:13px;color:var(--ink-light)">No chapter dues configured.</p></div></div>';
    return;
  }

  container.innerHTML = myChapters.map(function(c) {
    const chapterDues = _dues.find(function(d) { return d.chapterId === c.id; });
    const active = chapterDues && chapterDues.active;
    const amount = chapterDues && chapterDues.amount > 0 ? '$' + chapterDues.amount.toFixed(2) + '/' + (chapterDues.frequency || 'month') : 'Amount TBD';

    // Check if member has paid dues this period
    const myRecord = chapterDues && (chapterDues.records || []).find(function(r) {
      return r.email === _user.email;
    });

    return '<div class="give-card">' +
      '<div class="give-card-header">' +
        '<div style="display:flex;align-items:center;gap:0.5rem">' +
          '<span class="' + (active ? 'dues-badge-active' : 'dues-badge-inactive') + '">' + (active ? 'Active' : 'Inactive') + '</span>' +
          '<span class="give-card-title">' + c.name + ', ' + c.state + '</span>' +
        '</div>' +
        (active ? '<span style="font-size:13px;font-weight:600;color:var(--ink)">' + amount + '</span>' : '') +
      '</div>' +
      '<div class="give-card-body">' +
        (active
          ? '<div style="display:flex;align-items:center;justify-content:space-between">' +
              '<span style="font-size:13px;color:var(--ink-mid)">Status: ' + (myRecord ? '<strong style="color:var(--teal)">Paid</strong>' : '<strong style="color:var(--amber)">Unpaid</strong>') + '</span>' +
              '<button class="btn-donate" disabled title="Coming soon">Pay dues</button>' +
            '</div>'
          : '<p style="font-size:13px;color:var(--ink-light)">This chapter has not enabled dues.</p>'
        ) +
      '</div>' +
    '</div>';
  }).join('');
}

function renderHistory() {
  const container = document.getElementById('history-container');
  const mine = myDonations().sort(function(a, b) { return new Date(b.recordedAt) - new Date(a.recordedAt); });

  if (!mine.length) {
    container.innerHTML = '<div class="empty-state" style="padding:1.5rem"><p style="font-size:13px;color:var(--ink-light)">No donations recorded yet.</p></div>';
    return;
  }

  container.innerHTML = mine.map(function(d) {
    const date = new Date(d.recordedAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    const target = _chapters.find(function(c) { return c.id === d.targetId; });
    const targetLabel = target ? target.name + ', ' + target.state : d.targetId;
    return '<div class="history-row">' +
      '<div>' +
        '<div style="font-weight:500;color:var(--ink)">' + targetLabel + '</div>' +
        '<div style="font-size:12px;color:var(--ink-light)">' + date + ' · ' + d.category + '</div>' +
      '</div>' +
      '<div style="font-weight:700;color:var(--teal)">$' + d.amount.toFixed(2) + '</div>' +
    '</div>';
  }).join('');
}

function renderStats() {
  const mine = myDonations();
  const currentYear = new Date().getFullYear();
  const lifetime = mine.reduce(function(s, d) { return s + (d.amount || 0); }, 0);
  const fiscal   = mine.filter(function(d) { return d.fiscalYear === currentYear; })
                       .reduce(function(s, d) { return s + (d.amount || 0); }, 0);

  document.getElementById('total-lifetime').textContent = '$' + lifetime.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
  document.getElementById('total-fiscal').textContent   = '$' + fiscal.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
}

function renderCharts() {
  const mine = myDonations();
  HUFundChart.render('my-giving-chart', { breakdown: HUFundChart.computeBreakdown(mine) }, {
    title: 'My giving by category', showTotal: true, compact: true
  });
  HUFundChart.render('network-giving-chart', { breakdown: HUFundChart.computeBreakdown(_donations) }, {
    title: 'Network-wide', showTotal: true, compact: true
  });
}
