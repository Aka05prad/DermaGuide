================================================================================
  DermaGuide AI — Intelligent Skincare Recommendation System
  README  ·  v2.0
================================================================================

TABLE OF CONTENTS
─────────────────
  1. What is DermaGuide?
  2. Project Structure
  3. Tech Stack
  4. How to Run the Project (Step by Step)
  5. How the Skin Quiz Works
  6. How the Face Scan (CNN) Works
  7. MongoDB Setup
  8. Environment Variables (.env)
  9. API Reference
 10. Common Errors & Fixes
 11. What's Next (Roadmap)
 12. Git Cheat Sheet


================================================================================
1. WHAT IS DERMAGUIDE?
================================================================================

DermaGuide is an AI-powered skincare recommendation web app.

It has TWO ways to recommend products to a user:

  A) SKIN QUIZ  — User selects their skin type (e.g. Oily) and main concern
                  (e.g. Acne). A Python TF-IDF AI model (ai_model.py) matches
                  products. If Python is unavailable, a JavaScript fallback
                  recommender takes over automatically.

  B) FACE SCAN  — User uploads a face photo. A CNN (Convolutional Neural
                  Network) model in a separate Python Flask service
                  (skin_analyzer.py) detects skin conditions like acne,
                  pigmentation, scarring, dryness, and oiliness. Products are
                  then matched to the detected conditions.

Products are stored in MongoDB Atlas (cloud) with a local products.json as
a fallback when the database is unreachable.


================================================================================
2. PROJECT STRUCTURE
================================================================================

DermaGiude/
│
├── app.js                    ← Main Node.js + Express server
├── ai_model.py               ← Python TF-IDF skin quiz recommender
├── products.json             ← Local product data (DB fallback)
├── seed.js                   ← One-time script to import products into MongoDB
├── package.json
├── .env                      ← Secret config (never commit this!)
├── .gitignore
│
├── models/
│   ├── Product.js            ← MongoDB Product schema
│   └── User.js               ← MongoDB User schema (for auth, Phase 2)
│
├── middleware/
│   └── auth.js               ← JWT authentication middleware (Phase 2)
│
├── routes/
│   └── auth.js               ← Login/register routes (Phase 2)
│
├── skin_analyzer/
│   ├── skin_analyzer.py      ← Flask CNN microservice (Face Scan feature)
│   ├── requirements.txt      ← Python dependencies
│   └── model/
│       ├── keras_model.h5    ← Teachable Machine trained model
│       └── labels.txt        ← Condition class labels
│
└── public/                   ← Static frontend (served by Express)
    ├── index.html            ← Homepage
    ├── starter-page.html     ← AI Analyzer page (Quiz + Face Scan)
    ├── service-details.html  ← Services page
    ├── blog.html             ← Skin care tips
    └── assets/
        ├── css/
        │   ├── main.css      ← Main brand stylesheet
        │   └── ai-analyzer.css ← Analyzer page styles
        ├── js/
        │   ├── main.js       ← Homepage JS (contact form, quiz teaser)
        │   └── starter.js    ← Analyzer page JS (quiz + face scan logic)
        ├── img/              ← All images (hero, products, team, etc.)
        └── vendor/           ← Bootstrap, AOS, Swiper, GLightbox, etc.


================================================================================
3. TECH STACK
================================================================================

  FRONTEND   HTML5, CSS3, Bootstrap 5, AOS animations, Swiper, GLightbox
  BACKEND    Node.js + Express 5
  DATABASE   MongoDB Atlas (cloud) + Mongoose ODM
  AI QUIZ    Python 3 · scikit-learn (TF-IDF) · ai_model.py
  AI SCAN    Python 3 · TensorFlow 2.13 · Flask · Teachable Machine CNN
  AUTH       JWT tokens + bcryptjs (Phase 2, ready to enable)
  FONTS      DM Serif Display + DM Sans (Google Fonts)


================================================================================
4. HOW TO RUN THE PROJECT
================================================================================

You need TWO terminals — one for Node.js, one for Python (if using Face Scan).

── TERMINAL 1: Start the Node.js Server ──────────────────────────────────────

  cd DermaGiude
  node app.js

  You should see:
    ✅ DermaGuide server running → http://localhost:3000
    ✅ MongoDB connected!
    📦 Loaded XX products from local JSON

  Open your browser: http://localhost:3000

