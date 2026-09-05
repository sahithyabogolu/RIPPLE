"use strict";

/*
  RIPPLE // AI FINANCE CONTROLLER
  ---------------------------------
  Deterministic, client-side financial operations, 7-day cash runway,
  and reconciliation analysis.
  
  PRIVACY GUARANTEE:
  - All processing occurs locally within the browser context.
  - Zero financial records are transmitted to any external server.
*/

/* ----------------------------- State Management ----------------------------- */

const state = {
  records: [],
  filteredRecords: [],
  exceptions: [],
  currentPage: 1,
  pageSize: 15,
  currentSection: "dashboard",
  fileName: "",
  hasData: false,
  operatorName: localStorage.getItem("ripple_operator") || "Operator",
  currency: localStorage.getItem("ripple_currency") || "INR",
  isStealthActive: false,
  ninjaMode: false,
  
  // Currency Conversion Matrix (Base: INR)
  currencyRates: {
    INR: { symbol: "₹", rate: 1, locale: "en-IN" },
    USD: { symbol: "$", rate: 0.012, locale: "en-US" },
    EUR: { symbol: "€", rate: 0.011, locale: "de-DE" },
    GBP: { symbol: "£", rate: 0.0095, locale: "en-GB" },
    AED: { symbol: "AED ", rate: 0.044, locale: "ar-AE" }
  },

  // 7-Day Scenario Sliders
  scenario: {
    revenueAdjustment: 0,
    expenseAdjustment: 0,
    collectionDelayDays: 0
  }
};

const $ = (id) => document.getElementById(id);

const elements = {
  appShell: $("appShell"),
  sidebar: $("sidebar"),
  mobileMenuButton: $("mobileMenuButton"),
  welcomeScreen: $("welcomeScreen"),
  workspace: $("workspace"),
  fileInput: $("fileInput"),
  uploadDataButton: $("uploadDataButton"),
  loadDemoButton: $("loadDemoButton"),
  pageTitle: $("pageTitle"),
  dataStatus: $("dataStatus"),
  toast: $("toast"),
  toastMessage: $("toastMessage"),
  operatorDisplay: $("operatorDisplay"),
  currencySelect: $("currencySelect"),
  evidenceDrawer: $("evidenceDrawer"),
  evidenceContent: $("evidenceContent"),
  roboticText: $("roboticText")
};

/* ----------------------------- Initialisation ----------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  initialiseNavigation();
  initialiseEventListeners();
  initialiseRoboticTyping();
  updateOperatorUI();
});

function initialiseEventListeners() {
  // File Upload Handlers
  elements.fileInput?.addEventListener("change", (e) => {
    if (e.target.files.length > 0) readFile(e.target.files[0]);
  });

  elements.uploadDataButton?.addEventListener("click", () => {
    elements.fileInput?.click();
  });

  elements.loadDemoButton?.addEventListener("click", () => {
    load50RecordDemoBatch();
  });

  // Currency Selector
  elements.currencySelect?.addEventListener("change", (e) => {
    state.currency = e.target.value;
    localStorage.setItem("ripple_currency", state.currency);
    renderAll();
  });

  // Operator Edit
  $("editOperatorBtn")?.addEventListener("click", promptSetOperator);

  // Stealth Mode Keybinds (Alt + N or Esc)
  window.addEventListener("keydown", (e) => {
    if ((e.altKey && e.code === "KeyN") || e.key === "Escape") {
      toggleStealthMode();
    }
  });

  // Scenario Slider Listeners
  $("revenueSlider")?.addEventListener("input", (e) => {
    state.scenario.revenueAdjustment = parseFloat(e.target.value);
    $("revenueSliderVal").textContent = `${state.scenario.revenueAdjustment > 0 ? '+' : ''}${state.scenario.revenueAdjustment}%`;
    runScenario();
  });

  $("expenseSlider")?.addEventListener("input", (e) => {
    state.scenario.expenseAdjustment = parseFloat(e.target.value);
    $("expenseSliderVal").textContent = `${state.scenario.expenseAdjustment > 0 ? '+' : ''}${state.scenario.expenseAdjustment}%`;
    runScenario();
  });

  // Scenario Presets
  $("presetClientDelay")?.addEventListener("click", () => applyScenarioPreset(-15, 0, 7));
  $("presetEmergency")?.addEventListener("click", () => applyScenarioPreset(0, 25, 0));
  $("presetVendorDeferral")?.addEventListener("click", () => applyScenarioPreset(0, -20, 0));
  $("presetReset")?.addEventListener("click", () => applyScenarioPreset(0, 0, 0));
}

/* ----------------------------- Formatting & Utilities ----------------------------- */

