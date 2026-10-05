/* =========================================================
   TRI TECH — Main Scripts
   Innovation • Technology • Tomorrow
   ========================================================= */
(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouchDevice = window.matchMedia("(hover: none)").matches;

  /* ---------- Utility helpers ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const raf = (fn) => window.requestAnimationFrame(fn);

  /* ---------------------------------------------------------
     Preloader
     --------------------------------------------------------- */
  const preloader = $("#preloader");
  function hidePreloader() {
    if (!preloader) return;
    preloader.classList.add("done");
    document.body.classList.add("loaded");
    setTimeout(() => preloader.setAttribute("aria-hidden", "true"), 800);
  }
  window.addEventListener("load", () => setTimeout(hidePreloader, 500));
  setTimeout(hidePreloader, 3500); // failsafe

  /* ---------------------------------------------------------
     Navbar — scroll state + active link
     --------------------------------------------------------- */
  const navbar = $("#navbar");
  const backTop = $("#back-top");

  function onScroll() {
    const y = window.scrollY;
    if (navbar) navbar.classList.toggle("scrolled", y > 30);
    if (backTop) backTop.classList.toggle("visible", y > 700);

    let currentId = "";
    const probe = y + window.innerHeight * 0.34;
    $$("section[id]").forEach((sec) => {
      if (sec.offsetTop <= probe) currentId = sec.id;
    });
    $$(".nav-link").forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === "#" + currentId);
    });
  }

  let scrollTicking = false;
  window.addEventListener("scroll", () => {
    if (!scrollTicking) {
      raf(() => { onScroll(); scrollTicking = false; });
      scrollTicking = true;
    }
  }, { passive: true });

  /* ---------------------------------------------------------
     Mobile menu
     --------------------------------------------------------- */
  const hamburger = $("#hamburger");
  const mobileMenu = $("#mobile-menu");
  const mobileClose = $("#mobile-close");

  function toggleMenu(force) {
    const open = force !== undefined ? force : !mobileMenu.classList.contains("open");
    mobileMenu.classList.toggle("open", open);
    document.body.classList.toggle("menu-locked", open);
    if (hamburger) hamburger.setAttribute("aria-expanded", String(open));
    if (mobileMenu) mobileMenu.setAttribute("aria-hidden", String(!open));
  }

  if (hamburger) hamburger.addEventListener("click", () => toggleMenu());
  if (mobileClose) mobileClose.addEventListener("click", () => toggleMenu(false));
  $$(".mobile-link").forEach((l) => l.addEventListener("click", () => toggleMenu(false)));
/* ---------------------------------------------------------
     Cursor glow (desktop only)
     --------------------------------------------------------- */
  const cursorGlow = $("#cursor-glow");
  if (cursorGlow && !isTouchDevice && !prefersReducedMotion) {
    let targetX = window.innerWidth / 2, targetY = window.innerHeight / 3;
    let curX = targetX, curY = targetY;
    let visible = false;

    document.addEventListener("mousemove", (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!visible) { visible = true; cursorGlow.style.opacity = "1"; }
    });

    (function glowLoop() {
      curX += (targetX - curX) * 0.08;
      curY += (targetY - curY) * 0.08;
      cursorGlow.style.transform = `translate(${curX - 230}px, ${curY - 230}px)`;
      raf(glowLoop);
    })();

    document.addEventListener("mouseleave", () => { visible = false; cursorGlow.style.opacity = "0"; });
  }

  /* ---------------------------------------------------------
     Canvas helpers
     --------------------------------------------------------- */
  function setupCanvas(canvas) {
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);
    return { ctx, getSize: () => ({ w, h }) };
  }

  /* ---------------------------------------------------------
     Hero network + particles
     --------------------------------------------------------- */
  const heroCanvas = $("#hero-canvas");
  if (heroCanvas && !prefersReducedMotion) {
    const { ctx, getSize } = setupCanvas(heroCanvas);
    const NODES = 46;
    const LINK_DIST = 150;
    let nodes = [];
    const mouse = { x: -9999, y: -9999 };

    function initNodes() {
      const { w, h } = getSize();
      nodes = Array.from({ length: NODES }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        r: Math.random() * 1.8 + 0.8,
        pull: Math.random() > 0.82, // AI nodes
      }));
    }

    function draw() {
      const { w, h } = getSize();
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.hypot(dx, dy);
          if (d < LINK_DIST) {
            const alpha = (1 - d / LINK_DIST) * 0.4;
            ctx.strokeStyle = `rgba(96, 165, 250, ${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      nodes.forEach((n) => {
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 3);
        grad.addColorStop(0, n.pull ? "rgba(34,211,238,0.85)" : "rgba(96,165,250,0.6)");
        grad.addColorStop(1, "rgba(96,165,250,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = n.pull ? "#67E8F9" : "#93C5FD";
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();

        const mdx = n.x - mouse.x;
        const mdy = n.y - mouse.y;
        const md = Math.hypot(mdx, mdy);
        if (md < 170) {
          ctx.strokeStyle = `rgba(34, 211, 238, ${(1 - md / 170) * 0.7})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      });
    }

    function step() {
      const { w, h } = getSize();
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = w + 20;
        if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20;
        if (n.y > h + 20) n.y = -20;
      }
      draw();
      raf(step);
    }

    initNodes();
    step();

    heroCanvas.parentElement.addEventListener("mousemove", (e) => {
      const rect = heroCanvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });
    heroCanvas.parentElement.addEventListener("mouseleave", () => { mouse.x = -9999; mouse.y = -9999; });
  }
