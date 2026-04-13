// ── HUMAN UNITY FUND CHART ──
// Reusable pie chart + funding breakdown for all donation pages.
// Usage: HUFundChart.render(containerId, data, options)

window.HUFundChart = (function() {

  const CATEGORIES = {
    projectCosts:       { label: 'Project costs',       color: '#1D9E75' },
    eventCosts:         { label: 'Event costs',          color: '#534AB7' },
    chapterCosts:       { label: 'General chapter costs',color: '#BA7517' },
    initiativeCosts:    { label: 'Initiative costs',     color: '#0C447C' },
    administrativeCosts:{ label: 'Administrative costs', color: '#D85A30' },
  };

  // Draw SVG pie chart
  function drawPie(canvas, segments) {
    const size = canvas.clientWidth || 220;
    const cx = size / 2, cy = size / 2, r = size * 0.38, inner = size * 0.22;
    let angle = -Math.PI / 2;
    const total = segments.reduce((s, seg) => s + seg.value, 0);
    if (total === 0) {
      canvas.innerHTML = `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="#E5E4E0"/>
        <circle cx="${cx}" cy="${cy}" r="${inner}" fill="white"/>
        <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="12" fill="#888780">No data yet</text>
      </svg>`;
      return;
    }

    let paths = '';
    for (const seg of segments) {
      const slice = (seg.value / total) * 2 * Math.PI;
      const x1 = cx + r * Math.cos(angle);
      const y1 = cy + r * Math.sin(angle);
      const x2 = cx + r * Math.cos(angle + slice);
      const y2 = cy + r * Math.sin(angle + slice);
      const xi1 = cx + inner * Math.cos(angle);
      const yi1 = cy + inner * Math.sin(angle);
      const xi2 = cx + inner * Math.cos(angle + slice);
      const yi2 = cy + inner * Math.sin(angle + slice);
      const large = slice > Math.PI ? 1 : 0;
      paths += `<path d="M${xi1} ${yi1} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} L${xi2} ${yi2} A${inner} ${inner} 0 ${large} 0 ${xi1} ${yi1} Z" fill="${seg.color}" opacity="0.9"/>`;
      angle += slice;
    }

    canvas.innerHTML = `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">${paths}</svg>`;
  }

  // Render full chart widget into a container element
  function render(containerId, data, options) {
    const container = document.getElementById(containerId);
    if (!container) return;

    options = options || {};
    const title      = options.title      || 'Fund breakdown';
    const totalLabel = options.totalLabel || 'Total raised';
    const showTotal  = options.showTotal  !== false;
    const compact    = options.compact    || false;

    // Build segments from data.breakdown
    const breakdown = data.breakdown || {};
    const total = Object.values(breakdown).reduce((s, v) => s + (v || 0), 0);
    const segments = Object.entries(CATEGORIES)
      .map(([key, meta]) => ({ key, label: meta.label, color: meta.color, value: breakdown[key] || 0 }))
      .filter(s => s.value > 0);

    // Legend HTML
    const legendItems = Object.entries(CATEGORIES).map(([key, meta]) => {
      const val = breakdown[key] || 0;
      const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0;border-bottom:0.5px solid var(--border)">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:10px;height:10px;border-radius:2px;background:${meta.color};flex-shrink:0"></div>
            <span style="font-size:13px;color:var(--ink-mid)">${meta.label}</span>
          </div>
          <span style="font-size:13px;font-weight:600;color:var(--ink)">${pct}%</span>
        </div>`;
    }).join('');

    const totalHtml = showTotal ? `
      <div style="margin-top:1rem;padding-top:0.75rem;border-top:0.5px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:13px;font-weight:600;color:var(--ink)">${totalLabel}</span>
        <span style="font-size:15px;font-weight:700;color:var(--teal)">$${total.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
      </div>` : '';

    container.innerHTML = `
      <div style="display:${compact ? 'flex' : 'grid'};${compact ? 'gap:1.5rem;align-items:center' : 'grid-template-columns:1fr 1fr;gap:2rem;align-items:start'}">
        <div>
          <div id="${containerId}-pie" style="width:100%;max-width:220px;margin:0 auto"></div>
        </div>
        <div>
          <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-light);margin-bottom:0.75rem">${title}</p>
          ${legendItems}
          ${totalHtml}
        </div>
      </div>`;

    drawPie(document.getElementById(containerId + '-pie'), segments);
  }

  // Compute breakdown from live donations array
  function computeBreakdown(donations, filter) {
    const breakdown = { projectCosts:0, eventCosts:0, chapterCosts:0, initiativeCosts:0, administrativeCosts:0 };
    const filtered = filter ? donations.filter(filter) : donations;
    for (const d of filtered) {
      const key = {
        project:        'projectCosts',
        event:          'eventCosts',
        general:        'chapterCosts',
        initiative:     'initiativeCosts',
        administrative: 'administrativeCosts',
      }[d.category];
      if (key) breakdown[key] += d.amount || 0;
    }
    return breakdown;
  }

  return { render, computeBreakdown, CATEGORIES };
})();
