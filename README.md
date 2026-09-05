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

<!-- ================= RIPPLE STYLES ================= -->

<style>
  .ripple-hero {
    min-height: 78vh;
    display: flex;
    align-items: center;
    padding: 100px 8%;
    background:
      radial-gradient(circle at 80% 20%, rgba(14, 165, 233, 0.12), transparent 35%),
      linear-gradient(135deg, #07111f 0%, #0b1728 55%, #09111d 100%);
    color: #f8fafc;
    overflow: hidden;
  }

  .ripple-hero-content {
    max-width: 850px;
  }

  .ripple-eyebrow {
    margin-bottom: 24px;
    color: #38bdf8;
    font-family: "Courier New", monospace;
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
  }

  .ripple-hero h1 span {
    color: #38bdf8;
  }

  .ripple-subheadline {
    max-width: 680px;
    margin: 34px 0 16px;
    color: #cbd5e1;
    font-size: clamp(1.1rem, 2vw, 1.45rem);
    line-height: 1.6;
  }

  .ripple-description {
    max-width: 620px;
    margin-bottom: 36px;
    color: #94a3b8;
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
  }

  .ripple-btn-primary {
    background: #38bdf8;
    color: #07111f;
  }

  .ripple-btn-primary:hover {
    background: #7dd3fc;
    transform: translateY(-2px);
  }

  .ripple-btn-secondary {
    border: 1px solid #334155;
    color: #cbd5e1;
    background: rgba(15, 23, 42, 0.4);
  }

  .ripple-btn-secondary:hover {
    border-color: #38bdf8;
    color: #38bdf8;
  }

  .ripple-footer {
    margin-top: 0;
    padding: 26px 20px;
    border-top: 1px solid #1e293b;
    background: #090d16;
    text-align: center;
    font-family: "Courier New", monospace;
  }

  .robotic-credit {
    display: inline-block;
    min-height: 20px;
    color: #64748b;
    font-size: 0.78rem;
    letter-spacing: 1.4px;
  }

  .terminal-prefix {
    color: #0ea5e9;
    font-weight: 700;
  }

  #robotic-text {
    color: #38bdf8;
    font-weight: 600;
  }

  .terminal-cursor {
    color: #10b981;
    font-weight: 700;
    animation: ripple-blink 0.8s infinite;
  }

  .footer-disclaimer {
    margin: 12px 0 0;
    color: #64748b;
    font-family: Arial, sans-serif;
    font-size: 0.7rem;
    letter-spacing: 0.2px;
  }

  @keyframes ripple-blink {
    0%,
    100% {
      opacity: 1;
    }

    50% {
      opacity: 0;
    }
  }

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

<!-- ================= RIPPLE ROBOTIC TYPING EFFECT ================= -->

<script>
  document.addEventListener("DOMContentLoaded", function () {
    const textToType =
      "ENGINEERED BY SAHITHYA BOGOLU // RIPPLE CORE";

    const targetElement = document.getElementById("robotic-text");

    if (!targetElement) return;

    let index = 0;

    function typeRoboticText() {
      if (index < textToType.length) {
        targetElement.textContent += textToType.charAt(index);
        index++;

        const randomDelay = Math.floor(Math.random() * 50) + 30;
        setTimeout(typeRoboticText, randomDelay);
      }
    }

    setTimeout(typeRoboticText, 500);
  });
</script>