function showToast(message) {
  if (!elements.toast || !elements.toastMessage) return;
  elements.toastMessage.textContent = message;
  elements.toast.classList.remove("hidden");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => {
    elements.toast.classList.add("hidden");
  }, 3500);
}

function formatCurrency(valueInINR) {
  if (state.isStealthActive) return "••••••";
  
  const curr = state.currencyRates[state.currency] || state.currencyRates.INR;
  const converted = (Number(valueInINR) || 0) * curr.rate;

  return new Intl.NumberFormat(curr.locale, {
    style: "currency",
    currency: state.currency,
    maximumFractionDigits: 0
  }).format(converted);
}

function formatCompactCurrency(valueInINR) {
  if (state.isStealthActive) return "•••";
  const curr = state.currencyRates[state.currency] || state.currencyRates.INR;
  const converted = (Number(valueInINR) || 0) * curr.rate;
  
  return curr.symbol + Intl.NumberFormat("en", { notation: "compact" }).format(converted);
}

function formatNumber(value) {
  if (state.isStealthActive) return "••";
  return new Intl.NumberFormat("en-IN").format(Number(value) || 0);
}

function parseAmount(value) {
  if (typeof value === "number") return value;
  const cleaned = String(value ?? "")
    .replace(/[₹,$€£\s]/g, "")
    .replace(/[()]/g, "-")
    .replace(/,/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    const excelDate = new Date(Math.round((value - 25569) * 86400 * 1000));
    return Number.isNaN(excelDate.getTime()) ? null : excelDate;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function dateKey(value) {
  const date = parseDate(value);
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function normaliseText(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function cleanHeader(value) {
  return normaliseText(value).replace(/\s+/g, " ");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* ----------------------------- User & Stealth Features ----------------------------- */

function updateOperatorUI() {
  if (elements.operatorDisplay) {
    elements.operatorDisplay.textContent = `Operator: ${state.operatorName}`;
  }
}

function promptSetOperator() {
  const name = prompt("Enter Operator Callsign:", state.operatorName);
  if (name && name.trim().length > 0) {
    state.operatorName = name.trim();
    localStorage.setItem("ripple_operator", state.operatorName);
    updateOperatorUI();
    showToast(`Callsign updated to ${state.operatorName}`);
  }
}

function toggleStealthMode() {
  state.isStealthActive = !state.isStealthActive;
  showToast(state.isStealthActive ? "NINJA STEALTH MODE: ON" : "NINJA STEALTH MODE: OFF");
  renderAll();
}

/* ----------------------------- Navigation ----------------------------- */

const sectionTitles = {
  dashboard: "Executive Cash Controller",
  transactions: "Reconciled Transactions",
  cashflow: "Liquidity & Cash Flow",
  workingCapital: "Working Capital Health",
  risk: "Exception & Audit Centre",
  simulator: "7-Day Cash Stress Test"
};

function showSection(sectionName) {
  state.currentSection = sectionName;
  document.querySelectorAll(".nav-item[data-section]").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === sectionName);
  });
  document.querySelectorAll(".content-section").forEach((section) => {
    section.classList.remove("active");
  });
  const section = $(`${sectionName}Section`);
  if (section) section.classList.add("active");
  if (elements.pageTitle) {
    elements.pageTitle.textContent = sectionTitles[sectionName] || "RIPPLE Controller";
  }
  elements.sidebar?.classList.remove("open");
}

function initialiseNavigation() {
  document.querySelectorAll(".nav-item[data-section]").forEach((button) => {
    button.addEventListener("click", () => showSection(button.dataset.section));
  });
  elements.mobileMenuButton?.addEventListener("click", () => {
    elements.sidebar?.classList.toggle("open");
  });
}

/* ----------------------------- Data Processing & Exception Tracking ----------------------------- */

function findColumn(headers, possibleNames) {
  const normalisedHeaders = headers.map(cleanHeader);
  for (const name of possibleNames) {
    const target = cleanHeader(name);
    const exactIndex = normalisedHeaders.indexOf(target);
    if (exactIndex !== -1) return headers[exactIndex];
  }
  for (let i = 0; i < normalisedHeaders.length; i++) {
    const header = normalisedHeaders[i];
    if (possibleNames.some((name) => header.includes(cleanHeader(name)))) {
      return headers[i];
    }
  }
  return null;
}

function classifyRecord(record) {
  const combined = normaliseText(`${record.description} ${record.category} ${record.originalType}`);

  if (combined.includes("receivable") || combined.includes("invoice raised") || combined.includes("customer due")) {
    return "receivable";
  }
  if (combined.includes("payable") || combined.includes("vendor due") || combined.includes("supplier invoice")) {
    return "payable";
  }
  if (combined.includes("income") || combined.includes("revenue") || combined.includes("sales") || combined.includes("receipt")) {
    return "income";
  }
  if (combined.includes("expense") || combined.includes("salary") || combined.includes("rent") || combined.includes("cost")) {
    return "expense";
  }
  if (record.inflow > 0) return "income";
  if (record.outflow > 0) return "expense";
  
  return "unclassified";
}

function normaliseRecord(raw, headers, index) {
  const dateCol = findColumn(headers, ["date", "transaction date", "value date"]);
  const descCol = findColumn(headers, ["description", "narration", "particulars", "details"]);
  const catCol = findColumn(headers, ["category", "account", "ledger"]);
  const typeCol = findColumn(headers, ["type", "classification"]);
  const amtCol = findColumn(headers, ["amount", "value", "total"]);
  const inCol = findColumn(headers, ["inflow", "income", "credit"]);
  const outCol = findColumn(headers, ["outflow", "expense", "debit"]);

  const rawAmount = amtCol ? parseAmount(raw[amtCol]) : 0;
  const inflow = inCol ? Math.abs(parseAmount(raw[inCol])) : 0;
  const outflow = outCol ? Math.abs(parseAmount(raw[outCol])) : 0;
  const parsedDate = dateCol ? parseDate(raw[dateCol]) : null;

  const amount = rawAmount || inflow || outflow;

  const record = {
    id: safeId(),
    index: index + 1,
    date: parsedDate,
    description: descCol ? String(raw[descCol]).trim() : `Transaction #${index + 1}`,
    category: catCol ? String(raw[catCol]).trim() : "Uncategorised",
    originalType: typeCol ? String(raw[typeCol]).trim() : "",
    amount,
    inflow: inflow || (rawAmount > 0 ? rawAmount : 0),
    outflow: outflow || (rawAmount < 0 ? Math.abs(rawAmount) : 0),
    receivable: 0,
    payable: 0,
    raw
  };

  record.type = classifyRecord(record);

  if (record.type === "receivable") record.receivable = record.amount;
  if (record.type === "payable") record.payable = record.amount;

  // Determine Exception Flag
  const exceptionReasons = [];
  if (!record.date) exceptionReasons.push("Missing Date");
  if (!record.description || record.description.length < 3) exceptionReasons.push("Ambiguous Description");
  if (record.type === "unclassified") exceptionReasons.push("Unmapped Category/Type");
  if (record.amount <= 0) exceptionReasons.push("Zero Value Record");

  record.isException = exceptionReasons.length > 0;
  record.exceptionReasons = exceptionReasons;
  record.risk = record.isException ? (exceptionReasons.length >= 2 ? "high" : "medium") : "low";

  return record;
}

function processRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Uploaded dataset contains no readable records.");
  }

  const headers = Object.keys(rows[0]);
  const records = rows.map((row, index) => normaliseRecord(row, headers, index));

  state.records = records;
  state.filteredRecords = [...records];
  state.exceptions = records.filter((r) => r.isException);
  state.currentPage = 1;
  state.hasData = true;

  updateDataStatus();
  renderAll();

  elements.welcomeScreen?.classList.add("hidden");
  elements.workspace?.classList.remove("hidden");

  showSection("dashboard");
  showToast(`Loaded ${records.length} records (${state.exceptions.length} exceptions flagged).`);
}

