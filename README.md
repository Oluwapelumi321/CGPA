# CALC — GPA & CGPA Calculator

A production-ready, fully responsive GPA and CGPA calculator for Nigerian university students. Built with vanilla HTML, CSS, and JavaScript on the frontend, and Node.js/Express on the backend.

---

## Live Demo

> After deployment: `https://yourdomain.netlify.app`

---

## Features

- **Instant GPA** — Auto-calculates grade and credit point as you type each score
- **Live CGPA bar** — Shows running CGPA across all semesters in real time
- **Unlimited semesters** — Add or remove semesters dynamically
- **Chart Analysis** — 11 chart types via Chart.js, including comparison and trend views
- **Export CSV** — Download all results as a spreadsheet
- **Export PDF** — Browser print dialog for PDF saving
- **100% Private** — All calculations run locally; nothing is sent to a server
- **Fully responsive** — Mobile-first, works on any device
- **Accessible** — ARIA labels, keyboard navigation, skip links, live regions

---

## Project Structure

```
gpa-calculator/
├── frontend/
│   ├── index.html          ← Homepage
│   ├── calculator.html     ← Calculator page
│   ├── privacy.html        ← Privacy Policy
│   ├── terms.html          ← Terms of Use
│   ├── 404.html            ← Custom error page
│   ├── css/
│   │   ├── home.css        ← Homepage styles
│   │   ├── calculator.css  ← Calculator styles
│   │   └── legal.css       ← Privacy/Terms styles
│   └── js/
│       ├── home.js         ← Homepage interactions
│       └── calculator.js   ← All calculator logic
├── backend/
│   ├── server.js           ← Express server with security middleware
│   └── server.test.js      ← Jest unit + integration tests
├── .github/
│   └── workflows/
│       └── deploy.yml      ← CI/CD pipeline (GitHub Actions → Netlify)
├── netlify.toml            ← Netlify deployment + security headers config
├── package.json
├── .gitignore
├── .env.example
└── README.md
```

---

## Installation (Local Development)

