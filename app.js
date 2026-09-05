// --- STATE MANAGEMENT & INITIALIZATION ---
let appState = {
  rawRecords: [],
  resolvedRecords: [],
  exceptionRecords: [],
  currency: 'INR',
  currencySymbol: '₹',
  ninjaMode: false,
  operatorName: 'Operator',
  visibilityMode: 'private',
  simSliders: {
    collectionDelay: 0,
    emergencySurge: 0,
    vendorDeferral: 0
  }
};

// Currency Symbol Mapping
const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ'
};

document.addEventListener('DOMContentLoaded', () => {
  initWorkspace();
  setupEventListeners();
  setupDragAndDrop();
});

function initWorkspace() {
  const savedSettings = localStorage.getItem('ripple_settings');
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings);
      appState.operatorName = parsed.operatorName || 'Operator';
      appState.visibilityMode = parsed.visibilityMode || 'private';
      
      const nameInput = document.getElementById('user-name-input');
      if (nameInput) nameInput.value = appState.operatorName;
      
      const visSelect = document.getElementById('workspace-visibility');
      if (visSelect) visSelect.value = appState.visibilityMode;
    } catch (e) {
      console.error("Failed to load local settings", e);
    }
  }
}

// --- EVENT LISTENERS & SETUP ---
function setupEventListeners() {
  // Currency Selector
  document.getElementById('currency-select')?.addEventListener('change', (e) => {
    appState.currency = e.target.value;
    appState.currencySymbol = CURRENCY_SYMBOLS[e.target.value] || '₹';
    updateDashboard();
  });

  // Ninja Privacy Toggle
  document.getElementById('ninja-toggle-btn')?.addEventListener('click', () => {
    appState.ninjaMode = !appState.ninjaMode;
    document.body.classList.toggle('ninja-mode', appState.ninjaMode);
    const btnText = document.getElementById('ninja-btn-text');
    if (btnText) {
      btnText.textContent = appState.ninjaMode ? 'Ninja Mode (On)' : 'Ninja Mode (Off)';
    }
  });

  // Demo Dataset Boot
  document.getElementById('load-demo-btn')?.addEventListener('click', () => {
    bootSyntheticDataset();
  });

  // Simulator Sliders
  document.getElementById('slider-collection')?.addEventListener('input', (e) => {
    appState.simSliders.collectionDelay = parseInt(e.target.value, 10);
    document.getElementById('val-collection').textContent = `${e.target.value} Days`;
    recalculateSimulator();
  });

  document.getElementById('slider-emergency')?.addEventListener('input', (e) => {
    appState.simSliders.emergencySurge = parseInt(e.target.value, 10);
    document.getElementById('val-emergency').textContent = `${e.target.value}%`;
    recalculateSimulator();
  });

  document.getElementById('slider-vendor')?.addEventListener('input', (e) => {
    appState.simSliders.vendorDeferral = parseInt(e.target.value, 10);
    document.getElementById('val-vendor').textContent = `${e.target.value} Days`;
    recalculateSimulator();
  });

  document.getElementById('reset-sim-btn')?.addEventListener('click', () => {
    appState.simSliders = { collectionDelay: 0, emergencySurge: 0, vendorDeferral: 0 };
    document.getElementById('slider-collection').value = 0;
    document.getElementById('slider-emergency').value = 0;
    document.getElementById('slider-vendor').value = 0;
    document.getElementById('val-collection').textContent = '0 Days';
    document.getElementById('val-emergency').textContent = '0%';
    document.getElementById('val-vendor').textContent = '0 Days';
    recalculateSimulator();
  });

  // Export & Print Actions
  document.getElementById('export-pdf-btn')?.addEventListener('click', () => {
    window.print();
  });

  document.getElementById('export-csv-btn')?.addEventListener('click', () => {
    exportCleanCSV();
  });

  // Register Filters & Search
  document.getElementById('register-search')?.addEventListener('input', renderMasterRegister);
  document.getElementById('register-filter')?.addEventListener('change', renderMasterRegister);

  // Settings Modal Controls
  const modal = document.getElementById('settings-modal');
  document.getElementById('settings-trigger-btn')?.addEventListener('click', () => {
    modal?.classList.remove('hidden');
  });

  document.getElementById('close-settings-btn')?.addEventListener('click', () => {
    modal?.classList.add('hidden');
  });

  document.getElementById('user-name-input')?.addEventListener('change', (e) => {
    appState.operatorName = e.target.value;
    saveSettings();
  });

  document.getElementById('workspace-visibility')?.addEventListener('change', (e) => {
    appState.visibilityMode = e.target.value;
    saveSettings();
  });

  document.getElementById('factory-reset-btn')?.addEventListener('click', () => {
    if (confirm("Are you sure you want to reset all data and settings?")) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  });
}

