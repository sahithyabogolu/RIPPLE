/**
 * RIPPLE — Core Engine & UI Logic
 * Production-ready, client-side financial reconciliation engine.
 */

(function () {
  'use strict';

  // --- STATE MANAGEMENT ---
  const STATE = {
    records: [],
    resolved: [],
    exceptions: [],
    currency: 'INR',
    ninjaMode: false,
    operatorName: '',
    visibilityMode: 'private', // 'private' = sessionStorage, 'public' = localStorage
    simSliders: {
      collectionDelay: 0,
      emergencyExpense: 0,
      vendorDeferral: 0
    }
  };

  const CURRENCY_SYMBOLS = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    AED: 'د.إ '
  };

  // --- DOM ELEMENTS ---
  const DOM = {
    currencySelect: document.getElementById('currency-select'),
    ninjaToggleBtn: document.getElementById('ninja-toggle-btn'),
    ninjaBtnText: document.getElementById('ninja-btn-text'),
    settingsTriggerBtn: document.getElementById('settings-trigger-btn'),
    settingsModal: document.getElementById('settings-modal'),
    closeSettingsBtn: document.getElementById('close-settings-btn'),
    userNameInput: document.getElementById('user-name-input'),
    workspaceVisibility: document.getElementById('workspace-visibility'),
    factoryResetBtn: document.getElementById('factory-reset-btn'),
    fileInput: document.getElementById('file-input'),
    dropZone: document.getElementById('drop-zone'),
    loadDemoBtn: document.getElementById('load-demo-btn'),
    fileStatusText: document.getElementById('file-status-text'),
    fileStatusIcon: document.getElementById('file-status-icon'),
    storageTypeBadge: document.getElementById('storage-type-badge'),
    
    // Metrics
    metricCash: document.getElementById('metric-cash'),
    metricInflows: document.getElementById('metric-inflows'),
    metricOutflows: document.getElementById('metric-outflows'),
    metricRunway: document.getElementById('metric-runway'),
    metricRunwayStatus: document.getElementById('metric-runway-status'),
    
    // Summary
    statProcessed: document.getElementById('stat-processed'),
    statResolved: document.getElementById('stat-resolved'),
    statExceptions: document.getElementById('stat-exceptions'),
    matchRateBadge: document.getElementById('match-rate-badge'),
    monthlyBreakdownList: document.getElementById('monthly-breakdown-list'),
    
    // Tables
    exceptionsTbody: document.getElementById('exceptions-tbody'),
    registerTbody: document.getElementById('register-tbody'),
    registerSearch: document.getElementById('register-search'),
    registerFilter: document.getElementById('register-filter'),

    // Simulator
    sliderCollection: document.getElementById('slider-collection'),
    sliderEmergency: document.getElementById('slider-emergency'),
    sliderVendor: document.getElementById('slider-vendor'),
    valCollection: document.getElementById('val-collection'),
    valEmergency: document.getElementById('val-emergency'),
    valVendor: document.getElementById('val-vendor'),
    simProjectedCash: document.getElementById('sim-projected-cash'),
    simImpactNote: document.getElementById('sim-impact-note'),
    resetSimBtn: document.getElementById('reset-sim-btn'),

    // Exports
    exportPdfBtn: document.getElementById('export-pdf-btn'),
    exportCsvBtn: document.getElementById('export-csv-btn')
  };

  // --- INITIALIZATION ---
  function init() {
    loadSettings();
    setupEventListeners();
    renderCurrency();
  }

  // --- STORAGE MANAGEMENT ---
  function getStorage() {
    return STATE.visibilityMode === 'public' ? localStorage : sessionStorage;
  }

  function loadSettings() {
    const savedName = localStorage.getItem('ripple_operator_name') || sessionStorage.getItem('ripple_operator_name');
    const savedVis = localStorage.getItem('ripple_visibility') || 'private';
    
    STATE.operatorName = savedName || '';
    STATE.visibilityMode = savedVis;
    
    DOM.userNameInput.value = STATE.operatorName;
    DOM.workspaceVisibility.value = STATE.visibilityMode;
    updateStorageBadge();
  }

  function saveSettings() {
    STATE.operatorName = DOM.userNameInput.value.trim();
    STATE.visibilityMode = DOM.workspaceVisibility.value;

    localStorage.removeItem('ripple_operator_name');
    sessionStorage.removeItem('ripple_operator_name');
    
    getStorage().setItem('ripple_operator_name', STATE.operatorName);
    localStorage.setItem('ripple_visibility', STATE.visibilityMode);

    updateStorageBadge();
  }

  function updateStorageBadge() {
    if (STATE.visibilityMode === 'private') {
      DOM.storageTypeBadge.textContent = 'Private Workspace (Session)';
      DOM.storageTypeBadge.style.color = 'var(--accent-cyan)';
    } else {
      DOM.storageTypeBadge.textContent = 'Local Workspace (Persistent)';
      DOM.storageTypeBadge.style.color = 'var(--accent-amber)';
    }
  }

  function factoryReset() {
    localStorage.clear();
    sessionStorage.clear();
    STATE.records = [];
    STATE.resolved = [];
    STATE.exceptions = [];
    STATE.operatorName = '';
    STATE.visibilityMode = 'private';
    DOM.userNameInput.value = '';
    DOM.workspaceVisibility.value = 'private';
    DOM.fileStatusIcon.textContent = '◌';
    DOM.fileStatusText.textContent = 'No file selected';
    resetSimulator();
    renderAll();
    DOM.settingsModal.classList.add('hidden');
  }

  // --- SYNTHETIC DATA GENERATOR ---
  function generateSyntheticDataset() {
    const categories = ['Client Payment', 'Vendor Invoice', 'Payroll', 'Software SaaS', 'Office Logistics', 'Tax Reserve'];
    const records = [];
    const baseDate = new Date();
    
    for (let i = 1; i <= 55; i++) {
      const isOutflow = i % 3 === 0;
      const type = isOutflow ? 'outflow' : 'inflow';
      const category = categories[Math.floor(Math.random() * categories.length)];
      const amount = Math.floor(Math.random() * 4500) + 150;
      
      const dateObj = new Date(baseDate);
      dateObj.setDate(baseDate.getDate() - (i % 60));
      const dateStr = dateObj.toISOString().split('T')[0];

      records.push({
        row: i,
        date: dateStr,
        reference: `REF-${1000 + i}`,
        category: category,
        type: type,
        amount: amount,
        status: 'UNPROCESSED'
      });
    }

    // Seed specific rule violations (Dirty Records)
    records[4].reference = records[2].reference; // Duplicate Reference
    records[11].amount = -500; // Mismatched / Negative Amount
    records[18].reference = ''; // Missing Reference
    records[25].date = '2035-12-31'; // Out of Range Date
    records[32].category = ''; // Unclassified Category
    records[41].reference = records[10].reference; // Another Duplicate

    return records;
  }

  // --- DETERMINISTIC RECONCILIATION ENGINE ---
  function reconcileRecords(rawRecords) {
    const resolved = [];
    const exceptions = [];
    const seenRefs = new Map();
    const currentDate = new Date();

    rawRecords.forEach((record) => {
      const rec = { ...record };
      const issues = [];

      // Rule 1: Missing Reference Check
      if (!rec.reference || rec.reference.trim() === '') {
        issues.push('Missing reference ID');
      }

      // Rule 2: Amount Integrity Check
      if (typeof rec.amount !== 'number' || isNaN(rec.amount) || rec.amount <= 0) {
        issues.push('Invalid or negative amount vs ledger rules');
      }

      // Rule 3: Unclassified Category Check
      if (!rec.category || rec.category.trim() === '') {
        issues.push('Unclassified category field');
      }

      // Rule 4: Date Range Validation
      if (rec.date) {
        const recDate = new Date(rec.date);
        if (isNaN(recDate.getTime()) || recDate > currentDate) {
          issues.push('Out-of-range or future transaction date');
        }
      } else {
        issues.push('Missing transaction date');
      }

      // Rule 5: Duplicate Reference Check
      if (rec.reference && rec.reference.trim() !== '') {
        if (seenRefs.has(rec.reference)) {
          issues.push(`Duplicate reference ID (conflicts with Row ${seenRefs.get(rec.reference)})`);
        } else {
          seenRefs.set(rec.reference, rec.row);
        }
      }

      // Final Verdict Logic (Deterministic)
      if (issues.length === 0) {
        rec.status = 'RESOLVED';
        resolved.push(rec);
      } else {
        rec.status = 'EXCEPTION';
        rec.issueReason = issues.join('; ');
        exceptions.push(rec);
      }
    });

    return { resolved, exceptions };
  }

  // --- PARSER (CSV / Text Ingestion) ---
  function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const records = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.length < headers.length) continue;

      const rowObj = {
        row: i,
        date: cols[0] || '',
        reference: cols[1] || '',
        category: cols[2] || '',
        type: (cols[3] || 'inflow').toLowerCase().includes('out') ? 'outflow' : 'inflow',
        amount: parseFloat(cols[4]) || 0,
        status: 'UNPROCESSED'
      };
      records.push(rowObj);
    }
    return records;
  }

  // --- FORMATTING HELPERS ---
  function formatMoney(num) {
    const sym = CURRENCY_SYMBOLS[STATE.currency] || '₹';
    const formatted = Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${num < 0 ? '-' : ''}${sym}${formatted}`;
  }

  // --- RENDERING FUNCTIONS ---
  function renderAll() {
    renderMetrics();
    renderSummary();
    renderExceptionsTable();
    renderRegisterTable();
    renderSimulator();
  }

  function renderCurrency() {
    DOM.currencySelect.value = STATE.currency;
    renderAll();
  }

  function renderMetrics() {
    const totalInflows = STATE.resolved
      .filter(r => r.type === 'inflow')
      .reduce((sum, r) => sum + r.amount, 0);

    const totalOutflows = STATE.resolved
      .filter(r => r.type === 'outflow')
      .reduce((sum, r) => sum + r.amount, 0);

    const netCash = totalInflows - totalOutflows;

    DOM.metricInflows.textContent = formatMoney(totalInflows);
    DOM.metricOutflows.textContent = formatMoney(totalOutflows);
    DOM.metricCash.textContent = formatMoney(netCash);

    // Runway calculation (30-day window based on clean resolved outflows)
    const dailyBurn = totalOutflows / 30;
    if (dailyBurn > 0 && netCash > 0) {
      const days = Math.floor(netCash / dailyBurn);
      DOM.metricRunway.textContent = `${days} Days`;
      if (days < 15) {
        DOM.metricRunwayStatus.textContent = 'Status: Critical';
        DOM.metricRunwayStatus.style.color = 'var(--accent-red)';
      } else if (days < 30) {
        DOM.metricRunwayStatus.textContent = 'Status: Warning';
        DOM.metricRunwayStatus.style.color = 'var(--accent-amber)';
      } else {
        DOM.metricRunwayStatus.textContent = 'Status: Healthy';
        DOM.metricRunwayStatus.style.color = 'var(--accent-green)';
      }
    } else {
      DOM.metricRunway.textContent = netCash <= 0 ? '0 Days' : '∞ Days';
      DOM.metricRunwayStatus.textContent = netCash <= 0 ? 'Status: Critical Insolvency' : 'Status: Zero Outflows';
      DOM.metricRunwayStatus.style.color = netCash <= 0 ? 'var(--accent-red)' : 'var(--text-muted)';
    }
  }

  function renderSummary() {
    const total = STATE.records.length;
    const resolvedCount = STATE.resolved.length;
    const exceptionCount = STATE.exceptions.length;
    const matchRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;

    DOM.statProcessed.textContent = total;
    DOM.statResolved.textContent = resolvedCount;
    DOM.statExceptions.textContent = exceptionCount;
    DOM.matchRateBadge.textContent = `${matchRate}% Matched`;

    // Monthly breakdown
    const monthlyMap = {};
    STATE.resolved.forEach(r => {
      const month = r.date ? r.date.substring(0, 7) : 'Unknown';
      if (!monthlyMap[month]) monthlyMap[month] = { inflow: 0, outflow: 0 };
      if (r.type === 'inflow') monthlyMap[month].inflow += r.amount;
      else monthlyMap[month].outflow += r.amount;
    });

    DOM.monthlyBreakdownList.innerHTML = '';
    const months = Object.keys(monthlyMap).sort().reverse();
    
    if (months.length === 0) {
      DOM.monthlyBreakdownList.innerHTML = '<p class="placeholder-text">Load data to view breakdown.</p>';
      return;
    }

    months.forEach(m => {
      const row = document.createElement('div');
      row.className = 'monthly-row';
      const net = monthlyMap[m].inflow - monthlyMap[m].outflow;
      row.innerHTML = `
        <span>${m}</span>
        <span>In: ${formatMoney(monthlyMap[m].inflow)} | Out: ${formatMoney(monthlyMap[m].outflow)}</span>
        <strong style="color: ${net >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${formatMoney(net)}</strong>
      `;
      DOM.monthlyBreakdownList.appendChild(row);
    });
  }

  function renderExceptionsTable() {
    DOM.exceptionsTbody.innerHTML = '';
    if (STATE.exceptions.length === 0) {
      DOM.exceptionsTbody.innerHTML = '<tr><td colspan="5" class="table-placeholder">No reconciliation exceptions detected. All records resolved cleanly.</td></tr>';
      return;
    }

    STATE.exceptions.forEach(rec => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${rec.row}</td>
        <td>${rec.reference || '<em>EMPTY</em>'}</td>
        <td class="ninja-target">${formatMoney(rec.amount || 0)}</td>
        <td style="color: var(--accent-red); font-weight: 600;">${rec.issueReason}</td>
        <td><span class="pill-status exception">Rule Violation</span></td>
      `;
      DOM.exceptionsTbody.appendChild(tr);
    });
  }

  function renderRegisterTable() {
    DOM.registerTbody.innerHTML = '';
    const searchTerm = DOM.registerSearch.value.toLowerCase().trim();
    const filterType = DOM.registerFilter.value;

    const filtered = STATE.records.filter(r => {
      const matchesSearch = (r.reference && r.reference.toLowerCase().includes(searchTerm)) ||
                            (r.category && r.category.toLowerCase().includes(searchTerm));
      
      if (!matchesSearch) return false;

      if (filterType === 'RESOLVED') return r.status === 'RESOLVED';
      if (filterType === 'EXCEPTION') return r.status === 'EXCEPTION';
      if (filterType === 'inflow') return r.type === 'inflow';
      if (filterType === 'outflow') return r.type === 'outflow';
      return true;
    });

    if (filtered.length === 0) {
      DOM.registerTbody.innerHTML = '<tr><td colspan="7" class="table-placeholder">No matching records found.</td></tr>';
      return;
    }

    filtered.forEach(rec => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${rec.row}</td>
        <td>${rec.date || '-'}</td>
        <td>${rec.reference || '-'}</td>
        <td>${rec.category || '-'}</td>
        <td style="color: ${rec.type === 'inflow' ? 'var(--accent-green)' : 'var(--accent-amber)'}">${rec.type.toUpperCase()}</td>
        <td class="ninja-target">${formatMoney(rec.amount || 0)}</td>
        <td><span class="pill-status ${rec.status.toLowerCase()}">${rec.status}</span></td>
      `;
      DOM.registerTbody.appendChild(tr);
    });
  }

  function renderSimulator() {
    const delayDays = parseInt(DOM.sliderCollection.value, 10);
    const emergencyPct = parseInt(DOM.sliderEmergency.value, 10);
    const deferralDays = parseInt(DOM.sliderVendor.value, 10);

    DOM.valCollection.textContent = `${delayDays} Days`;
    DOM.valEmergency.textContent = `${emergencyPct}%`;
    DOM.valVendor.textContent = `${deferralDays} Days`;

    const cleanInflows = STATE.resolved.filter(r => r.type === 'inflow').reduce((sum, r) => sum + r.amount, 0);
    const cleanOutflows = STATE.resolved.filter(r => r.type === 'outflow').reduce((sum, r) => sum + r.amount, 0);

    // 7-day baseline (pro-rated from batch)
    let projectedInflow = (cleanInflows / 30) * 7;
    let projectedOutflow = (cleanOutflows / 30) * 7;

    // Apply slider dynamics
    if (delayDays > 0) {
      projectedInflow *= Math.max(0, (1 - (delayDays / 14)));
    }

    if (emergencyPct > 0) {
      projectedOutflow *= (1 + (emergencyPct / 100));
    }

    if (deferralDays > 0) {
      projectedOutflow *= Math.max(0.1, (1 - (deferralDays / 14)));
    }

    const projectedNet = projectedInflow - projectedOutflow;
    DOM.simProjectedCash.textContent = formatMoney(projectedNet);

    if (projectedNet < 0) {
      DOM.simImpactNote.textContent = 'Warning: Projected 7-day deficit under simulated pressure.';
      DOM.simImpactNote.style.color = 'var(--accent-red)';
    } else {
      DOM.simImpactNote.textContent = 'Liquidity stable under current simulation parameters.';
      DOM.simImpactNote.style.color = 'var(--accent-green)';
    }
  }

  function resetSimulator() {
    DOM.sliderCollection.value = 0;
    DOM.sliderEmergency.value = 0;
    DOM.sliderVendor.value = 0;
    renderSimulator();
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Currency Selector
    DOM.currencySelect.addEventListener('change', (e) => {
      STATE.currency = e.target.value;
      renderCurrency();
    });

    // Ninja Mode Toggle
    DOM.ninjaToggleBtn.addEventListener('click', toggleNinjaMode);
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'n' || e.key === 'N') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        toggleNinjaMode();
      }
    });

    function toggleNinjaMode() {
      STATE.ninjaMode = !STATE.ninjaMode;
      document.body.classList.toggle('ninja-mode', STATE.ninjaMode);
      DOM.ninjaBtnText.textContent = `Ninja Mode (${STATE.ninjaMode ? 'On' : 'Off'})`;
    }

    // Modal & Settings
    DOM.settingsTriggerBtn.addEventListener('click', () => DOM.settingsModal.classList.remove('hidden'));
    DOM.closeSettingsBtn.addEventListener('click', () => DOM.settingsModal.classList.add('hidden'));
    DOM.userNameInput.addEventListener('input', saveSettings);
    DOM.workspaceVisibility.addEventListener('change', saveSettings);
    DOM.factoryResetBtn.addEventListener('click', factoryReset);

    // Boot Demo Data
    DOM.loadDemoBtn.addEventListener('click', () => {
      const raw = generateSyntheticDataset();
      processDataset(raw, 'Synthetic Demo Dataset (55 Records)');
    });

    // File Upload Handlers
    DOM.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      DOM.dropZone.classList.add('dragover');
    });

    DOM.dropZone.addEventListener('dragleave', () => DOM.dropZone.classList.remove('dragover'));

    DOM.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      DOM.dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    DOM.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
      }
    });

    function handleFileSelect(file) {
      const reader = new FileReader();
      reader.onload = function (event) {
        const text = event.target.result;
        const parsed = parseCSV(text);
        processDataset(parsed, file.name);
      };
      reader.readAsText(file);
    }

    function processDataset(records, sourceName) {
      STATE.records = records;
      const { resolved, exceptions } = reconcileRecords(records);
      STATE.resolved = resolved;
      STATE.exceptions = exceptions;

      DOM.fileStatusIcon.textContent = '✓';
      DOM.fileStatusText.textContent = `Loaded: ${sourceName}`;
      renderAll();
    }

    // Register Filtering
    DOM.registerSearch.addEventListener('input', renderRegisterTable);
    DOM.registerFilter.addEventListener('change', renderRegisterTable);

    // Simulator Sliders
    DOM.sliderCollection.addEventListener('input', renderSimulator);
    DOM.sliderEmergency.addEventListener('input', renderSimulator);
    DOM.sliderVendor.addEventListener('input', renderSimulator);
    DOM.resetSimBtn.addEventListener('click', resetSimulator);

    // Exports
    DOM.exportPdfBtn.addEventListener('click', () => window.print());
    DOM.exportCsvBtn.addEventListener('click', exportCleanCSV);
  }

  function exportCleanCSV() {
    if (STATE.resolved.length === 0) {
      alert('No clean resolved records to export.');
      return;
    }

    const headers = ['Row', 'Date', 'Reference', 'Category', 'Type', 'Amount', 'Status'];
    const rows = STATE.resolved.map(r => [
      r.row, r.date, `"${r.reference}"`, `"${r.category}"`, r.type, r.amount, r.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RIPPLE_Clean_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Run on DOM ready
  document.addEventListener('DOMContentLoaded', init);
})();