### Prerequisites
- Node.js 18+ — [nodejs.org](https://nodejs.org)
- npm (bundled with Node.js)
- Git — [git-scm.com](https://git-scm.com)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/your-username/calc-gpa-calculator.git
cd calc-gpa-calculator

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env

# 4. Start development server
npm run dev

# 5. Open in browser
# → http://localhost:3000
```

---

## Running Tests

```bash
# Run all tests with coverage report
npm test

# Run tests in watch mode (during development)
npx jest --watch
```

Expected output:
```
PASS backend/server.test.js
  Grade Scale
    ✓ score 100 → A, 4.00
    ✓ score 75 → A (boundary)
    ... (30+ tests)
  GPA Calculation
    ✓ mixed grades weighted correctly
    ...
  HTTP Server
    ✓ GET /api/health returns 200 and ok status
    ✓ security headers present
```

---

## Deployment — Netlify (Free, Recommended)

The calculator is a static frontend and does not require the Express backend. Netlify publishes only `frontend/`; the backend is optional infrastructure for the health route and future API features and must be hosted separately if used.

### Option A: Netlify Drop (Quickest — No Account Needed)

1. Go to **[drop.netlify.com](https://drop.netlify.com)**
2. Drag and drop the entire **`frontend/`** folder onto the page
3. Your site is live instantly with a random Netlify URL
4. Click **"Claim your site"** to save it to a free account

### Option B: Netlify + GitHub (Recommended — Auto-deploy on every push)

**Step 1 — Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit — production ready CALC calculator"
git remote add origin https://github.com/your-username/calc-gpa-calculator.git
git push -u origin main
```

**Step 2 — Connect Netlify to GitHub**
1. Sign up free at [netlify.com](https://netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** → authorize → select your repository
4. Build settings:
   - **Build command:** *(leave blank)*
   - **Publish directory:** `frontend`
5. Click **"Deploy site"**

**Step 3 — Add a Custom Domain (Optional)**
1. In Netlify dashboard → **Domain settings** → **Add custom domain**
2. Enter your domain (e.g., `calc-gpa.com`)
3. Update your domain's DNS nameservers to Netlify's:
   - `dns1.p04.nsone.net`
   - `dns2.p04.nsone.net`
   - `dns3.p04.nsone.net`
   - `dns4.p04.nsone.net`
4. Netlify provisions a free **SSL/TLS certificate (HTTPS)** automatically via Let's Encrypt

**Step 4 — Enable Auto-Deploy (CI/CD)**

Add these secrets to your GitHub repo (**Settings → Secrets → Actions**):

| Secret Name | Where to find it |
|---|---|
| `NETLIFY_AUTH_TOKEN` | Netlify → User Settings → Personal Access Tokens |
| `NETLIFY_SITE_ID` | Netlify → Site Settings → General → Site ID |

Now every `git push` to `main` triggers: **tests → security audit → auto-deploy**. The Netlify deployment contains the static frontend only.

### Option C: Vercel (Alternative Free Host)

```bash
npm install -g vercel
vercel --cwd frontend
```

---

## Security Checklist

| Measure | Status |
|---|---|
| HTTPS enforced (HSTS) | ✅ netlify.toml |
| Content Security Policy | ✅ helmet.js + netlify.toml |
| X-Frame-Options: DENY | ✅ |
| X-Content-Type-Options: nosniff | ✅ |
| X-XSS-Protection | ✅ |
| Rate limiting (500 req/15min) | ✅ express-rate-limit |
| CORS policy | ✅ cors middleware |
| No server-side data storage | ✅ Pure client-side calc |
| Request body size limit (10kb) | ✅ |
| Referrer-Policy | ✅ |
| Permissions-Policy | ✅ |
| Dependency audit in CI | ✅ npm audit in pipeline |

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check — returns `{ status: "ok", timestamp }` |
| `/api/save` | POST | Save results *(coming soon — returns 501)* |

---

## Grade Scale Reference

Class standing is based on cumulative CGPA, not on an individual course.

### 4.0 scale

| Score | Grade | Credit Point |
|---|---|---|
| 75–100 | A | 4.00 |
| 70–74 | AB | 3.50 |
| 65–69 | B | 3.25 |
| 60–64 | BC | 3.00 |
| 56–59 | C | 2.75 |
| 50–55 | CD | 2.50 |
| 45–49 | D | 2.25 |
| 40–44 | E | 2.00 |
| 0–39 | F | 0.00 |

### 5.0 scale

| Score | Grade | Credit Point |
|---|---|---|
| 70–100 | A | 5.00 |
| 60–69 | B | 4.00 |
| 50–59 | C | 3.00 |
| 45–49 | D | 2.00 |
| 40–44 | E | 1.00 |
| 0–39 | F | 0.00 |

---

## Troubleshooting

**Calculator page is blank**
- Ensure `calculator.js` is in `frontend/js/` and the `<script>` tag in `calculator.html` points to `js/calculator.js`.
- Open browser DevTools (F12) → Console tab for errors.

**Charts not rendering**
- Check internet connection (Chart.js loads from jsDelivr CDN).
- Make sure you click **"Generate Chart"** after entering course data.

**Email link not working**
- Ensure `mailto:` prefix is present: `href="mailto:your@email.com"`.

**Styles not loading locally**
- You must open the site through a server (`npm run dev` or VS Code Live Server extension), not by double-clicking the HTML file (`file://` protocol blocks some resources).

---

## Future Improvements

- [ ] User accounts — save and retrieve results across devices
- [ ] Shareable link — generate a URL to share your CGPA breakdown
- [ ] Dark/Light mode toggle
- [ ] WAEC/NECO result calculator variant
- [ ] Progressive Web App (PWA) — installable, offline support
- [ ] Multiple grading systems (4.0 scale, 5.0 scale)
- [ ] Academic progress tracker with semester-over-semester trends
- [ ] WhatsApp/email share button for results

---

## Author

**Emmanuel Oluwapelumi**
- Email: [emmanueloriade70@gmail.com](mailto:emmanueloriade70@gmail.com)
- WhatsApp: [+234 913 748 1691](https://wa.link/o5fjku)
- Instagram: [@emmanuel.oriade.3](https://www.instagram.com/emmanuel.oriade.3)

---

## License

MIT © 2025 Emmanuel Oluwapelumi