function saveSettings() {
  localStorage.setItem('ripple_settings', JSON.stringify({
    operatorName: appState.operatorName,
    visibilityMode: appState.visibilityMode
  }));
}

// --- UNIVERSAL FILE & GOOGLE SHEETS PARSER ---
const fileInput = document.getElementById('file-input');

fileInput?.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const fileName = file.name.toLowerCase();
  const fileStatusText = document.getElementById('file-status-text');
  const fileStatusIcon = document.getElementById('file-status-icon');
  
  if (fileStatusText) fileStatusText.textContent = `Reading ${file.name}...`;
  if (fileStatusIcon) fileStatusIcon.textContent = "⏳";

  try {
    if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => parseCSVData(e.target.result);
      reader.readAsText(file);
    } 
    else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const csvData = XLSX.utils.sheet_to_csv(worksheet);
        parseCSVData(csvData);
      };
      reader.readAsArrayBuffer(file);
    } 
    else if (fileName.endsWith('.pdf') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
      const reader = new FileReader();
      reader.onload = (e) => parseCSVData(e.target.result);
      reader.readAsText(file);
    } 
    else {
      alert("Unsupported file format. Please upload .csv, .xlsx, .xls, .pdf, or .docx files.");
      if (fileStatusText) fileStatusText.textContent = "Unsupported format";
      if (fileStatusIcon) fileStatusIcon.textContent = "✖";
    }
  } catch (error) {
    console.error("File Read Error:", error);
    if (fileStatusText) fileStatusText.textContent = "Error parsing file.";
    if (fileStatusIcon) fileStatusIcon.textContent = "✖";
  }
});

document.getElementById('load-sheets-btn')?.addEventListener('click', async () => {
  const urlInput = document.getElementById('sheets-url-input').value.trim();
  const fileStatusText = document.getElementById('file-status-text');
  const fileStatusIcon = document.getElementById('file-status-icon');

  if (!urlInput.includes('docs.google.com/spreadsheets')) {
    alert("Please enter a valid Google Sheets URL.");
    return;
  }

  try {
    const sheetIdMatch = urlInput.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      alert("Could not extract Sheet ID from URL.");
      return;
    }

    const sheetId = sheetIdMatch[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    if (fileStatusText) fileStatusText.textContent = "Fetching Google Sheet...";
    if (fileStatusIcon) fileStatusIcon.textContent = "⏳";
    
    const response = await fetch(exportUrl);
    
    if (!response.ok) {
      throw new Error("Sheet not accessible. Ensure share settings are set to 'Anyone with link'.");
    }
    
    const csvData = await response.text();
    parseCSVData(csvData);
    if (fileStatusText) fileStatusText.textContent = "Google Sheet loaded successfully";
    if (fileStatusIcon) fileStatusIcon.textContent = "✓";
  } catch (err) {
    alert(err.message);
    if (fileStatusText) fileStatusText.textContent = "Failed to fetch Google Sheet";
    if (fileStatusIcon) fileStatusIcon.textContent = "✖";
  }
});

