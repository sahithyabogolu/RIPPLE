"use strict";

/* =========================================================
   RIPPLE — Finance Control Workspace
   ========================================================= */

const $ = (id) => document.getElementById(id);

const uploadInput = $("csvFile");
const fileName = $("fileName");
const statusMessage = $("statusMessage");
const errorMessage = $("errorMessage");

const welcomeModal = $("welcomeModal");
const userNameInput = $("userNameInput");
const saveNameButton = $("saveNameButton");
const headerGreeting = $("headerGreeting");
const heroDescription = $("heroDescription");

const privacyModal = $("privacyModal");
const openPrivacyButton = $("openPrivacyButton");
const closePrivacyButton = $("closePrivacyButton");
const saveAnalysesToggle = $("saveAnalysesToggle");
const clearWorkspaceButton = $("clearWorkspaceButton");
const privacyFeedback = $("privacyFeedback");

const workspaceSection = $("workspaceSection");
const workspaceTitle = $("workspaceTitle");
const historyList = $("historyList");
const historyCount = $("historyCount");
const newAnalysisButton = $("newAnalysisButton");

const dashboard = $("dashboard");
const dashboardTitle = $("dashboardTitle");
const dashboardSubtitle = $("dashboardSubtitle");

const cashValue = $("cashValue");
const receivablesValue = $("receivablesValue");
const billsValue = $("billsValue");

const riskSummary = $("riskSummary");
const riskDescription = $("riskDescription");
const riskScoreTag = $("riskScoreTag");
const riskWarning = $("riskWarning");
const riskWarningList = $("riskWarningList");
const riskSuccess = $("riskSuccess");

const dataQuality = $("dataQuality");
const actionsList = $("actionsList");
const evidenceList = $("evidenceList");

const saveCurrentAnalysisButton = $("saveCurrentAnalysisButton");
const deleteCurrentAnalysisButton = $("deleteCurrentAnalysisButton");
const resetButton = $("resetButton");

const chartContainer = $("chartContainer");
const chartLegend = $("chartLegend");
const chartTabs = document.querySelectorAll(".chart-tab");

const collectionRate = $("collectionRate");
const paymentDelay = $("paymentDelay");
const collectionRateLabel = $("collectionRateLabel");
const paymentDelayLabel = $("paymentDelayLabel");
const simulateButton = $("simulateButton");
const simulationResult = $("simulationResult");

const sampleButton = $("sampleButton");

const STORAGE_NAME = "ripple_user_name";
const STORAGE_HISTORY = "ripple_analysis_history";
const STORAGE_SAVE_SETTING = "ripple_save_setting";

let currentAnalysis = null;
let currentChart = "bar";
let currentHistoryId = null;

/* =========================================================
   General helpers
   ========================================================= */

function cleanText(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normaliseHeader(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const cleaned = String(value ?? "")
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .replace(/[^\d.-]/g, "");

  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

function parseDate(value) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date;
  }

  return null;
}

function formatCurrency(value) {
  const amount = Number(value) || 0;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}

