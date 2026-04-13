// chapter-fund.js — all logic for /members/chapter-fund.html

let _user = null;
let _chapters = [], _donations = [], _disbursements = [], _goals = [], _events = [];
let _userChapter = null;

// ── Auth guard ──
netlifyIdentity.on('init', function(user) {
  window.HULoading && window.HULoading.dismiss();
  if (!user) { window.location.href = '/members/login.html'; return; }
  _user = user;
  document.getElementById('nav-email').textContent = user.email;
  initFund();
});
netlifyIdentity.on('logout', function() { window.location.href = '/members/login.html'; });
netlifyIdentity.init({ logo: false });

function signOut() { netlifyIdentity.logout(); }

async function initFund() {
  try {
    const [chapRes, donRes, disbRes, goalsRes, evtRes] = await Promise.all([
      fetch('/data/chapters.json'),
      fetch('/data/donations.json'),
      fetch('/data/disbursements.json'),
      fetch('/data/fund-goals.json'),
      fetch('/data/events.json'),
    ]);
    _chapters    = await chapRes.json();
    _donations   = await donRes.json();
    _disbursements = await disbRes.json();
    _goals       = await goalsRes.json();
    _events      = await evtRes.json();

    // Find user's chapter
    _userChapter = _chapters.find(function(c) {
      return (c.memberEmails || []).includes(_user.email);
    }) || _chapters[0];

    if (!_userChapter) {
      document.getElementById('fund-content').style.display = 'block';
      document.getElementById('fund-title').textContent = 'No chapter found';
      return;
    }

    document.getElementById('fund-title').textContent = _userChapter.name + ', ' + _userChapter.state + ' — Trust Fund';
    document.getElementById('fund-content').style.display = 'block';

    renderGeneralFund();
    renderEventFunds();
    renderDisbursements();
    renderCharts();
  } catch (err) {
    console.error(err);
  }
}

function raisedFor(targetId, category) {
  return _donations
    .filter(function(d) {
      return d.targetId === targetId && (!category || d.category === category);
    })
    .reduce(function(s, d) { return s + (d.amount || 0); }, 0);
}

function goalFor(targetId, type) {
  return _goals.find(function(g) {
    return g.targetId === targetId && g.status === 'active' && (!type || g.type === type);
  });
}

function progressBar(raised, goal) {
  const pct = goal > 0 ? Math.min(100, (raised / goal) * 100).toFixed(1) : 0;
  return '<div class="progress-wrap">' +
    '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
    '<div class="progress-labels"><span>$' + raised.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2}) + ' raised</span>' +
    (goal > 0 ? '<span>Goal: $' + goal.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2}) + '</span>' : '<span>No goal set</span>') +
    '</div></div>';
}

function renderGeneralFund() {
  const raised = raisedFor(_userChapter.id, 'general');
  const goal   = goalFor(_userChapter.id, 'chapter');
  const goalAmt = goal ? goal.goalAmount : 0;

  document.getElementById('general-fund-card').innerHTML =
    '<div class="fund-card-body">' +
      '<div style="display:flex;align-items:baseline;gap:0.75rem;flex-wrap:wrap">' +
        '<span class="fund-amount">$' + raised.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2}) + '</span>' +
        (goal ? '<span class="fund-goal">of $' + goalAmt.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2}) + ' goal</span>' : '<span class="fund-goal" style="color:var(--amber)">No goal set — propose one</span>') +
      '</div>' +
      progressBar(raised, goalAmt) +
      '<div style="display:flex;gap:0.5rem;margin-top:1rem">' +
        '<button class="btn-donate" disabled title="Coming soon — EIN pending">Donate — coming soon</button>' +
      '</div>' +
    '</div>';
}

