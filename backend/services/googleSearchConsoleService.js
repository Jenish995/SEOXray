const { google } = require('googleapis');

const getOAuth2Client = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/auth/google/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Missing Google OAuth credentials. Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in backend/.env');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

const generateAuthUrl = (state) => {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/webmasters.readonly'],
    state,
    prompt: 'consent',
  });
};

const exchangeCodeForTokens = async (code) => {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

const getAuthenticatedClient = (tokens) => {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
};

const listUserSites = async (tokens) => {
  const auth = getAuthenticatedClient(tokens);
  const searchconsole = google.searchconsole({ version: 'v1', auth });
  const response = await searchconsole.sites.list();
  return response.data.siteEntry || [];
};

const querySearchAnalytics = async (tokens, params = {}) => {
  const {
    siteUrl,
    startDate,
    endDate,
    dimensions = ['query', 'page'],
    rowLimit = 100,
  } = params;

  if (!siteUrl) {
    throw new Error('siteUrl parameter is required for Search Console analytics query.');
  }

  const auth = getAuthenticatedClient(tokens);
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  // Default date range: past 30 days ending 2 days ago (due to GSC data delay)
  const defaultEndDate = new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0];
  const defaultStartDate = new Date(Date.now() - 86400000 * 32).toISOString().split('T')[0];

  const response = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: startDate || defaultStartDate,
      endDate: endDate || defaultEndDate,
      dimensions: Array.isArray(dimensions) ? dimensions : [dimensions],
      rowLimit: Math.min(Number(rowLimit) || 100, 5000),
    },
  });

  return response.data;
};

module.exports = {
  getOAuth2Client,
  generateAuthUrl,
  exchangeCodeForTokens,
  listUserSites,
  querySearchAnalytics,
};