async function readFile(file) {
  if (!file) return;
  const ext = file.name.split(".").pop().toLowerCase();

  try {
    if (ext === "csv") {
      const text = await file.text();
      const rows = parseCsv(text);
      state.fileName = file.name;
      processRows(rows);
    } else if (["xlsx", "xls"].includes(ext)) {
      if (!window.XLSX) throw new Error("Excel parsing engine unavailable.");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      state.fileName = file.name;
      processRows(rows);
    } else {
      throw new Error("Unsupported file format. Upload CSV or Excel.");
    }
  } catch (err) {
    showToast(err.message || "Failed to parse file.");
  }
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV requires a header and at least one row.");

  const parseLine = (line) => {
    const res = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; continue; }
      if (c === '"') { inQuotes = !inQuotes; continue; }
      if (c === "," && !inQuotes) { res.push(cur.trim()); cur = ""; } 
      else { cur += c; }
    }
    res.push(cur.trim());
    return res;
  };

  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = parseLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  });
}

/* ----------------------------- 50-Record Demo Batch Generator ----------------------------- */

function load50RecordDemoBatch() {
  const categories = ["Sales Revenue", "Software SaaS", "Office Lease", "Payroll", "Vendor Invoice", "Consulting", "Utility"];
  const batch = [];
  const now = new Date();

  for (let i = 1; i <= 50; i++) {
    const isIncome = i % 3 !== 0;
    const isExceptionRow = i === 7 || i === 19 || i === 33 || i === 42; // Synthetic exceptions
    const dateOffset = Math.floor(Math.random() * 30);
    const dateStr = isExceptionRow && i === 19 ? "" : new Date(now.getTime() - dateOffset * 86400000).toISOString().split("T")[0];

    batch.push({
      "Transaction Date": dateStr,
      "Description": isExceptionRow && i === 7 ? "X" : `${isIncome ? "Client Payment" : "Supplier Debit"} - Ref #${1000 + i}`,
      "Category": isExceptionRow && i === 33 ? "" : categories[i % categories.length],
      "Type": isIncome ? "Income" : "Expense",
      "Amount": isExceptionRow && i === 42 ? 0 : Math.floor(Math.random() * 85000) + 5000
    });
  }

  state.fileName = "50-Record-Demo-Batch.csv";
  processRows(batch);
}

