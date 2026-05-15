require('dotenv').config();
const express    = require('express');
const path       = require('path');
const fs         = require('fs');
const { spawnSync } = require('child_process');
const mongoose   = require('mongoose');
const multer     = require('multer');
const axios      = require('axios');

const Product = require('./models/Product');

// ── MongoDB ──────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected!'))
  .catch(err => console.error('MongoDB error:', err));

// ── Express ──────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── CORS ─────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Multer (declared ONCE) ────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  }
});

// ── Flask CNN URL ─────────────────────────────────────────────
const SKIN_API = process.env.SKIN_ANALYZER_URL || 'http://localhost:5001';

// ── Local product cache ───────────────────────────────────────
const PRODUCTS_PATH = path.join(__dirname, 'products.json');
let LOCAL_PRODUCTS = [];
try {
  LOCAL_PRODUCTS = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf8'));
  console.log(`📦 Loaded ${LOCAL_PRODUCTS.length} products from local JSON`);
} catch (e) {
  console.warn('products.json not found — using MongoDB only');
}

// ── JS fallback recommender ───────────────────────────────────
function recommendProducts({ skinType, concern, limit = 8 }) {
  const st = (skinType || '').toLowerCase().trim();
  const c  = (concern  || '').toLowerCase().trim();

  const scored = LOCAL_PRODUCTS.map(p => {
    let score = 0;
    if ((p.skinType   || []).map(x => x.toLowerCase()).includes(st)) score += 2;
    if ((p.concerns   || []).map(x => x.toLowerCase()).includes(c))  score += 3;
    if ((p.name        || '').toLowerCase().includes(c)) score += 1;
    if ((p.description || '').toLowerCase().includes(c)) score += 1;
    return { product: p, score };
  });

  scored.sort((a, b) => (b.score - a.score) || a.product.name.localeCompare(b.product.name));
  const results = scored.filter(s => s.score > 0).slice(0, limit).map(s => s.product);
  return results.length > 0 ? results : LOCAL_PRODUCTS.slice(0, limit);
}

// ════════════════════════════════════════════════════════════
// POST /api/recommend — quiz → product recommendations
// ════════════════════════════════════════════════════════════
app.post('/api/recommend', async (req, res) => {
  const { skinType, concern } = req.body;

  if (!skinType || !concern) {
    return res.status(400).json({ ok: false, message: 'skinType and concern are required.' });
  }

  // Load from MongoDB, fall back to local JSON
  let dbProducts = [];
  try {
    dbProducts = await Product.find({});
    if (dbProducts.length === 0) {
      console.warn('MongoDB returned 0 products — using local JSON');
      dbProducts = LOCAL_PRODUCTS;
    }
  } catch (dbErr) {
    console.warn('DB fetch failed, using local JSON:', dbErr.message);
    dbProducts = LOCAL_PRODUCTS;
  }

  // Try Python AI model
  const pythonCmds = ['python', 'python3'];
  let pyOutput = null;

  for (const cmd of pythonCmds) {
    const py = spawnSync(cmd, ['ai_model.py'], {
      input:    JSON.stringify({ products: dbProducts, skinType, concern }),
      encoding: 'utf8',
      timeout:  15000,
      cwd:      __dirname
    });
    if (py.stderr) console.warn(`[${cmd}] stderr:`, py.stderr.slice(0, 300));
    if (py.stdout && !py.error) {
      try {
        const parsed = JSON.parse(py.stdout);
        const recs   = parsed.recommendations || parsed;
        if (Array.isArray(recs) && recs.length > 0) { pyOutput = recs; break; }
      } catch (_) {}
    }
  }

  const recommendations = pyOutput || recommendProducts({ skinType, concern, limit: 8 });
  if (!pyOutput) console.log('ℹ️  JS fallback recommender used');

  res.json({ ok: true, meta: { skinType, concern }, recommendations });
});