function formatDate(value) {
  const date = parseDate(value);

  if (!date) return "Date unavailable";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setStatus(message = "", isError = false) {
  if (isError) {
    errorMessage.textContent = message;
    statusMessage.textContent = "";
  } else {
    statusMessage.textContent = message;
    errorMessage.textContent = "";
  }
}

function getColumn(row, aliases) {
  const keys = Object.keys(row);
  const match = keys.find((key) =>
    aliases.some(
      (alias) => normaliseHeader(key) === normaliseHeader(alias)
    )
  );

  return match ? row[match] : null;
}

function getDateFromRow(row) {
  return (
    getColumn(row, [
      "date",
      "transaction date",
      "invoice date",
      "due date",
      "payment date"
    ]) || null
  );
}

function getAmountFromRow(row) {
  return parseNumber(
    getColumn(row, [
      "amount",
      "value",
      "total",
      "total amount",
      "invoice amount",
      "money in",
      "money out",
      "balance",
      "outstanding"
    ])
  );
}

function getDescriptionFromRow(row) {
  return cleanText(
    getColumn(row, [
      "description",
      "details",
      "particulars",
      "customer",
      "supplier",
      "name",
      "category"
    ]) || "Financial item"
  );
}

function getRowsFromSheet(sheet) {
  return XLSX.utils.sheet_to_json(sheet, {
    defval: ""
  });
}

/* =========================================================
   User identity and privacy
   ========================================================= */

function getUserName() {
  return localStorage.getItem(STORAGE_NAME) || "";
}

function saveUserName() {
  const name = cleanText(userNameInput.value);

  if (!name) {
    userNameInput.focus();
    return;
  }

  localStorage.setItem(STORAGE_NAME, name);
  welcomeModal.classList.add("hidden");
  document.body.classList.remove("modal-open");

  updatePersonalisation();
}

function updatePersonalisation() {
  const name = getUserName();

  if (name) {
    headerGreeting.textContent = `Welcome back, ${name}`;
    heroDescription.textContent =
      `Your private finance workspace is ready, ${name}. Turn financial data into clear cash-flow insights and practical decisions.`;
    workspaceTitle.textContent = `${name}'s analysis workspace.`;
  } else {
    headerGreeting.textContent = "Finance control workspace";
  }
}

function openWelcomeModal() {
  welcomeModal.classList.remove("hidden");
  document.body.classList.add("modal-open");

  setTimeout(() => {
    userNameInput.focus();
  }, 100);
}

function openPrivacyModal() {
  saveAnalysesToggle.checked =
    localStorage.getItem(STORAGE_SAVE_SETTING) === "true";

  privacyFeedback.textContent = "";
  privacyModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closePrivacyModal() {
  privacyModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function updateSavePreference() {
  localStorage.setItem(
    STORAGE_SAVE_SETTING,
    String(saveAnalysesToggle.checked)
  );

  privacyFeedback.textContent = saveAnalysesToggle.checked
    ? "Analyses will now be saved locally when you choose Save analysis."
    : "Automatic local saving is turned off.";
}

function getSavedHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_HISTORY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history));
}

function clearWorkspace() {
  const confirmed = window.confirm(
    "Clear all saved analyses from this browser?"
  );

  if (!confirmed) return;

  localStorage.removeItem(STORAGE_HISTORY);
  renderHistory();
  privacyFeedback.textContent = "Saved workspace cleared.";
}

/* =========================================================
   Workbook processing
   ========================================================= */

function classifyRows(rows) {
  const result = {
    transactions: [],
    receivables: [],
    payables: [],
    forecast: [],
    other: []
  };

  rows.forEach((row) => {
    const headers = Object.keys(row)
      .map(normaliseHeader)
      .join(" ");

    const description = getDescriptionFromRow(row).toLowerCase();

    const outstanding = parseNumber(
      getColumn(row, ["outstanding", "balance", "amount due"])
    );

    const received = parseNumber(
      getColumn(row, ["received", "paid", "collected", "amount received"])
    );

    const moneyIn = parseNumber(
      getColumn(row, ["money in", "inflow", "income", "receipts"])
    );

    const moneyOut = parseNumber(
      getColumn(row, ["money out", "outflow", "expense", "payments"])
    );

    const amount = getAmountFromRow(row);

    if (
      headers.includes("customer") ||
      headers.includes("receivable") ||
      headers.includes("invoice") ||
      headers.includes("amountdue") ||
      outstanding > 0 ||
      received > 0
    ) {
      result.receivables.push({
        ...row,
        amount: outstanding || amount,
        received,
        date: getDateFromRow(row),
        description
      });

      return;
    }

    if (
      headers.includes("supplier") ||
      headers.includes("payable") ||
      headers.includes("vendor") ||
      headers.includes("bill") ||
      headers.includes("expense")
    ) {
      result.payables.push({
        ...row,
        amount: amount || outstanding,
        date: getDateFromRow(row),
        description
      });

      return;
    }

    if (
      headers.includes("forecast") ||
      headers.includes("openingcash") ||
      headers.includes("closingcash") ||
      headers.includes("expectedcollections")
    ) {
      result.forecast.push({
        ...row,
        amount,
        date: getDateFromRow(row),
        description
      });

      return;
    }

    if (moneyIn || moneyOut || amount) {
      result.transactions.push({
        ...row,
        amount,
        moneyIn,
        moneyOut,
        date: getDateFromRow(row),
        description
      });

      return;
    }

    result.other.push(row);
  });

  return result;
}