function setupDragAndDrop() {
  const dropZone = document.getElementById('drop-zone');
  if (!dropZone) return;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0 && fileInput) {
      fileInput.files = files;
      fileInput.dispatchEvent(new Event('change'));
    }
  });
}

// --- CSV PARSER & RECONCILIATION ENGINE ---
function parseCSVData(rawText) {
  const lines = rawText.split(/\r\n|\n/);
  const records = [];

  lines.forEach((line, index) => {
    if (!line.trim() || index === 0 && line.toLowerCase().includes('reference')) return; // Skip header/empty
    const parts = line.split(',');
    
    if (parts.length >= 4) {
      records.push({
        rowId: index,
        date: parts[0]?.trim() || 'N/A',
        reference: parts[1]?.trim() || `REF-${index}`,
        category: parts[2]?.trim() || 'General',
        type: parts[3]?.trim().toLowerCase() === 'inflow' ? 'inflow' : 'outflow',
        amount: parseFloat(parts[4]) || 0
      });
    }
  });

  if (records.length === 0) {
    alert("No valid rows found in file.");
    return;
  }

  processReconciliation(records);
}

function processReconciliation(records) {
  appState.rawRecords = records;
  appState.resolvedRecords = [];
  appState.exceptionRecords = [];

  records.forEach((record) => {
    let issueDetails = [];
    let evidence = [];

    // Rule 1: Zero/Negative Amount Check
    if (isNaN(record.amount) || record.amount <= 0) {
      issueDetails.push("Invalid or zero monetary value");
      evidence.push("Amount field must be a positive numeric value.");
    }

    // Rule 2: Duplicate Reference Check
    const isDuplicate = records.filter(r => r.reference.toLowerCase() === record.reference.toLowerCase()).length > 1;
    if (isDuplicate) {
      issueDetails.push("Duplicate Reference Identifier");
      evidence.push(`Multiple entries detected with reference '${record.reference}'.`);
    }

    // Rule 3: Missing Category / Reference
    if (!record.reference || record.reference === 'N/A') {
      issueDetails.push("Missing Reference Code");
      evidence.push("Audit standard requires unique reference code for ledger integrity.");
    }

    if (issueDetails.length > 0) {
      appState.exceptionRecords.push({
        ...record,
        status: 'EXCEPTION',
        issue: issueDetails.join("; "),
        evidence: evidence.join(" ")
      });
    } else {
      appState.resolvedRecords.push({
        ...record,
        status: 'RESOLVED'
      });
    }
  });

  updateDashboard();
  
  const statusText = document.getElementById('file-status-text');
  const statusIcon = document.getElementById('file-status-icon');
  if (statusText) statusText.textContent = `Loaded ${records.length} records`;
  if (statusIcon) statusIcon.textContent = "✓";
}

// --- SYNTHETIC DATASET GENERATOR ---
function bootSyntheticDataset() {
  const categories = ['Client Payment', 'Vendor Invoice', 'Software SaaS', 'Payroll', 'Office Rent', 'Utility Bill'];
  const synthetic = [];
  
  for (let i = 1; i <= 52; i++) {
    const isException = i % 10 === 0;
    const isOutflow = i % 3 === 0;
    
    synthetic.push({
      rowId: i,
      date: `2026-03-${(i % 28 + 1).toString().padStart(2, '0')}`,
      reference: isException && i === 20 ? 'REF-DUP-100' : (i === 30 ? 'REF-DUP-100' : `INV-2026-${1000 + i}`),
      category: categories[i % categories.length],
      type: isOutflow ? 'outflow' : 'inflow',
      amount: isException && i === 10 ? -500 : Math.floor(Math.random() * 45000) + 1200
    });
  }

  processReconciliation(synthetic);
}

