# St. Louis Casino Party App — Setup Guide

## What you'll end up with
- checkin.stlcasinoparty.com/event/[ID] — guest check-in (QR code destination)
- checkin.stlcasinoparty.com/admin — your event management home
- checkin.stlcasinoparty.com/admin/[ID] — live dashboard for each event

Total cost: $0/month to start (free tiers cover everything for typical event sizes)

---

## STEP 1 — Create your Supabase database (10 minutes)

1. Go to https://supabase.com and click "Start your project"
2. Sign up with GitHub or email
3. Click "New project"
   - Name: stl-casino-party
   - Database password: save this somewhere safe
   - Region: US East (closest to St. Louis)
4. Wait ~2 minutes for it to spin up
5. Click "SQL Editor" in the left sidebar
6. Open the file `supabase/schema.sql` from this project
7. Paste the entire contents into the editor and click "Run"
8. You should see "Success" — your database is ready

### Get your API keys
1. Click "Project Settings" (gear icon) → "API"
2. Copy "Project URL" — looks like https://abcdefgh.supabase.co
3. Copy "anon public" key — a long string starting with "eyJ..."
4. Open `src/lib/supabase.js` and replace:
   - YOUR_PROJECT_ID with your actual project ID
   - YOUR_ANON_KEY with the anon key you copied

### Enable real-time (so admin dashboard auto-refreshes)
1. In Supabase: click "Database" → "Replication"
2. Find the "guests" table and toggle it ON
3. Do the same for "prizes"

---

## STEP 2 — Deploy to Vercel (10 minutes)

1. Go to https://github.com and create a free account if you don't have one
2. Create a new repository called "stl-casino-party"
3. Upload all the project files to that repository
   (Drag and drop works in the GitHub web UI)
4. Go to https://vercel.com and sign up with your GitHub account
5. Click "Add New Project"
6. Select your "stl-casino-party" repository
7. Framework preset: Vite (should auto-detect)
8. Click "Deploy"
9. Wait ~1 minute — you'll get a URL like stl-casino-party.vercel.app

---

## STEP 3 — Connect your domain (10 minutes)

You want: checkin.stlcasinoparty.com

1. In Vercel: go to your project → "Settings" → "Domains"
2. Type: checkin.stlcasinoparty.com and click "Add"
3. Vercel will show you a CNAME record to add
4. Log into wherever you manage stlcasinoparty.com (GoDaddy, Namecheap, Squarespace, etc.)
5. Add the CNAME record Vercel gave you
6. Wait 5–30 minutes for DNS to propagate
7. Vercel auto-provisions HTTPS — nothing else to do

---

## STEP 4 — Set your admin PIN

Open `src/pages/Admin.jsx` and `src/pages/EventList.jsx`
Find the line: `const ADMIN_PIN = '1234'`
Change it to something you'll remember.

Then re-deploy: any change you push to GitHub auto-deploys via Vercel.

---

## STEP 5 — Create your first event

1. Go to checkin.stlcasinoparty.com/admin
2. Enter your PIN
3. Click "+ New Event"
4. Fill in the event name, date, starting chips
5. Toggle Fundraiser/Raffle if needed
6. Click "Create Event"
7. Click "QR Code" next to the event → download the PNG
8. Print it and put it at the door

Guests scan → land on /event/[ID] → check in → get their wallet screen.
You watch /admin/[ID] and see them appear in real time.

---

## STEP 6 — Square payments (when ready)

1. Create a Square developer account at https://developer.squareup.com
2. Get your Application ID and Location ID
3. Add the Square Web Payments SDK to index.html:
   <script src="https://sandbox.web.squarecdn.com/v1/square.js"></script>
   (swap sandbox for production when ready)
4. In CheckIn.jsx, find the handleBuyin() function
5. Replace the placeholder block with the real Square tokenization flow
   (Square's docs: https://developer.squareup.com/docs/web-payments/overview)

---

## Day-of checklist

- [ ] Open /admin/[event-id] on your phone or tablet — keep it open all night
- [ ] Print QR code, tape it at the door / put on tables
- [ ] Brief dealers: they use the "Dealer confirmation view" button on guest phones
- [ ] End of night: dealers collect phones, enter final chip counts via Tally screen
- [ ] Draw raffle from your admin dashboard Raffle tab

---

## File structure

casino-app/
├── index.html              # Entry point
├── package.json            # Dependencies
├── vite.config.js          # Build config
├── vercel.json             # Routing rules
├── supabase/
│   └── schema.sql          # Run this in Supabase SQL editor
└── src/
    ├── main.jsx            # React bootstrap
    ├── App.jsx             # Routes
    ├── lib/
    │   └── supabase.js     # DB connection (put your keys here)
    └── pages/
        ├── CheckIn.jsx     # Guest-facing app
        ├── Admin.jsx       # Event dashboard
        └── EventList.jsx   # Admin home / event creator
