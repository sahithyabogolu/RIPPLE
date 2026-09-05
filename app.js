"use strict";

/*
  FinSight Enterprise
  --------------------
  Client-side financial operations analysis.

  Important:
  - Files are processed in the browser.
  - No financial data is sent to a server by this application.
  - Outputs require professional validation.
*/

const state = {
  records: [],
  filteredRecords: [],
  currentPage: 1,
  pageSize: 15,
  currentSection: "dashboard",
  chartInstances: {},
  fileName: "",
  hasData: false,
  preferences: {
    saveHistory: true
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
  loadSampleButton: $("loadSampleButton"),
  newAnalysisButton: $("newAnalysisButton"),
  pageTitle: $("pageTitle"),
  dataStatus: $("dataStatus"),
  toast: $("toast"),
  toastMessage: $("toastMessage")
};

/* ----------------------------- Utilities ----------------------------- */

function showToast(message) {
  if (!elements.toast || !elements.toastMessage) return;

  elements.toastMessage.textContent = message;
  elements.toast.classList.remove("hidden");

  clearTimeout(showToast.timeout);

  showToast.timeout = setTimeout(() => {
    elements.toast.classList.add("hidden");
  }, 3500);
}

function formatCurrency(value) {
  const number = Number(value) || 0;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(number);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function normaliseText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
}

function cleanHeader(value) {
  return normaliseText(value).replace(/\s+/g, " ");
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

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number") {
    const excelDate = new Date(
      Math.round((value - 25569) * 86400 * 1000)
    );

    return Number.isNaN(excelDate.getTime()) ? null : excelDate;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = parseDate(value);

  if (!date) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function dateKey(value) {
  const date = parseDate(value);

  if (!date) return null;

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function downloadFile(filename, content, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

function safeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* ----------------------------- Navigation ----------------------------- */

const sectionTitles = {
  dashboard: "Executive Dashboard",
  transactions: "Transactions",
  cashflow: "Cash Flow Analysis",
  workingCapital: "Working Capital",
  risk: "Risk Centre",
  simulator: "Scenario Simulator",
  reports: "Reports & Exports",
  privacy: "Privacy & Security",
  disclaimer: "Disclaimer"
};

function showSection(sectionName) {
  state.currentSection = sectionName;

  document.querySelectorAll(".nav-item[data-section]").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.section === sectionName
    );
  });

  document.querySelectorAll(".content-section").forEach((section) => {
    section.classList.remove("active");
  });

  const section = $(`${sectionName}Section`);

  if (section) {
    section.classList.add("active");
  }

  if (elements.pageTitle) {
    elements.pageTitle.textContent =
      sectionTitles[sectionName] || "FinSight Enterprise";
  }

  elements.sidebar?.classList.remove("open");
}

function initialiseNavigation() {
  document.querySelectorAll(".nav-item[data-section]").forEach((button) => {
    button.addEventListener("click", () => {
      showSection(button.dataset.section);
    });
  });

  elements.mobileMenuButton?.addEventListener("click", () => {
    elements.sidebar?.classList.toggle("open");
  });
}

/* ----------------------------- Data loading ----------------------------- */

function findColumn(headers, possibleNames) {
  const normalisedHeaders = headers.map(cleanHeader);

  for (const name of possibleNames) {
    const target = cleanHeader(name);

    const exactIndex = normalisedHeaders.indexOf(target);

    if (exactIndex !== -1) {
      return headers[exactIndex];
    }
  }

  for (let index = 0; index < normalisedHeaders.length; index++) {
    const header = normalisedHeaders[index];

    if (
      possibleNames.some((name) => {
        const target = cleanHeader(name);
        return header.includes(target) || target.includes(header);
      })
    ) {
      return headers[index];
    }
  }

  return null;
}

function classifyRecord(record) {
  const description = normaliseText(record.description);
  const category = normaliseText(record.category);
  const type = normaliseText(record.originalType);

  const combined = `${description} ${category} ${type}`;

  if (
    combined.includes("receivable") ||
    combined.includes("customer due") ||
    combined.includes("accounts receivable") ||
    combined.includes("invoice raised")
  ) {
    return "receivable";
  }

  if (
    combined.includes("payable") ||
    combined.includes("supplier due") ||
    combined.includes("accounts payable") ||
    combined.includes("vendor")
  ) {
    return "payable";
  }

  if (
    combined.includes("income") ||
    combined.includes("revenue") ||
    combined.includes("sales") ||
    combined.includes("receipt") ||
    combined.includes("credit")
  ) {
    return "income";
  }

  if (
    combined.includes("expense") ||
    combined.includes("cost") ||
    combined.includes("purchase") ||
    combined.includes("rent") ||
    combined.includes("salary") ||
    combined.includes("debit")
  ) {
    return "expense";
  }

  if (record.inflow > 0 && record.outflow === 0) {
    return "income";
  }

  if (record.outflow > 0 && record.inflow === 0) {
    return "expense";
  }

  if (record.amount > 0) {
    return record.amountDirection === "in" ? "income" : "expense";
  }

  return "unclassified";
}

function normaliseRecord(raw, headers, index) {
  const dateColumn = findColumn(headers, [
    "date",
    "transaction date",
    "posting date",
    "invoice date",
    "value date"
  ]);

  const descriptionColumn = findColumn(headers, [
    "description",
    "narration",
    "details",
    "particulars",
    "transaction",
    "reference"
  ]);

  const categoryColumn = findColumn(headers, [
    "category",
    "account",
    "account name",
    "ledger",
    "department"
  ]);

  const typeColumn = findColumn(headers, [
    "type",
    "transaction type",
    "classification",
    "nature"
  ]);

  const amountColumn = findColumn(headers, [
    "amount",
    "value",
    "transaction amount",
    "total"
  ]);

  const inflowColumn = findColumn(headers, [
    "inflow",
    "income",
    "credit",
    "money in",
    "receipts"
  ]);

  const outflowColumn = findColumn(headers, [
    "outflow",
    "expense",
    "debit",
    "money out",
    "payments"
  ]);

  const receivableColumn = findColumn(headers, [
    "receivable",
    "receivables",
    "accounts receivable",
    "amount due from customer"
  ]);

  const payableColumn = findColumn(headers, [
    "payable",
    "payables",
    "accounts payable",
    "amount due to supplier"
  ]);

  const rawAmount = amountColumn ? parseAmount(raw[amountColumn]) : 0;
  const inflow = inflowColumn ? Math.abs(parseAmount(raw[inflowColumn])) : 0;
  const outflow = outflowColumn ? Math.abs(parseAmount(raw[outflowColumn])) : 0;

  const amountDirection =
    inflow > 0 ? "in" : outflow > 0 ? "out" : "out";

  const amount =
    rawAmount ||
    inflow ||
    outflow ||
    Math.abs(parseAmount(raw[receivableColumn])) ||
    Math.abs(parseAmount(raw[payableColumn]));

  const record = {
    id: safeId(),
    index,
    date: dateColumn ? raw[dateColumn] : null,
    description: descriptionColumn
      ? raw[descriptionColumn]
      : `Transaction ${index + 1}`,
    category: categoryColumn ? raw[categoryColumn] : "Uncategorised",
    originalType: typeColumn ? raw[typeColumn] : "",
    amount,
    inflow,
    outflow,
    receivable: receivableColumn
      ? Math.abs(parseAmount(raw[receivableColumn]))
      : 0,
    payable: payableColumn
      ? Math.abs(parseAmount(raw[payableColumn]))
      : 0,
    amountDirection,
    raw
  };

  record.type = classifyRecord(record);

  if (record.type === "income" && record.inflow === 0) {
    record.inflow = record.amount;
  }

  if (record.type === "expense" && record.outflow === 0) {
    record.outflow = record.amount;
  }

  if (record.type === "receivable" && record.receivable === 0) {
    record.receivable = record.amount;
  }

  if (record.type === "payable" && record.payable === 0) {
    record.payable = record.amount;
  }

  record.risk = assessRecordRisk(record);

  return record;
}

function assessRecordRisk(record) {
  const description = normaliseText(record.description);
  let score = 0;

  if (!record.date) score += 1;
  if (!record.description || description.length < 3) score += 1;
  if (!record.category || record.category === "Uncategorised") score += 1;
  if (!record.amount || record.amount <= 0) score += 2;
  if (record.type === "unclassified") score += 2;
  if (record.amount > 1000000) score += 1;

  if (score >= 4) return "high";
  if (score >= 2) return "medium";

  return "low";
}

function processRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("The uploaded file does not contain any records.");
  }

  const headers = Object.keys(rows[0]);

  if (headers.length === 0) {
    throw new Error("No usable columns were found.");
  }

  const records = rows
    .map((row, index) => normaliseRecord(row, headers, index))
    .filter((record) => {
      return (
        record.description ||
        record.amount ||
        record.inflow ||
        record.outflow
      );
    });

  if (records.length === 0) {
    throw new Error("No usable financial records were found.");
  }

  state.records = records;
  state.filteredRecords = [...records];
  state.currentPage = 1;
  state.hasData = true;

  updateDataStatus();
  renderAll();
  saveHistory();

  elements.welcomeScreen?.classList.add("hidden");
  elements.workspace?.classList.remove("hidden");

  showSection("dashboard");
  showToast(`${records.length} records successfully loaded.`);
}

