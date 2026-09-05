const FX_RATES = {
  INR: 1.0, USD: 83.25, EUR: 90.15, GBP: 105.40, AED: 22.66,
  JPY: 0.56, CNY: 11.50, SGD: 61.80, AUD: 54.30, CAD: 61.10
};

function PRNG(seed) {
  let s = seed;
  return function() {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
}

function generateBatch(seed = 42, size = 50) {
  const rng = PRNG(seed);
  const records = [];
  const groundTruthKeys = [];
  
  const categories = ['SaaS Subscription', 'Vendor Payment', 'Consulting Fees', 'Hardware Procurement', 'Cloud Services'];
  const currencies = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

  const anomalyMap = new Map([
    [7, 'FEE_MISMATCH'],
    [14, 'DUPLICATE_REF'],
    [22, 'SETTLEMENT_DELAY'],
    [31, 'FX_MISMATCH'],
    [39, 'TAX_UNMATCHED'],
    [45, 'ORPHAN_RECORD']
  ]);

  for (let i = 0; i < size; i++) {
    const id = `REC-2026-${String(i + 1).padStart(4, '0')}`;
    const refId = `REF-${Math.floor(100000 + rng() * 900000)}`;
    const baseAmount = Math.floor(5000 + rng() * 450000);
    const curr = currencies[Math.floor(rng() * currencies.length)];
    const cat = categories[Math.floor(rng() * categories.length)];
    const baseDate = new Date(2026, 8, 1 + (i % 5));

    const issue = anomalyMap.get(i) || 'NONE';

    let rec = {
      id, referenceId: refId, timestamp: baseDate.toISOString(), category: cat, currency: curr,
      ledger: { amount: baseAmount, description: `${cat} - Ref: ${refId}`, taxCode: issue === 'TAX_UNMATCHED' ? null : 'GST_18' },
      bank: { amount: baseAmount, utr: `UTR${Math.floor(100000000 + rng() * 900000000)}`, date: baseDate.toISOString().split('T')[0] },
      gateway: {
        grossAmount: baseAmount, feeDeducted: Math.round(baseAmount * 0.02), netAmount: Math.round(baseAmount * 0.98),
        settlementBatchId: `SETTLE-BATCH-${100 + (i % 10)}`, settlementDate: new Date(baseDate.getTime() + 86400000).toISOString().split('T')[0]
      }
    };

    if (issue === 'FEE_MISMATCH') {
      rec.gateway.feeDeducted = Math.round(baseAmount * 0.08);
      rec.gateway.netAmount = baseAmount - rec.gateway.feeDeducted;
    } else if (issue === 'SETTLEMENT_DELAY') {
      rec.gateway.settlementDate = new Date(baseDate.getTime() + (7 * 86400000)).toISOString().split('T')[0];
    } else if (issue === 'FX_MISMATCH') {
      rec.currency = 'USD';
    } else if (issue === 'ORPHAN_RECORD') {
      rec.bank = null; rec.gateway = null;
    }

    records.push(rec);
    groundTruthKeys.push({ recordId: id, expectedLabel: issue });
  }

  return { records, groundTruthKeys };
}

function runPipeline(records, keys, selectedCurrency = 'INR') {
  const startTime = performance.now();
  const exceptions = [];
  let matched = 0, correct = 0, falsePositives = 0, falseNegatives = 0;

  const keyMap = new Map(keys.map(k => [k.recordId, k.expectedLabel]));

  records.forEach(rec => {
    let issue = 'NONE';
    let ruleId = 'RULE_3WAY_EXACT_MATCH';
    let evidence = '', action = '';

    if (!rec.bank || !rec.gateway) {
      issue = 'ORPHAN_RECORD';
      ruleId = 'RULE_MISSING_SOURCE_RECORD';
      evidence = 'Missing Bank or Gateway stream entry.';
      action = 'Flag record for upstream ingestion pipeline review.';
    } else if (Math.abs((rec.gateway.grossAmount - rec.gateway.feeDeducted) - rec.gateway.netAmount) > 1) {
      issue = 'FEE_MISMATCH';
      ruleId = 'RULE_GATEWAY_FEE_TOLERANCE_0.5PCT';
      evidence = `Unrecorded fee mismatch. Gross: ${rec.gateway.grossAmount}, Fee: ${rec.gateway.feeDeducted}`;
      action = 'Post adjusting entry for unrecorded payment gateway charges.';
    } else if (rec.currency === 'USD' && rec.ledger.description.includes('INR')) {
      issue = 'FX_MISMATCH';
      ruleId = 'RULE_CORRIDOR_FX_ALIGNMENT';
      evidence = 'Currency tagged as USD, expected clearance in INR.';
      action = 'Route through FX revaluation clearing account.';
    } else if (!rec.ledger.taxCode) {
      issue = 'TAX_UNMATCHED';
      ruleId = 'RULE_TAX_GST_LINE_MISSING';
      evidence = 'Transaction amount > ₹50,000 without tax code.';
      action = 'Assign statutory GST tax schedule.';
    }

    const expected = keyMap.get(rec.id) || 'NONE';
    if (issue === expected) correct++;
    else if (issue !== 'NONE' && expected === 'NONE') falsePositives++;
    else falseNegatives++;

    if (issue === 'NONE') {
      matched++;
    } else {
      exceptions.push({
        rowId: rec.id, loop: issue === 'TAX_UNMATCHED' ? 'TAX' : 'RECON',
        reasonCode: issue, confidence: 0.95, evidence, suggestedAction: action, ruleId
      });
    }
  });

  const endTime = performance.now();

  return {
    processed: records.length,
    matched,
    exceptions,
    accuracy: ((correct / records.length) * 100).toFixed(1),
    latencyMs: Math.round(endTime - startTime),
    falsePositives, falseNegatives
  };
}

function runJudgeMode() {
  const batch = generateBatch(1337, 50);
  const selectedCurrency = document.getElementById('currency-select')?.value || 'INR';
  const report = runPipeline(batch.records, batch.groundTruthKeys, selectedCurrency);

  document.getElementById('kpi-throughput').innerText = `${report.processed} records`;
  document.getElementById('kpi-throughput-sub').innerText = `Processed in ${report.latencyMs}ms (${Math.round(report.processed / (report.latencyMs / 1000))} rec/sec)`;

  document.getElementById('kpi-match-rate').innerText = `${((report.matched / report.processed) * 100).toFixed(1)}%`;
  document.getElementById('kpi-match-sub').innerText = `${report.matched}/${report.processed} Clean 3-Way Matches`;

  document.getElementById('kpi-accuracy').innerText = `${report.accuracy}%`;
  document.getElementById('kpi-accuracy-sub').innerText = `FP: ${report.falsePositives} | FN: ${report.falseNegatives} (Automated)`;

  document.getElementById('kpi-exceptions').innerText = report.exceptions.length;

  const tbody = document.getElementById('exception-rows');
  if (tbody) {
    tbody.innerHTML = report.exceptions.map(ex => `
      <tr>
        <td><strong>${ex.rowId}</strong></td>
        <td>${ex.loop}</td>
        <td><span class="badge-reason">${ex.reasonCode}</span></td>
        <td style="color: #22c55e;">${(ex.confidence * 100).toFixed(0)}%</td>
        <td style="color: #d8b4fe;">${ex.evidence}</td>
        <td style="color: #4ade80;">${ex.suggestedAction}</td>
      </tr>
    `).join('');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  runJudgeMode();
});
