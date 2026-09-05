const fileInput = document.getElementById("csvFile");
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
const collectionRateValue = document.getElementById("collectionRateValue");
const paymentDelay = document.getElementById("paymentDelay");
const paymentDelayValue = document.getElementById("paymentDelayValue");
const simulateButton = document.getElementById("simulateButton");
const simulationResult = document.getElementById("simulationResult");
const resetButton = document.getElementById("resetButton");

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
    "payment due",
    "deadline"
  ],
  description: [
    "description",
    "details",
    "narration",
    "particulars",
    "transaction description"
  ],
  customer: [
    "customer",
    "customer name",
    "client",
    "client name",
    "buyer"
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
    "value",
    "total",
    "total amount",
    "invoice amount",
    "bill amount"
  ],
  moneyIn: [
    "money in",
    "credit",
    "credits",
    "inflow",
    "inflows",
    "receipt",
    "receipts",
    "income",
    "cash received"
  ],
  moneyOut: [
    "money out",
    "debit",
    "debits",
    "outflow",
    "outflows",
    "payment",
    "payments",
    "expense",
    "expenses",
    "cash paid"
  ],
  outstanding: [
    "outstanding",
    "outstanding amount",
    "balance due",
    "amount due",
    "unpaid amount"
  ],
  received: [
    "amount received",
    "received",
    "amount paid",
    "paid"
  ],
  status: [
    "status",
    "payment status",
    "invoice status"
  ],
  essential: [
    "essential",
    "essential non essential",
    "priority",
    "critical",
    "mandatory"
  ],
  openingCash: [
    "opening cash",
    "opening balance",
    "cash balance",
    "available cash"
  ],
  closingCash: [
    "closing cash",
    "closing balance"
  ]
};

function normalise(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function findColumn(headers, possibleNames) {
  const normalisedHeaders = headers.map(normalise);

  for (const name of possibleNames) {
    const index = normalisedHeaders.indexOf(normalise(name));
    if (index !== -1) return headers[index];
  }

  return null;
}

function numberValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const cleaned = String(value)
    .replace(/[₹$£€,\s]/g, "")
    .replace(/[()]/g, "-")
    .replace(/[^\d.-]/g, "");

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateValue(value) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number") {
    const excelDate = XLSX.SSF.parse_date_code(value);

    if (excelDate) {
      return new Date(
        excelDate.y,
        excelDate.m - 1,
        excelDate.d
      );
    }
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatMoney(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Unavailable";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(value) {
  if (!value) return "Unknown date";

  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function daysBetween(first, second) {
  const difference = second.getTime() - first.getTime();
  return Math.round(difference / 86400000);
}

function getRows(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: true
  });

  return rows.filter((row) =>
    Object.values(row).some((value) => cleanText(value) !== "")
  );
}

function classifySheet(rows) {
  if (!rows.length) return "unknown";

  const headers = Object.keys(rows[0]);
  const headerText = headers.map(normalise).join(" ");

  const hasMoneyIn = findColumn(headers, aliases.moneyIn);
  const hasMoneyOut = findColumn(headers, aliases.moneyOut);
  const hasCustomer = findColumn(headers, aliases.customer);
  const hasSupplier = findColumn(headers, aliases.supplier);
  const hasDueDate = findColumn(headers, aliases.dueDate);
  const hasOpeningCash = findColumn(headers, aliases.openingCash);
  const hasClosingCash = findColumn(headers, aliases.closingCash);
  const hasInventory = headerText.includes("inventory") ||
    headerText.includes("unitsinstock") ||
    headerText.includes("reorderlevel");

  if (hasOpeningCash || hasClosingCash) return "forecast";
  if (hasCustomer && hasDueDate) return "receivables";
  if (hasSupplier && hasDueDate) return "payables";
  if (hasMoneyIn || hasMoneyOut) return "transactions";
  if (hasInventory) return "inventory";

  return "unknown";
}