/* ----------------------------- Analytics & Calculations ----------------------------- */

function getTotals() {
  const records = state.records;
  const totalInflows = records.reduce((s, r) => s + (r.type === "income" ? r.amount : 0), 0);
  const totalOutflows = records.reduce((s, r) => s + (r.type === "expense" ? r.amount : 0), 0);
  const receivables = records.reduce((s, r) => s + r.receivable, 0);
  const payables = records.reduce((s, r) => s + r.payable, 0);
  const netCashFlow = totalInflows - totalOutflows;

  // Working Capital & Cash Runway Engine
  const dailyBurn = totalOutflows > 0 ? totalOutflows / 30 : 1;
  const cashRunwayDays = Math.max(0, Math.round(netCashFlow / dailyBurn));

  // Reconciliation Match Rate
  const resolvedCount = records.length - state.exceptions.length;
  const matchRate = records.length > 0 ? Math.round((resolvedCount / records.length) * 100) : 100;

  return {
    totalInflows,
    totalOutflows,
    receivables,
    payables,
    netCashFlow,
    estimatedCash: netCashFlow,
    cashRunwayDays,
    matchRate,
    resolvedCount,
    totalCount: records.length
  };
}

function getMonthlyData() {
  const months = {};
  state.records.forEach((r) => {
    const key = dateKey(r.date);
    if (!key) return;
    if (!months[key]) months[key] = { month: key, inflows: 0, outflows: 0, net: 0 };
    if (r.type === "income") months[key].inflows += r.amount;
    if (r.type === "expense") months[key].outflows += r.amount;
    months[key].net = months[key].inflows - months[key].outflows;
  });
  return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
}

