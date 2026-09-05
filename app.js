const uploadInput = document.getElementById("csvFile");
const fileName = document.getElementById("fileName");
const statusMessage = document.getElementById("statusMessage");
const errorMessage = document.getElementById("errorMessage");

const dashboard = document.getElementById("dashboard");
const cashValue = document.getElementById("cashValue");
const receivablesValue = document.getElementById("receivablesValue");
const billsValue = document.getElementById("billsValue");

const actionsList = document.getElementById("actionsList");
const riskSummary = document.getElementById("riskSummary");
const dataQuality = document.getElementById("dataQuality");
const evidenceList = document.getElementById("evidenceList");

const collectionRate = document.getElementById("collectionRate");
const paymentDelay = document.getElementById("paymentDelay");
const collectionRateValue = document.getElementById("collectionRateValue");
const paymentDelayValue = document.getElementById("paymentDelayValue");
const simulateButton = document.getElementById("simulateButton");
const simulationResult = document.getElementById("simulationResult");

const resetButton = document.getElementById("resetButton");
const sampleButton = document.getElementById("sampleButton");

let currentAnalysis = null;

const aliases = {
  date: [
    "date",
    "transaction date",
    "invoice date",
    "bill date",
    "payment date"
  ],

  dueDate: [
    "due date",
    "payment due date",
    "deadline",
    "expected payment date"
  ],

  description: [
    "description",
    "details",
    "particulars",
    "narration",
    "transaction description",
    "name"
  ],

  customer: [
    "customer",
    "customer name",
    "client",
    "client name",
    "buyer",
    "buyer name"
  ],

  supplier: [
    "supplier",
    "supplier name",
    "vendor",
    "vendor name",
    "payee"
  ],

  amount: [
    "amount",
    "total amount",
    "invoice amount",
    "bill amount",
    "value",
    "total"
  ],

  moneyIn: [
    "money in",
    "cash inflow",
    "inflow",
    "credit",
    "credits",
    "received",
    "income",
    "cash received"
  ],

  moneyOut: [
    "money out",
    "cash outflow",
    "outflow",
    "debit",
    "debits",
    "paid",
    "expense",
    "expenses",
    "cash paid"
  ],

  outstanding: [
    "outstanding",
    "outstanding amount",
    "balance due",
    "amount due",
    "unpaid amount",
    "remaining amount"
  ],

  received: [
    "amount received",
    "received amount",
    "amount paid",
    "paid amount",
    "collected",
    "collection"
  ],

  essential: [
    "essential",
    "essential / non-essential",
    "priority",
    "critical",
    "payment priority"
  ],

  openingCash: [
    "opening cash",
    "opening balance",
    "starting cash",
    "opening cash balance"
  ],

  closingCash: [
    "closing cash",
    "closing balance",
    "ending cash",
    "ending balance",
    "cash balance"
  ],

  expectedCollections: [
    "expected customer collections",
    "expected collections",
    "customer collections",
    "expected receipts",
    "forecast collections"
  ],

  otherInflows: [
    "expected other inflows",
    "other inflows",
    "other income",
    "other receipts"
  ],

  essentialPayments: [
    "essential payments",
    "essential outflows",
    "critical payments",
    "mandatory payments"
  ],

  nonEssentialPayments: [
    "non-essential payments",
    "non essential payments",
    "discretionary payments",
    "optional payments"
  ]
};

function cleanText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[_-]+/g, " ");
}

