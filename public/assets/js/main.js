/**
 * DermaGuide — main.js  (UPDATED)
 * Changes from original are marked with [CHANGED] comments.
 *
 * Original: BizPage template JS (BootstrapMade)
 * Updated by: DermaGuide team
 */

(function () {
  "use strict";

  // ── Scroll class on body ──────────────────────────────────
  function toggleScrolled() {
    const body   = document.querySelector("body");
    const header = document.querySelector("#header");
    if (!header) return;
    if (
      !header.classList.contains("scroll-up-sticky") &&
      !header.classList.contains("sticky-top") &&
      !header.classList.contains("fixed-top")
    ) return;
    window.scrollY > 100
      ? body.classList.add("scrolled")
      : body.classList.remove("scrolled");
  }
  document.addEventListener("scroll", toggleScrolled);
  window.addEventListener("load", toggleScrolled);

  // ── Mobile nav toggle ─────────────────────────────────────
  const mobileNavToggleBtn = document.querySelector(".mobile-nav-toggle");
  if (mobileNavToggleBtn) {
    function mobileNavToggle() {
      document.querySelector("body").classList.toggle("mobile-nav-active");
      mobileNavToggleBtn.classList.toggle("bi-list");
      mobileNavToggleBtn.classList.toggle("bi-x");
    }
    mobileNavToggleBtn.addEventListener("click", mobileNavToggle);

    document.querySelectorAll("#navmenu a").forEach((link) => {
      link.addEventListener("click", () => {
        if (document.querySelector(".mobile-nav-active")) mobileNavToggle();
      });
    });
  }

  // ── Dropdown toggle ───────────────────────────────────────
  document.querySelectorAll(".navmenu .toggle-dropdown").forEach((el) => {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      this.parentNode.classList.toggle("active");
      this.parentNode.nextElementSibling.classList.toggle("dropdown-active");
      e.stopImmediatePropagation();
    });
  });

  // ── Preloader ─────────────────────────────────────────────
  const preloader = document.querySelector("#preloader");
  if (preloader) window.addEventListener("load", () => preloader.remove());

  // ── Scroll-to-top button ──────────────────────────────────
  const scrollTop = document.querySelector(".scroll-top");
  if (scrollTop) {
    function toggleScrollTop() {
      window.scrollY > 100
        ? scrollTop.classList.add("active")
        : scrollTop.classList.remove("active");
    }
    scrollTop.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    window.addEventListener("load", toggleScrollTop);
    document.addEventListener("scroll", toggleScrollTop);
  }

  // ── AOS animations ────────────────────────────────────────
  function aosInit() {
    AOS.init({ duration: 700, easing: "ease-in-out", once: true, mirror: false });
  }
  window.addEventListener("load", aosInit);

  // ── Carousel indicators ───────────────────────────────────
  document.querySelectorAll(".carousel-indicators").forEach((indicator) => {
    indicator
      .closest(".carousel")
      .querySelectorAll(".carousel-item")
      .forEach((item, i) => {
        indicator.innerHTML += `<li data-bs-target="#${indicator.closest(".carousel").id}" data-bs-slide-to="${i}" ${i === 0 ? 'class="active"' : ""}></li>`;
      });
  });

  // ── PureCounter ───────────────────────────────────────────
  if (typeof PureCounter !== "undefined") new PureCounter();

  // ── GLightbox ─────────────────────────────────────────────
  if (typeof GLightbox !== "undefined") GLightbox({ selector: ".glightbox" });

  // ── Isotope portfolio filters ─────────────────────────────
  document.querySelectorAll(".isotope-layout").forEach((isotopeItem) => {
    const layout = isotopeItem.getAttribute("data-layout") ?? "masonry";
    const filter = isotopeItem.getAttribute("data-default-filter") ?? "*";
    const sort   = isotopeItem.getAttribute("data-sort") ?? "original-order";
    let initIsotope;

    imagesLoaded(isotopeItem.querySelector(".isotope-container"), () => {
      initIsotope = new Isotope(isotopeItem.querySelector(".isotope-container"), {
        itemSelector: ".isotope-item",
        layoutMode: layout,
        filter,
        sortBy: sort,
      });
    });

    isotopeItem.querySelectorAll(".isotope-filters li").forEach((filterBtn) => {
      filterBtn.addEventListener("click", function () {
        isotopeItem.querySelector(".isotope-filters .filter-active").classList.remove("filter-active");
        this.classList.add("filter-active");
        initIsotope.arrange({ filter: this.getAttribute("data-filter") });
        aosInit();
      });
    });
  });

  // ── Swiper ────────────────────────────────────────────────
  function initSwiper() {
    document.querySelectorAll(".init-swiper").forEach((el) => {
      const config = JSON.parse(el.querySelector(".swiper-config").innerHTML.trim());
      new Swiper(el, config);
    });
  }
  window.addEventListener("load", initSwiper);

  // ── FAQ accordion ─────────────────────────────────────────
  document.querySelectorAll(".faq-item h3, .faq-item .faq-toggle").forEach((el) => {
    el.addEventListener("click", () => el.parentNode.classList.toggle("faq-active"));
  });

  // ── Hash scroll correction ────────────────────────────────
  window.addEventListener("load", () => {
    if (window.location.hash && document.querySelector(window.location.hash)) {
      setTimeout(() => {
        const section = document.querySelector(window.location.hash);
        window.scrollTo({
          top: section.offsetTop - parseInt(getComputedStyle(section).scrollMarginTop),
          behavior: "smooth",
        });
      }, 100);
    }
  });

  // ── Navmenu scrollspy ─────────────────────────────────────
  const navLinks = document.querySelectorAll(".navmenu a");
  function navmenuScrollspy() {
    navLinks.forEach((link) => {
      if (!link.hash) return;
      const section = document.querySelector(link.hash);
      if (!section) return;
      const pos = window.scrollY + 200;
      if (pos >= section.offsetTop && pos <= section.offsetTop + section.offsetHeight) {
        document.querySelectorAll(".navmenu a.active").forEach((a) => a.classList.remove("active"));
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  }
  window.addEventListener("load", navmenuScrollspy);
  document.addEventListener("scroll", navmenuScrollspy);

})();

// ============================================================
// [CHANGED] Contact Form — wired to /api/contact backend route
// Previously used a dummy preventDefault with no server call.
// Now sends data to the backend and shows real feedback.
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  const contactForm = document.getElementById("contactForm");
  if (!contactForm) return;

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const btn = contactForm.querySelector('button[type="submit"]');
    const msgEl = document.getElementById("formMessage");
    const originalText = btn.innerHTML;

    // Loading state
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Sending...`;

    const formData = {
      name:    contactForm.querySelector('[name="name"]').value,
      email:   contactForm.querySelector('[name="email"]').value,
      subject: contactForm.querySelector('[name="subject"]').value,
      message: contactForm.querySelector('[name="message"]').value,
    };

    try {
      const res  = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      msgEl.style.display = "block";
      if (data.ok) {
        msgEl.innerHTML = `<p class="text-success fw-semibold">✅ ${data.message}</p>`;
        contactForm.reset();
      } else {
        msgEl.innerHTML = `<p class="text-danger fw-semibold">❌ ${data.message}</p>`;
      }
    } catch (err) {
      msgEl.style.display = "block";
      msgEl.innerHTML = `<p class="text-danger fw-semibold">❌ Could not send message. Please try again.</p>`;
    }

    btn.disabled = false;
    btn.innerHTML = originalText;
    setTimeout(() => { msgEl.style.display = "none"; }, 5000);
  });
});

// ============================================================
// [CHANGED] Skin Quiz on index.html (quick inline quiz)
// Added: shows a 3-card teaser of results right on the homepage,
// then links user to the full Skin Analyzer page for detail.
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  const skinForm    = document.getElementById("skinForm");
  const resultSect  = document.getElementById("resultSection");
  const aiResult    = document.getElementById("aiResult");
  if (!skinForm || !resultSect || !aiResult) return;

  skinForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const skinType   = document.getElementById("skinType")?.value   || "";
    const skinConcern = document.getElementById("skinConcern")?.value || "";

    // [CHANGED] Validate both fields before calling API
    if (!skinType || skinType === "None" || !skinConcern || skinConcern === "None") {
      aiResult.innerHTML = `<div class="alert alert-warning rounded-3">⚠️ Please select both your skin type and main concern.</div>`;
      resultSect.style.display = "block";
      return;
    }

    // Loading
    resultSect.style.display = "block";
    aiResult.innerHTML = `
      <div class="text-center py-4">
        <div class="spinner-border text-primary" role="status" style="width:2.5rem;height:2.5rem;"></div>
        <p class="mt-3 text-muted fw-medium">Analyzing your skin profile…</p>
      </div>`;
    resultSect.scrollIntoView({ behavior: "smooth" });

    try {
      const res  = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skinType, concern: skinConcern }),
      });
      const data = await res.json();

      if (data.ok && data.recommendations?.length > 0) {
        // [CHANGED] Render product cards with rating stars + badge
        const cards = data.recommendations.slice(0, 6).map((p) => `
          <div class="col-md-4 mb-4">
            <div class="card h-100 border-0 shadow-sm product-result-card">
              <div class="product-img-wrap">
                <img src="${p.image || 'assets/img/products/placeholder.jpg'}"
                     class="card-img-top" alt="${p.name}"
                     onerror="this.src='assets/img/products/placeholder.jpg'">
                <span class="product-badge">${p.category || 'Skincare'}</span>
              </div>
              <div class="card-body text-center">
                <h5 class="card-title fw-semibold">${p.name}</h5>
                <p class="card-text text-muted small mb-3">${p.description || ''}</p>
                ${p.price ? `<p class="product-price">₹${p.price}</p>` : ''}
                <a href="${p.buy_link || '#'}" target="_blank"
                   class="btn btn-sm btn-dg w-100">Shop Now →</a>
              </div>
            </div>
          </div>`).join("");

        aiResult.innerHTML = `
          <div class="text-center mb-4">
            <h4 class="fw-bold text-success">✨ Recommended for ${skinType} skin with ${skinConcern}</h4>
            <p class="text-muted small">Powered by DermaGuide AI</p>
          </div>
          <div class="row justify-content-center">${cards}</div>
          <div class="text-center mt-2">
            <a href="starter-page.html" class="btn btn-outline-primary btn-sm rounded-pill px-4">
              Get Full Skin Analysis →
            </a>
          </div>`;
      } else {
        aiResult.innerHTML = `<div class="alert alert-info rounded-3">😊 No exact matches found — <a href="starter-page.html">try the full analyzer</a> for more options.</div>`;
      }
    } catch (err) {
      console.error(err);
      aiResult.innerHTML = `<div class="alert alert-danger rounded-3">❌ Server not responding. Make sure your backend is running on port 3000.</div>`;
    }
  });
});