function renderEventFunds() {
  const container = document.getElementById('event-funds');
  const chapterEvents = _events.filter(function(e) {
    return e.chapterId === _userChapter.id && e.status === 'approved';
  });

  if (!chapterEvents.length) {
    container.innerHTML = '<div class="fund-card"><div class="fund-card-body"><p style="font-size:13px;color:var(--ink-light)">No approved events yet.</p></div></div>';
    return;
  }

  container.innerHTML = chapterEvents.map(function(ev) {
    const raised = raisedFor(ev.id, 'event');
    const goal   = goalFor(ev.id, 'event');
    const goalAmt = goal ? goal.goalAmount : 0;
    return '<div class="fund-card">' +
      '<div class="fund-card-header">' +
        '<span class="fund-card-title">' + ev.title + '</span>' +
        '<span style="font-size:12px;color:var(--ink-light)">' + ev.date + '</span>' +
      '</div>' +
      '<div class="fund-card-body">' +
        '<div style="display:flex;align-items:baseline;gap:0.75rem">' +
          '<span class="fund-amount" style="font-size:1.15rem">$' + raised.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2}) + '</span>' +
          (goal ? '<span class="fund-goal">of $' + goalAmt.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2}) + ' goal</span>' : '<span class="fund-goal" style="color:var(--amber)">No goal set</span>') +
        '</div>' +
        progressBar(raised, goalAmt) +
        '<div style="display:flex;gap:0.5rem;margin-top:0.75rem">' +
          '<button class="btn-donate" disabled title="Coming soon">Donate — coming soon</button>' +
          '<button class="btn-propose" onclick="showProposeGoal(\'event\', \'' + ev.id + '\', \'' + ev.title.replace(/'/g, "\\'") + '\')">+ Goal</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function renderDisbursements() {
  const container = document.getElementById('disbursements-container');
  const active = _disbursements.filter(function(d) {
    return d.chapterId === _userChapter.id && (d.status === 'open' || d.status === 'dialogue');
  });

  if (!active.length) {
    container.innerHTML = '<div class="disb-card"><div style="padding:1.25rem;font-size:13px;color:var(--ink-light)">No active disbursement proposals.</div></div>';
    return;
  }

  container.innerHTML = active.map(function(d) {
    const myResponse = d.responses.find(function(r) { return r.member === _user.email; });
    const consents   = d.responses.filter(function(r) { return r.type === 'consent'; }).length;
    const objections = d.responses.filter(function(r) { return r.type === 'objection'; }).length;
    const daysLeft   = Math.max(0, Math.ceil((new Date(d.windowClosesAt) - new Date()) / (1000*60*60*24)));

    const actionsHtml = myResponse
      ? '<div class="already-responded">You responded: <strong>' + myResponse.type + '</strong></div>'
      : '<div class="disb-actions">' +
          '<button class="btn-consent" onclick="respondDisb(\'' + d.id + '\', \'consent\')">Consent ✓</button>' +
          '<button class="btn-object" onclick="toggleObjForm(\'' + d.id + '\')">Object…</button>' +
        '</div>' +
        '<div class="objection-form" id="obj-form-' + d.id + '">' +
          '<textarea class="objection-textarea" id="obj-text-' + d.id + '" placeholder="Describe your objection…"></textarea>' +
          '<button class="btn-submit-objection" onclick="respondDisb(\'' + d.id + '\', \'objection\')">Submit objection</button>' +
        '</div>';

    return '<div class="disb-card">' +
      '<div class="disb-card-top">' +
        '<div>' +
          '<div class="disb-title">' + d.title + ' <span class="badge-' + d.status + '">' + d.status + '</span></div>' +
          '<div style="font-size:12px;color:var(--ink-light);margin-top:2px">Proposed by ' + d.proposedBy + ' · ' + daysLeft + ' days left</div>' +
        '</div>' +
        '<div class="disb-amount">$' + d.amount.toFixed(2) + '</div>' +
      '</div>' +
      '<div class="disb-card-body">' +
        (d.description ? '<p style="font-size:13px;color:var(--ink-mid);margin-bottom:0.75rem">' + d.description + '</p>' : '') +
        '<div style="font-size:12px;color:var(--ink-light);margin-bottom:0.75rem">✓ ' + consents + ' consent · ✗ ' + objections + ' objection</div>' +
        actionsHtml +
      '</div>' +
    '</div>';
  }).join('');
}

function renderCharts() {
  // Chapter breakdown
  const chapterDonations = _donations.filter(function(d) { return d.chapterId === _userChapter.id; });
  const chapterBreakdown = HUFundChart.computeBreakdown(chapterDonations);
  HUFundChart.render('chapter-chart', { breakdown: chapterBreakdown }, {
    title: _userChapter.name + ' breakdown', showTotal: true, compact: true
  });

  // Network-wide breakdown
  const networkBreakdown = HUFundChart.computeBreakdown(_donations);
  HUFundChart.render('network-chart', { breakdown: networkBreakdown }, {
    title: 'All chapters combined', showTotal: true, compact: true
  });
}

function toggleObjForm(id) {
  var form = document.getElementById('obj-form-' + id);
  form.style.display = form.style.display === 'block' ? 'none' : 'block';
}

async function respondDisb(disbId, type) {
  var reason = '';
  if (type === 'objection') {
    reason = (document.getElementById('obj-text-' + disbId) || {}).value || '';
    if (!reason.trim()) { alert('Please describe your objection.'); return; }
  }
  try {
    const token = await _user.jwt();
    const res = await fetch('/.netlify/functions/respond-to-disbursement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ disbursementId: disbId, member: _user.email, type, reason })
    });
    if (!res.ok) throw new Error((await res.json()).message);
    const data = await res.json();
    // Update local state and re-render
    const idx = _disbursements.findIndex(function(d) { return d.id === disbId; });
    if (idx >= 0) _disbursements[idx] = data.disbursement;
    renderDisbursements();
  } catch (err) { alert('Error: ' + err.message); }
}