function normaliseHeader(value) {
  return cleanText(value)
    .replace(/[₹$€£,%()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findColumn(headers, possibleNames) {
  const normalisedHeaders = headers.map(normaliseHeader);

  for (const name of possibleNames) {
    const target = normaliseHeader(name);
    const exactIndex = normalisedHeaders.indexOf(target);

    if (exactIndex !== -1) {
      return headers[exactIndex];
    }
  }

  for (const name of possibleNames) {
    const target = normaliseHeader(name);

    const partialIndex = normalisedHeaders.findIndex(header =>
      header.includes(target) || target.includes(header)
    );

    if (partialIndex !== -1) {
      return headers[partialIndex];
    }
  }

  return null;
}

function getValue(row, column) {
  if (!column) return "";
  return row[column];
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  let text = String(value).trim();

  if (!text) return null;

  const isNegative =
    text.includes("(") &&
    text.includes(")");

  text = text
    .replace(/[₹$€£,\s]/g, "")
    .replace(/[()]/g, "")
    .replace(/[^\d.-]/g, "");

  if (!text || text === "-" || text === ".") {
    return null;
  }

  const number = Number(text);

  if (!Number.isFinite(number)) {
    return null;
  }

  return isNegative ? -Math.abs(number) : number;
}

function parseDate(value) {
  if (!value) return null;

  if (value instanceof Date && !isNaN(value)) {
    return value;
  }

  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(
      excelEpoch.getTime() + value * 86400000
    );

    return isNaN(date) ? null : date;
  }

  const text = String(value).trim();

  const date = new Date(text);

  if (!isNaN(date)) {
    return date;
  }

  const parts = text.split(/[\/.-]/);

  if (parts.length === 3) {
    const day = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const year = Number(parts[2]);

    const parsed = new Date(year, month, day);

    if (!isNaN(parsed)) {
      return parsed;
    }
  }

  return null;
}

function formatCurrency(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(value) {
  if (!value) return "Unknown date";

  const date = value instanceof Date ? value : parseDate(value);

  if (!date) return "Unknown date";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function isEssential(value) {
  const text = cleanText(value);

  if (
    text.includes("non") ||
    text.includes("optional") ||
    text.includes("discretionary")
  ) {
    return false;
  }

  return (
    text.includes("essential") ||
    text.includes("critical") ||
    text.includes("mandatory") ||
    text.includes("high") ||
    text === "yes" ||
    text === "true"
  );
}

function isOverdue(row) {
  const status = cleanText(row.status);

  if (
    status.includes("overdue") ||
    status.includes("late") ||
    status.includes("past due")
  ) {
    return true;
  }

  if (row.dueDate) {
    const dueDate = parseDate(row.dueDate);

    if (dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return dueDate < today && (row.outstanding ?? 0) > 0;
    }
  }

  return false;
}

function classifySheet(headers, rows) {
  const headerText = headers.map(normaliseHeader).join(" ");

  if (
    headerText.includes("opening cash") ||
    headerText.includes("closing cash") ||
    headerText.includes("cash risk") ||
    headerText.includes("expected customer collections")
  ) {
    return "forecast";
  }

  if (
    headerText.includes("invoice") ||
    headerText.includes("customer") ||
    headerText.includes("amount received") ||
    headerText.includes("invoice amount")
  ) {
    return "receivables";
  }

  if (
    headerText.includes("bill number") ||
    headerText.includes("supplier") ||
    headerText.includes("bill amount") ||
    headerText.includes("amount paid")
  ) {
    return "payables";
  }

  if (
    headerText.includes("money in") ||
    headerText.includes("money out") ||
    headerText.includes("transaction id") ||
    headerText.includes("transaction date")
  ) {
    return "transactions";
  }

  if (
    headerText.includes("units in stock") ||
    headerText.includes("inventory value") ||
    headerText.includes("reorder level")
  ) {
    return "inventory";
  }

  const firstRows = rows
    .slice(0, 5)
    .map(row => Object.values(row).join(" ").toLowerCase())
    .join(" ");

  if (
    firstRows.includes("invoice") &&
    firstRows.includes("customer")
  ) {
    return "receivables";
  }

  if (
    firstRows.includes("supplier") &&
    firstRows.includes("bill")
  ) {
    return "payables";
  }

  return "unknown";
}

function normaliseTransactions(headers, rows) {
  const dateColumn = findColumn(headers, aliases.date);
  const descriptionColumn = findColumn(headers, aliases.description);
  const moneyInColumn = findColumn(headers, aliases.moneyIn);
  const moneyOutColumn = findColumn(headers, aliases.moneyOut);
  const amountColumn = findColumn(headers, aliases.amount);

  return rows
    .map(row => {
      let moneyIn = parseNumber(getValue(row, moneyInColumn));
      let moneyOut = parseNumber(getValue(row, moneyOutColumn));

      if (
        moneyIn === null &&
        moneyOut === null &&
        amountColumn
      ) {
        const amount = parseNumber(getValue(row, amountColumn));
        const description = cleanText(
          getValue(row, descriptionColumn)
        );

        if (
          description.includes("sale") ||
          description.includes("receipt") ||
          description.includes("income") ||
          description.includes("collection") ||
          description.includes("credit")
        ) {
          moneyIn = amount;
          moneyOut = 0;
        } else if (amount !== null) {
          moneyIn = 0;
          moneyOut = amount;
        }
      }

      return {
        date: parseDate(getValue(row, dateColumn)),
        description: getValue(row, descriptionColumn),
        moneyIn: moneyIn ?? 0,
        moneyOut: moneyOut ?? 0
      };
    })
    .filter(row =>
      row.moneyIn !== 0 ||
      row.moneyOut !== 0 ||
      row.date
    );
}

function normaliseReceivables(headers, rows) {
  const customerColumn = findColumn(headers, aliases.customer);
  const dateColumn = findColumn(headers, aliases.date);
  const dueDateColumn = findColumn(headers, aliases.dueDate);
  const amountColumn = findColumn(headers, [
    "invoice amount",
    "total invoice amount",
    "amount"
  ]);
  const receivedColumn = findColumn(headers, aliases.received);
  const outstandingColumn = findColumn(headers, aliases.outstanding);
  const statusColumn = findColumn(headers, [
    "payment status",
    "status"
  ]);
  const priorityColumn = findColumn(headers, [
    "customer priority",
    "priority"
  ]);

  return rows
    .map(row => {
      const amount = parseNumber(getValue(row, amountColumn));
      const received = parseNumber(getValue(row, receivedColumn));
      let outstanding = parseNumber(
        getValue(row, outstandingColumn)
      );

      if (outstanding === null && amount !== null) {
        outstanding = Math.max(
          amount - (received ?? 0),
          0
        );
      }

      return {
        customer: getValue(row, customerColumn) || "Unnamed customer",
        date: parseDate(getValue(row, dateColumn)),
        dueDate: parseDate(getValue(row, dueDateColumn)),
        amount: amount ?? 0,
        received: received ?? 0,
        outstanding: outstanding ?? 0,
        status: getValue(row, statusColumn),
        priority: getValue(row, priorityColumn)
      };
    })
    .filter(row =>
      row.outstanding > 0 ||
      row.amount > 0 ||
      row.customer !== "Unnamed customer"
    );
}

function normalisePayables(headers, rows) {
  const supplierColumn = findColumn(headers, aliases.supplier);
  const dateColumn = findColumn(headers, aliases.date);
  const dueDateColumn = findColumn(headers, aliases.dueDate);
  const amountColumn = findColumn(headers, [
    "bill amount",
    "total bill amount",
    "amount"
  ]);
  const paidColumn = findColumn(headers, aliases.received);
  const outstandingColumn = findColumn(headers, aliases.outstanding);
  const statusColumn = findColumn(headers, [
    "payment status",
    "status"
  ]);
  const essentialColumn = findColumn(headers, aliases.essential);

  return rows
    .map(row => {
      const amount = parseNumber(getValue(row, amountColumn));
      const paid = parseNumber(getValue(row, paidColumn));

      let outstanding = parseNumber(
        getValue(row, outstandingColumn)
      );

      if (outstanding === null && amount !== null) {
        outstanding = Math.max(
          amount - (paid ?? 0),
          0
        );
      }

      return {
        supplier: getValue(row, supplierColumn) || "Unnamed supplier",
        date: parseDate(getValue(row, dateColumn)),
        dueDate: parseDate(getValue(row, dueDateColumn)),
        amount: amount ?? 0,
        paid: paid ?? 0,
        outstanding: outstanding ?? 0,
        status: getValue(row, statusColumn),
        essential: isEssential(
          getValue(row, essentialColumn)
        )
      };
    })
    .filter(row =>
      row.outstanding > 0 ||
      row.amount > 0 ||
      row.supplier !== "Unnamed supplier"
    );
}

function normaliseForecast(headers, rows) {
  const dateColumn = findColumn(headers, aliases.date);
  const openingColumn = findColumn(headers, aliases.openingCash);
  const collectionsColumn = findColumn(
    headers,
    aliases.expectedCollections
  );
  const otherInflowsColumn = findColumn(
    headers,
    aliases.otherInflows
  );
  const essentialPaymentsColumn = findColumn(
    headers,
    aliases.essentialPayments
  );
  const nonEssentialPaymentsColumn = findColumn(
    headers,
    aliases.nonEssentialPayments
  );
  const closingColumn = findColumn(headers, aliases.closingCash);

  return rows
    .map(row => ({
      date: parseDate(getValue(row, dateColumn)),
      openingCash: parseNumber(
        getValue(row, openingColumn)
      ),
      expectedCollections: parseNumber(
        getValue(row, collectionsColumn)
      ) ?? 0,
      otherInflows: parseNumber(
        getValue(row, otherInflowsColumn)
      ) ?? 0,
      essentialPayments: parseNumber(
        getValue(row, essentialPaymentsColumn)
      ) ?? 0,
      nonEssentialPayments: parseNumber(
        getValue(row, nonEssentialPaymentsColumn)
      ) ?? 0,
      closingCash: parseNumber(
        getValue(row, closingColumn)
      )
    }))
    .filter(row =>
      row.date ||
      row.openingCash !== null ||
      row.closingCash !== null
    )
    .sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return a.date - b.date;
    });
}

function inspectWorkbook(workbook) {
  const result = {
    transactions: [],
    receivables: [],
    payables: [],
    forecast: [],
    inventory: [],
    unknownSheets: [],
    warnings: [],
    sheetCount: workbook.SheetNames.length
  };

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: true
    });

    if (!rows.length) {
      result.warnings.push(
        `${sheetName}: empty sheet ignored.`
      );
      return;
    }

    const headers = Object.keys(rows[0]);
    const type = classifySheet(headers, rows);

    if (type === "transactions") {
      result.transactions.push(
        ...normaliseTransactions(headers, rows)
      );
    } else if (type === "receivables") {
      result.receivables.push(
        ...normaliseReceivables(headers, rows)
      );
    } else if (type === "payables") {
      result.payables.push(
        ...normalisePayables(headers, rows)
      );
    } else if (type === "forecast") {
      result.forecast.push(
        ...normaliseForecast(headers, rows)
      );
    } else if (type === "inventory") {
      result.inventory.push(...rows);
    } else {
      result.unknownSheets.push(sheetName);
    }
  });

  if (!result.transactions.length) {
    result.warnings.push(
      "No transaction sheet was confidently identified."
    );
  }

  if (!result.receivables.length) {
    result.warnings.push(
      "No receivables data was confidently identified."
    );
  }

  if (!result.payables.length) {
    result.warnings.push(
      "No payables data was confidently identified."
    );
  }

  if (!result.forecast.length) {
    result.warnings.push(
      "No seven-day forecast was identified. Cash was estimated from available transactions."
    );
  }

  return result;
}