── TERMINAL 2: Start the CNN Skin Analyzer (for Face Scan only) ──────────────

  cd DermaGiude/skin_analyzer
  python skin_analyzer.py

  You should see:
    Loading skin analysis model...
    Model loaded! Classes: ['acne', 'pigmentation', ...]
    * Running on http://127.0.0.1:5001

  ⚠️  If you haven't trained a model yet, the Face Scan tab will show an
  "offline" message. The Skin Quiz tab works without Python running.

── FIRST TIME SETUP ───────────────────────────────────────────────────────────

  1. Install Node.js dependencies:
       npm install

  2. Install Python dependencies:
       cd skin_analyzer
       pip install tensorflow==2.13.0 flask flask-cors pillow numpy

  3. Create your .env file (see Section 8 below)

  4. Seed the MongoDB database (run once):
       node seed.js


================================================================================
5. HOW THE SKIN QUIZ WORKS
================================================================================

User flow:
  1. User selects skin type (Oily / Dry / Combination / Normal / Sensitive)
  2. User selects main concern (Acne / Pigmentation / Wrinkles / Dullness / Dark Spots)
  3. Frontend sends POST /api/recommend with { skinType, concern }
  4. Backend loads products from MongoDB (falls back to products.json)
  5. Backend runs ai_model.py with the products + inputs as JSON via stdin
  6. ai_model.py uses TF-IDF to rank products and returns top matches as JSON
  7. If Python fails, Node.js JS fallback recommender is used automatically
  8. Products are returned and rendered as cards in the browser

The ingredient tip box (e.g. "Look for: Salicylic Acid, Niacinamide...") appears
automatically in the browser when the user selects a concern — no server call needed.


================================================================================
6. HOW THE FACE SCAN (CNN) WORKS
================================================================================

User flow:
  1. User clicks "Face Scan (CNN)" tab on starter-page.html
  2. User uploads or drags a face photo (JPG/PNG/WEBP, max 5 MB)
  3. Photo is previewed in the browser before submission
  4. User clicks "Scan My Skin"
  5. Frontend sends POST /api/analyze-skin with the image as FormData
  6. Node.js (app.js) receives the image, converts it to base64
  7. Node.js calls http://localhost:5001/analyze (the Flask CNN service)
  8. Flask loads keras_model.h5, resizes image to 224×224, runs inference
  9. Flask returns condition scores e.g. { "acne": 78.3, "clear": 5.4 }
 10. Node.js queries MongoDB for products matching detected conditions
 11. Results sent back to frontend: condition bars + product cards rendered

If skin_analyzer.py is NOT running, the user sees a clear "offline" message
with exact terminal commands to start it. The Skin Quiz tab remains fully
functional as an alternative.

CNN Model Training:
  Use Google Teachable Machine (teachablemachine.withgoogle.com):
  - Create an Image Project with 6 classes:
    acne / pigmentation / acne_scar / dryness / oiliness / clear
  - Upload 50-150 training images per class
  - Click Train → Export → TensorFlow → Keras → Download
  - Copy keras_model.h5 and labels.txt into skin_analyzer/model/
  - Run: python skin_analyzer.py


================================================================================
7. MONGODB SETUP
================================================================================

DermaGuide uses MongoDB Atlas (free cloud database).

  1. Go to mongodb.com/atlas → Create free account
  2. Create a free M0 cluster
  3. Create a database user (save username + password)
  4. Go to Network Access → Add IP → Allow from Anywhere (0.0.0.0/0)
  5. Click Connect → Drivers → Copy connection string
  6. Paste it into your .env as MONGODB_URI (replace username/password)
  7. Run: node seed.js   (imports your products.json into MongoDB)

After seeding, open MongoDB Atlas → Browse Collections to see your products.


================================================================================
8. ENVIRONMENT VARIABLES (.env)
================================================================================

Create a file named exactly  .env  in your DermaGiude folder:

  MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/dermadb?retryWrites=true&w=majority
  PORT=3000
  JWT_SECRET=pick_any_long_random_string_here_min_32_chars
  SKIN_ANALYZER_URL=http://localhost:5001

  # For Phase 4 chatbot (optional):
  # ANTHROPIC_API_KEY=your_key_from_console.anthropic.com