function calculateAnalysis(rows, sourceName, isDemo = false) {
  const grouped = classifyRows(rows);

  const transactionInflow = grouped.transactions.reduce(
    (sum, row) => sum + (row.moneyIn || 0),
    0
  );

  const transactionOutflow = grouped.transactions.reduce(
    (sum, row) => sum + (row.moneyOut || 0),
    0
  );

  const receivables = grouped.receivables.reduce(
    (sum, row) => sum + Math.max(row.amount || 0, 0),
    0
  );

  const received = grouped.receivables.reduce(
    (sum, row) => sum + Math.max(row.received || 0, 0),
    0
  );

  const payables = grouped.payables.reduce(
    (sum, row) => sum + Math.max(row.amount || 0, 0),
    0
  );

  const forecastCash = grouped.forecast.reduce(
    (sum, row) => sum + (row.amount || 0),
    0
  );

  const totalInflow = transactionInflow + received;
  const totalOutflow = transactionOutflow + payables;

  const estimatedCash =
    forecastCash || totalInflow - totalOutflow;

  const collectionRate =
    receivables > 0
      ? Math.round((received / receivables) * 100)
      : 0;

  const overdueReceivables = grouped.receivables.filter((row) => {
    const date = parseDate(row.date);
    return date && date < new Date() && row.amount > row.received;
  });

  const overdueAmount = overdueReceivables.reduce(
    (sum, row) => sum + Math.max((row.amount || 0) - (row.received || 0), 0),
    0
  );

  const essentialPayables = grouped.payables
    .filter((row) => {
      const text = row.description.toLowerCase();

      return (
        text.includes("salary") ||
        text.includes("rent") ||
        text.includes("tax") ||
        text.includes("electric") ||
        text.includes("utility") ||
        text.includes("supplier")
      );
    })
    .reduce((sum, row) => sum + row.amount, 0);

  const nonEssentialPayables = Math.max(
    payables - essentialPayables,
    0
  );

  let riskScore = 0;

  if (estimatedCash < 0) riskScore += 45;
  else if (estimatedCash < payables * 0.5) riskScore += 30;
  else if (estimatedCash < payables) riskScore += 15;

  if (overdueAmount > receivables * 0.25) riskScore += 30;
  else if (overdueAmount > 0) riskScore += 15;

  if (payables > receivables) riskScore += 15;
  if (collectionRate < 50) riskScore += 10;

  riskScore = Math.min(riskScore, 100);

  let riskLevel = "low";

  if (riskScore >= 65) riskLevel = "high";
  else if (riskScore >= 35) riskLevel = "medium";

  const warnings = [];

  if (estimatedCash < 0) {
    warnings.push("Estimated cash position is negative.");
  }

  if (overdueAmount > 0) {
    warnings.push(
      `${formatCurrency(overdueAmount)} may be tied up in overdue receivables.`
    );
  }

  if (payables > receivables) {
    warnings.push("Upcoming obligations exceed recorded receivables.");
  }

  if (collectionRate < 50 && receivables > 0) {
    warnings.push("Collection performance may need attention.");
  }

  const actions = [];

  if (overdueAmount > 0) {
    actions.push(
      `Prioritise follow-up on overdue receivables worth ${formatCurrency(overdueAmount)}.`
    );
  }

  if (nonEssentialPayables > 0) {
    actions.push(
      `Review or reschedule non-essential payments worth ${formatCurrency(nonEssentialPayables)}.`
    );
  }

  if (collectionRate < 70 && receivables > 0) {
    actions.push(
      "Create a short collection plan for the largest outstanding customers."
    );
  }

  if (estimatedCash < 0) {
    actions.push(
      "Protect essential payments first and review near-term funding needs."
    );
  }

  if (!actions.length) {
    actions.push(
      "Continue monitoring collections, upcoming bills, and cash movements."
    );
  }

  const evidence = [
    `${grouped.transactions.length} transaction records reviewed.`,
    `${grouped.receivables.length} receivable records identified.`,
    `${grouped.payables.length} payable records identified.`
  ];

  if (grouped.forecast.length) {
    evidence.push(`${grouped.forecast.length} forecast records included.`);
  }

  if (isDemo) {
    evidence.push("This analysis uses fictional demonstration data.");
  } else {
    evidence.push("Analysis is based only on the uploaded file.");
  }

  return {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
    sourceName,
    createdAt: new Date().toISOString(),
    isDemo,
    rows,
    grouped,
    metrics: {
      estimatedCash,
      receivables,
      payables,
      received,
      totalInflow,
      totalOutflow,
      collectionRate,
      overdueAmount,
      essentialPayables,
      nonEssentialPayables,
      riskScore,
      riskLevel
    },
    warnings,
    actions,
    evidence
  };
}