function normaliseTransactions(rows) {
  const headers = Object.keys(rows[0] || {});
  const dateColumn = findColumn(headers, aliases.date);
  const descriptionColumn = findColumn(headers, aliases.description);
  const moneyInColumn = findColumn(headers, aliases.moneyIn);
  const moneyOutColumn = findColumn(headers, aliases.moneyOut);
  const amountColumn = findColumn(headers, aliases.amount);

  return rows.map((row) => {
    let inflow = moneyInColumn
      ? numberValue(row[moneyInColumn])
      : null;

    let outflow = moneyOutColumn
      ? numberValue(row[moneyOutColumn])
      : null;

    if (!moneyInColumn && !moneyOutColumn && amountColumn) {
      const description = cleanText(row[descriptionColumn]).toLowerCase();

      if (
        description.includes("sale") ||
        description.includes("receipt") ||
        description.includes("income") ||
        description.includes("deposit")
      ) {
        inflow = numberValue(row[amountColumn]);
        outflow = 0;
      } else if (
        description.includes("payment") ||
        description.includes("expense") ||
        description.includes("purchase") ||
        description.includes("withdraw")
      ) {
        inflow = 0;
        outflow = numberValue(row[amountColumn]);
      }
    }

    return {
      date: dateValue(row[dateColumn]),
      description: cleanText(row[descriptionColumn]),
      inflow: inflow ?? 0,
      outflow: outflow ?? 0
    };
  });
}

function normaliseReceivables(rows) {
  const headers = Object.keys(rows[0] || {});
  const customerColumn = findColumn(headers, aliases.customer);
  const dueDateColumn = findColumn(headers, aliases.dueDate);
  const amountColumn = findColumn(headers, aliases.amount);
  const outstandingColumn = findColumn(headers, aliases.outstanding);
  const receivedColumn = findColumn(headers, aliases.received);
  const statusColumn = findColumn(headers, aliases.status);

  return rows.map((row) => {
    const amount = numberValue(row[amountColumn]);
    const outstanding = outstandingColumn
      ? numberValue(row[outstandingColumn])
      : null;

    const received = receivedColumn
      ? numberValue(row[receivedColumn])
      : null;

    return {
      customer: cleanText(row[customerColumn]) || "Unnamed customer",
      dueDate: dateValue(row[dueDateColumn]),
      amount,
      outstanding:
        outstanding !== null
          ? outstanding
          : amount !== null && received !== null
            ? Math.max(amount - received, 0)
            : amount,
      status: cleanText(row[statusColumn])
    };
  });
}

function normalisePayables(rows) {
  const headers = Object.keys(rows[0] || {});
  const supplierColumn = findColumn(headers, aliases.supplier);
  const dueDateColumn = findColumn(headers, aliases.dueDate);
  const amountColumn = findColumn(headers, aliases.amount);
  const outstandingColumn = findColumn(headers, aliases.outstanding);
  const paidColumn = findColumn(headers, aliases.received);
  const essentialColumn = findColumn(headers, aliases.essential);

  return rows.map((row) => {
    const amount = numberValue(row[amountColumn]);
    const outstanding = outstandingColumn
      ? numberValue(row[outstandingColumn])
      : null;

    const paid = paidColumn
      ? numberValue(row[paidColumn])
      : null;

    return {
      supplier: cleanText(row[supplierColumn]) || "Unnamed supplier",
      dueDate: dateValue(row[dueDateColumn]),
      amount,
      outstanding:
        outstanding !== null
          ? outstanding
          : amount !== null && paid !== null
            ? Math.max(amount - paid, 0)
            : amount,
      essential: cleanText(row[essentialColumn]).toLowerCase()
    };
  });
}

function normaliseForecast(rows) {
  const headers = Object.keys(rows[0] || {});
  const dateColumn = findColumn(headers, aliases.date);
  const openingColumn = findColumn(headers, aliases.openingCash);
  const customerColumn = findColumn(headers, aliases.moneyIn);
  const closingColumn = findColumn(headers, aliases.closingCash);

  return rows.map((row) => ({
    date: dateValue(row[dateColumn]),
    openingCash: numberValue(row[openingColumn]),
    customerCollections: numberValue(row[customerColumn]) || 0,
    closingCash: numberValue(row[closingColumn])
  }));
}

function analyseWorkbook(workbook) {
  const analysis = {
    transactions: [],
    receivables: [],
    payables: [],
    forecast: [],
    sheetsReviewed: 0,
    recordsDetected: 0,
    warnings: []
  };

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = getRows(sheet);

    if (!rows.length) return;

    analysis.sheetsReviewed += 1;
    analysis.recordsDetected += rows.length;

    const type = classifySheet(rows);

    if (type === "transactions") {
      analysis.transactions.push(...normaliseTransactions(rows));
    } else if (type === "receivables") {
      analysis.receivables.push(...normaliseReceivables(rows));
    } else if (type === "payables") {
      analysis.payables.push(...normalisePayables(rows));
    } else if (type === "forecast") {
      analysis.forecast.push(...normaliseForecast(rows));
    } else if (type === "unknown") {
      analysis.warnings.push(
        `The sheet "${sheetName}" was reviewed but its purpose could not be confidently identified.`
      );
    }
  });

  return analysis;
}

