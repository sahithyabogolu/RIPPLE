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

csvFile.addEventListener("change", function () {
  const file = csvFile.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (event) {
    const rows = event.target.result.trim().split("\n");

    financialData = {
      cash: 0,
      receivables: 0,
      bills: 0
    };

    rows.slice(1).forEach(function (row) {
      const columns = row.split(",");

      const type = columns[0]?.trim().toLowerCase();
      const amount = Number(columns[1]?.trim()) || 0;

      if (type === "cash") {
        financialData.cash += amount;
      }

      if (type === "receivable") {
        financialData.receivables += amount;
      }

      if (type === "bill") {
        financialData.bills += amount;
      }
    });

    updateDashboard();
  };

  reader.readAsText(file);
});

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
    financialData.cash + financialData.receivables - financialData.bills;

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
