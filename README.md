# 🔍 SEOXray

**SEOXray** is a Puppeteer-powered web crawler and SEO auditing tool that inspects website health, audits technical & on-page SEO issues, and integrates with Google Search Console.

---

## ✨ Features

- **🌐 Live Web Crawling**: Puppeteer-driven browser rendering, SPA detection, and network tracking.
- **🛠️ Technical SEO Audits**: HTTPS, HTTP status codes, canonicals, robots directives, mobile viewport, bot challenges, and JS console/network errors.
- **📄 On-Page SEO Audits**: Page title & meta description length validation, H1–H6 heading hierarchy, image alt text, link sanity, social sharing cards (Open Graph & Twitter), and JSON-LD schema.
- **📊 Scoring & Confidence**: 0–100 weighted SEO audit score (A+ to F) and audit confidence rating.
- **📈 Google Search Console Integration**: Server-side OAuth 2.0 flow to fetch verified sites and search analytics metrics.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, React Router v7, Vite, CSS
- **Backend**: Node.js, Express 5, Puppeteer, googleapis, express-session, Vitest

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Environment Setup

Copy `backend/.env.example` to `backend/.env` and set your credentials:

```env
PORT=5000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
SESSION_SECRET=seoxray_gsc_session_secret
```

### 3. Run Development Servers

```bash
# Terminal 1 (Backend - http://localhost:5000)
cd backend && npm run dev

# Terminal 2 (Frontend - http://localhost:5173)
cd frontend && npm run dev
```

---

## 🧪 Testing

```bash
cd backend && npm test
```

---

## 📄 License

ISC License