function calculateAnalysis(data) {
  const totalInflow = data.transactions.reduce(
    (sum, row) => sum + row.moneyIn,
    0
  );

  const totalOutflow = data.transactions.reduce(
    (sum, row) => sum + row.moneyOut,
    0
  );

  const latestForecast =
    data.forecast.length
      ? data.forecast[data.forecast.length - 1]
      : null;

  const forecastCash = latestForecast
    ? latestForecast.closingCash
    : null;

  const estimatedCash =
    forecastCash !== null
      ? forecastCash
      : totalInflow - totalOutflow;

  const totalReceivables = data.receivables.reduce(
    (sum, row) => sum + row.outstanding,
    0
  );

  const totalPayables = data.payables.reduce(
    (sum, row) => sum + row.outstanding,
    0
  );

  const overdueReceivables = data.receivables
    .filter(isOverdue)
    .reduce((sum, row) => sum + row.outstanding, 0);

  const essentialPayables = data.payables
    .filter(row => row.essential)
    .reduce((sum, row) => sum + row.outstanding, 0);

  const nonEssentialPayables = data.payables
    .filter(row => !row.essential)
    .reduce((sum, row) => sum + row.outstanding, 0);

  const forecastMinimumCash = data.forecast.length
    ? Math.min(
        ...data.forecast
          .map(row => row.closingCash)
          .filter(value => value !== null)
      )
    : estimatedCash;

  let riskScore = 0;

  if (estimatedCash < 0) riskScore += 45;
  else if (estimatedCash < essentialPayables) riskScore += 30;
  else if (estimatedCash < essentialPayables * 1.5) riskScore += 15;

  if (overdueReceivables > 0) riskScore += 20;

  if (forecastMinimumCash < 0) riskScore += 25;
  else if (forecastMinimumCash < essentialPayables) riskScore += 15;

  if (totalPayables > estimatedCash) riskScore += 15;

  let riskLevel = "Low";

  if (riskScore >= 60) {
    riskLevel = "High";
  } else if (riskScore >= 30) {
    riskLevel = "Medium";
  }

  return {
    ...data,
    estimatedCash,
    totalInflow,
    totalOutflow,
    totalReceivables,
    totalPayables,
    overdueReceivables,
    essentialPayables,
    nonEssentialPayables,
    forecastMinimumCash,
    riskScore,
    riskLevel
  };
}