async function readFile(file) {
  if (!file) return;

  const extension = file.name.split(".").pop().toLowerCase();

  try {
    if (extension === "csv") {
      const text = await file.text();
      const rows = parseCsv(text);
      state.fileName = file.name;
      processRows(rows);
      return;
    }

    if (["xlsx", "xls"].includes(extension)) {
      if (!window.XLSX) {
        throw new Error("Spreadsheet library could not be loaded.");
      }

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, {
        defval: ""
      });

      state.fileName = file.name;
      processRows(rows);
      return;
    }

    throw new Error("Please upload a CSV or Excel file.");
  } catch (error) {
    showToast(error.message || "Unable to process the file.");
  }
}

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("The CSV file must contain a header and at least one row.");
  }

  const parseLine = (line) => {
    const result = [];
    let current = "";
    let insideQuotes = false;

    for (let index = 0; index < line.length; index++) {
      const character = line[index];

      if (character === '"' && line[index + 1] === '"') {
        current += '"';
        index++;
        continue;
      }

      if (character === '"') {
        insideQuotes = !insideQuotes;
        continue;
      }

      if (character === "," && !insideQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += character;
      }
    }

    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

/* ----------------------------- Sample data ----------------------------- */

function loadSampleData() {
  const sampleRows = [
    {
      Date: "2026-01-05",
      Description: "Customer payment - Alpha Industries",
      Category: "Sales",
      Type: "Income",
      Amount: 420000
    },
    {
      Date: "2026-01-08",
      Description: "Office rent",
      Category: "Administration",
      Type: "Expense",
      Amount: 85000
    },
    {
      Date: "2026-01-12",
      Description: "Supplier invoice - Beta Supplies",
      Category: "Accounts Payable",
      Type: "Payable",
      Amount: 160000
    },
    {
      Date: "2026-01-18",
      Description: "Customer invoice outstanding",
      Category: "Accounts Receivable",
      Type: "Receivable",
      Amount: 230000
    },
    {
      Date: "2026-02-03",
      Description: "Customer payment - Gamma Retail",
      Category: "Sales",
      Type: "Income",
      Amount: 510000
    },
    {
      Date: "2026-02-10",
      Description: "Employee salaries",
      Category: "Payroll",
      Type: "Expense",
      Amount: 190000
    },
    {
      Date: "2026-02-15",
      Description: "Software subscriptions",
      Category: "Technology",
      Type: "Expense",
      Amount: 45000
    },
    {
      Date: "2026-03-04",
      Description: "Customer payment - Alpha Industries",
      Category: "Sales",
      Type: "Income",
      Amount: 390000
    },
    {
      Date: "2026-03-11",
      Description: "Supplier payment",
      Category: "Accounts Payable",
      Type: "Payable",
      Amount: 125000
    },
    {
      Date: "2026-03-20",
      Description: "Marketing campaign",
      Category: "Marketing",
      Type: "Expense",
      Amount: 90000
    }
  ];

  state.fileName = "Sample Dataset";
  processRows(sampleRows);
}

/* ----------------------------- Calculations ----------------------------- */

function getTotals() {
  const records = state.records;

  const totalInflows = records.reduce(
    (sum, record) => sum + record.inflow,
    0
  );

  const totalOutflows = records.reduce(
    (sum, record) => sum + record.outflow,
    0
  );

  const receivables = records.reduce(
    (sum, record) => sum + record.receivable,
    0
  );

  const payables = records.reduce(
    (sum, record) => sum + record.payable,
    0
  );

  const netCashFlow = totalInflows - totalOutflows;

  return {
    totalInflows,
    totalOutflows,
    receivables,
    payables,
    netCashFlow,
    estimatedCash: netCashFlow
  };
}

function getMonthlyData() {
  const months = {};

  state.records.forEach((record) => {
    const key = dateKey(record.date);

    if (!key) return;

    if (!months[key]) {
      months[key] = {
        month: key,
        inflows: 0,
        outflows: 0,
        net: 0
      };
    }

    months[key].inflows += record.inflow;
    months[key].outflows += record.outflow;
    months[key].net =
      months[key].inflows - months[key].outflows;
  });

  return Object.values(months).sort((a, b) =>
    a.month.localeCompare(b.month)
  );
}

function getRiskAssessment() {
  const records = state.records;

  const highRiskCount = records.filter(
    (record) => record.risk === "high"
  ).length;

  const mediumRiskCount = records.filter(
    (record) => record.risk === "medium"
  ).length;

  const unclassifiedCount = records.filter(
    (record) => record.type === "unclassified"
  ).length;

  const missingDateCount = records.filter(
    (record) => !record.date
  ).length;

  const total = records.length || 1;

  let score =
    (highRiskCount * 8 +
      mediumRiskCount * 3 +
      unclassifiedCount * 4 +
      missingDateCount * 2) /
    total;

  score = Math.min(100, Math.round(score * 10));

  let label = "Low risk";

  if (score >= 60) {
    label = "High attention required";
  } else if (score >= 30) {
    label = "Moderate attention required";
  }

  return {
    score,
    label,
    highRiskCount,
    mediumRiskCount,
    unclassifiedCount,
    missingDateCount
  };
}

function getDataQuality() {
  const total = state.records.length || 1;

  const valid = state.records.filter((record) => {
    return (
      record.date &&
      record.description &&
      record.amount > 0 &&
      record.type !== "unclassified"
    );
  }).length;

  const score = Math.round((valid / total) * 100);

  return {
    total: state.records.length,
    valid,
    unclassified: state.records.filter(
      (record) => record.type === "unclassified"
    ).length,
    score
  };
}

/* ----------------------------- Rendering ----------------------------- */

function updateDataStatus() {
  if (!elements.dataStatus) return;

  if (!state.hasData) {
    elements.dataStatus.innerHTML = `
      <span class="status-dot"></span>
      No data loaded
    `;
    return;
  }

  elements.dataStatus.innerHTML = `
    <span class="status-dot" style="background:#18794e"></span>
    ${escapeHtml(state.fileName || "Dataset loaded")}
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
  const risk = getRiskAssessment();
  const quality = getDataQuality();

  $("totalInflows").textContent = formatCurrency(totals.totalInflows);
  $("totalOutflows").textContent = formatCurrency(totals.totalOutflows);
  $("netCashFlow").textContent = formatCurrency(totals.netCashFlow);
  $("estimatedCash").textContent = formatCurrency(totals.estimatedCash);

  $("cashFlowFootnote").textContent =
    totals.netCashFlow >= 0
      ? "Positive net cash movement"
      : "Negative net cash movement";

  $("riskScore").textContent = risk.score;
  $("riskScoreLabel").textContent = risk.label;

  $("riskScoreDescription").textContent =
    risk.score >= 60
      ? "Several records require immediate review."
      : risk.score >= 30
      ? "Some records require management attention."
      : "No significant issues detected from available data.";

  $("recordCount").textContent = formatNumber(quality.total);
  $("validRecordCount").textContent = formatNumber(quality.valid);
  $("unclassifiedCount").textContent = formatNumber(quality.unclassified);
  $("dataQualityScore").textContent = `${quality.score}%`;

  $("cashPositionValue").textContent = formatCurrency(
    totals.estimatedCash
  );

  const cashBar = $("cashPositionBar");

  if (cashBar) {
    const max = Math.max(
      totals.totalInflows,
      totals.totalOutflows,
      Math.abs(totals.estimatedCash),
      1
    );

    cashBar.style.width = `${Math.min(
      100,
      (Math.abs(totals.estimatedCash) / max) * 100
    )}%`;

    cashBar.style.background =
      totals.estimatedCash >= 0
        ? "var(--success)"
        : "var(--danger)";
  }

  $("cashPositionMessage").textContent =
    totals.estimatedCash >= 0
      ? "The available dataset indicates a positive net cash position."
      : "The available dataset indicates a negative net cash position.";

  renderRiskSummary();
  renderCashFlowChart();
}

function renderRiskSummary() {
  const risk = getRiskAssessment();
  const container = $("riskSummaryList");

  if (!container) return;

  const items = [
    ["High-risk records", risk.highRiskCount],
    ["Medium-risk records", risk.mediumRiskCount],
    ["Unclassified records", risk.unclassifiedCount],
    ["Records without dates", risk.missingDateCount]
  ];

  container.innerHTML = items
    .map(
      ([label, value]) => `
        <div class="risk-summary-item">
          <span>${escapeHtml(label)}</span>
          <strong>${formatNumber(value)}</strong>
        </div>
      `
    )
    .join("");
}

function renderCashFlowChart() {
  const monthlyData = getMonthlyData();
  const canvas = $("cashFlowChart");
  const empty = $("cashFlowChartEmpty");

  if (!canvas) return;

  if (monthlyData.length === 0) {
    canvas.classList.add("hidden");
    empty?.classList.remove("hidden");
    return;
  }

  canvas.classList.remove("hidden");
  empty?.classList.add("hidden");

  drawLineChart(
    canvas,
    monthlyData.map((item) => item.month),
    [
      {
        label: "Inflows",
        values: monthlyData.map((item) => item.inflows)
      },
      {
        label: "Outflows",
        values: monthlyData.map((item) => item.outflows)
      },
      {
        label: "Net",
        values: monthlyData.map((item) => item.net)
      }
    ]
  );
}

function renderTransactions() {
  applyTransactionFilters();

  const body = $("transactionsTableBody");

  if (!body) return;

  const start = (state.currentPage - 1) * state.pageSize;
  const pageRecords = state.filteredRecords.slice(
    start,
    start + state.pageSize
  );

  if (pageRecords.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6" class="empty-table">
          No matching transactions found.
        </td>
      </tr>
    `;
  } else {
    body.innerHTML = pageRecords
      .map(
        (record) => `
          <tr>
            <td>${escapeHtml(formatDate(record.date))}</td>
            <td>${escapeHtml(record.description)}</td>
            <td>${escapeHtml(record.category)}</td>
            <td>
              <span class="type-badge type-${escapeHtml(record.type)}">
                ${escapeHtml(record.type)}
              </span>
            </td>
            <td>${escapeHtml(formatCurrency(record.amount))}</td>
            <td>
              <span class="risk-badge risk-${escapeHtml(record.risk)}">
                ${escapeHtml(record.risk)}
              </span>
            </td>
          </tr>
        `
      )
      .join("");
  }

  const totalPages = Math.max(
    1,
    Math.ceil(state.filteredRecords.length / state.pageSize)
  );

  $("pageIndicator").textContent = `Page ${state.currentPage} of ${totalPages}`;

  $("transactionTableSummary").textContent =
    `${state.filteredRecords.length} matching record(s)`;

  $("previousPageButton").disabled = state.currentPage <= 1;
  $("nextPageButton").disabled = state.currentPage >= totalPages;
}

