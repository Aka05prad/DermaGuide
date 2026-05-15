/**
 * DermaGuide — starter.js
 * Powers starter-page.html
 *
 * Features:
 *  1. Mode switching (Quiz ↔ Face Scan)
 *  2. Multi-step quiz with ingredient tips
 *  3. Face photo upload with drag-and-drop preview
 *  4. CNN skin analysis via /api/analyze-skin
 *  5. Confidence bar rendering
 *  6. Product card rendering for both modes
 *  7. Graceful offline handling when CNN service isn't running
 */

// ── Ingredient tips shown after selecting a concern ──────────
const INGREDIENT_TIPS = {
  acne:         '🧪 Look for: Salicylic Acid, Niacinamide, Benzoyl Peroxide. Avoid heavy oils.',
  pigmentation: '🧪 Look for: Vitamin C, Alpha Arbutin, Kojic Acid. Always use SPF 50+.',
  wrinkles:     '🧪 Look for: Retinol, Peptides, Hyaluronic Acid. Apply SPF every morning.',
  dullness:     '🧪 Look for: Vitamin C, AHA (Glycolic Acid), Niacinamide. Exfoliate 2×/week.',
  'dark spots': '🧪 Look for: Alpha Arbutin, Azelaic Acid, Tranexamic Acid. SPF is non-negotiable.',
};

// ════════════════════════════════════════════════════════════
// MODE SWITCHING (Quiz ↔ Face Scan)
// ════════════════════════════════════════════════════════════
function switchMode(mode) {
  const quizPanel = document.getElementById('modeQuiz');
  const scanPanel = document.getElementById('modeScan');
  const tabQuiz   = document.getElementById('tabQuiz');
  const tabScan   = document.getElementById('tabScan');

  if (mode === 'quiz') {
    quizPanel.style.display = 'block';
    scanPanel.style.display = 'none';
    tabQuiz.classList.add('active');
    tabScan.classList.remove('active');
  } else {
    quizPanel.style.display = 'none';
    scanPanel.style.display = 'block';
    tabScan.classList.add('active');
    tabQuiz.classList.remove('active');
  }
}

// ════════════════════════════════════════════════════════════
// QUIZ — multi-step form
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const form        = document.getElementById('skinForm');
  const resultSect  = document.getElementById('resultSection');
  const aiResult    = document.getElementById('aiResult');
  const steps       = document.querySelectorAll('.quiz-step');
  const dots        = document.querySelectorAll('.step-dot');
  let currentStep   = 0;

  // ── Step navigation ───────────────────────────────────────
  function showStep(n) {
    steps.forEach((s, i) => {
      s.classList.toggle('active-step', i === n);
      s.classList.toggle('hidden-step', i !== n);
    });
    dots.forEach((d, i) => {
      d.classList.toggle('done',   i < n);
      d.classList.toggle('active', i === n);
    });
    currentStep = n;
  }

  document.querySelectorAll('[data-step-next]').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = steps[currentStep].querySelector('select');
      if (!field || !field.value) {
        field && field.classList.add('is-invalid');
        return;
      }
      field.classList.remove('is-invalid');
      showStep(currentStep + 1);
    });
  });

  document.querySelectorAll('[data-step-back]').forEach(btn => {
    btn.addEventListener('click', () => showStep(currentStep - 1));
  });

  if (steps.length > 0) showStep(0);

  // ── Ingredient tip on concern select ─────────────────────
  const concernSelect = document.getElementById('skinConcern');
  const tipBox        = document.getElementById('ingredientTip');
  if (concernSelect && tipBox) {
    concernSelect.addEventListener('change', () => {
      const val = concernSelect.value.toLowerCase();
      const tip = INGREDIENT_TIPS[val];
      if (tip) {
        tipBox.textContent  = tip;
        tipBox.style.display = 'block';
      } else {
        tipBox.style.display = 'none';
      }
    });
  }

  // ── Form submit ───────────────────────────────────────────
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const skinType    = document.getElementById('skinType')?.value    || '';
    const skinConcern = document.getElementById('skinConcern')?.value || '';

    if (!skinType || skinType === 'None' || !skinConcern || skinConcern === 'None') {
      aiResult.innerHTML = `<div class="alert alert-warning rounded-3">⚠️ Please complete all selections.</div>`;
      resultSect.style.display = 'block';
      return;
    }

    resultSect.style.display = 'block';
    aiResult.innerHTML = buildLoader('Analysing your skin profile…');
    resultSect.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      const res  = await fetch('/api/recommend', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ skinType, concern: skinConcern }),
      });
      const data = await res.json();

      if (data.ok && data.recommendations?.length > 0) {
        const tip = INGREDIENT_TIPS[skinConcern.toLowerCase()] || '';
        aiResult.innerHTML = `
          <div class="text-center mb-5">
            <div class="result-badge">AI Analysis Complete ✓</div>
            <h3 style="font-family:'DM Serif Display',serif;margin-top:16px;color:#111c17;">
              Your personalised picks for <em>${skinType}</em> skin
            </h3>
            <p style="color:#6e7d78;">Concern: <strong>${skinConcern}</strong> · ${data.recommendations.length} products matched</p>
            ${tip ? `<div class="ingredient-tip-box">${tip}</div>` : ''}
          </div>
          <div class="row">${data.recommendations.map(productCard).join('')}</div>
          <div class="text-center mt-5">
            <button onclick="resetQuiz()" class="btn btn-outline-secondary rounded-pill px-4 me-2">↩ Start Over</button>
            <a href="index.html#portfolio" class="btn btn-outline-primary rounded-pill px-4">Browse All Products</a>
          </div>`;
      } else {
        aiResult.innerHTML = `
          <div class="text-center py-5">
            <div style="font-size:3rem">🔍</div>
            <h5 class="mt-3">No exact matches found</h5>
            <p style="color:#6e7d78;">Try a different skin type or concern combination.</p>
            <button onclick="resetQuiz()" class="btn btn-primary rounded-pill px-4">Try Again</button>
          </div>`;
      }
    } catch (err) {
      console.error(err);
      aiResult.innerHTML = `
        <div class="alert alert-danger rounded-3 text-center">
          <strong>❌ Connection Error</strong><br>
          Make sure your Node.js server is running on <code>localhost:3000</code>
          <br><button onclick="resetQuiz()" class="btn btn-sm btn-outline-danger mt-3 rounded-pill">Try Again</button>
        </div>`;
    }
  });
});

