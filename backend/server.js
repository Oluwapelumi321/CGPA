/**
 * server.js — CALC GPA/CGPA Calculator Backend
 * Node.js + Express — serves static files with full security headers
 * Can be extended to support save/share features, auth, analytics
 */

'use strict';

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const compression = require('compression');

const app = express();
const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

function validateProductionConfig() {
  if (!isProduction) return;

  if (!process.env.FRONTEND_URL) {
    throw new Error('Production requires FRONTEND_URL to be set in the environment.');
  }

  const logDir = path.join(ROOT_DIR, 'backend', 'logs');
  fs.mkdirSync(logDir, { recursive: true });
}

validateProductionConfig();

// ── Logging ────────────────────────────────────────────────────────────────
if (isProduction) {
  const logStream = fs.createWriteStream(path.join(ROOT_DIR, 'backend', 'logs', 'access.log'), { flags: 'a' });
  app.use(morgan('combined', { stream: logStream }));
} else {
  app.use(morgan('dev'));
}

// ── Compression ────────────────────────────────────────────────────────────
app.use(compression());

app.disable('x-powered-by');

// ── Security Headers (Helmet) ──────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com",
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

function getAllowedOrigins() {
  const localhostOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];

  if (!isProduction) {
    return localhostOrigins;
  }

  const configuredOrigins = [process.env.FRONTEND_URL];
  if (process.env.NETLIFY_URL) configuredOrigins.push(process.env.NETLIFY_URL);

  return [...new Set(configuredOrigins.filter(Boolean))];
}

// ── CORS ───────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = getAllowedOrigins();
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS policy violation'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// ── Rate Limiting ──────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 500,                   // max 500 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use(globalLimiter);

// API-specific stricter limit (for future API endpoints)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 60,
  message: { error: 'API rate limit exceeded.' },
});

// ── Body parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));      // prevent large payload attacks
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Request ID middleware ──────────────────────────────────────────────────
app.use((req, _res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  next();
});

// ── Static files ───────────────────────────────────────────────────────────
const staticDir = path.join(ROOT_DIR, 'frontend');
app.use(express.static(staticDir, {
  maxAge: isProduction ? '7d' : 0,
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (filePath.match(/\.(css|js)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    } else if (filePath.match(/\.(jpg|jpeg|png|webp|svg|ico|woff2?)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

// ── API Routes ─────────────────────────────────────────────────────────────
// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// (Future) Save calculation to shareable link
app.post('/api/save', apiLimiter, (req, res) => {
  // TODO: Implement with a database (MongoDB/PostgreSQL)
  // Input validation would go here (Joi/Zod schema)
  res.status(501).json({ error: 'Save feature coming soon.' });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

// ── SPA fallback — serve index.html for unmatched routes ──────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

// ── Global error handler ───────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  const statusCode = err.status || err.statusCode || 500;
  console.error(`[ERROR] ${req.id} — ${err.message}`);
  res.status(statusCode).json({
    error: NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
  });
});

// ── Start server ───────────────────────────────────────────────────────────
function startServer() {
  return app.listen(PORT, () => {
    console.log(`\n🎓 CALC GPA Calculator`);
    console.log(`  Running in ${NODE_ENV} mode`);
    console.log(`  http://localhost:${PORT}\n`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;
