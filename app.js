const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Load products once
const PRODUCTS_PATH = path.join(__dirname, 'products.json');
let PRODUCTS = [];
try {
  PRODUCTS = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf8'));
} catch (e) {
  console.error('Failed to load products.json', e);
}

// Fallback recommender (in case AI model fails)
function recommendProducts({ skinType, concern, limit = 6 }) {
  const st = (skinType || '').toLowerCase().trim();
  const c = (concern || '').toLowerCase().trim();

  const scored = PRODUCTS.map(p => {
    let score = 0;
    if (p.skinType && p.skinType.map(x => x.toLowerCase()).includes(st)) score += 2;
    if (p.concerns && p.concerns.map(x => x.toLowerCase()).includes(c)) score += 1;
    return { product: p, score };
  });

  scored.sort((a, b) => (b.score - a.score) || a.product.name.localeCompare(b.product.name));
  const results = scored.filter(s => s.score > 0).slice(0, limit).map(s => s.product);
  return results.length > 0 ? results : PRODUCTS.slice(0, limit);
}

// --- API endpoint ---
app.post('/api/recommend', (req, res) => {
  const { skinType, concern } = req.body;

  // Call Python AI model
  const py = spawnSync('python', ['ai_model.py'], {
    input: JSON.stringify({ products: PRODUCTS, skinType, concern }),
    encoding: 'utf8'
  });

  let output;
  try {
    output = JSON.parse(py.stdout); // ai_model.py returns full JSON
  } catch (e) {
    console.error('AI model parse error:', e);
    output = { ok: false, recommendations: recommendProducts({ skinType, concern, limit: 8 }) };
  }

  // Always return consistent structure
  res.json({
    ok: true,
    meta: { skinType, concern },
    recommendations: output.recommendations || output
  });
});

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date() }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));

