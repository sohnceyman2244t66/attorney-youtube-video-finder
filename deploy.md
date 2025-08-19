# Deployment Guide - Attorney YouTube Video Finder

## 🚀 Option 1: Railway (Recommended - Easiest)

1. **Push to GitHub:**

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Deploy to Railway:**

   - Go to [railway.app](https://railway.app)
   - Click "Start a New Project"
   - Choose "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect Node.js and deploy

3. **Add Environment Variable:**
   - In Railway dashboard, go to Variables
   - Add: `OPENAI_API_KEY` = `your-api-key-here`

**That's it!** Railway will give you a URL like `yourapp.railway.app`

---

## 🌐 Option 2: Render.com (Free with limitations)

1. **Create `render.yaml`:**

   ```yaml
   services:
     - type: web
       name: attorney-video-finder
       env: node
       buildCommand: npm install
       startCommand: npm start
       envVars:
         - key: OPENAI_API_KEY
           sync: false
   ```

2. **Deploy:**
   - Push to GitHub
   - Go to [render.com](https://render.com)
   - New > Web Service > Connect GitHub
   - Select repo and deploy

**Note:** Free tier spins down after 15 min of inactivity

---

## 📦 Option 3: Vercel (Need small adjustments)

1. **Create `vercel.json`:**

   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "src/index.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "src/index.js"
       }
     ]
   }
   ```

2. **Deploy:**
   ```bash
   npm i -g vercel
   vercel
   ```

**Note:** SSE (progress bar) might need adjustments for Vercel

---

## 🔥 Option 4: Fly.io (More technical)

1. **Install flyctl:**

   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Deploy:**
   ```bash
   fly launch
   fly secrets set OPENAI_API_KEY=your-key-here
   fly deploy
   ```

---

## 🏠 Option 5: Self-Host (Completely Free)

**On your PC with ngrok:**

```bash
# Terminal 1
npm start

# Terminal 2
ngrok http 3000
```

Get a public URL instantly!

**On a VPS (Oracle Cloud Free Tier, AWS Free Tier):**

1. Get a free VPS
2. Install Node.js
3. Clone your repo
4. Run with PM2:
   ```bash
   npm install pm2 -g
   pm2 start src/index.js --name attorney-finder
   pm2 save
   pm2 startup
   ```

---

## 🎯 Quick Start Commands

```bash
# 1. Prepare for deployment
echo "node_modules/" > .gitignore
echo "OPENAI_API_KEY=your_actual_key" > .env

# 2. Test locally
npm start

# 3. Deploy to Railway (easiest)
# Just push to GitHub and connect on railway.app
```

## ⚡ Environment Variables Needed

- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `PORT` - Port number (optional, defaults to 3000)

## 📝 Notes

- **yt-dlp.exe**: The Windows binary won't work on Linux servers. The app will need to install yt-dlp via pip or apt on the server.
- **Progress Bar (SSE)**: Works best on Railway, Render, and self-hosted options
- **Free Limits**: Most free tiers have limits (CPU hours, bandwidth, etc.)

## 🏆 Recommendation

**For easiest deployment:** Use Railway

- One-click deploy
- Automatic HTTPS
- Environment variables UI
- Good free tier
- No credit card required initially