function createActions(analysis) {
  const actions = [];

  if (analysis.overdueReceivables > 0) {
    const largestOverdue = [...analysis.receivables]
      .filter(isOverdue)
      .sort((a, b) => b.outstanding - a.outstanding)[0];

    actions.push({
      title: "Prioritise overdue collections",
      description:
        `Follow up on overdue customer balances, starting with ${largestOverdue?.customer || "the largest overdue account"}.`,
      value: formatCurrency(analysis.overdueReceivables),
      type: "urgent"
    });
  }

  if (
    analysis.estimatedCash < analysis.essentialPayables ||
    analysis.forecastMinimumCash < analysis.essentialPayables
  ) {
    actions.push({
      title: "Protect essential payment coverage",
      description:
        "Review upcoming mandatory payments and confirm which obligations must be paid first.",
      value: formatCurrency(analysis.essentialPayables),
      type: "urgent"
    });
  }

  if (analysis.nonEssentialPayables > 0) {
    actions.push({
      title: "Defer discretionary outflows",
      description:
        "Consider delaying non-essential payments until collections improve.",
      value: formatCurrency(analysis.nonEssentialPayables),
      type: "watch"
    });
  }

  if (analysis.totalReceivables > 0) {
    actions.push({
      title: "Create a collection schedule",
      description:
        "Map expected customer receipts against payment due dates instead of relying only on total balances.",
      value: formatCurrency(analysis.totalReceivables),
      type: "recommended"
    });
  }

  if (!actions.length) {
    actions.push({
      title: "Maintain current controls",
      description:
        "The available data does not show an immediate liquidity exception. Continue monitoring cash timing.",
      value: "Monitor",
      type: "recommended"
    });
  }

  return actions;
}