/* ----------------------------- Rendering Functions ----------------------------- */

function updateDataStatus() {
  if (!elements.dataStatus) return;
  if (!state.hasData) {
    elements.dataStatus.innerHTML = `<span class="status-dot"></span> Offline / No Data`;
    return;
  }
  elements.dataStatus.innerHTML = `
    <span class="status-dot" style="background: var(--accent-emerald);"></span> 
    ${escapeHtml(state.fileName)}
  `;
}

function renderAll() {
  renderDashboard();
  renderTransactions();
  renderCashFlow();
  renderWorkingCapital();
  renderRisk();
  runScenario();
}

function renderDashboard() {
  const totals = getTotals();

  if ($("totalInflows")) $("totalInflows").textContent = formatCurrency(totals.totalInflows);
  if ($("totalOutflows")) $("totalOutflows").textContent = formatCurrency(totals.totalOutflows);
  if ($("netCashFlow")) $("netCashFlow").textContent = formatCurrency(totals.netCashFlow);
  if ($("estimatedCash")) $("estimatedCash").textContent = formatCurrency(totals.estimatedCash);

  // Match Rate & Reconciliation Summary
  if ($("matchRateDisplay")) $("matchRateDisplay").textContent = `${totals.matchRate}%`;
  if ($("matchRateSummary")) {
    $("matchRateSummary").textContent = `${totals.resolvedCount}/${totals.totalCount} Reconciled (${state.exceptions.length} Exceptions)`;
  }

  // Working Capital & Cash Runway Meter
  if ($("cashRunwayDisplay")) {
    $("cashRunwayDisplay").textContent = `${totals.cashRunwayDays} Days`;
  }
  if ($("cashRunwayMeter")) {
    const meterPercent = Math.min(100, Math.max(5, (totals.cashRunwayDays / 90) * 100));
    $("cashRunwayMeter").style.width = `${meterPercent}%`;
    $("cashRunwayMeter").style.background = totals.cashRunwayDays < 15 ? "#ef4444" : "var(--accent-purple)";
  }

  renderCashFlowChart();
}