// ════════════════════════════════════════════════════════════
// FACE SCAN — drag-and-drop upload + CNN analysis
// ════════════════════════════════════════════════════════════

// File input change → show preview + enable scan button
document.addEventListener('DOMContentLoaded', () => {
  const photoInput = document.getElementById('photoInput');
  const uploadZone = document.getElementById('uploadZone');

  if (!photoInput) return;

  photoInput.addEventListener('change', () => {
    if (photoInput.files && photoInput.files[0]) {
      showPreview(photoInput.files[0]);
    }
  });

  // Drag-and-drop
  if (uploadZone) {
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        // Put file into the input so FormData picks it up
        const dt = new DataTransfer();
        dt.items.add(file);
        photoInput.files = dt.files;
        showPreview(file);
      }
    });
  }
});

function showPreview(file) {
  const preview     = document.getElementById('photoPreview');
  const previewWrap = document.getElementById('photoPreviewWrap');
  const scanBtn     = document.getElementById('scanBtn');

  const reader = new FileReader();
  reader.onload = (e) => {
    preview.src           = e.target.result;
    previewWrap.style.display = 'block';
    if (scanBtn) {
      scanBtn.disabled        = false;
      scanBtn.style.opacity   = '1';
    }
  };
  reader.readAsDataURL(file);
}

function clearPhoto() {
  const photoInput  = document.getElementById('photoInput');
  const previewWrap = document.getElementById('photoPreviewWrap');
  const scanBtn     = document.getElementById('scanBtn');
  const scanStatus  = document.getElementById('scanStatus');
  const scanResult  = document.getElementById('scanResultSection');

  if (photoInput)  photoInput.value   = '';
  if (previewWrap) previewWrap.style.display = 'none';
  if (scanBtn)     { scanBtn.disabled = true; scanBtn.style.opacity = '0.5'; }
  if (scanStatus)  { scanStatus.style.display = 'none'; scanStatus.className = 'scan-status'; }
  if (scanResult)  scanResult.style.display = 'none';
}

function clearScan() {
  clearPhoto();
  window.scrollTo({ top: document.getElementById('skin-analyzer')?.offsetTop - 80 || 0, behavior: 'smooth' });
}