/* =========================================================
   Rendering
   ========================================================= */

function renderAnalysis(analysis) {
  currentAnalysis = analysis;
  currentHistoryId = analysis.id;

  workspaceSection.classList.remove("hidden");
  dashboard.classList.remove("hidden");

  dashboardTitle.textContent = analysis.isDemo
    ? "Explore a fictional cash position."
    : "Your cash position, clearly.";

  dashboardSubtitle.textContent = analysis.isDemo
    ? "A fictional example showing how RIPPLE turns financial data into decisions."
    : `Analysis based on ${analysis.sourceName}.`;

  cashValue.textContent = formatCurrency(
    analysis.metrics.estimatedCash
  );

  receivablesValue.textContent = formatCurrency(
    analysis.metrics.receivables
  );

  billsValue.textContent = formatCurrency(
    analysis.metrics.payables
  );

  const riskLevel = analysis.metrics.riskLevel;
  riskSummary.className = `risk-badge ${riskLevel}`;
  riskSummary.textContent =
    `${riskLevel.charAt(0).toUpperCase()}${riskLevel.slice(1)} risk`;

  riskScoreTag.textContent =
    `Score ${analysis.metrics.riskScore}`;

  riskDescription.textContent =
    riskLevel === "high"
      ? "The current data suggests a meaningful liquidity pressure that needs attention."
      : riskLevel === "medium"
        ? "The current data suggests some pressure points worth monitoring."
        : "The current position appears manageable based on the information provided.";

  riskWarningList.innerHTML = analysis.warnings
    .map((warning) => `<li>${escapeHTML(warning)}</li>`)
    .join("");

  riskWarning.classList.toggle(
    "hidden",
    analysis.warnings.length === 0
  );

  riskSuccess.classList.toggle(
    "hidden",
    analysis.warnings.length > 0
  );

  dataQuality.textContent = analysis.rows.length
    ? `${analysis.rows.length} rows reviewed`
    : "Limited data";

  actionsList.innerHTML = analysis.actions
    .map((action) => `<li>${escapeHTML(action)}</li>`)
    .join("");

  evidenceList.innerHTML = analysis.evidence
    .map((item) => `<li>${escapeHTML(item)}</li>`)
    .join("");

  collectionRate.value = 0;
  paymentDelay.value = 0;
  collectionRateLabel.textContent = "0%";
  paymentDelayLabel.textContent = "0 days";

  renderChart(currentChart);
  updateSimulation();

  dashboard.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function renderHistory() {
  const history = getSavedHistory();

  historyCount.textContent =
    `${history.length} saved`;

  if (!history.length) {
    historyList.innerHTML = `
      <div class="empty-history">
        <span>◌</span>
        <p>Your saved analyses will appear here.</p>
      </div>
    `;
    return;
  }

  historyList.innerHTML = history
    .map(
      (item) => `
        <button
          type="button"
          class="history-item ${
            item.id === currentHistoryId ? "active" : ""
          }"
          data-history-id="${escapeHTML(item.id)}"
        >
          <span class="history-item-name">
            ${escapeHTML(item.sourceName)}
          </span>

          <span class="history-item-meta">
            ${formatDate(item.createdAt)}
          </span>
        </button>
      `
    )
    .join("");

  document.querySelectorAll(".history-item").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.historyId;
      const selected = history.find((item) => item.id === id);

      if (selected) {
        renderAnalysis(selected);
        renderHistory();
      }
    });
  });
}

function saveCurrentAnalysis() {
  if (!currentAnalysis) return;

  const history = getSavedHistory();
  const existingIndex = history.findIndex(
    (item) => item.id === currentAnalysis.id
  );

  if (existingIndex >= 0) {
    history[existingIndex] = currentAnalysis;
  } else {
    history.unshift(currentAnalysis);
  }

  saveHistory(history);
  renderHistory();

  setStatus("Analysis saved locally in your workspace.");
}

