<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RIPPLE // Financial Decision Support</title>
  
  <style>
    /* ================= RIPPLE SYSTEM STYLES ================= */
    :root {
      --bg-dark-base: #07111f;
      --bg-dark-surface: #0b1728;
      --bg-dark-footer: #090d16;
      --accent-cyan: #38bdf8;
      --accent-cyan-hover: #7dd3fc;
      --accent-sky: #0ea5e9;
      --accent-emerald: #10b981;
      --text-main: #f8fafc;
      --text-muted: #cbd5e1;
      --text-subtle: #94a3b8;
      --border-subtle: #1e293b;
      --border-btn: #334155;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-dark-base);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    /* Hero Section */
    .ripple-hero {
      min-height: 78vh;
      display: flex;
      align-items: center;
      padding: 100px 8%;
      background:
        radial-gradient(circle at 80% 20%, rgba(14, 165, 233, 0.12), transparent 35%),
        linear-gradient(135deg, var(--bg-dark-base) 0%, var(--bg-dark-surface) 55%, #09111d 100%);
      overflow: hidden;
    }

    .ripple-hero-content {
      max-width: 850px;
      width: 100%;
    }

    .ripple-eyebrow {
      margin-bottom: 24px;
      color: var(--accent-cyan);
      font-family: "Courier New", Courier, monospace;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 2px;
    }

    .ripple-hero h1 {
      margin: 0;
      font-size: clamp(3rem, 8vw, 7rem);
      line-height: 0.95;
      letter-spacing: -4px;
      font-weight: 800;
      color: var(--text-main);
    }

    .ripple-hero h1 span {
      color: var(--accent-cyan);
    }

    .ripple-subheadline {
      max-width: 680px;
      margin: 34px 0 16px;
      color: var(--text-muted);
      font-size: clamp(1.1rem, 2vw, 1.45rem);
      line-height: 1.6;
    }

    .ripple-description {
      max-width: 620px;
      margin-bottom: 36px;
      color: var(--text-subtle);
      font-size: 1rem;
      line-height: 1.7;
    }

    .ripple-hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
    }

    .ripple-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 48px;
      padding: 0 24px;
      border-radius: 8px;
      text-decoration: none;
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 1px;
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .ripple-btn-primary {
      background: var(--accent-cyan);
      color: var(--bg-dark-base);
      border: 1px solid var(--accent-cyan);
    }

    .ripple-btn-primary:hover {
      background: var(--accent-cyan-hover);
      border-color: var(--accent-cyan-hover);
      transform: translateY(-2px);
    }

    .ripple-btn-secondary {
      border: 1px solid var(--border-btn);
      color: var(--text-muted);
      background: rgba(15, 23, 42, 0.4);
    }

    .ripple-btn-secondary:hover {
      border-color: var(--accent-cyan);
      color: var(--accent-cyan);
    }

    /* Footer Section */
    .ripple-footer {
      margin-top: 0;
      padding: 26px 20px;
      border-top: 1px solid var(--border-subtle);
      background: var(--bg-dark-footer);
      text-align: center;
      font-family: "Courier New", Courier, monospace;
    }

    .robotic-credit {
      display: inline-block;
      min-height: 20px;
      color: var(--text-subtle);
      font-size: 0.78rem;
      letter-spacing: 1.4px;
      word-break: break-word;
    }

    .terminal-prefix {
      color: var(--accent-sky);
      font-weight: 700;
    }

    #robotic-text {
      color: var(--accent-cyan);
      font-weight: 600;
    }

    .terminal-cursor {
      color: var(--accent-emerald);
      font-weight: 700;
      animation: ripple-blink 0.8s infinite;
    }

    .footer-disclaimer {
      margin: 12px 0 0;
      color: var(--text-subtle);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 0.7rem;
      letter-spacing: 0.2px;
    }

    @keyframes ripple-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }

    /* Responsive Breaks */
    @media (max-width: 700px) {
      .ripple-hero {
        min-height: 70vh;
        padding: 80px 24px;
      }

      .ripple-hero h1 {
        font-size: clamp(2.8rem, 15vw, 5rem);
        letter-spacing: -2px;
      }

      .ripple-subheadline {
        font-size: 1rem;
      }

      .ripple-description {
        font-size: 0.9rem;
      }

      .ripple-hero-actions {
        flex-direction: column;
        align-items: stretch;
      }

      .ripple-btn {
        width: 100%;
      }

      .robotic-credit {
        font-size: 0.65rem;
        letter-spacing: 0.8px;
      }
    }
  </style>
</head>
<body>

  <!-- ================= RIPPLE HERO ================= -->
  <section class="ripple-hero">
    <div class="ripple-hero-content">
      <p class="ripple-eyebrow">RIPPLE / FINANCIAL DECISION SUPPORT</p>

      <h1>
        KNOW YOUR CASH.<br />
        <span>NO GUESSWORK.</span>
      </h1>

      <p class="ripple-subheadline">
        Reconcile multi-sheet ledgers, identify liquidity pressure, and evaluate
        7-day cash decisions through a transparent financial workflow.
      </p>

      <p class="ripple-description">
        Upload your financial data. Understand what needs attention. Decide what
        to collect, pay, delay, or protect.
      </p>

      <div class="ripple-hero-actions">
        <a href="#upload" class="ripple-btn ripple-btn-primary">
          TRY RIPPLE
        </a>

        <a href="#how-it-works" class="ripple-btn ripple-btn-secondary">
          VIEW HOW IT WORKS
        </a>
      </div>
    </div>
  </section>

  <!-- ================= RIPPLE FOOTER ================= -->
  <footer class="ripple-footer">
    <div class="robotic-credit">
      <span class="terminal-prefix">[SYS_INIT]: </span>
      <span id="robotic-text"></span>
      <span class="terminal-cursor">_</span>
    </div>

    <p class="footer-disclaimer">
      Early-access financial decision-support prototype.
    </p>
  </footer>

  <!-- ================= RIPPLE ENGINE SCRIPT ================= -->
  <script>
    (function () {
      "use strict";

      function initTerminalTyping() {
        const textToType = "ENGINEERED BY SAHITHYA BOGOLU // RIPPLE CORE";
        const targetElement = document.getElementById("robotic-text");

        if (!targetElement) return;

        // Prevent multi-initialization bugs
        if (targetElement.getAttribute("data-typing-started") === "true") return;
        targetElement.setAttribute("data-typing-started", "true");

        targetElement.textContent = "";
        let index = 0;

        function typeChar() {
          if (index < textToType.length) {
            targetElement.textContent += textToType.charAt(index);
            index++;
            const randomDelay = Math.floor(Math.random() * 40) + 30;
            setTimeout(typeChar, randomDelay);
          }
        }

        setTimeout(typeChar, 400);
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initTerminalTyping);
      } else {
        initTerminalTyping();
      }
    })();
  </script>

</body>
</html>