function applyTransactionFilters() {
  const search = normaliseText(
    $("transactionSearch")?.value || ""
  );

  const type = $("transactionTypeFilter")?.value || "all";

  state.filteredRecords = state.records.filter((record) => {
    const searchable = normaliseText(
      `${record.description} ${record.category} ${record.type}`
    );

    const matchesSearch =
      !search || searchable.includes(search);

    const matchesType =
      type === "all" || record.type === type;

    return matchesSearch && matchesType;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(state.filteredRecords.length / state.pageSize)
  );

  if (state.currentPage > totalPages) {
    state.currentPage = totalPages;
  }
}

function renderCashFlow() {
  const monthlyData = getMonthlyData();
  const totals = getTotals();

  const months = Math.max(monthlyData.length, 1);

  const averageInflow = totals.totalInflows / months;
  const averageOutflow = totals.totalOutflows / months;
  const burnRate = Math.max(0, averageOutflow - averageInflow);

  $("averageMonthlyInflow").textContent =
    formatCurrency(averageInflow);

  $("averageMonthlyOutflow").textContent =
    formatCurrency(averageOutflow);

  $("monthlyBurnRate").textContent =
    formatCurrency(burnRate);

  renderForecastChart();

  $("cashFlowCommentary").textContent =
    totals.netCashFlow >= 0
      ? `The dataset indicates positive net cash flow of ${formatCurrency(
          totals.netCashFlow
        )}. Management should continue monitoring the timing of collections,
        supplier payments, and recurring operating costs.`
      : `The dataset indicates negative net cash flow of ${formatCurrency(
          Math.abs(totals.netCashFlow)
        )}. Management should review collection timing, discretionary spending,
        and upcoming payment obligations.`;
}

function renderForecastChart() {
  const monthlyData = getMonthlyData();
  const canvas = $("forecastChart");

  if (!canvas) return;

  const totals = getTotals();
  const months = Math.max(monthlyData.length, 1);
  const averageNet = totals.netCashFlow / months;

  const labels = [];
  const values = [];

  let currentValue = totals.estimatedCash;

  for (let index = 1; index <= 6; index++) {
    labels.push(`Month ${index}`);
    currentValue += averageNet;
    values.push(currentValue);
  }

  drawLineChart(canvas, labels, [
    {
      label: "Projected cash position",
      values
    }
  ]);
}

function renderWorkingCapital() {
  const totals = getTotals();

  $("receivablesValue").textContent =
    formatCurrency(totals.receivables);

  $("payablesValue").textContent =
    formatCurrency(totals.payables);

  const receivableRecords = state.records
    .filter((record) => record.type === "receivable")
    .slice(0, 8);

  const payableRecords = state.records
    .filter((record) => record.type === "payable")
    .slice(0, 8);

  renderOperationsList($("receivablesList"), receivableRecords);
  renderOperationsList($("payablesList"), payableRecords);
}

function renderOperationsList(container, records) {
  if (!container) return;

  if (records.length === 0) {
    container.innerHTML = `
      <div class="empty-state-small">
        No records available.
      </div>
    `;
    return;
  }

  container.innerHTML = records
    .map(
      (record) => `
        <div class="operation-row">
          <div>
            <strong>${escapeHtml(record.description)}</strong>
            <span>${escapeHtml(formatDate(record.date))}</span>
          </div>
          <strong>${escapeHtml(formatCurrency(record.amount))}</strong>
        </div>
      `
    )
    .join("");
}

function renderRisk() {
  const risk = getRiskAssessment();

  $("overallRiskScore").textContent = risk.score;
  $("highRiskCount").textContent = risk.highRiskCount;
  $("dataExceptionCount").textContent =
    risk.unclassifiedCount + risk.missingDateCount;

  const riskRecords = state.records
    .filter((record) => record.risk !== "low")
    .sort((a, b) => {
      const weight = {
        high: 3,
        medium: 2,
        low: 1
      };

      return weight[b.risk] - weight[a.risk];
    });

  const container = $("riskRegister");

  if (!container) return;

  if (riskRecords.length === 0) {
    container.innerHTML = `
      <div class="empty-state-small">
        No elevated-risk records were identified.
      </div>
    `;
    return;
  }

  container.innerHTML = riskRecords
    .map((record) => {
      const reasons = [];

      if (!record.date) reasons.push("Missing date");
      if (!record.description) reasons.push("Missing description");
      if (!record.category || record.category === "Uncategorised") {
        reasons.push("Missing category");
      }
      if (record.type === "unclassified") {
        reasons.push("Unclassified transaction");
      }
      if (!record.amount || record.amount <= 0) {
        reasons.push("Missing amount");
      }
      if (record.amount > 1000000) {
        reasons.push("High-value transaction");
      }

      return `
        <div class="risk-summary-item">
          <div>
            <strong>${escapeHtml(record.description)}</strong>
            <div>${escapeHtml(reasons.join(" • ") || "Review required")}</div>
          </div>

          <span class="risk-badge risk-${escapeHtml(record.risk)}">
            ${escapeHtml(record.risk)}
          </span>
        </div>
      `;
    })
    .join("");
}

/* ----------------------------- Charts ----------------------------- */

function drawLineChart(canvas, labels, datasets) {
  const context = canvas.getContext("2d");

  if (!context) return;

  const rect = canvas.getBoundingClientRect();
  const width = Math.max(rect.width, 300);
  const height = Math.max(rect.height, 270);
  const ratio = window.devicePixelRatio || 1;

  canvas.width = width * ratio;
  canvas.height = height * ratio;

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  const padding = {
    top: 25,
    right: 25,
    bottom: 45,
    left: 60
  };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allValues = datasets.flatMap((dataset) => dataset.values);

  let minValue = Math.min(...allValues, 0);
  let maxValue = Math.max(...allValues, 1);

  if (minValue === maxValue) {
    maxValue += 1;
  }

  const range = maxValue - minValue;

  const xPosition = (index) => {
    if (labels.length <= 1) return padding.left + chartWidth / 2;

    return (
      padding.left +
      (index / (labels.length - 1)) * chartWidth
    );
  };

  const yPosition = (value) => {
    return (
      padding.top +
      chartHeight -
      ((value - minValue) / range) * chartHeight
    );
  };

  context.font = "11px Arial";
  context.lineWidth = 1;
  context.strokeStyle = "#e3e8ef";
  context.fillStyle = "#687386";

  for (let index = 0; index <= 4; index++) {
    const y = padding.top + (index / 4) * chartHeight;
    const value = maxValue - (index / 4) * range;

    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();

    context.fillText(
      formatCompactCurrency(value),
      5,
      y + 4
    );
  }

  labels.forEach((label, index) => {
    const x = xPosition(index);

    context.fillText(
      label,
      x - 22,
      height - 15
    );
  });

  const lineStyles = [
    "#1f4f8f",
    "#b42318",
    "#18794e"
  ];

  datasets.forEach((dataset, datasetIndex) => {
    context.beginPath();
    context.strokeStyle =
      lineStyles[datasetIndex % lineStyles.length];
    context.lineWidth = 2.5;

    dataset.values.forEach((value, index) => {
      const x = xPosition(index);
      const y = yPosition(value);

      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });

    context.stroke();

    dataset.values.forEach((value, index) => {
      const x = xPosition(index);
      const y = yPosition(value);

      context.beginPath();
      context.fillStyle =
        lineStyles[datasetIndex % lineStyles.length];
      context.arc(x, y, 3.5, 0, Math.PI * 2);
      context.fill();
    });
  });
}

function formatCompactCurrency(value) {
  const number = Number(value) || 0;

  if (Math.abs(number) >= 10000000) {
    return `₹${(number / 10000000).toFixed(1)}Cr`;
  }

  if (Math.abs(number) >= 100000) {
    return `₹${(number / 100000).toFixed(1)}L`;
  }

  if (Math.abs(number) >= 1000) {
    return `₹${(number / 1000).toFixed(1)}K`;
  }

  return `₹${Math.round(number)}`;
}

/* ----------------------------- Simulator ----------------------------- */

function updateSliderLabels() {
  $("inflowAdjustmentValue").textContent =
    `${$("inflowAdjustment").value}%`;

  $("outflowAdjustmentValue").textContent =
    `${$("outflowAdjustment").value}%`;
}

function runScenario() {
  if (!state.hasData) return;

  const totals = getTotals();

  const inflowAdjustment =
    Number($("inflowAdjustment")?.value || 0) / 100;

  const outflowAdjustment =
    Number($("outflowAdjustment")?.value || 0) / 100;

  const months =
    Number($("scenarioMonths")?.value || 6);

  const monthlyInflows =
    totals.totalInflows / Math.max(getMonthlyData().length, 1);

  const monthlyOutflows =
    totals.totalOutflows / Math.max(getMonthlyData().length, 1);

  const projectedInflows =
    monthlyInflows * (1 + inflowAdjustment) * months;

  const projectedOutflows =
    monthlyOutflows * (1 + outflowAdjustment) * months;

  const projectedNet =
    projectedInflows - projectedOutflows;

  const projectedCash =
    totals.estimatedCash + projectedNet;

  $("scenarioInflows").textContent =
    formatCurrency(projectedInflows);

  $("scenarioOutflows").textContent =
    formatCurrency(projectedOutflows);

  $("scenarioNetCashFlow").textContent =
    formatCurrency(projectedNet);

  $("scenarioCashPosition").textContent =
    formatCurrency(projectedCash);

  $("scenarioCommentary").textContent =
    projectedCash >= 0
      ? `Under this scenario, the projected cash position remains positive at ${formatCurrency(
          projectedCash
        )}. This is an estimate based on average historical activity.`
      : `Under this scenario, the projected cash position becomes negative by ${formatCurrency(
          Math.abs(projectedCash)
        )}. Management should review liquidity buffers and payment timing.`;
}

/* ----------------------------- Export ----------------------------- */

function recordsToCsv(records) {
  if (!records.length) return "";

  const headers = [
    "Date",
    "Description",
    "Category",
    "Type",
    "Amount",
    "Inflow",
    "Outflow",
    "Receivable",
    "Payable",
    "Risk"
  ];

  const rows = records.map((record) => [
    record.date || "",
    record.description,
    record.category,
    record.type,
    record.amount,
    record.inflow,
    record.outflow,
    record.receivable,
    record.payable,
    record.risk
  ]);

  return [headers, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");
}

function exportTransactions() {
  if (!state.hasData) {
    showToast("Load data before exporting transactions.");
    return;
  }

  downloadFile(
    "finsight-transaction-register.csv",
    recordsToCsv(state.records),
    "text/csv;charset=utf-8"
  );

  showToast("Transaction register exported.");
}

function exportRiskRegister() {
  if (!state.hasData) {
    showToast("Load data before exporting risks.");
    return;
  }

  const riskRecords = state.records.filter(
    (record) => record.risk !== "low"
  );

  const csv = recordsToCsv(riskRecords);

  downloadFile(
    "finsight-risk-register.csv",
    csv,
    "text/csv;charset=utf-8"
  );

  showToast("Risk register exported.");
}

function exportExecutiveSummary() {
  if (!state.hasData) {
    showToast("Load data before exporting the summary.");
    return;
  }

  const totals = getTotals();
  const risk = getRiskAssessment();
  const quality = getDataQuality();

  const summary = [
    "FINSIGHT ENTERPRISE",
    "EXECUTIVE FINANCIAL SUMMARY",
    "",
    `Dataset: ${state.fileName}`,
    `Generated: ${new Date().toLocaleString("en-IN")}`,
    "",
    `Total inflows: ${formatCurrency(totals.totalInflows)}`,
    `Total outflows: ${formatCurrency(totals.totalOutflows)}`,
    `Net cash flow: ${formatCurrency(totals.netCashFlow)}`,
    `Estimated cash position: ${formatCurrency(totals.estimatedCash)}`,
    `Receivables: ${formatCurrency(totals.receivables)}`,
    `Payables: ${formatCurrency(totals.payables)}`,
    "",
    `Risk score: ${risk.score}`,
    `Risk assessment: ${risk.label}`,
    `High-risk records: ${risk.highRiskCount}`,
    `Data quality score: ${quality.score}%`,
    "",
    "DISCLAIMER",
    "This report is generated for analytical decision support only.",
    "It is not a substitute for professional accounting, audit, tax, legal,",
    "treasury, investment, or financial advice."
  ].join("\n");

  downloadFile(
    "finsight-executive-summary.txt",
    summary,
    "text/plain;charset=utf-8"
  );

  showToast("Executive summary exported.");
}

/* ----------------------------- Local history ----------------------------- */

function saveHistory() {
  if (!state.preferences.saveHistory || !state.hasData) return;

  try {
    const history = {
      fileName: state.fileName,
      records: state.records,
      savedAt: new Date().toISOString()
    };

    localStorage.setItem(
      "finsight-analysis-history",
      JSON.stringify(history)
    );
  } catch {
    showToast("The browser could not save local analysis history.");
  }
}

function loadHistory() {
  try {
    const saved = localStorage.getItem(
      "finsight-analysis-history"
    );

    if (!saved) return;

    const history = JSON.parse(saved);

    if (!history.records || !Array.isArray(history.records)) {
      return;
    }

    state.fileName = history.fileName || "Saved analysis";
    state.records = history.records;
    state.filteredRecords = [...state.records];
    state.hasData = state.records.length > 0;

    if (state.hasData) {
      updateDataStatus();
      renderAll();
      elements.welcomeScreen?.classList.add("hidden");
      elements.workspace?.classList.remove("hidden");
    }
  } catch {
    localStorage.removeItem("finsight-analysis-history");
  }
}

/* ----------------------------- Reset ----------------------------- */

function resetApplication() {
  const confirmed = window.confirm(
    "Start a new analysis? Current browser-stored analysis data will be cleared."
  );

  if (!confirmed) return;

  state.records = [];
  state.filteredRecords = [];
  state.currentPage = 1;
  state.fileName = "";
  state.hasData = false;

  localStorage.removeItem("finsight-analysis-history");

  elements.workspace?.classList.add("hidden");
  elements.welcomeScreen?.classList.remove("hidden");

  updateDataStatus();
  showToast("New analysis workspace created.");
}

/* ----------------------------- Event listeners ----------------------------- */

function initialiseEvents() {
  elements.uploadDataButton?.addEventListener("click", () => {
    elements.fileInput?.click();
  });

  elements.fileInput?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];

    if (file) {
      readFile(file);
    }

    event.target.value = "";
  });

  elements.loadSampleButton?.addEventListener(
    "click",
    loadSampleData
  );

  elements.newAnalysisButton?.addEventListener(
    "click",
    resetApplication
  );

  $("transactionSearch")?.addEventListener("input", () => {
    state.currentPage = 1;
    renderTransactions();
  });

  $("transactionTypeFilter")?.addEventListener("change", () => {
    state.currentPage = 1;
    renderTransactions();
  });

  $("previousPageButton")?.addEventListener("click", () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderTransactions();
    }
  });

  $("nextPageButton")?.addEventListener("click", () => {
    const totalPages = Math.max(
      1,
      Math.ceil(state.filteredRecords.length / state.pageSize)
    );

    if (state.currentPage < totalPages) {
      state.currentPage++;
      renderTransactions();
    }
  });

  $("downloadCsvButton")?.addEventListener(
    "click",
    exportTransactions
  );

  $("exportReportButton")?.addEventListener(
    "click",
    exportExecutiveSummary
  );

  $("exportExecutiveReportButton")?.addEventListener(
    "click",
    exportExecutiveSummary
  );

  $("exportTransactionReportButton")?.addEventListener(
    "click",
    exportTransactions
  );

  $("exportRiskReportButton")?.addEventListener(
    "click",
    exportRiskRegister
  );

  $("inflowAdjustment")?.addEventListener(
    "input",
    updateSliderLabels
  );

  $("outflowAdjustment")?.addEventListener(
    "input",
    updateSliderLabels
  );

  $("scenarioMonths")?.addEventListener(
    "change",
    runScenario
  );

  $("runScenarioButton")?.addEventListener(
    "click",
    runScenario
  );

  window.addEventListener("resize", () => {
    if (state.hasData) {
      renderCashFlowChart();
      renderForecastChart();
    }
  });
}

/* ----------------------------- Initialise ----------------------------- */

function initialiseApplication() {
  initialiseNavigation();
  initialiseEvents();
  updateSliderLabels();
  updateDataStatus();
  loadHistory();
}

document.addEventListener(
  "DOMContentLoaded",
  initialiseApplication
);
