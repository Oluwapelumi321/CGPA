/**
 * server.test.js — Jest + Supertest tests for CALC backend
 * Run: npm test
 */

'use strict';

const request = require('supertest');
const app     = require('./server');

// ── Grade scale logic (copied here to test independently) ──────────────────
const GRADE_SCALE = [
  { min: 75, max: 100, grade: 'A',  creditPoint: 4.00 },
  { min: 70, max: 74,  grade: 'AB', creditPoint: 3.50 },
  { min: 65, max: 69,  grade: 'B',  creditPoint: 3.25 },
  { min: 60, max: 64,  grade: 'BC', creditPoint: 3.00 },
  { min: 56, max: 59,  grade: 'C',  creditPoint: 2.75 },
  { min: 50, max: 55,  grade: 'CD', creditPoint: 2.50 },
  { min: 45, max: 49,  grade: 'D',  creditPoint: 2.25 },
  { min: 40, max: 44,  grade: 'E',  creditPoint: 2.00 },
  { min: 0,  max: 39,  grade: 'F',  creditPoint: 0.00 },
];

function getGradeInfo(score) {
  return GRADE_SCALE.find(g => score >= g.min && score <= g.max) || null;
}

function getClassification(cgpa) {
  if (cgpa >= 3.50) return 'First Class';
  if (cgpa >= 3.00) return 'Second Class Upper';
  if (cgpa >= 2.50) return 'Second Class Lower';
  if (cgpa >= 2.00) return 'Third Class';
  if (cgpa >= 1.00) return 'Pass';
  return 'Fail';
}

// ── Grade Scale Tests ──────────────────────────────────────────────────────
describe('Grade Scale', () => {
  test('score 100 → A, 4.00', () => {
    const info = getGradeInfo(100);
    expect(info.grade).toBe('A');
    expect(info.creditPoint).toBe(4.00);
  });
  test('score 75 → A (boundary)', () => {
    expect(getGradeInfo(75).grade).toBe('A');
  });
  test('score 74 → AB', () => {
    expect(getGradeInfo(74).grade).toBe('AB');
  });
  test('score 70 → AB (boundary)', () => {
    expect(getGradeInfo(70).grade).toBe('AB');
  });
  test('score 65 → B (boundary)', () => {
    expect(getGradeInfo(65).grade).toBe('B');
  });
  test('score 59 → C (upper boundary)', () => {
    expect(getGradeInfo(59).grade).toBe('C');
  });
  test('score 56 → C (lower boundary)', () => {
    expect(getGradeInfo(56).grade).toBe('C');
  });
  test('score 55 → CD (upper boundary)', () => {
    expect(getGradeInfo(55).grade).toBe('CD');
  });
  test('score 50 → CD (lower boundary)', () => {
    expect(getGradeInfo(50).grade).toBe('CD');
  });
  test('score 49 → D', () => {
    expect(getGradeInfo(49).grade).toBe('D');
  });
  test('score 39 → F', () => {
    expect(getGradeInfo(39).grade).toBe('F');
  });
  test('score 0 → F (zero boundary)', () => {
    expect(getGradeInfo(0).grade).toBe('F');
  });
  test('score -1 → null (out of range below)', () => {
    expect(getGradeInfo(-1)).toBeNull();
  });
  test('score 101 → null (out of range above)', () => {
    expect(getGradeInfo(101)).toBeNull();
  });
  test('no gap between CD and C (55 and 56)', () => {
    expect(getGradeInfo(55).grade).toBe('CD');
    expect(getGradeInfo(56).grade).toBe('C');
  });
});

// ── GPA Calculation Tests ──────────────────────────────────────────────────
describe('GPA Calculation', () => {
  function calcGPA(courses) {
    let totalCU = 0, totalGP = 0;
    courses.forEach(({ credit, score }) => {
      const info = getGradeInfo(score);
      if (info && credit > 0) {
        totalGP += credit * info.creditPoint;
        totalCU += credit;
      }
    });
    return totalCU > 0 ? totalGP / totalCU : 0;
  }

  test('single A-grade course → GPA 4.00', () => {
    expect(calcGPA([{ credit: 3, score: 80 }])).toBe(4.00);
  });
  test('all F grades → GPA 0.00', () => {
    expect(calcGPA([{ credit: 3, score: 20 }, { credit: 2, score: 10 }])).toBe(0.00);
  });
  test('mixed grades weighted correctly', () => {
    // 3 CU × 4.00 (A) + 2 CU × 2.00 (E) = 12 + 4 = 16 / 5 = 3.20
    const gpa = calcGPA([{ credit: 3, score: 80 }, { credit: 2, score: 42 }]);
    expect(parseFloat(gpa.toFixed(2))).toBe(3.20);
  });
  test('zero credit unit courses are ignored', () => {
    const gpa = calcGPA([{ credit: 0, score: 90 }, { credit: 3, score: 75 }]);
    expect(gpa).toBe(4.00);
  });
});

// ── CGPA Classification Tests ──────────────────────────────────────────────
describe('CGPA Classification', () => {
  test('3.50 → First Class', () => expect(getClassification(3.50)).toBe('First Class'));
  test('4.00 → First Class', () => expect(getClassification(4.00)).toBe('First Class'));
  test('3.49 → Second Class Upper', () => expect(getClassification(3.49)).toBe('Second Class Upper'));
  test('3.00 → Second Class Upper', () => expect(getClassification(3.00)).toBe('Second Class Upper'));
  test('2.99 → Second Class Lower', () => expect(getClassification(2.99)).toBe('Second Class Lower'));
  test('2.50 → Second Class Lower', () => expect(getClassification(2.50)).toBe('Second Class Lower'));
  test('2.49 → Third Class', () => expect(getClassification(2.49)).toBe('Third Class'));
  test('2.00 → Third Class', () => expect(getClassification(2.00)).toBe('Third Class'));
  test('1.99 → Pass', () => expect(getClassification(1.99)).toBe('Pass'));
  test('1.00 → Pass', () => expect(getClassification(1.00)).toBe('Pass'));
  test('0.99 → Fail', () => expect(getClassification(0.99)).toBe('Fail'));
  test('0.00 → Fail', () => expect(getClassification(0.00)).toBe('Fail'));
});

// ── Production Readiness Tests ────────────────────────────────────────────
describe('Production Configuration', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFrontendUrl = process.env.FRONTEND_URL;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.FRONTEND_URL = originalFrontendUrl;
    jest.resetModules();
  });

  test('missing FRONTEND_URL in production mode throws a clear startup error', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.FRONTEND_URL;

    expect(() => {
      jest.isolateModules(() => {
        require('./server');
      });
    }).toThrow(/FRONTEND_URL/i);
  });
});

// ── HTTP Server Tests ──────────────────────────────────────────────────────
describe('HTTP Server', () => {
  test('GET /api/health returns 200 and ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  test('GET /api/health has security headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  test('POST /api/save returns 501 (not yet implemented)', async () => {
    const res = await request(app).post('/api/save').send({ test: true });
    expect(res.status).toBe(501);
  });

  test('unknown API routes return JSON 404', async () => {
    const res = await request(app).get('/api/unknown-route');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('API route not found.');
  });

  test('GET /nonexistent responds with a response (SPA fallback or 200)', async () => {
    const res = await request(app).get('/nonexistent-route-xyz');
    // SPA fallback serves index.html or 200
    expect([200, 404]).toContain(res.status);
  });
});