function createEvidence(analysis) {
  const evidence = [];

  if (analysis.forecast.length) {
    evidence.push(
      `Seven-day forecast minimum closing cash: ${formatCurrency(
        analysis.forecastMinimumCash
      )}.`
    );
  }

  if (analysis.overdueReceivables > 0) {
    evidence.push(
      `Overdue receivables identified: ${formatCurrency(
        analysis.overdueReceivables
      )}.`
    );
  }

  if (analysis.essentialPayables > 0) {
    evidence.push(
      `Essential outstanding payables: ${formatCurrency(
        analysis.essentialPayables
      )}.`
    );
  }

  if (analysis.nonEssentialPayables > 0) {
    evidence.push(
      `Non-essential outstanding payables: ${formatCurrency(
        analysis.nonEssentialPayables
      )}.`
    );
  }

  evidence.push(
    `Transactions analysed: ${analysis.transactions.length}.`
  );

  evidence.push(
    `Receivable records analysed: ${analysis.receivables.length}.`
  );

  evidence.push(
    `Payable records analysed: ${analysis.payables.length}.`
  );

  return evidence;
}

function renderAnalysis(analysis) {
  currentAnalysis = analysis;

  dashboard.classList.remove("hidden");

  cashValue.textContent = formatCurrency(
    analysis.estimatedCash
  );

  receivablesValue.textContent = formatCurrency(
    analysis.totalReceivables
  );

  billsValue.textContent = formatCurrency(
    analysis.totalPayables
  );

  riskSummary.innerHTML = `
    <div class="risk-card risk-${analysis.riskLevel.toLowerCase()}">
      <div>
        <span class="risk-label">Liquidity risk</span>
        <strong>${analysis.riskLevel}</strong>
      </div>
      <div class="risk-score">
        Score ${analysis.riskScore}/100
      </div>
    </div>
    <p>
      Minimum forecast cash is
      <strong>${formatCurrency(analysis.forecastMinimumCash)}</strong>.
      Essential outstanding payments total
      <strong>${formatCurrency(analysis.essentialPayables)}</strong>.
    </p>
  `;

  const actions = createActions(analysis);

  actionsList.innerHTML = actions
    .map(action => `
      <div class="action-item action-${action.type}">
        <div class="action-topline">
          <span class="action-type">${action.type}</span>
          <strong>${action.value}</strong>
        </div>
        <h3>${action.title}</h3>
        <p>${action.description}</p>
      </div>
    `)
    .join("");

  const warnings = analysis.warnings.length
    ? analysis.warnings
        .map(warning => `<li>${warning}</li>`)
        .join("")
    : "<li>No major data-quality warnings detected.</li>";

  dataQuality.innerHTML = `
    <div class="quality-summary">
      <strong>${analysis.sheetCount}</strong>
      <span>Sheets scanned</span>
    </div>
    <div class="quality-summary">
      <strong>${analysis.transactions.length}</strong>
      <span>Transactions</span>
    </div>
    <div class="quality-summary">
      <strong>${analysis.receivables.length}</strong>
      <span>Receivable records</span>
    </div>
    <div class="quality-summary">
      <strong>${analysis.payables.length}</strong>
      <span>Payable records</span>
    </div>
    <ul class="warning-list">${warnings}</ul>
  `;

  evidenceList.innerHTML = createEvidence(analysis)
    .map(item => `<li>${item}</li>`)
    .join("");

  statusMessage.textContent =
    "Analysis complete. Review the evidence before acting.";

  errorMessage.textContent = "";
}