// ── Main CNN scan function ───────────────────────────────────
async function runFaceScan() {
  const photoInput     = document.getElementById('photoInput');
  const scanBtn        = document.getElementById('scanBtn');
  const scanStatus     = document.getElementById('scanStatus');
  const scanResultSect = document.getElementById('scanResultSection');

  if (!photoInput?.files?.length) {
    showScanStatus('Please upload a photo first.', 'error');
    return;
  }

  // Loading state
  scanBtn.disabled      = true;
  scanBtn.innerHTML     = `<span class="spinner-border spinner-border-sm me-2"></span> Scanning your skin…`;
  scanStatus.style.display = 'none';
  scanResultSect.style.display = 'none';

  // Build form data
  const formData = new FormData();
  formData.append('photo', photoInput.files[0]);

  try {
    const res  = await fetch('/api/analyze-skin', {
      method: 'POST',
      body:   formData,   // Do NOT set Content-Type manually — browser sets boundary
    });
    const data = await res.json();

    scanBtn.disabled  = false;
    scanBtn.innerHTML = '<i class="bi bi-camera-fill me-2"></i> Scan My Skin';

    // CNN service is offline
    if (res.status === 503) {
      showScanStatus('offline');
      return;
    }

    if (!data.ok) {
      showScanStatus(data.message || 'Analysis failed. Please try again.', 'error');
      return;
    }

    // ── Render results ─────────────────────────────────────
    renderScanResults(data);

  } catch (err) {
    console.error('Face scan error:', err);
    scanBtn.disabled  = false;
    scanBtn.innerHTML = '<i class="bi bi-camera-fill me-2"></i> Scan My Skin';
    showScanStatus('Could not connect to server. Make sure node app.js is running.', 'error');
  }
}

// ── Show status message ──────────────────────────────────────
function showScanStatus(msg, type = 'info') {
  const el = document.getElementById('scanStatus');
  if (!el) return;

  if (type === 'offline') {
    el.className = 'scan-status offline';
    el.innerHTML = `
      <div class="cnn-offline-notice">
        <h6>🔧 CNN Skin Analyzer Not Running</h6>
        <p style="font-size:13px;color:#5a4a00;margin-bottom:10px;">
          The Face Scan feature requires your Python Flask service to be running.
          This is separate from the Node.js server.
        </p>
        <p style="font-size:13px;color:#5a4a00;margin-bottom:6px;"><strong>Start it now — open a new terminal and run:</strong></p>
        <code>cd skin_analyzer</code><br>
        <code>python skin_analyzer.py</code>
        <p style="font-size:12px;color:#7a6a20;margin-top:10px;margin-bottom:0;">
          Once it shows "Running on http://127.0.0.1:5001", come back and try again.<br>
          💡 While CNN is offline, use the <strong>Skin Quiz tab</strong> — it works fully without Python.
        </p>
      </div>`;
  } else if (type === 'error') {
    el.className = 'scan-status error';
    el.innerHTML = `<strong>❌ ${msg}</strong>`;
  } else {
    el.className = 'scan-status';
    el.innerHTML = msg;
  }
  el.style.display = 'block';
}

// ── Render CNN results (condition bars + product cards) ──────
// Ingredient advice per detected condition
const CONDITION_ADVICE = {
  acne:         { emoji: '🔴', label: 'Acne',         tip: 'Look for Salicylic Acid, Niacinamide, Benzoyl Peroxide. Avoid heavy oils and comedogenic ingredients.' },
  pigmentation: { emoji: '🟤', label: 'Pigmentation', tip: 'Look for Vitamin C, Alpha Arbutin, Kojic Acid. Wear SPF 50+ every day without fail.' },
  acne_scar:    { emoji: '🟠', label: 'Acne Scars',   tip: 'Look for AHA (Glycolic Acid), Retinol, Centella Asiatica. Be patient — scars fade over months.' },
  dryness:      { emoji: '🔵', label: 'Dryness',       tip: 'Look for Hyaluronic Acid, Ceramides, Squalane. Avoid alcohol-based toners and hot water on your face.' },
  oiliness:     { emoji: '🟡', label: 'Oiliness',      tip: 'Look for Niacinamide, Zinc, Clay. Use a gentle gel cleanser twice daily and never skip moisturiser.' },
  clear:        { emoji: '🟢', label: 'Clear Skin',    tip: 'Your skin looks healthy! Maintain with a gentle cleanser, light moisturiser, and daily SPF.' },
};