function renderTransactions() {
  applyTransactionFilters();
  const body = $("transactionsTableBody");
  if (!body) return;

  const start = (state.currentPage - 1) * state.pageSize;
  const pageRecords = state.filteredRecords.slice(start, start + state.pageSize);

  if (pageRecords.length === 0) {
    body.innerHTML = `<tr><td colspan="6" class="empty-table">No records found matching filters.</td></tr>`;
    return;
  }

  body.innerHTML = pageRecords.map((r) => `
    <tr>
      <td>${escapeHtml(formatDate(r.date))}</td>
      <td>${escapeHtml(r.description)}</td>
      <td>${escapeHtml(r.category)}</td>
      <td><span class="type-badge type-${r.type}">${r.type}</span></td>
      <td style="font-family: var(--font-mono);">${formatCurrency(r.amount)}</td>
      <td>
        <button class="ripple-btn-secondary" style="padding: 2px 8px; font-size: 0.7rem;" onclick="openAuditorDrawer('${r.id}')">
          🔍 Evidence
        </button>
      </td>
    </tr>
  `).join("");

  const totalPages = Math.max(1, Math.ceil(state.filteredRecords.length / state.pageSize));
  if ($("pageIndicator")) $("pageIndicator").textContent = `Page ${state.currentPage} of ${totalPages}`;
  if ($("previousPageButton")) $("previousPageButton").disabled = state.currentPage <= 1;
  if ($("nextPageButton")) $("nextPageButton").disabled = state.currentPage >= totalPages;
}

function applyTransactionFilters() {
  const search = normaliseText($("transactionSearch")?.value || "");
  const type = $("transactionTypeFilter")?.value || "all";

  state.filteredRecords = state.records.filter((r) => {
    const text = normaliseText(`${r.description} ${r.category} ${r.type}`);
    const matchesSearch = !search || text.includes(search);
    const matchesType = type === "all" || r.type === type;
    return matchesSearch && matchesType;
  });
}

function renderCashFlow() {
  const monthlyData = getMonthlyData();
  const totals = getTotals();
  const months = Math.max(monthlyData.length, 1);

  if ($("averageMonthlyInflow")) $("averageMonthlyInflow").textContent = formatCurrency(totals.totalInflows / months);
  if ($("averageMonthlyOutflow")) $("averageMonthlyOutflow").textContent = formatCurrency(totals.totalOutflows / months);
  if ($("monthlyBurnRate")) $("monthlyBurnRate").textContent = formatCurrency(Math.max(0, (totals.totalOutflows - totals.totalInflows) / months));
}

function renderWorkingCapital() {
  const totals = getTotals();
  if ($("receivablesValue")) $("receivablesValue").textContent = formatCurrency(totals.receivables);
  if ($("payablesValue")) $("payablesValue").textContent = formatCurrency(totals.payables);
}

