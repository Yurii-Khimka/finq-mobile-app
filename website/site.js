// finQ landing — shared nav/footer + theme toggle

(function () {
  // ── Theme ─────────────────────────────────────────────
  const STORAGE_KEY = "finq-site-theme";
  const stored = localStorage.getItem(STORAGE_KEY);
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initial = stored || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", initial);

  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem(STORAGE_KEY, t);
  }
  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    setTheme(cur === "dark" ? "light" : "dark");
  }

  // ── Nav ───────────────────────────────────────────────
  const navHost = document.getElementById("nav");
  const active = navHost ? navHost.dataset.active || "" : "";

  const navHTML = `
    <nav class="nav" id="site-nav">
      <div class="container nav-inner">
        <a class="logo" href="index.html" aria-label="finQ home">
          <span class="logo-mark"><span>fQ</span></span>
          <span>finQ</span>
        </a>
        <div class="nav-links" id="nav-links">
          <a class="nav-link" href="index.html"${active==="home" ? ' aria-current="page"' : ''}>Home</a>
          <a class="nav-link" href="index.html#envelopes">Envelopes</a>
          <a class="nav-link" href="index.html#how">How it works</a>
          <a class="nav-link" href="feedback.html"${active==="feedback" ? ' aria-current="page"' : ''}>Feedback</a>
          <a class="nav-link" href="privacy.html"${active==="privacy" ? ' aria-current="page"' : ''}>Privacy</a>
        </div>
        <div class="nav-actions">
          <button class="theme-toggle" id="theme-toggle" aria-label="Toggle theme">
            <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
          </button>
          <a class="btn btn-primary" href="#">Open app</a>
          <button class="menu-btn" id="menu-btn" aria-label="Toggle menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>
      </div>
    </nav>
  `;

  if (navHost) {
    navHost.outerHTML = navHTML;
    document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
    const menuBtn = document.getElementById("menu-btn");
    const links = document.getElementById("nav-links");
    if (menuBtn && links) {
      menuBtn.addEventListener("click", () => links.classList.toggle("open"));
      links.addEventListener("click", e => {
        if (e.target.matches("a")) links.classList.remove("open");
      });
    }
    // Scrolled state
    const navEl = document.getElementById("site-nav");
    const onScroll = () => navEl.classList.toggle("scrolled", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ── Footer ────────────────────────────────────────────
  const footerHost = document.getElementById("footer");
  const footerHTML = `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-col">
            <a class="logo" href="index.html" aria-label="finQ home">
              <span class="logo-mark"><span>fQ</span></span>
              <span>finQ</span>
            </a>
            <p class="footer-tag">A calm money companion. The four envelopes do the discipline so you don't have to think about it.</p>
          </div>
          <div class="footer-col">
            <h4>Product</h4>
            <a href="index.html#envelopes">Envelopes</a>
            <a href="index.html#how">How it works</a>
            <a href="#">Open prototype</a>
          </div>
          <div class="footer-col">
            <h4>Support</h4>
            <a href="feedback.html">Feedback</a>
            <a href="mailto:hello@finq.app">hello@finq.app</a>
          </div>
          <div class="footer-col">
            <h4>Legal</h4>
            <a href="privacy.html">Privacy policy</a>
            <a href="privacy.html#contact">Data requests</a>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} finQ. Built with care.</span>
          <span>v1.0 · Made for keyboard people.</span>
        </div>
      </div>
    </footer>
  `;
  if (footerHost) footerHost.outerHTML = footerHTML;
})();
