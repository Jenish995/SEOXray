const express = require('express');
const cors = require('cors');
const { validateSeoUrl } = require('./validator/urlvalidator');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'SEOXray backend is running.' });
});

app.post('/api/validate-url', async (req, res) => {
  const { url } = req.body || {};

  if (typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({
      ok: false,
      error: 'Please enter a website URL.',
    });
  }

  const result = await validateSeoUrl(url);

  if (!result.ok) {
    return res.status(400).json({
      ok: false,
      error: result.error || 'This URL is not safe to crawl.',
    });
  }

  return res.json({
    ok: true,
    data: result,
  });
});

app.listen(PORT, () => {
  console.log(`SEOXray backend listening on http://localhost:${PORT}`);
});
