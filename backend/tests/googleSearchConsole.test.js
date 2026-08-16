const request = require('supertest');
const app = require('../server');

describe('Google Search Console Routes', () => {
  it('GET /auth/search-console/sites returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/auth/search-console/sites');
    expect(res.statusCode).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toContain('Unauthorized');
  });

  it('GET /auth/search-console/analytics returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/auth/search-console/analytics?siteUrl=https://example.com');
    expect(res.statusCode).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toContain('Unauthorized');
  });

  it('GET /auth/google returns 500 or 302 depending on env vars presence', async () => {
    const res = await request(app).get('/auth/google');
    // Without valid GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET, it returns 500 error; with env vars set, it returns 302 redirect.
    expect([302, 500]).toContain(res.statusCode);
  });
});