function calculateAnalysis(analysis) {
  const validTransactions = analysis.transactions.filter(
    (item) => item.inflow !== 0 || item.outflow !== 0
  );

  const totalIn = validTransactions.reduce(
    (sum, item) => sum + item.inflow,
    0
  );

  const totalOut = validTransactions.reduce(
    (sum, item) => sum + item.outflow,
    0
  );

  const receivables = analysis.receivables.reduce(
    (sum, item) => sum + (item.outstanding || 0),
    0
  );

  const payables = analysis.payables.reduce(
    (sum, item) => sum + (item.outstanding || 0),
    0
  );

  const overdueReceivables = analysis.receivables.filter(
    (item) => item.dueDate && item.dueDate < new Date()
  );

  const overdueAmount = overdueReceivables.reduce(
    (sum, item) => sum + (item.outstanding || 0),
    0
  );

  const essentialPayables = analysis.payables.filter(
    (item) =>
      item.essential.includes("essential") ||
      item.essential.includes("critical") ||
      item.essential.includes("mandatory")
  );

  const essentialAmount = essentialPayables.reduce(
    (sum, item) => sum + (item.outstanding || 0),
    0
  );

  let cash = null;

  if (analysis.forecast.length) {
    const latest = [...analysis.forecast]
      .filter((item) => item.closingCash !== null)
      .sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return b.date - a.date;
      })[0];

    cash = latest ? latest.closingCash : null;
  }

  if (cash === null && validTransactions.length) {
    cash = totalIn - totalOut;
  }

  const riskScore =
    (cash !== null && essentialAmount > cash ? 45 : 0) +
    (overdueAmount > 0 ? 25 : 0) +
    (cash !== null && cash < 0 ? 30 : 0);

  let risk = "Low";

  if (riskScore >= 60) risk = "High";
  else if (riskScore >= 25) risk = "Medium";

  return {
    ...analysis,
    cash,
    totalIn,
    totalOut,
    receivables,
    payables,
    overdueAmount,
    essentialAmount,
    risk,
    riskScore
  };
}

function renderAnalysis(result) {
  currentAnalysis = result;

  dashboard.classList.remove("hidden");

  cashValue.textContent = formatMoney(result.cash);
  receivablesValue.textContent = formatMoney(result.receivables);
  billsValue.textContent = formatMoney(result.payables);

  const riskClass =
    result.risk === "High"
      ? "red"
      : result.risk === "Medium"
        ? "yellow"
        : "green";

  riskSummary.innerHTML = `
    <div class="action-item ${riskClass}">
      <div>
        <div class="action-title">${result.risk} cash-flow risk</div>
        <div class="action-description">
          Risk score: ${result.riskScore}/100.
          ${result.cash === null
            ? "Available cash could not be confidently detected."
            : `Detected cash position: ${formatMoney(result.cash)}.`}
          ${result.essentialAmount > 0
            ? ` Essential outstanding payments: ${formatMoney(result.essentialAmount)}.`
            : ""}
        </div>
      </div>
    </div>
  `;

  dataQuality.innerHTML = `
    <div class="action-item">
      <div>
        <div class="action-title">${result.sheetsReviewed} financial sheet(s) reviewed</div>
        <div class="action-description">
          ${result.recordsDetected} record(s) detected.
          Transactions: ${result.transactions.length}.
          Receivables: ${result.receivables.length}.
          Payables: ${result.payables.length}.
          Forecast rows: ${result.forecast.length}.
        </div>
      </div>
    </div>
    ${
      result.warnings.length
        ? result.warnings
            .map(
              (warning) => `
                <div class="action-item yellow">
                  <div>
                    <div class="action-title">Review needed</div>
                    <div class="action-description">${warning}</div>
                  </div>
                </div>
              `
            )
            .join("")
        : `
          <div class="action-item green">
            <div>
              <div class="action-title">No major classification warnings</div>
              <div class="action-description">
                RIPPLE identified the main financial data categories.
              </div>
            </div>
          </div>
        `
    }
  `;

  const actions = [];

  if (result.overdueAmount > 0) {
    actions.push({
      type: "red",
      title: "Follow up on overdue customer collections",
      description: `${formatMoney(result.overdueAmount)} is overdue. Prioritise the largest or most critical customers first.`
    });
  }

  if (result.essentialAmount > 0 && result.cash !== null) {
    actions.push({
      type: result.essentialAmount > result.cash ? "red" : "yellow",
      title: "Review essential payments before committing cash",
      description: `Essential outstanding payments total ${formatMoney(result.essentialAmount)} against detected cash of ${formatMoney(result.cash)}.`
    });
  }

  if (result.receivables > 0) {
    actions.push({
      type: "yellow",
      title: "Convert receivables into a dated collection plan",
      description: `There is ${formatMoney(result.receivables)} in outstanding customer money. Separate overdue amounts from amounts not yet due.`
    });
  }

  if (result.payables > 0) {
    actions.push({
      type: "yellow",
      title: "Sequence supplier payments by urgency",
      description: `Outstanding obligations total ${formatMoney(result.payables)}. Protect essential payments and delay non-essential commitments where possible.`
    });
  }

  if (!actions.length) {
    actions.push({
      type: "green",
      title: "Upload more complete financial data",
      description: "RIPPLE needs transactions, receivables, payables, or forecast data to produce stronger recommendations."
    });
  }

  actionsList.innerHTML = actions
    .map(
      (action) => `
        <div class="action-item ${action.type}">
          <div>
            <div class="action-title">${action.title}</div>
            <div class="action-description">${action.description}</div>
          </div>
        </div>
      `
    )
    .join("");

  evidenceList.innerHTML = `
    <div class="action-item">
      <div>
        <div class="action-title">Evidence used</div>
        <div class="action-description">
          Cash: ${formatMoney(result.cash)} |
          Receivables: ${formatMoney(result.receivables)} |
          Obligations: ${formatMoney(result.payables)} |
          Overdue receivables: ${formatMoney(result.overdueAmount)} |
          Essential payments: ${formatMoney(result.essentialAmount)}
        </div>
      </div>
    </div>
  `;

  simulationResult.textContent =
    "Adjust the controls and run a simulation.";
}