// ════════════════════════════════════════════════════════════
// POST /api/analyze-skin — face photo → CNN → products
// ════════════════════════════════════════════════════════════
app.post('/api/analyze-skin', upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, message: 'No photo uploaded.' });
  }

  const imageBase64 = req.file.buffer.toString('base64');

  try {
    const { data: skinResult } = await axios.post(
      `${SKIN_API}/analyze`,
      { image: imageBase64 },
      { timeout: 30000 }
    );

    if (!skinResult.ok) {
      return res.status(500).json({ ok: false, message: 'Skin analysis failed.' });
    }

    // Match products to detected conditions
    let products = [];
    try {
      products = await Product.find({ concerns: { $in: skinResult.detected } }).limit(8);
      if (products.length === 0 && skinResult.primary) {
        products = recommendProducts({ concern: skinResult.primary, limit: 8 });
      }
    } catch (_) {
      if (skinResult.primary) products = recommendProducts({ concern: skinResult.primary, limit: 8 });
    }

    res.json({
      ok:       true,
      primary:  skinResult.primary,
      detected: skinResult.detected,
      scores:   skinResult.scores,
      products
    });

  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
      return res.status(503).json({
        ok:      false,
        message: 'CNN skin analyzer is not running.',
        hint:    'Start it: python skin_analyzer/skin_analyzer.py'
      });
    }
    console.error('Skin analysis error:', err.message);
    // res.status(500).json({ ok: false, message: 'Something went wrong.' });
    res.status(500).json({ ok: false, message: 'Something went wrong: ' + err.message });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/products — filter products
// ════════════════════════════════════════════════════════════
app.get('/api/products', async (req, res) => {
  try {
    const { skinType, concern, category, maxPrice } = req.query;
    const query = {};
    if (skinType) query.skinType = skinType;
    if (concern)  query.concerns = concern;
    if (category) query.category = category;
    if (maxPrice) query.price    = { $lte: Number(maxPrice) };

    const products = await Product.find(query).limit(20);
    res.json({ ok: true, products });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// POST /api/contact — contact form
// ════════════════════════════════════════════════════════════
app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, message: 'Name, email and message are required.' });
  }
  console.log(`📩 Contact: ${name} <${email}> — ${subject}`);
  res.json({ ok: true, message: 'Message received! We will get back to you soon.' });
});

// ════════════════════════════════════════════════════════════
// GET /api/health — server status
// ════════════════════════════════════════════════════════════
app.get('/api/health', (req, res) => {
  res.json({
    ok:              true,
    time:            new Date(),
    db:              mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    products_cached: LOCAL_PRODUCTS.length
  });
});

// ════════════════════════════════════════════════════════════
// POST /api/chat — AI skincare chatbot using Claude
// ════════════════════════════════════════════════════════════
const OpenAI = require("openai");

const groq = new OpenAI({

  apiKey: process.env.GROQ_API_KEY,

  baseURL: "https://api.groq.com/openai/v1"
});
app.post('/api/chat', async (req, res) => {

  const { message, history } = req.body;

  if (!message?.trim()) {

    return res.status(400).json({
      ok: false,
      reply: 'Please enter a message.'
    });
  }

  try {

    // Build conversation history
    const messages = [

      {
        role: "system",
        content: `
You are DermaBot, an AI skincare advisor.

Rules:
- Beginner-friendly skincare advice
- Focus on Indian skin & climate
- Suggest routines
- Warn about ingredient conflicts
- No prescription medicines
- Suggest dermatologist for severe issues
- Keep responses concise and warm
`
      },

      ...(Array.isArray(history)
        ? history
        : []),

      {
        role: "user",
        content: message
      }
    ];

    // Call Groq AI
    const completion =
      await groq.chat.completions.create({

        model: "llama-3.1-8b-instant",

        messages,

        temperature: 0.7,

        max_tokens: 500
      });

    const reply =
      completion.choices[0].message.content;

    res.json({
      ok: true,
      reply
    });

  } catch (err) {

    console.error("Groq API Error:", err);

    res.status(500).json({
      ok: false,
      reply:
        "DermaBot is currently unavailable."
    });
  }
});

// ── 404 for unknown API routes ────────────────────────────────
app.use('/api/*path', (req, res) => {
  res.status(404).json({ ok: false, message: `API route ${req.originalUrl} not found.` });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ DermaGuide server running  → http://localhost:${PORT}`);
  console.log(`   Health check              → http://localhost:${PORT}/api/health`);
  console.log(`   Skin quiz API             → POST /api/recommend`);
  console.log(`   Face scan API (CNN)       → POST /api/analyze-skin`);
});