/* ---------------------------------------------------------
     Ambient full-page particles
     --------------------------------------------------------- */
  const ambientCanvas = $("#ambient-canvas");
  if (ambientCanvas && !prefersReducedMotion) {
    const { ctx, getSize } = setupCanvas(ambientCanvas);
    const P_COUNT = 42;
    let parts = [];

    function initParts() {
      const { w, h } = getSize();
      parts = Array.from({ length: P_COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.6 + 0.4,
        s: Math.random() * 0.35 + 0.12,
        o: Math.random() * 0.5 + 0.2,
      }));
    }

    function drawParts() {
      const { w, h } = getSize();
      ctx.clearRect(0, 0, w, h);
      parts.forEach((p) => {
        p.y -= p.s;
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        ctx.fillStyle = `rgba(147, 197, 253, ${p.o})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      raf(drawParts);
    }

    initParts();
    drawParts();
    window.addEventListener("resize", initParts);
  }

  /* ---------------------------------------------------------
     Scroll reveal
     --------------------------------------------------------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -40px 0px" });

  $$(".reveal").forEach((el) => revealObserver.observe(el));

  // Timeline animated line
  const timeline = $(".timeline");
  if (timeline) {
    const tlObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { timeline.classList.add("animated"); tlObserver.unobserve(timeline); }
      });
    }, { threshold: 0.2 });
    tlObserver.observe(timeline);
  }

  /* ---------------------------------------------------------
     Animated counters + stat bars
     --------------------------------------------------------- */
  function animateCounter(el) {
    const target = parseInt(el.dataset.count, 10) || 0;
    const duration = 1700;
    const start = performance.now();

    function frame(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) raf(frame);
      else el.textContent = target;
    }
    raf(frame);
  }

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const item = entry.target;
        item.classList.add("in-view");
        const num = $(".counter", item);
        if (num) animateCounter(num);
        counterObserver.unobserve(item);
      }
    });
  }, { threshold: 0.5 });

  $$(".stat-item").forEach((item) => counterObserver.observe(item));

  /* ---------------------------------------------------------
     Testimonial carousel
     --------------------------------------------------------- */
  const carousel = $("#t-carousel");
  if (carousel) {
    const track = $("#t-track");
    const slides = $$(".testimonial-card", track);
    const dots = $$(".t-dot");
    let index = 0;
    let autoplayTimer = null;

    function goTo(i, animate = true) {
      index = (i + slides.length) % slides.length;
      if (!animate) {
        track.style.transition = "none";
        track.style.transform = `translateX(-${index * 100}%)`;
        track.offsetHeight; // reflow
        track.style.transition = "";
      } else {
        track.style.transform = `translateX(-${index * 100}%)`;
      }
      dots.forEach((d, di) => d.classList.toggle("active", di === index));
    }

    function startAutoplay() {
      if (prefersReducedMotion) return;
      stopAutoplay();
      autoplayTimer = setInterval(() => goTo(index + 1), 6000);
    }
    function stopAutoplay() {
      if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; }
    }

    $("#t-next") && $("#t-next").addEventListener("click", () => { stopAutoplay(); goTo(index + 1); startAutoplay(); });
    $("#t-prev") && $("#t-prev").addEventListener("click", () => { stopAutoplay(); goTo(index - 1); startAutoplay(); });
    dots.forEach((d) => d.addEventListener("click", () => {
      stopAutoplay();
      goTo(parseInt(d.dataset.i, 10));
      startAutoplay();
    }));

    // Swipe support
    let startX = 0;
    carousel.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; stopAutoplay(); }, { passive: true });
    carousel.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 46) goTo(index + (dx < 0 ? 1 : -1));
      startAutoplay();
    }, { passive: true });

    goTo(0, false);
    startAutoplay();
  }

  /* ---------------------------------------------------------
     Magnetic buttons
     --------------------------------------------------------- */
  if (!isTouchDevice && !prefersReducedMotion) {
    $$(".magnetic").forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        const rect = btn.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) * 0.24;
        const y = (e.clientY - rect.top - rect.height / 2) * 0.3;
        btn.style.transform = `translate(${x}px, ${y}px)`;
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.transition = "transform 0.45s var(--ease, cubic-bezier(0.22,1,0.36,1))";
        btn.style.transform = "";
        setTimeout(() => { btn.style.transition = ""; }, 450);
      });
    });
  }
/* ---------------------------------------------------------
     Parallax (hero depth layers + scroll parallax)
     --------------------------------------------------------- */
  if (!prefersReducedMotion) {
    // Mouse parallax
    const depthEls = $$("[data-depth]");
    if (depthEls.length && !isTouchDevice) {
      let mx = 0, my = 0, cx = 0, cy = 0;

      document.addEventListener("mousemove", (e) => {
        mx = (e.clientX / window.innerWidth - 0.5) * 2;
        my = (e.clientY / window.innerHeight - 0.5) * 2;
      });

      (function parallaxLoop() {
        cx += (mx - cx) * 0.05;
        cy += (my - cy) * 0.05;
        depthEls.forEach((el) => {
          const d = parseFloat(el.dataset.depth) || 0.4;
          el.style.transform = `translate(${cx * d * -1 * 22}px, ${cy * d * -1 * 18}px)`;
        });
        raf(parallaxLoop);
      })();
    }

    // Subtle scroll parallax for the hero symbol & section visuals
    const hero = $(".hero");
    if (hero) {
      const symbol = $(".hero-symbol", hero);
      window.addEventListener("scroll", () => {
        if (window.scrollY < window.innerHeight && symbol) {
          const p = window.scrollY / window.innerHeight;
          symbol.style.marginTop = (p * 60) + "px";
          symbol.style.opacity = String(Math.max(0.25, 1 - p * 1.4));
        }
      }, { passive: true });
    }
  }

  /* ---------------------------------------------------------
     Smooth anchor scrolling (compensate + close menus)
     --------------------------------------------------------- */
  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      const navH = navbar ? navbar.offsetHeight : 78;
      const top = target.getBoundingClientRect().top + window.scrollY - navH + 2;
      window.scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  });

  // Back to top
  if (backTop) {
    backTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  }

  /* ---------------------------------------------------------
     Contact form (front-end validation + success state)
     --------------------------------------------------------- */
  const form = $("#contact-form");
  if (form) {
    const note = $("#form-note");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      note.classList.remove("error");
      note.textContent = "";

      const name = $("#cf-name").value.trim();
      const email = $("#cf-email").value.trim();
      const service = $("#cf-service").value;
      const message = $("#cf-message").value.trim();
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!name) return fail("Please enter your full name.");
      if (!email || !emailOk) return fail("Please enter a valid business email.");
      if (!service) return fail("Please select a service.");
      if (!message) return fail("Please tell us a little about your project.");

      const button = $('button[type="submit"]', form);
      const original = button.textContent;
      button.textContent = "Sending…";
      button.disabled = true;

      setTimeout(() => {
        note.textContent = "✓ Thank you! Your inquiry has been received. Our team will reach out within 24 hours.";
        form.reset();
        button.textContent = "✓ Inquiry Sent";
        setTimeout(() => { button.textContent = original; button.disabled = false; }, 4000);
      }, 900);

      function fail(msg) {
        note.classList.add("error");
        note.textContent = msg;
        button.disabled = false;
      }
    });
  }

  /* ---------------------------------------------------------
     Hero title reveal — ensure words visible if animations late
     --------------------------------------------------------- */
  $$(".word").forEach((w, i) => w.style.animationDelay = `${0.15 + i * 0.13}s`);

  onScroll();
})();
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggleMenu(false); });