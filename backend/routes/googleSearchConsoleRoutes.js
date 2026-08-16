const express = require('express');
const {
  initiateAuth,
  handleCallback,
  getSites,
  getAnalytics,
} = require('../controller/googleSearchConsoleController');

const router = express.Router();

// OAuth 2.0 endpoints
router.get('/google', initiateAuth);
router.get('/google/callback', handleCallback);

// Search Console data endpoints
router.get('/search-console/sites', getSites);
router.get('/search-console/analytics', getAnalytics);
router.post('/search-console/analytics', getAnalytics);

module.exports = router;
