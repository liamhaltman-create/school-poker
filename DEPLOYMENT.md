# School Poker — Deployment Guide

## Prerequisites
- Node.js 18+
- Supabase account (free tier works)
- Netlify account (free tier works)
- Git

---

## Step 1: Supabase Setup

### 1.1 Create Project
1. Go to https://supabase.com
2. Click "New Project"
3. Name it `school-poker`
4. Choose a region close to your users
5. Set a strong database password

### 1.2 Run Database Schema
1. In your Supabase dashboard, go to **SQL Editor**
2. Open `supabase/schema.sql` from this project
3. Paste the entire contents and click **Run**
4. Verify tables were created in the **Table Editor**

### 1.3 Enable Authentication
1. Go to **Authentication → Settings**
2. Enable **Email** provider (default)
3. Set Site URL to your Netlify URL (update after deploy)
4. Add `http://localhost:3000` to redirect URLs for local dev

### 1.4 Enable Realtime
1. Go to **Database → Replication**
2. Enable replication for: `poker_tables`, `table_members`, `hand_actions`
3. These are also added in the schema SQL automatically

### 1.5 Get API Keys
Go to **Settings → API** and copy:
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- service_role key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

---

## Step 2: Local Development

```bash
# Install dependencies
npm install

# Create env file
cp .env.example .env.local
# Fill in your Supabase credentials

# Run dev server
npm run dev
# Open http://localhost:3000
```

---

## Step 3: Deploy to Netlify

### 3.1 Push to GitHub
```bash
git init
git add .
git commit -m "Initial School Poker"
git remote add origin https://github.com/yourname/school-poker
git push -u origin main
```

### 3.2 Connect to Netlify
1. Go to https://netlify.com
2. Click **Add new site → Import an existing project**
3. Connect GitHub and select your repo
4. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
5. Add **Environment Variables** (all from `.env.example`)

### 3.3 Configure netlify.toml
The included `netlify.toml` handles Next.js routing automatically.

### 3.4 Update Supabase Auth Settings
After deploying, update in Supabase:
- **Site URL**: `https://your-app.netlify.app`
- **Redirect URLs**: Add your Netlify URL

---

## Step 4: Configure Supabase Realtime (Important!)

For instant real-time updates:

```sql
-- Run in Supabase SQL Editor
ALTER PUBLICATION supabase_realtime ADD TABLE poker_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE table_members;
ALTER PUBLICATION supabase_realtime ADD TABLE hand_actions;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
```

---

## Step 5: First-Time Setup

1. Register an account at your deployed URL
2. Create your first table
3. Share the invite code with friends
4. Start playing!

---

## Architecture Notes

### Security Model
- All game actions go through `/api/game/action`
- Server validates every action via `PokerEngine.processAction()`
- Cards are never sent to clients who shouldn't see them
- RLS policies prevent unauthorized data access
- Admin actions require role verification server-side

### Realtime Flow
```
Player clicks "Raise"
  → POST /api/game/action
  → Server validates action
  → Server updates poker_tables.game_state in Supabase
  → Supabase Realtime fires for all subscribers
  → All clients update their local state
```

### Persistence
- `poker_tables.game_state` (JSONB) stores full game state
- Persists across disconnects automatically
- Players can rejoin any time and resume

### Performance Tips
- Supabase free tier handles ~50 concurrent connections
- Upgrade to Pro ($25/mo) for 200+ concurrent connections
- Use Supabase Edge Functions for time-sensitive operations

---

## Troubleshooting

**"WebSocket connection failed"**
→ Check Supabase Realtime is enabled for the tables

**"Auth session missing"**
→ Check NEXT_PUBLIC_SUPABASE_URL and ANON_KEY are set

**"Game state not updating"**
→ Check Replication is enabled in Supabase Dashboard

**Netlify 404 on page refresh**
→ The included `netlify.toml` handles this with redirect rules

---

## netlify.toml

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```