function renderScanResults(data) {
  const scanResultSect  = document.getElementById('scanResultSection');
  const barsContainer   = document.getElementById('barsContainer');
  const scanResultTitle = document.getElementById('scanResultTitle');
  const scanProductsDiv = document.getElementById('scanProducts');

  // ── Confidence bars ────────────────────────────────────────
  if (barsContainer && data.scores) {
    barsContainer.innerHTML = Object.entries(data.scores)
      .sort(([, a], [, b]) => b - a)
      .map(([condition, score]) => {
        const level = score >= 50 ? 'high' : score >= 25 ? 'medium' : '';
        return `
          <div class="condition-bar">
            <div class="label">
              <span>${(CONDITION_ADVICE[condition]?.emoji || '⚪')} ${condition.replace(/_/g, ' ')}</span>
              <span>${score.toFixed(1)}%</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill ${level}" style="width:${score}%"></div>
            </div>
          </div>`;
      }).join('');
  }

  // ── Title ──────────────────────────────────────────────────
  if (scanResultTitle) {
    const detected = (data.detected || []).map(d => d.replace(/_/g, ' ')).join(', ')
                     || (data.primary || '').replace(/_/g, ' ')
                     || 'your skin';
    scanResultTitle.innerHTML = `Your CNN scan detected: <em>${detected}</em>`;
  }

  // ── Replace flickering product cards with advice cards ─────
  // Products are removed here because image URLs in the current
  // dataset are broken, causing the flickering/loading issue.
  // Instead we show ingredient advice per detected condition,
  // then direct the user to the Skin Quiz for product picks.
  if (scanProductsDiv) {
    const detected = data.detected || (data.primary ? [data.primary] : []);

    // Build one advice card per detected condition
    const adviceCards = detected.map(condition => {
      const info = CONDITION_ADVICE[condition] || {
        emoji: '🔬',
        label: condition.replace(/_/g, ' '),
        tip:   'Use gentle, fragrance-free products suitable for sensitive skin.'
      };
      return `
        <div class="col-md-6 mb-4">
          <div style="
            background:#fff; border-radius:16px; padding:24px;
            border-left:5px solid #1a4a3a;
            box-shadow:0 4px 20px rgba(0,0,0,0.07);
            height:100%;">
            <div style="font-size:2rem;margin-bottom:10px;">${info.emoji}</div>
            <h5 style="font-family:'DM Serif Display',serif;color:#1a4a3a;margin-bottom:8px;text-transform:capitalize;">
              ${info.label}
            </h5>
            <p style="color:#6e7d78;font-size:0.88rem;line-height:1.7;margin:0;">
              ${info.tip}
            </p>
          </div>
        </div>`;
    }).join('');

    // Skin type mapping from primary condition → quiz pre-fill suggestion
    const skinTypeHint = {
      acne:         'Oily',
      oiliness:     'Oily',
      dryness:      'Dry',
      pigmentation: 'Combination',
      acne_scar:    'Combination',
      clear:        'Normal',
    };
    const quizSkinType    = skinTypeHint[data.primary] || '';
    const quizConcernMap  = {
      acne:         'Acne',
      pigmentation: 'Pigmentation',
      acne_scar:    'Dark Spots',
      dryness:      'Dullness',
      oiliness:     'Acne',
      clear:        '',
    };
    const quizConcern = quizConcernMap[data.primary] || '';

    scanProductsDiv.innerHTML = `
      ${adviceCards
        ? `<div class="col-12 mb-4">
             <h5 style="font-family:'DM Serif Display',serif;color:#111c17;margin-bottom:4px;">
               🧴 What to look for in your products
             </h5>
             <p style="color:#6e7d78;font-size:0.88rem;">
               Based on your CNN scan, here are the key ingredients and tips for each detected condition.
             </p>
           </div>
           ${adviceCards}`
        : ''}

      <div class="col-12 mt-3">
        <div style="
          background:linear-gradient(135deg,#0d3d2c,#1a6644);
          border-radius:18px; padding:32px; text-align:center; color:#fff;">
          <div style="font-size:2rem;margin-bottom:10px;">🛒</div>
          <h5 style="font-family:'DM Serif Display',serif;font-size:1.3rem;margin-bottom:8px;">
            Ready to find the perfect products?
          </h5>
          <p style="color:rgba(255,255,255,0.8);font-size:0.9rem;margin-bottom:20px;max-width:420px;margin-left:auto;margin-right:auto;">
            The CNN scan tells you <em>what</em> your skin needs. Take the Skin Quiz to get
            <strong>product recommendations</strong> matched to your exact profile.
          </p>
          <button onclick="goToQuizWithHint('${quizSkinType}','${quizConcern}')"
            style="background:#c9a85c;color:#111;border:none;border-radius:40px;
                   padding:12px 32px;font-weight:700;font-size:14px;cursor:pointer;
                   transition:background 0.2s;"
            onmouseover="this.style.background='#e8c97a'"
            onmouseout="this.style.background='#c9a85c'">
            ✨ Get Product Recommendations →
          </button>
        </div>
      </div>`;
  }

  scanResultSect.style.display = 'block';
  scanResultSect.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Pre-fill the quiz selects with the CNN-detected skin profile, then switch to quiz tab
function goToQuizWithHint(skinType, concern) {
  switchMode('quiz');

  // Pre-fill skin type if detected
  if (skinType) {
    const stEl = document.getElementById('skinType');
    if (stEl) stEl.value = skinType;
  }

  // Pre-fill concern if detected, and show ingredient tip
  if (concern) {
    const cEl = document.getElementById('skinConcern');
    if (cEl) {
      cEl.value = concern;
      cEl.dispatchEvent(new Event('change')); // trigger ingredient tip
    }
  }

  // Jump straight to Step 2 if skinType was filled
  if (skinType) {
    const steps = document.querySelectorAll('.quiz-step');
    const dots  = document.querySelectorAll('.step-dot');
    steps.forEach((s, i) => {
      s.classList.toggle('active-step', i === 1);
      s.classList.toggle('hidden-step', i !== 1);
    });
    dots.forEach((d, i) => {
      d.classList.toggle('active', i === 1);
      d.classList.toggle('done',   i < 1);
    });
  }

  window.scrollTo({
    top: (document.getElementById('skin-analyzer')?.offsetTop || 200) - 80,
    behavior: 'smooth'
  });
}

// ════════════════════════════════════════════════════════════
// SHARED HELPERS
// ════════════════════════════════════════════════════════════

// Build a product card — NO images (removed: caused flickering + broken URLs)
function productCard(p) {
  const categoryIcons = {
    "Moisturizer": "💧", "Cleanser": "🫧", "Serum": "✨",
    "Sunscreen": "☀️", "Treatment": "🔬", "Exfoliator": "🌿",
    "Essence": "💎", "Body Lotion": "🧴", "Toner": "🌊",
  };
  const icon = categoryIcons[p.category] || "🛍️";

  return `
    <div class="col-lg-4 col-md-6 mb-4">
      <div class="dg-product-card">
        <div class="dg-card-top">
          <span class="dg-card-icon">${icon}</span>
          <span class="dg-card-badge">${p.category || "Skincare"}</span>
        </div>
        ${p.brand ? `<p class="dg-card-brand">${p.brand}</p>` : ""}
        <h5 class="dg-card-name">${p.name}</h5>
        <p class="dg-card-desc">${p.description || ""}</p>
        <div class="dg-card-footer">
          ${p.price ? `<span class="dg-card-price">₹${p.price}</span>` : "<span></span>"}
          <a href="${p.buy_link || "#"}" target="_blank" rel="noopener" class="dg-shop-btn">
            Shop Now →
          </a>
        </div>
      </div>
    </div>`;
}

// Loader HTML
function buildLoader(msg = 'Analysing…') {
  return `
    <div class="text-center py-5">
      <div class="dg-loader mb-4"><span></span><span></span><span></span></div>
      <p style="color:#6e7d78;font-weight:500;">${msg}</p>
    </div>`;
}

// Reset quiz to Step 1
function resetQuiz() {
  const form       = document.getElementById('skinForm');
  const resultSect = document.getElementById('resultSection');
  const tipBox     = document.getElementById('ingredientTip');
  const steps      = document.querySelectorAll('.quiz-step');
  const dots       = document.querySelectorAll('.step-dot');

  if (form)       form.reset();
  if (resultSect) resultSect.style.display = 'none';
  if (tipBox)     tipBox.style.display = 'none';

  steps.forEach((s, i) => {
    s.classList.toggle('active-step', i === 0);
    s.classList.toggle('hidden-step', i !== 0);
  });
  dots.forEach((d, i) => {
    d.classList.toggle('active', i === 0);
    d.classList.remove('done');
  });

  window.scrollTo({
    top: (document.getElementById('skin-analyzer')?.offsetTop || 200) - 80,
    behavior: 'smooth'
  });
}