// --- DASHBOARD UI UPDATER ---
function updateDashboard() {
  const totalInflows = appState.resolvedRecords
    .filter(r => r.type === 'inflow')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalOutflows = appState.resolvedRecords
    .filter(r => r.type === 'outflow')
    .reduce((sum, r) => sum + r.amount, 0);

  const netCash = totalInflows - totalOutflows;
  const dailyBurn = totalOutflows > 0 ? totalOutflows / 30 : 1;
  const runwayDays = Math.max(0, Math.floor(netCash / dailyBurn));

  // Render Metric Cards
  document.getElementById('metric-cash').textContent = formatMoney(netCash);
  document.getElementById('metric-inflows').textContent = formatMoney(totalInflows);
  document.getElementById('metric-outflows').textContent = formatMoney(totalOutflows);
  
  const runwayEl = document.getElementById('metric-runway');
  if (runwayEl) runwayEl.textContent = `${runwayDays} Days`;

  const runwayStatus = document.getElementById('metric-runway-status');
  if (runwayStatus) {
    if (runwayDays > 60) runwayStatus.textContent = "Status: Healthy Runway";
    else if (runwayDays > 30) runwayStatus.textContent = "Status: Moderate";
    else runwayStatus.textContent = "Status: Critical Attention Needed";
  }

  // Render Engine Throughput Stats
  const totalProcessed = appState.rawRecords.length;
  const resolvedCount = appState.resolvedRecords.length;
  const exceptionCount = appState.exceptionRecords.length;
  const matchRate = totalProcessed > 0 ? Math.round((resolvedCount / totalProcessed) * 100) : 0;

  document.getElementById('stat-processed').textContent = totalProcessed;
  document.getElementById('stat-resolved').textContent = resolvedCount;
  document.getElementById('stat-exceptions').textContent = exceptionCount;
  
  const matchBadge = document.getElementById('match-rate-badge');
  if (matchBadge) matchBadge.textContent = `${matchRate}% Matched`;

  renderMonthlyBreakdown();
  renderExceptionsLedger();
  renderMasterRegister();
  recalculateSimulator();
}

function renderMonthlyBreakdown() {
  const monthlyContainer = document.getElementById('monthly-breakdown-list');
  if (!monthlyContainer) return;

  if (appState.resolvedRecords.length === 0) {
    monthlyContainer.innerHTML = '<p class="placeholder-text">Load data to view breakdown.</p>';
    return;
  }

  const breakdown = {};
  appState.resolvedRecords.forEach(r => {
    const month = r.date.substring(0, 7) || '2026-03';
    if (!breakdown[month]) breakdown[month] = { inflow: 0, outflow: 0 };
    if (r.type === 'inflow') breakdown[month].inflow += r.amount;
    else breakdown[month].outflow += r.amount;
  });

  monthlyContainer.innerHTML = Object.entries(breakdown).map(([month, val]) => `
    <div class="monthly-row">
      <span>${month}</span>
      <span style="color: var(--accent-green)">+${formatMoney(val.inflow)}</span>
      <span style="color: var(--accent-red)">-${formatMoney(val.outflow)}</span>
    </div>
  `).join('');
}

function renderExceptionsLedger() {
  const tbody = document.getElementById('exceptions-tbody');
  if (!tbody) return;

  if (appState.exceptionRecords.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-placeholder">No exceptions detected. All records resolved cleanly.</td></tr>';
    return;
  }

  tbody.innerHTML = appState.exceptionRecords.map(r => `
    <tr>
      <td>#${r.rowId}</td>
      <td><strong>${escapeHtml(r.reference)}</strong></td>
      <td class="ninja-target">${formatMoney(r.amount)}</td>
      <td style="color: var(--accent-red); font-weight: 600;">${escapeHtml(r.issue)}</td>
      <td style="color: var(--text-muted);">${escapeHtml(r.evidence)}</td>
    </tr>
  `).join('');
}