function showProposeGoal(type, targetId, targetTitle) {
  const title = prompt('Goal title:');
  if (!title) return;
  const amount = parseFloat(prompt('Goal amount ($):'));
  if (!amount || amount <= 0) return;
  const category = prompt('Category (general/event/project/initiative/administrative):', type === 'event' ? 'event' : 'general');
  if (!category) return;

  netlifyIdentity.currentUser().jwt().then(function(token) {
    return fetch('/.netlify/functions/propose-goal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        chapterId: _userChapter.id, type, targetId: targetId || _userChapter.id,
        title, goalAmount: amount, category, proposedBy: _user.email
      })
    });
  }).then(function(res) {
    if (!res.ok) return res.json().then(function(e) { throw new Error(e.message); });
    return res.json();
  }).then(function(data) {
    alert('Goal proposed! It will go through a 5-day consent round before becoming active.');
    _goals.push(data.goal);
    renderGeneralFund();
    renderEventFunds();
  }).catch(function(err) { alert('Error: ' + err.message); });
}

function showProposeDisbursement() {
  const title = prompt('Disbursement title:');
  if (!title) return;
  const amount = parseFloat(prompt('Amount requested ($):'));
  if (!amount || amount <= 0) return;
  const description = prompt('Description (what is this for?):') || '';

  netlifyIdentity.currentUser().jwt().then(function(token) {
    return fetch('/.netlify/functions/propose-disbursement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        chapterId: _userChapter.id, targetType: 'chapter', targetId: _userChapter.id,
        title, description, amount, proposedBy: _user.email
      })
    });
  }).then(function(res) {
    if (!res.ok) return res.json().then(function(e) { throw new Error(e.message); });
    return res.json();
  }).then(function(data) {
    alert('Disbursement proposed! Chapter members have 5 days to respond.');
    _disbursements.push(data.disbursement);
    renderDisbursements();
  }).catch(function(err) { alert('Error: ' + err.message); });
}
