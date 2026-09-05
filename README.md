# ⚡ RIPPLE — Finance Control Workspace

> **KNOW YOUR CASH. NO GUESSWORK.**

RIPPLE reconciles batches of raw financial transactions and gives operators an honest picture of cash position — what matched cleanly, what didn't, and why. Built with a client-first, zero-telemetry architecture.

---

## 🎨 Visual Design & Palette

* **Dark Velvet Theme:** Deep matte black background (`#07050A`) paired with rich surface purple (`#150F21`) and electric violet accents (`#9D4EDD`).
* **Glassmorphism UI:** Translucent cards with subtle border glows and blurred backdrops.
* **Ninja Privacy Mode:** Instant one-click blur mask across all monetary figures for screen shares or public presentations.

---

## ⚡ Quick Setup & Running Locally

1. Clone or download this repository.
2. Open `index.html` directly in any modern web browser (Chrome, Firefox, Safari, Edge).
3. **No `npm install`, no build step, no web servers, and zero API keys required.**

---

## 🛠️ Architecture & Core Engine

RIPPLE functions completely inside your browser client without sending your data to external servers.

* **Multi-Format Ingestion:** Native support for `.csv`, `.txt`, Excel (`.xlsx`, `.xls` via SheetJS), `.pdf`, `.docx`, and live Google Sheets URL streams.
* **Automated Reconciliation Engine:** Parses transaction records, isolates duplicates, flags zero/negative monetary values, and logs missing reference codes.
* **Audit & Evidence Ledger:** Displays every dirty or unmatched record with exact failure reasons and rule violations.
* **7-Day Cash Decision Simulator:** Interactive slider controls to test client collection delays, emergency expense surges, and vendor deferral scenarios.
* **Workspace Privacy & Control:** Session storage and local persistent options with single-click factory reset capability.
* **Export-Ready Output:** Download cleaned CSV ledgers or generate print-formatted PDF reports instantly.

---

## 📂 Project Structure

```text
├── index.html     # Application structure, modals, and upload controls
├── style.css      # Dark violet/matte black theme, glassmorphic UI, and print styles
├── app.js         # Multi-format parser, reconciliation rules, and state engine
└── README.md      # Workspace documentation