function renderMasterRegister() {
  const tbody = document.getElementById('register-tbody');
  if (!tbody) return;

  const searchQuery = document.getElementById('register-search')?.value.toLowerCase() || '';
  const filterType = document.getElementById('register-filter')?.value || 'ALL';

  const allRecords = [...appState.resolvedRecords, ...appState.exceptionRecords];

  const filtered = allRecords.filter(r => {
    const matchesSearch = r.reference.toLowerCase().includes(searchQuery) || r.category.toLowerCase().includes(searchQuery);
    
    if (!matchesSearch) return false;
    if (filterType === 'RESOLVED') return r.status === 'RESOLVED';
    if (filterType === 'EXCEPTION') return r.status === 'EXCEPTION';
    if (filterType === 'inflow') return r.type === 'inflow';
    if (filterType === 'outflow') return r.type === 'outflow';
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-placeholder">No matching records found.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(r => `
    <tr>
      <td>#${r.rowId}</td>
      <td>${r.date}</td>
      <td>${escapeHtml(r.reference)}</td>
      <td>${escapeHtml(r.category)}</td>
      <td><span style="color: ${r.type === 'inflow' ? 'var(--accent-green)' : 'var(--accent-red)'}">${r.type.toUpperCase()}</span></td>
      <td class="ninja-target">${formatMoney(r.amount)}</td>
      <td>
        <span class="pill-status ${r.status === 'RESOLVED' ? 'resolved' : 'exception'}">
          ${r.status}
        </span>
      </td>
    </tr>
  `).join('');
}

// --- SCENARIO SIMULATOR CALCULATOR ---
function recalculateSimulator() {
  const totalInflows = appState.resolvedRecords.filter(r => r.type === 'inflow').reduce((sum, r) => sum + r.amount, 0);
  const totalOutflows = appState.resolvedRecords.filter(r => r.type === 'outflow').reduce((sum, r) => sum + r.amount, 0);
  
  const baseLiquidity = totalInflows - totalOutflows;

  // Simulator adjustments
  const delayFactor = 1 - (appState.simSliders.collectionDelay * 0.015);
  const emergencySurgeFactor = 1 + (appState.simSliders.emergencySurge * 0.01);
  const vendorDeferralRelief = (totalOutflows * 0.1) * (appState.simSliders.vendorDeferral / 30);

  const projectedInflows = totalInflows * delayFactor;
  const projectedOutflows = (totalOutflows * emergencySurgeFactor) - vendorDeferralRelief;
  
  const projectedLiquidity = projectedInflows - projectedOutflows;

  const simCashEl = document.getElementById('sim-projected-cash');
  if (simCashEl) simCashEl.textContent = formatMoney(projectedLiquidity);

  const noteEl = document.getElementById('sim-impact-note');
  if (noteEl) {
    const diff = projectedLiquidity - baseLiquidity;
    if (diff < 0) {
      noteEl.textContent = `Warning: Scenario reduces projected cash by ${formatMoney(Math.abs(diff))}.`;
      noteEl.style.color = "var(--accent-red)";
    } else if (diff > 0) {
      noteEl.textContent = `Positive: Scenario improves projected cash position by ${formatMoney(diff)}.`;
      noteEl.style.color = "var(--accent-green)";
    } else {
      noteEl.textContent = "Baseline trajectory loaded. No scenario adjustments applied.";
      noteEl.style.color = "var(--text-dim)";
    }
  }
}

// --- EXPORT CLEAN CSV ---
function exportCleanCSV() {
  if (appState.resolvedRecords.length === 0) {
    alert("No resolved records to export.");
    return;
  }

  const headers = ["Row", "Date", "Reference", "Category", "Type", "Amount", "Status"];
  const rows = appState.resolvedRecords.map(r => [
    r.rowId,
    `"${r.date}"`,
    `"${r.reference}"`,
    `"${r.category}"`,
    `"${r.type}"`,
    r.amount,
    `"${r.status}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `RIPPLE_Clean_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- UTILITY FUNCTIONS ---
function formatMoney(amount) {
  return `${appState.currencySymbol}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