function deleteCurrentAnalysis() {
  if (!currentAnalysis) return;

  const confirmed = window.confirm(
    "Delete this saved analysis from your workspace?"
  );

  if (!confirmed) return;

  const history = getSavedHistory().filter(
    (item) => item.id !== currentAnalysis.id
  );

  saveHistory(history);
  currentHistoryId = null;
  renderHistory();

  setStatus("Saved analysis deleted.");
}

function resetWorkspace() {
  currentAnalysis = null;
  currentHistoryId = null;

  dashboard.classList.add("hidden");
  workspaceSection.classList.add("hidden");

  uploadInput.value = "";
  fileName.textContent = "No file selected";
  setStatus("");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* =========================================================
   Charts
   ========================================================= */

function getChartData() {
  if (!currentAnalysis) return [];

  const metrics = currentAnalysis.metrics;

  return [
    {
      label: "Cash",
      value: Math.max(metrics.estimatedCash, 0)
    },
    {
      label: "Receivables",
      value: metrics.receivables
    },
    {
      label: "Bills",
      value: metrics.payables
    }
  ];
}

function renderChart(type = "bar") {
  currentChart = type;

  chartTabs.forEach((tab) => {
    tab.classList.toggle(
      "active",
      tab.dataset.chart === type
    );
  });

  const data = getChartData();

  if (!data.length) {
    chartContainer.innerHTML = `
      <div class="chart-empty">
        Your chart will appear after an analysis is loaded.
      </div>
    `;
    chartLegend.innerHTML = "";
    return;
  }

  if (type === "pie") {
    renderPieChart(data);
  } else if (type === "line") {
    renderLineChart(data);
  } else {
    renderBarChart(data);
  }
}

function renderBarChart(data) {
  const width = 700;
  const height = 280;
  const padding = 45;
  const max = Math.max(...data.map((item) => item.value), 1);
  const chartHeight = height - padding * 2;
  const barWidth = 100;
  const gap = 65;

  const bars = data
    .map((item, index) => {
      const barHeight = (item.value / max) * chartHeight;
      const x = padding + index * (barWidth + gap);
      const y = height - padding - barHeight;

      return `
        <rect
          class="chart-bar"
          x="${x}"
          y="${y}"
          width="${barWidth}"
          height="${barHeight}"
          rx="8"
        ></rect>

        <text
          class="chart-value"
          x="${x + barWidth / 2}"
          y="${Math.max(y - 10, 15)}"
          text-anchor="middle"
        >
          ${escapeHTML(formatCurrency(item.value))}
        </text>

        <text
          class="chart-label"
          x="${x + barWidth / 2}"
          y="${height - 15}"
          text-anchor="middle"
        >
          ${escapeHTML(item.label)}
        </text>
      `;
    })
    .join("");

  chartContainer.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img">
      <line
        class="chart-axis"
        x1="${padding}"
        y1="${height - padding}"
        x2="${width - padding}"
        y2="${height - padding}"
      ></line>
      ${bars}
    </svg>
  `;

  renderLegend(data);
}

function renderLineChart(data) {
  const width = 700;
  const height = 280;
  const padding = 45;
  const max = Math.max(...data.map((item) => item.value), 1);
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((item, index) => {
    const x = padding + (index * chartWidth) / (data.length - 1);
    const y =
      height -
      padding -
      (item.value / max) * chartHeight;

    return { ...item, x, y };
  });

  const pointString = points
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  const pointMarkup = points
    .map(
      (point) => `
        <circle
          class="chart-point"
          cx="${point.x}"
          cy="${point.y}"
          r="5"
        ></circle>

        <text
          class="chart-value"
          x="${point.x}"
          y="${point.y - 13}"
          text-anchor="middle"
        >
          ${escapeHTML(formatCurrency(point.value))}
        </text>

        <text
          class="chart-label"
          x="${point.x}"
          y="${height - 15}"
          text-anchor="middle"
        >
          ${escapeHTML(point.label)}
        </text>
      `
    )
    .join("");

  chartContainer.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img">
      <line
        class="chart-axis"
        x1="${padding}"
        y1="${height - padding}"
        x2="${width - padding}"
        y2="${height - padding}"
      ></line>

      <polyline
        class="chart-line"
        points="${pointString}"
      ></polyline>

      ${pointMarkup}
    </svg>
  `;

  renderLegend(data);
}

function renderPieChart(data) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const center = 140;
  const radius = 90;

  let currentAngle = -Math.PI / 2;

  const segments = data
    .map((item, index) => {
      const angle = (item.value / total) * Math.PI * 2;
      const endAngle = currentAngle + angle;

      const x1 = center + radius * Math.cos(currentAngle);
      const y1 = center + radius * Math.sin(currentAngle);
      const x2 = center + radius * Math.cos(endAngle);
      const y2 = center + radius * Math.sin(endAngle);

      const largeArc = angle > Math.PI ? 1 : 0;

      const path = `
        M ${center} ${center}
        L ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
        Z
      `;

      currentAngle = endAngle;

      return `
        <path
          class="chart-pie-segment"
          d="${path}"
          fill="var(--${index === 0 ? "purple" : index === 1 ? "purple-light" : "green"})"
        ></path>
      `;
    })
    .join("");

  chartContainer.innerHTML = `
    <svg viewBox="0 0 700 280" role="img">
      <g transform="translate(210 0)">
        ${segments}

        <circle
          cx="${center}"
          cy="${center}"
          r="42"
          fill="var(--surface)"
        ></circle>

        <text
          class="chart-label"
          x="${center}"
          y="${center - 4}"
          text-anchor="middle"
        >
          Total
        </text>

        <text
          class="chart-value"
          x="${center}"
          y="${center + 15}"
          text-anchor="middle"
        >
          ${escapeHTML(formatCurrency(total))}
        </text>
      </g>
    </svg>
  `;

  renderLegend(data);
}