function renderRisk() {
  const container = $("exceptionListTable");
  if (!container) return;

  if (state.exceptions.length === 0) {
    container.innerHTML = `<div style="padding: 16px; color: var(--accent-emerald);">✓ Zero reconciliation exceptions detected in current batch.</div>`;
    return;
  }

  container.innerHTML = state.exceptions.map((e) => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid var(--border-subtle);">
      <div>
        <strong style="color: var(--text-main);">${escapeHtml(e.description)}</strong>
        <div style="font-size: 0.75rem; color: #ef4444;">${e.exceptionReasons.join(" • ")}</div>
      </div>
      <button class="ripple-btn-secondary" style="padding: 4px 10px;" onclick="openAuditorDrawer('${e.id}')">Inspect Row</button>
    </div>
  `).join("");
}

/* ----------------------------- 7-Day Scenario Stress Test ----------------------------- */

function applyScenarioPreset(revAdj, expAdj, delayDays) {
  state.scenario.revenueAdjustment = revAdj;
  state.scenario.expenseAdjustment = expAdj;
  state.scenario.collectionDelayDays = delayDays;

  if ($("revenueSlider")) $("revenueSlider").value = revAdj;
  if ($("revenueSliderVal")) $("revenueSliderVal").textContent = `${revAdj > 0 ? '+' : ''}${revAdj}%`;
  if ($("expenseSlider")) $("expenseSlider").value = expAdj;
  if ($("expenseSliderVal")) $("expenseSliderVal").textContent = `${expAdj > 0 ? '+' : ''}${expAdj}%`;

  runScenario();
}

function runScenario() {
  const totals = getTotals();
  const revMod = 1 + (state.scenario.revenueAdjustment / 100);
  const expMod = 1 + (state.scenario.expenseAdjustment / 100);

  const projectedInflows = totals.totalInflows * revMod;
  const projectedOutflows = totals.totalOutflows * expMod;
  const projectedNet = projectedInflows - projectedOutflows;

  if ($("simProjectedCash")) $("simProjectedCash").textContent = formatCurrency(projectedNet);
  if ($("simImpactDelta")) {
    const delta = projectedNet - totals.netCashFlow;
    $("simImpactDelta").textContent = `${delta >= 0 ? '+' : ''}${formatCurrency(delta)}`;
    $("simImpactDelta").style.color = delta >= 0 ? "var(--accent-emerald)" : "#ef4444";
  }
}

/* ----------------------------- Auditor's Evidence Drawer ----------------------------- */

window.openAuditorDrawer = function(recordId) {
  const record = state.records.find((r) => r.id === recordId);
  if (!record || !elements.evidenceDrawer || !elements.evidenceContent) return;

  elements.evidenceContent.innerHTML = `
    <div style="font-family: var(--font-mono); font-size: 0.82rem; color: var(--text-main);">
      <h4 style="color: var(--accent-purple); margin-top: 0;">RAW RECORD ROW EVIDENCE</h4>
      <p><strong>System ID:</strong> ${record.id}</p>
      <p><strong>Parsed Date:</strong> ${formatDate(record.date)}</p>
      <p><strong>Description:</strong> ${escapeHtml(record.description)}</p>
      <p><strong>Raw Inflow/Outflow Amount:</strong> ${formatCurrency(record.amount)}</p>
      <hr style="border-color: var(--border-subtle);" />
      <h5 style="color: var(--text-muted);">RAW EXCEL/CSV DATA OBJECT</h5>
      <pre style="background: rgba(0,0,0,0.5); padding: 12px; border-radius: 6px; overflow-x: auto;">${escapeHtml(JSON.stringify(record.raw, null, 2))}</pre>
    </div>
  `;

  elements.evidenceDrawer.classList.remove("hidden");
};

window.closeAuditorDrawer = function() {
  elements.evidenceDrawer?.classList.add("hidden");
};

/* ----------------------------- Charts & Robotic Typing ----------------------------- */

function renderCashFlowChart() {
  const monthlyData = getMonthlyData();
  const canvas = $("cashFlowChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  canvas.width = (rect.width || 400) * (window.devicePixelRatio || 1);
  canvas.height = 220 * (window.devicePixelRatio || 1);
  ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);

  ctx.clearRect(0, 0, rect.width, 220);

  if (monthlyData.length === 0) return;

  const maxVal = Math.max(...monthlyData.map((m) => Math.max(m.inflows, m.outflows)), 1);
  const stepX = rect.width / (monthlyData.length || 1);

  // Draw Inflow Line (Purple)
  ctx.beginPath();
  ctx.strokeStyle = "#a855f7";
  ctx.lineWidth = 2;
  monthlyData.forEach((m, i) => {
    const x = i * stepX + stepX / 2;
    const y = 180 - (m.inflows / maxVal) * 140;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Draw Outflow Line (Red/Pink)
  ctx.beginPath();
  ctx.strokeStyle = "#e879f9";
  ctx.lineWidth = 2;
  monthlyData.forEach((m, i) => {
    const x = i * stepX + stepX / 2;
    const y = 180 - (m.outflows / maxVal) * 140;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function initialiseRoboticTyping() {
  const text = "ENGINEERED BY SAHITHYA BOGOLU // RIPPLE CORE";
  let index = 0;
  
  function typeChar() {
    if (elements.roboticText && index < text.length) {
      elements.roboticText.textContent += text.charAt(index);
      index++;
      setTimeout(typeChar, 45);
    }
  }

  if (elements.roboticText) {
    elements.roboticText.textContent = "";
    typeChar();
  }
}