Rules:
  - Never commit .env to Git (it's in .gitignore already)
  - JWT_SECRET can be any long random text — it signs your login tokens
  - SKIN_ANALYZER_URL points to your Flask CNN service


================================================================================
9. API REFERENCE
================================================================================

  POST /api/recommend
    Body:    { "skinType": "Oily", "concern": "Acne" }
    Returns: { ok, meta, recommendations: [...products] }
    Note:    Works without CNN service. Uses Python AI or JS fallback.

  POST /api/analyze-skin
    Body:    FormData with field "photo" (image file)
    Returns: { ok, primary, detected, scores, products: [...] }
    Note:    Requires skin_analyzer.py to be running on port 5001.
    Error:   Returns 503 with hint message if CNN service is offline.

  GET  /api/products
    Query:   ?skinType=Oily&concern=Acne&category=serum&maxPrice=500
    Returns: { ok, products: [...] }

  POST /api/contact
    Body:    { "name", "email", "subject", "message" }
    Returns: { ok, message }

  GET  /api/health
    Returns: { ok, time, db: "connected"|"disconnected", products: count }
    Use this to verify the server is running and MongoDB is connected.


================================================================================
10. COMMON ERRORS & FIXES
================================================================================

ERROR: "AI model issue, using JS fallback: No stdout"
  CAUSE:  Python can't be found or ai_model.py has an error.
  FIX 1:  Make sure Python is installed: python --version
  FIX 2:  Run manually to see the real error:
            python ai_model.py
  FIX 3:  If your venv uses 'python3', the server tries both automatically.
  NOTE:   JS fallback still gives good results — this is not a crash.

ERROR: "MongooseServerSelectionError: Could not connect"
  CAUSE:  Your IP is not whitelisted in MongoDB Atlas.
  FIX:    Atlas → Network Access → Add IP → Allow from Anywhere (0.0.0.0/0)

ERROR: "PathError: Missing parameter name at index 6: /api/*"
  CAUSE:  Express 5 changed wildcard syntax.
  FIX:    Change app.use('/api/*', ...) to app.use('/api/*path', ...)

ERROR: "SyntaxError: Identifier 'products' has already been declared"
  CAUSE:  Two let/const/var with the same name in scope.
  FIX:    Rename the inner variable (e.g. let dbProducts = [])

ERROR: "ECONNREFUSED" on /api/analyze-skin
  CAUSE:  skin_analyzer.py Flask service is not running.
  FIX:    Open new terminal → cd skin_analyzer → python skin_analyzer.py

ERROR: "DepthwiseConv2D groups: 1 not recognized"
  CAUSE:  TensorFlow version mismatch with Teachable Machine model.
  FIX:    pip install tensorflow==2.13.0 (inside your venv)

ERROR: Multer or axios not found
  FIX:    npm install multer axios


================================================================================
11. WHAT'S NEXT (ROADMAP)
================================================================================

  Phase 1 ✅  Git setup, .gitignore, GitHub push
  Phase 2 ✅  MongoDB database, Product model, seed script
  Phase 2b    User authentication (JWT) — models/User.js is ready, just
              uncomment auth routes in app.js and routes/auth.js
  Phase 3 ✅  CNN Face Scan — /api/analyze-skin endpoint live
              (train keras_model.h5 via Teachable Machine to activate)
  Phase 4     UI Enhancements:
              - Ingredient conflict checker (/api/check-conflicts)
              - Routine generator (/api/routine)
              - AI chatbot using Anthropic Claude API (/api/chat)
              - Product search filters (already in /api/products)
  Phase 5     Deployment:
              - Node.js → Render.com (free)
              - Flask CNN → Hugging Face Spaces or Railway.app
              - MongoDB Atlas → already cloud-hosted ✅


================================================================================
12. GIT CHEAT SHEET
================================================================================

Initial setup (run once):
  git init
  git add .
  git commit -m "initial commit: DermaGuide v2"
  git remote add origin https://github.com/YOUR_USERNAME/derma-guide.git
  git push -u origin main

Daily workflow:
  git add .
  git commit -m "feat: add face scan upload section"
  git push

Good commit message formats:
  feat: add CNN face scan UI
  fix: JS fallback recommender not returning results
  refactor: move product loading into helper function
  docs: update README with CNN setup steps
  style: update navbar color to forest green

Check what changed before committing:
  git status        → shows changed files
  git diff          → shows line-by-line changes

Undo last commit (keeps your changes):
  git reset --soft HEAD~1

Create a branch for risky new features:
  git checkout -b feature/ingredient-checker
  (work safely, then merge back when done)


================================================================================
  Built with ❤️ by Akankshya Pradhan · DermaGuide AI · 2026
================================================================================