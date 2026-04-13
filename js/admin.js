let _user = null;
  let _chapters = [], _chapSha = null;
  let _events = [],   _evtSha  = null;
  let _proposals = [], _propSha = null;

  // ── Auth + role guard ──
  netlifyIdentity.on('init', async user => {
    window.HULoading && window.HULoading.dismiss();
    if (!user) { window.location.href = '/members/login.html'; return; }
    const roles = user.app_metadata?.roles || [];
    if (!roles.includes('admin')) {
      document.getElementById('access-denied').style.display = 'block';
      return;
    }
    _user = user;
    document.getElementById('admin-wrap').style.display = 'block';
    await loadAll();
  });
  netlifyIdentity.on('logout', () => { window.location.href = '/members/login.html'; });
  netlifyIdentity.init();

  // ── Tabs ──
  function switchTab(tab, btn) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + tab).classList.add('active');
  }

  // ── Load all data ──
  async function loadAll() {
    const [cRes, eRes, pRes] = await Promise.all([
      fetch('/data/chapters.json'),
      fetch('/data/events.json'),
      fetch('/data/proposals.json'),
    ]);
    _chapters  = await cRes.json();
    _events    = await eRes.json();
    _proposals = await pRes.json();

    renderChaptersList();
    renderEventsList();
    renderProposalsList();
    renderMemberRosters();
    populateChapterSelects();
  }

  // ── Render chapters list ──
  function renderChaptersList() {
    const el = document.getElementById('chapters-list');
    if (!_chapters.length) {
      el.innerHTML = '<div style="padding:1.5rem;color:var(--ink-light);font-size:14px">No chapters yet.</div>';
      return;
    }
    el.innerHTML = _chapters.map(c => `
      <div class="list-item">
        <div>
          <div class="list-item-title">${c.name}, ${c.state} <span class="badge badge-${c.status}">${c.status}</span></div>
          <div class="list-item-meta">${c.members} member${c.members !== 1 ? 's' : ''} · Founded ${c.founded || '—'} · ${(c.focus || []).join(', ')}</div>
          <div class="list-item-meta" style="margin-top:3px">${c.lat}, ${c.lng}</div>
        </div>
        <div class="list-item-actions">
          <button class="btn-danger" onclick="deleteChapter('${c.id}')">Delete</button>
        </div>
      </div>`).join('');
  }

  // ── Render events list ──
  function renderEventsList() {
    const el = document.getElementById('events-list');
    const upcoming = _events
      .filter(e => new Date(e.date) >= new Date())
      .sort((a,b) => new Date(a.date) - new Date(b.date));
    if (!upcoming.length) {
      el.innerHTML = '<div style="padding:1.5rem;color:var(--ink-light);font-size:14px">No upcoming events.</div>';
      return;
    }
    el.innerHTML = upcoming.map(e => {
      const ch = _chapters.find(c => c.id === e.chapterId);
      return `
        <div class="list-item">
          <div>
            <div class="list-item-title">${e.title} <span class="badge badge-${e.status}">${e.status}</span></div>
            <div class="list-item-meta">${ch ? `${ch.name}, ${ch.state}` : e.chapterId} · ${e.date} · ${e.time}</div>
            <div class="list-item-meta">${e.location}</div>
          </div>
          <div class="list-item-actions">
            <button class="btn-danger" onclick="deleteEvent('${e.id}')">Delete</button>
          </div>
        </div>`;
    }).join('');
  }

  // ── Render proposals list ──
  function renderProposalsList() {
    const el = document.getElementById('proposals-list');
    if (!_proposals.length) {
      el.innerHTML = '<div style="padding:1.5rem;color:var(--ink-light);font-size:14px">No proposals yet.</div>';
      return;
    }
    const statusClass = { open:'badge-open', dialogue:'badge-dialogue', approved:'badge-approved' };
    el.innerHTML = _proposals.map(p => {
      const ch = _chapters.find(c => c.id === p.chapterId);
      return `
        <div class="list-item">
          <div>
            <div class="list-item-title">${p.title} <span class="badge ${statusClass[p.status] || ''}">${p.status}</span></div>
            <div class="list-item-meta">${ch ? `${ch.name}, ${ch.state}` : p.chapterId} · by ${p.proposedBy}</div>
            <div class="list-item-meta">${p.proposedDate} · ${p.responses.length} response${p.responses.length !== 1 ? 's' : ''} · Window closes ${new Date(p.windowClosesAt).toLocaleDateString()}</div>
          </div>
          <div class="list-item-actions">
            ${p.status === 'open' ? `<button class="btn-edit" onclick="forceApprove('${p.id}')">Force approve</button>` : ''}
            <button class="btn-danger" onclick="deleteProposal('${p.id}')">Delete</button>
          </div>
        </div>`;
    }).join('');
  }

  // ── Render member rosters ──
  function renderMemberRosters() {
    const el = document.getElementById('member-rosters');
    if (!_chapters.length) {
      el.innerHTML = '<div style="color:var(--ink-light);font-size:14px">No chapters yet.</div>';
      return;
    }
    el.innerHTML = _chapters.map(c => `
      <div class="admin-card" style="margin-bottom:1rem">
        <div class="admin-card-header">
          <span class="admin-card-title">${c.name}, ${c.state}</span>
          <span class="admin-card-meta">${(c.memberEmails || []).length} email${(c.memberEmails||[]).length !== 1 ? 's' : ''}</span>
        </div>
        <div class="admin-card-body">
          <div class="field-group" style="margin-bottom:0.75rem">
            <label class="field-label">Member emails — one per line</label>
            <textarea class="field-textarea" id="roster-${c.id}" style="min-height:100px;font-size:13px">${(c.memberEmails || []).join('\n')}</textarea>
          </div>
          <button class="btn-save" onclick="saveRoster('${c.id}', this)">Save roster →</button>
        </div>
      </div>`).join('');
  }

  // ── Populate chapter selects ──
  function populateChapterSelects() {
    const sel = document.getElementById('ev-chapter');
    sel.innerHTML = _chapters.map(c =>
      `<option value="${c.id}">${c.name}, ${c.state}</option>`
    ).join('');
  }

  // ── GitHub write via admin function ──
  async function adminWrite(file, content, message) {
    const token = await _user.jwt();
    const res = await fetch('/.netlify/functions/admin-write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify({ file, content, message }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Write failed');
    }
    return res.json();
  }

  function showMsg(id, text, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'save-msg ' + type;
  }

  function setBtnLoading(btn, loading) {
    btn.disabled = loading;
    btn.classList.toggle('loading', loading);
  }

  // ── Save chapter ──
  async function saveChapter(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-chapter');
    setBtnLoading(btn, true);

    const name    = document.getElementById('ch-name').value.trim();
    const state   = document.getElementById('ch-state').value.trim().toUpperCase();
    const lat     = parseFloat(document.getElementById('ch-lat').value);
    const lng     = parseFloat(document.getElementById('ch-lng').value);
    const ethos   = document.getElementById('ch-ethos').value.trim();
    const focus   = document.getElementById('ch-focus').value.split(',').map(s => s.trim()).filter(Boolean);
    const status  = document.getElementById('ch-status').value;
    const founded = document.getElementById('ch-founded').value || new Date().toISOString().split('T')[0];

    const id = `${name.toLowerCase().replace(/\s+/g, '-')}-${state.toLowerCase()}`;
    if (_chapters.find(c => c.id === id)) {
      showMsg('msg-chapter', `Chapter "${name}, ${state}" already exists.`, 'error');
      setBtnLoading(btn, false);
      return;
    }

    const newChapter = { id, name, state, lat, lng, status, founded, ethos, focus, members: 0, memberEmails: [] };
    const updated = [..._chapters, newChapter];

    try {
      await adminWrite('data/chapters.json', updated, `Add chapter: ${name}, ${state}`);
      _chapters = updated;
      renderChaptersList();
      renderMemberRosters();
      populateChapterSelects();
      e.target.reset();
      showMsg('msg-chapter', `✓ Chapter "${name}, ${state}" added.`, 'success');
    } catch (err) {
      showMsg('msg-chapter', err.message, 'error');
    }
    setBtnLoading(btn, false);
  }

  // ── Delete chapter ──
  async function deleteChapter(id) {
    const ch = _chapters.find(c => c.id === id);
    if (!confirm(`Delete chapter "${ch?.name}"? This cannot be undone.`)) return;
    const updated = _chapters.filter(c => c.id !== id);
    try {
      await adminWrite('data/chapters.json', updated, `Delete chapter: ${id}`);
      _chapters = updated;
      renderChaptersList();
      renderMemberRosters();
      populateChapterSelects();
    } catch (err) { alert(err.message); }
  }

  // ── Save event ──
  async function saveEvent(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-event');
    setBtnLoading(btn, true);

    const chapterId = document.getElementById('ev-chapter').value;
    const title     = document.getElementById('ev-title').value.trim();
    const desc      = document.getElementById('ev-desc').value.trim();
    const date      = document.getElementById('ev-date').value;
    const rawTime   = document.getElementById('ev-time').value;
    const status    = document.getElementById('ev-status').value;
    const location  = document.getElementById('ev-location').value.trim();

    const [h, m] = rawTime.split(':');
    const hour = parseInt(h);
    const time = `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;

    const newEvent = {
      id: `evt-${Date.now()}`,
      chapterId, title, description: desc, date, time, location, status,
      proposedBy: _user.email,
      approvedAt: new Date().toISOString(),
    };

    const updated = [..._events, newEvent];
    try {
      await adminWrite('data/events.json', updated, `Add event: "${title}"`);
      _events = updated;
      renderEventsList();
      e.target.reset();
      showMsg('msg-event', `✓ Event "${title}" added.`, 'success');
    } catch (err) {
      showMsg('msg-event', err.message, 'error');
    }
    setBtnLoading(btn, false);
  }

  // ── Delete event ──
  async function deleteEvent(id) {
    const ev = _events.find(e => e.id === id);
    if (!confirm(`Delete event "${ev?.title}"?`)) return;
    const updated = _events.filter(e => e.id !== id);
    try {
      await adminWrite('data/events.json', updated, `Delete event: ${id}`);
      _events = updated;
      renderEventsList();
    } catch (err) { alert(err.message); }
  }

  // ── Delete proposal ──
  async function deleteProposal(id) {
    const p = _proposals.find(x => x.id === id);
    if (!confirm(`Delete proposal "${p?.title}"?`)) return;
    const updated = _proposals.filter(x => x.id !== id);
    try {
      await adminWrite('data/proposals.json', updated, `Delete proposal: ${id}`);
      _proposals = updated;
      renderProposalsList();
    } catch (err) { alert(err.message); }
  }

  // ── Force approve proposal ──
  async function forceApprove(id) {
    const p = _proposals.find(x => x.id === id);
    if (!confirm(`Force-approve "${p?.title}" and publish to events?`)) return;

    p.status = 'approved';
    const newEvent = {
      id: `evt-${Date.now()}`,
      chapterId: p.chapterId, title: p.title, description: p.description,
      date: p.proposedDate, time: p.proposedTime, location: p.location,
      status: 'approved', proposedBy: p.proposedBy,
      approvedAt: new Date().toISOString(), fromProposalId: p.id,
    };
    const updatedEvents = [..._events, newEvent];

    try {
      await Promise.all([
        adminWrite('data/proposals.json', _proposals, `Admin force-approve: ${id}`),
        adminWrite('data/events.json', updatedEvents, `Force-approved event: "${p.title}"`),
      ]);
      _events = updatedEvents;
      renderProposalsList();
      renderEventsList();
    } catch (err) { alert(err.message); }
  }

  // ── Save member roster ──
  async function saveRoster(chapterId, btn) {
    setBtnLoading(btn, true);
    const raw = document.getElementById('roster-' + chapterId).value;
    const emails = raw.split('\n').map(s => s.trim()).filter(s => s.includes('@'));
    const updated = _chapters.map(c =>
      c.id === chapterId ? { ...c, memberEmails: emails, members: emails.length } : c
    );
    try {
      await adminWrite('data/chapters.json', updated, `Update member roster: ${chapterId}`);
      _chapters = updated;
          renderMemberRosters();
      showMsg('msg-roster-' + chapterId, '✓ Roster saved.', 'success');
    } catch (err) {
      showMsg('msg-roster-' + chapterId, err.message, 'error');
    }
    setBtnLoading(btn, false);
  }