function renderLegend(data) {
  chartLegend.innerHTML = data
    .map(
      (item, index) => `
        <div class="legend-item">
          <span
            class="legend-dot"
            style="background: ${
              index === 0
                ? "var(--purple)"
                : index === 1
                  ? "var(--purple-light)"
                  : "var(--green)"
            }"
          ></span>
          <span>${escapeHTML(item.label)}</span>
        </div>
      `
    )
    .join("");
}

/* =========================================================
   Live scenario simulator
   ========================================================= */

function updateSimulation() {
  if (!currentAnalysis) return;

  const collectionImprovement = Number(collectionRate.value);
  const delayDays = Number(paymentDelay.value);

  collectionRateLabel.textContent =
    `${collectionImprovement}%`;

  paymentDelayLabel.textContent =
    `${delayDays} day${delayDays === 1 ? "" : "s"}`;

  const metrics = currentAnalysis.metrics;

  const additionalCollections =
    metrics.receivables * (collectionImprovement / 100);

  const delayedPayments =
    metrics.nonEssentialPayables *
    Math.min(delayDays / 30, 1);

  const projectedCash =
    metrics.estimatedCash +
    additionalCollections +
    delayedPayments;

  const remainingReceivables = Math.max(
    metrics.receivables -
      metrics.received -
      additionalCollections,
    0
  );

  const resultClass =
    projectedCash >= metrics.estimatedCash
      ? "is-positive"
      : "is-warning";

  simulationResult.className =
    `simulation-result ${resultClass}`;

  simulationResult.innerHTML = `
    With a <strong>${collectionImprovement}% collection improvement</strong>
    and a <strong>${delayDays}-day payment delay</strong>:

    <br /><br />

    Projected cash position:
    <strong>${escapeHTML(formatCurrency(projectedCash))}</strong>

    <br />

    Additional collections:
    <strong>${escapeHTML(formatCurrency(additionalCollections))}</strong>

    <br />

    Payments deferred:
    <strong>${escapeHTML(formatCurrency(delayedPayments))}</strong>

    <br />

    Remaining receivables:
    <strong>${escapeHTML(formatCurrency(remainingReceivables))}</strong>
  `;
}

function runSimulation() {
  updateSimulation();
}

/* =========================================================
   Fictional demo data
   ========================================================= */

