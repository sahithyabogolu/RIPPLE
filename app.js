const csvFile = document.getElementById("csvFile");
const dashboard = document.getElementById("dashboard");
const cashValue = document.getElementById("cashValue");
const receivablesValue = document.getElementById("receivablesValue");
const billsValue = document.getElementById("billsValue");
const actionsList = document.getElementById("actionsList");
const simulateButton = document.getElementById("simulateButton");
const simulationResult = document.getElementById("simulationResult");
const resetButton = document.getElementById("resetButton");

let financialData = {
  cash: 0,
  receivables: 0,
  bills: 0
};

csvFile.addEventListener("change", async function () {
  const file = csvFile.files[0];

  if (!file) return;

  try {
    const text = await readFile(file);

    financialData = extractFinancialData(text);

    updateDashboard();
  } catch (error) {
    alert("We could not read this file. Please try a PDF, Excel, CSV, or text financial report.");
    console.error(error);
  }
});

async function readFile(file) {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".pdf")) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();

      fullText += content.items.map(item => item.str).join(" ") + "\n";
    }

    return fullText;
  }

  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    let fullText = "";

    workbook.SheetNames.forEach(function (sheetName) {
      const sheet = workbook.Sheets[sheetName];
      fullText += XLSX.utils.sheet_to_csv(sheet) + "\n";
    });

    return fullText;
  }

  return await file.text();
}

function extractFinancialData(text) {
  const lowerText = text.toLowerCase();

  const numbers = text.match(/₹?\s?\d[\d,]*(?:\.\d+)?/g) || [];

  const amounts = numbers.map(function (number) {
    return Number(number.replace(/[₹,\s]/g, "")) || 0;
  });

  let cash = 0;
  let receivables = 0;
  let bills = 0;

  amounts.forEach(function (amount, index) {
    const nearbyText = lowerText.substring(
      Math.max(0, index * 30 - 40),
      index * 30 + 100
    );

    if (
      nearbyText.includes("cash") ||
      nearbyText.includes("bank balance") ||
      nearbyText.includes("available balance")
    ) {
      cash += amount;
    } else if (
      nearbyText.includes("receivable") ||
      nearbyText.includes("money owed") ||
      nearbyText.includes("amount due to us")
    ) {
      receivables += amount;
    } else if (
      nearbyText.includes("bill") ||
      nearbyText.includes("payable") ||
      nearbyText.includes("expense") ||
      nearbyText.includes("amount due")
    ) {
      bills += amount;
    }
  });

  if (cash === 0 && amounts.length > 0) cash = amounts[0];
  if (receivables === 0 && amounts.length > 1) receivables = amounts[1];
  if (bills === 0 && amounts.length > 2) {
    bills = amounts.slice(2).reduce((total, amount) => total + amount, 0);
  }

  return {
    cash,
    receivables,
    bills
  };
}

function formatCurrency(amount) {
  return "₹" + amount.toLocaleString("en-IN");
}

function updateDashboard() {
  cashValue.textContent = formatCurrency(financialData.cash);
  receivablesValue.textContent = formatCurrency(financialData.receivables);
  billsValue.textContent = formatCurrency(financialData.bills);

  generateActions();

  dashboard.classList.remove("hidden");
}

function generateActions() {
  actionsList.innerHTML = "";

  const availableAfterBills =
    financialData.cash +
    financialData.receivables -
    financialData.bills;

  const actions = [];

  if (financialData.cash < financialData.bills) {
    actions.push({
      title: "Protect your immediate cash",
      text: "Your available cash is lower than your upcoming bills. Avoid unnecessary spending until essential payments are covered."
    });
  }

  if (financialData.receivables > 0) {
    actions.push({
      title: "Follow up on expected payments",
      text: "You have " + formatCurrency(financialData.receivables) + " in expected receivables. Prioritize the payments most important for covering upcoming bills."
    });
  }

  if (availableAfterBills >= 0) {
    actions.push({
      title: "Maintain a safety buffer",
      text: "Your expected cash position can cover the listed bills. Keep part of the remaining balance available for unexpected expenses."
    });
  } else {
    actions.push({
      title: "Prepare for a cash shortfall",
      text: "Your projected position is negative by " + formatCurrency(Math.abs(availableAfterBills)) + ". Consider negotiating payment timing or reducing non-essential expenses."
    });
  }

  actions.forEach(function (action) {
    const item = document.createElement("div");
    item.className = "action-item";

    item.innerHTML = `
      <strong>${action.title}</strong>
      <span>${action.text}</span>
    `;

    actionsList.appendChild(item);
  });
}

simulateButton.addEventListener("click", function () {
  const projectedCash =
    financialData.cash +
    financialData.receivables -
    financialData.bills;

  simulationResult.classList.remove("hidden");

  if (projectedCash >= 0) {
    simulationResult.textContent =
      "7-day simulation: You may finish the next 7 days with approximately " +
      formatCurrency(projectedCash) +
      " remaining after the listed receivables and bills.";
  } else {
    simulationResult.textContent =
      "7-day simulation: You may face a shortfall of approximately " +
      formatCurrency(Math.abs(projectedCash)) +
      " after the listed receivables and bills.";
  }
});

resetButton.addEventListener("click", function () {
  location.reload();
});