function showError(message) {
  errorMessage.textContent = message;
  statusMessage.textContent = "";
}

async function processFile(file) {
  if (!file) return;

  try {
    errorMessage.textContent = "";
    statusMessage.textContent = "Reading and understanding your file...";
    fileName.textContent = file.name;

    const buffer = await file.arrayBuffer();

    const workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: true
    });

    const data = inspectWorkbook(workbook);
    const analysis = calculateAnalysis(data);

    renderAnalysis(analysis);
  } catch (error) {
    console.error(error);

    showError(
      "The file could not be analysed. Please check that it is a valid Excel or CSV file."
    );
  }
}

function createSampleWorkbook() {
  return {
    transactions: [
      {
        date: new Date("2026-09-05"),
        description: "Customer collection",
        moneyIn: 45000,
        moneyOut: 0
      },
      {
        date: new Date("2026-09-05"),
        description: "Other income",
        moneyIn: 18000,
        moneyOut: 0
      },
      {
        date: new Date("2026-09-06"),
        description: "Supplier payment",
        moneyIn: 0,
        moneyOut: 69000
      },
      {
        date: new Date("2026-09-07"),
        description: "Essential supplier payment",
        moneyIn: 0,
        moneyOut: 257700
      }
    ],

    receivables: [
      {
        customer: "Urban Nest Retail",
        date: new Date("2026-08-01"),
        dueDate: new Date("2026-08-25"),
        amount: 125000,
        received: 0,
        outstanding: 125000,
        status: "Overdue",
        priority: "High"
      },
      {
        customer: "The Home Story",
        date: new Date("2026-08-10"),
        dueDate: new Date("2026-09-10"),
        amount: 68000,
        received: 0,
        outstanding: 68000,
        status: "Not Due",
        priority: "Medium"
      },
      {
        customer: "Casa Bella Interiors",
        date: new Date("2026-08-05"),
        dueDate: new Date("2026-08-28"),
        amount: 106000,
        received: 0,
        outstanding: 106000,
        status: "Overdue",
        priority: "High"
      }
    ],

    payables: [
      {
        supplier: "Jaipur Blue Pottery Works",
        date: new Date("2026-08-20"),
        dueDate: new Date("2026-09-07"),
        amount: 145000,
        paid: 0,
        outstanding: 145000,
        status: "Due Soon",
        essential: true
      },
      {
        supplier: "BESCOM",
        date: new Date("2026-08-20"),
        dueDate: new Date("2026-09-08"),
        amount: 16800,
        paid: 0,
        outstanding: 16800,
        status: "Due Soon",
        essential: true
      },
      {
        supplier: "Meta Platforms",
        date: new Date("2026-08-20"),
        dueDate: new Date("2026-09-07"),
        amount: 22000,
        paid: 0,
        outstanding: 22000,
        status: "Due Soon",
        essential: false
      }
    ],

    forecast: [
      {
        date: new Date("2026-09-05"),
        openingCash: 301298.7,
        expectedCollections: 45000,
        otherInflows: 18000,
        essentialPayments: 69000,
        nonEssentialPayments: 0,
        closingCash: 295298.7
      },
      {
        date: new Date("2026-09-07"),
        openingCash: 278898.7,
        expectedCollections: 0,
        otherInflows: 8000,
        essentialPayments: 257700,
        nonEssentialPayments: 22000,
        closingCash: 7198.7
      },
      {
        date: new Date("2026-09-08"),
        openingCash: 7198.7,
        expectedCollections: 125000,
        otherInflows: 20000,
        essentialPayments: 16800,
        nonEssentialPayments: 0,
        closingCash: 135398.7
      }
    ],

    inventory: [],
    unknownSheets: [],
    warnings: [],
    sheetCount: 5
  };
}