async function handleFileUpload(event) {
  const file = event.target.files[0];

  if (!file) return;

  fileName.textContent = file.name;
  statusMessage.textContent = "Reading and analysing your financial data...";
  errorMessage.textContent = "";

  try {
    const buffer = await file.arrayBuffer();

    const workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: true
    });

    const rawAnalysis = analyseWorkbook(workbook);
    const result = calculateAnalysis(rawAnalysis);

    renderAnalysis(result);

    statusMessage.textContent = "Analysis complete.";
  } catch (error) {
    console.error(error);
    errorMessage.textContent =
      "RIPPLE could not read this file. Please check that it is a valid Excel or CSV file.";
    statusMessage.textContent = "";
  }
}

function runSimulation() {
  if (!currentAnalysis) {
    simulationResult.textContent =
      "Upload and analyse a file before running a simulation.";
    return;
  }

  const rate = Number(collectionRate.value) / 100;
  const delay = Number(paymentDelay.value);

  const expectedCollections = currentAnalysis.receivables * rate;

  const delayedPayments = currentAnalysis.payables * 0.5;
  const adjustedPayments =
    delay > 0 ? delayedPayments * 0.5 : delayedPayments;

  const simulatedCash =
    (currentAnalysis.cash || 0) +
    expectedCollections -
    adjustedPayments;

  const resultClass =
    simulatedCash < 0
      ? "red"
      : simulatedCash < currentAnalysis.essentialAmount
        ? "yellow"
        : "green";

  simulationResult.innerHTML = `
    <div class="action-item ${resultClass}">
      <div>
        <div class="action-title">
          Simulated closing cash: ${formatMoney(simulatedCash)}
        </div>
        <div class="action-description">
          Assumes ${Math.round(rate * 100)}% of outstanding receivables are
          collected and payments are delayed by ${delay} day(s).
          This is a directional scenario, not a guaranteed forecast.
        </div>
      </div>
    </div>
  `;
}

collectionRate.addEventListener("input", () => {
  collectionRateValue.textContent = `${collectionRate.value}%`;
});

paymentDelay.addEventListener("input", () => {
  paymentDelayValue.textContent =
    `${paymentDelay.value} day${paymentDelay.value === "1" ? "" : "s"}`;
});

fileInput.addEventListener("change", handleFileUpload);
simulateButton.addEventListener("click", runSimulation);

resetButton.addEventListener("click", () => {
  fileInput.value = "";
  fileName.textContent = "No file selected";
  statusMessage.textContent = "";
  errorMessage.textContent = "";
  dashboard.classList.add("hidden");
  currentAnalysis = null;
});