function createSampleRows() {
  return [
    {
      Date: "2026-09-01",
      Customer: "Urban Nest Retail",
      Amount: 145000,
      Received: 45000,
      Outstanding: 100000
    },
    {
      Date: "2026-08-20",
      Customer: "The Home Story",
      Amount: 92000,
      Received: 20000,
      Outstanding: 72000
    },
    {
      Date: "2026-08-15",
      Customer: "Casa Bella Interiors",
      Amount: 68000,
      Received: 68000,
      Outstanding: 0
    },
    {
      Date: "2026-09-05",
      Supplier: "Jaipur Blue Pottery Works",
      Amount: 54000
    },
    {
      Date: "2026-09-07",
      Supplier: "BESCOM",
      Amount: 18000
    },
    {
      Date: "2026-09-10",
      Supplier: "Office and operations",
      Amount: 27000
    },
    {
      Date: "2026-09-02",
      Description: "Customer collections",
      MoneyIn: 68000,
      MoneyOut: 0
    },
    {
      Date: "2026-09-03",
      Description: "Operating expenses",
      MoneyIn: 0,
      MoneyOut: 22000
    },
    {
      Date: "2026-09-04",
      Description: "Opening cash balance",
      MoneyIn: 0,
      MoneyOut: 0,
      Amount: 185000
    }
  ];
}

function loadSampleData() {
  const rows = createSampleRows();

  fileName.textContent = "Fictional RIPPLE demo workspace";
  setStatus("Fictional demonstration data loaded.");

  const analysis = calculateAnalysis(
    rows,
    "Fictional RIPPLE demo workspace",
    true
  );

  renderAnalysis(analysis);
}

/* =========================================================
   File upload
   ========================================================= */

async function processFile(file) {
  if (!file) return;

  if (!window.XLSX) {
    setStatus(
      "The spreadsheet reader is still loading. Please try again.",
      true
    );
    return;
  }

  const validExtensions = [".xlsx", ".xls", ".csv"];
  const extension = file.name
    .toLowerCase()
    .slice(file.name.lastIndexOf("."));

  if (!validExtensions.includes(extension)) {
    setStatus(
      "Please upload an Excel or CSV file.",
      true
    );
    return;
  }

  try {
    setStatus("Reading your financial file...");
    fileName.textContent = file.name;

    const buffer = await file.arrayBuffer();

    const workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: true
    });

    const allRows = [];

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const rows = getRowsFromSheet(sheet);

      rows.forEach((row) => {
        allRows.push(row);
      });
    });

    if (!allRows.length) {
      throw new Error("No readable rows were found in this file.");
    }

    const analysis = calculateAnalysis(
      allRows,
      file.name,
      false
    );

    setStatus(
      `Analysis complete. ${allRows.length} rows reviewed.`
    );

    renderAnalysis(analysis);
  } catch (error) {
    console.error(error);

    setStatus(
      error.message ||
        "Something went wrong while reading the file.",
      true
    );
  }
}

/* =========================================================
   Event listeners
   ========================================================= */

saveNameButton.addEventListener("click", saveUserName);

userNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    saveUserName();
  }
});

openPrivacyButton.addEventListener("click", openPrivacyModal);

closePrivacyButton.addEventListener("click", closePrivacyModal);

privacyModal.addEventListener("click", (event) => {
  if (event.target === privacyModal) {
    closePrivacyModal();
  }
});

saveAnalysesToggle.addEventListener(
  "change",
  updateSavePreference
);

clearWorkspaceButton.addEventListener(
  "click",
  clearWorkspace
);

uploadInput.addEventListener("change", (event) => {
  processFile(event.target.files[0]);
});

sampleButton.addEventListener("click", loadSampleData);

saveCurrentAnalysisButton.addEventListener(
  "click",
  saveCurrentAnalysis
);

deleteCurrentAnalysisButton.addEventListener(
  "click",
  deleteCurrentAnalysis
);

resetButton.addEventListener(
  "click",
  resetWorkspace
);

newAnalysisButton.addEventListener(
  "click",
  resetWorkspace
);

simulateButton.addEventListener(
  "click",
  runSimulation
);

collectionRate.addEventListener(
  "input",
  updateSimulation
);

paymentDelay.addEventListener(
  "input",
  updateSimulation
);

chartTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    renderChart(tab.dataset.chart);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePrivacyModal();
  }
});

/* =========================================================
   Initialisation
   ========================================================= */

function initialise() {
  updatePersonalisation();
  renderHistory();

  const savedPreference =
    localStorage.getItem(STORAGE_SAVE_SETTING);

  saveAnalysesToggle.checked =
    savedPreference === "true";

  if (!getUserName()) {
    openWelcomeModal();
  }
}

initialise();