function loadSampleData() {
  const sample = createSampleWorkbook();
  const analysis = calculateAnalysis(sample);

  fileName.textContent = "RIPPLE sample workspace";
  renderAnalysis(analysis);
}

function runSimulation() {
  if (!currentAnalysis) {
    simulationResult.textContent =
      "Upload a file or load the sample workspace first.";
    return;
  }

  const collectionMultiplier =
    Number(collectionRate.value) / 100;

  const delayDays = Number(paymentDelay.value);

  const baseCash = currentAnalysis.estimatedCash;

  const additionalCollections =
    currentAnalysis.totalReceivables *
    collectionMultiplier;

  const delayedPayments =
    currentAnalysis.nonEssentialPayables *
    Math.min(delayDays / 30, 1);

  const simulatedCash =
    baseCash +
    additionalCollections +
    delayedPayments;

  const improvement =
    simulatedCash - baseCash;

  simulationResult.innerHTML = `
    <div class="simulation-number">
      ${formatCurrency(simulatedCash)}
    </div>
    <p>
      Estimated cash after collecting
      <strong>${collectionRate.value}%</strong>
      of outstanding receivables and delaying selected payments by
      <strong>${delayDays} days</strong>.
    </p>
    <p class="simulation-improvement">
      Potential cash improvement:
      <strong>${formatCurrency(improvement)}</strong>
    </p>
    <small>
      This is a scenario estimate, not a guaranteed outcome.
    </small>
  `;
}

if (uploadInput) {
  uploadInput.addEventListener("change", event => {
    const file = event.target.files[0];
    processFile(file);
  });
}

if (sampleButton) {
  sampleButton.addEventListener("click", loadSampleData);
}

if (simulateButton) {
  simulateButton.addEventListener("click", runSimulation);
}

if (collectionRate) {
  collectionRate.addEventListener("input", () => {
    collectionRateValue.textContent =
      `${collectionRate.value}%`;
  });
}

if (paymentDelay) {
  paymentDelay.addEventListener("input", () => {
    paymentDelayValue.textContent =
      `${paymentDelay.value} days`;
  });
}

if (resetButton) {
  resetButton.addEventListener("click", () => {
    dashboard.classList.add("hidden");
    uploadInput.value = "";
    fileName.textContent = "No file selected";
    statusMessage.textContent = "";
    errorMessage.textContent = "";
    simulationResult.textContent =
      "Adjust the assumptions and run a scenario.";
    currentAnalysis = null;
  });
}
