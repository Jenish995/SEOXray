const crypto = require('crypto');
const {
  generateAuthUrl,
  exchangeCodeForTokens,
  listUserSites,
  querySearchAnalytics,
} = require('../services/googleSearchConsoleService');

const initiateAuth = (req, res) => {
  try {
    const state = crypto.randomBytes(32).toString('hex');
    req.session.oauthState = state;

    const authUrl = generateAuthUrl(state);
    return res.redirect(authUrl);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Failed to initiate Google OAuth flow.',
    });
  }
};

const handleCallback = async (req, res) => {
  const { code, state, error: authError } = req.query;

  if (authError) {
    return res.status(400).json({
      ok: false,
      error: `Google OAuth error: ${authError}`,
    });
  }

  if (!code) {
    return res.status(400).json({
      ok: false,
      error: 'Missing authorization code from Google callback.',
    });
  }

  const savedState = req.session?.oauthState;
  if (!state || !savedState || state !== savedState) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid or missing OAuth state parameter. Request rejected for security.',
    });
  }

  // Clear state after single use
  delete req.session.oauthState;

  try {
    const tokens = await exchangeCodeForTokens(code);
    req.session.tokens = tokens;

    return res.json({
      ok: true,
      message: 'Google Search Console authenticated successfully.',
      authenticated: true,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Failed to exchange authorization code for tokens.',
    });
  }
};

const getSites = async (req, res) => {
  if (!req.session?.tokens) {
    return res.status(401).json({
      ok: false,
      error: 'Unauthorized: Please authenticate via /auth/google first.',
    });
  }

  try {
    const sites = await listUserSites(req.session.tokens);
    return res.json({
      ok: true,
      sites,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Failed to fetch Search Console sites.',
    });
  }
};

const getAnalytics = async (req, res) => {
  if (!req.session?.tokens) {
    return res.status(401).json({
      ok: false,
      error: 'Unauthorized: Please authenticate via /auth/google first.',
    });
  }

  const siteUrl = req.query.siteUrl || req.body?.siteUrl;
  const startDate = req.query.startDate || req.body?.startDate;
  const endDate = req.query.endDate || req.body?.endDate;
  const rowLimit = req.query.rowLimit || req.body?.rowLimit;
  
  let dimensions = req.query.dimensions || req.body?.dimensions;
  if (typeof dimensions === 'string') {
    dimensions = dimensions.split(',').map((d) => d.trim());
  }

  if (!siteUrl) {
    return res.status(400).json({
      ok: false,
      error: 'siteUrl parameter is required (e.g. ?siteUrl=sc-domain:example.com or ?siteUrl=https://example.com/).',
    });
  }

  try {
    const data = await querySearchAnalytics(req.session.tokens, {
      siteUrl,
      startDate,
      endDate,
      dimensions,
      rowLimit,
    });

    return res.json({
      ok: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Failed to fetch Search Console analytics data.',
    });
  }
};

module.exports = {
  initiateAuth,
  handleCallback,
  getSites,
  getAnalytics,
};
