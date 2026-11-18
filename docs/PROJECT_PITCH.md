# CozySpace: Project Pitch & Technical Blueprint
> **A Private, Real-Time Digital Sanctuary for Two.**

---

## 1. Executive Summary & Vision

### 1.1 The Pitch
In a world dominated by noisy, public social media algorithms and cluttered messaging apps, **CozySpace** is an intentional, private digital home crafted exclusively for a couple. 

Whether navigating long-distance relationships or cherishing everyday closeness, CozySpace gives partners a quiet, intimate sanctuary to express affection, exchange real-time love notes, track meaningful milestones, and archive shared memories without external noise.

### 1.2 The Emotional Value Proposition
* **Effortless Micro-Connections:** Sending a quick virtual hug or leaving a warm note takes two seconds, bridging physical distance throughout busy days.
* **Preserving Sacred Memories:** Important dates, photos, and handwritten digital notes are stored in a dedicated scrapbook rather than lost in endless messaging histories.
* **Shared Presence:** Real-time feedback and shared status indicators create a comforting sense of living in the same digital room.

---

## 2. Core Feature Matrix

| Feature | Description | Real-Time Mechanism |
| :--- | :--- | :--- |
| **Virtual Hugs** | Interactive heart button with pulse animation, cumulative hug counter, and streak counter. | Supabase Realtime Broadcast / Postgres Changes |
| **Love Notes Wall** | Sticky notes and micro-letters with color pins, timestamps, and emoji reactions. | Realtime Database sync (Instant insert/delete) |
| **Couples Calendar** | Shared event planner with countdown timers (Anniversaries, date nights, upcoming visits). | Supabase Database with date indexing |
| **Memory Scrapbook** | Private photo gallery with Polaroid aesthetic, captions, and date tags. | Supabase Storage Bucket + signed secure URLs |
| **Live Presence & Feed** | Activity ticker ("Alex sent a hug 2m ago", "Taylor posted a note") and mood indicators. | Supabase Realtime Presence |
| **Dual Theme System** | Personalized color schemes ("Mine" vs "Partner's" mood aesthetic). | Local state & synchronized profile preference |

---

## 3. Zero-Cost Modern Architecture

Traditional hosting for PHP/Laravel apps often requires paid virtual servers or free tiers with painful cold starts (like Render or Railway sleeping after inactivity). 

By adopting a **Serverless JAMstack + BaaS (Backend-as-a-Service)** approach, CozySpace runs **100% free with enterprise-grade performance, zero cold starts, and instant global CDN delivery**.

```
┌────────────────────────────────────────────────────────┐
│                   CLIENT FRONTEND                      │
│      Vite + Vanilla JS / Tailwind / Lucide Icons       │
│           Hosted on VERCEL / CLOUDFLARE PAGES          │
└───────────────────────────┬────────────────────────────┘
                            │
               HTTPS REST & WebSocket (Realtime)
                            │
┌───────────────────────────▼────────────────────────────┐
│                  SUPABASE BACKEND (BaaS)               │
│                                                        │
│  ┌────────────────┐  ┌───────────────┐  ┌───────────┐  │
│  │ Supabase Auth  │  │   Postgres    │  │ Realtime  │  │
│  │ (Email / Magic)│  │   Database    │  │WebSockets │  │
│  └────────────────┘  └───────┬───────┘  └───────────┘  │
│                              │                         │
│  ┌────────────────┐  ┌───────▼───────┐                 │
│  │    Storage     │  │   Row Level   │                 │
│  │  (Photo Bucket)│  │Security (RLS) │                 │
│  └────────────────┘  └───────────────┘                 │
└────────────────────────────────────────────────────────┘
```

### 3.1 Recommended Frontend Hosting Platforms (Zero Cost)

1. **Vercel (Top Recommendation)**
   - **Cost:** \$0 / month (Hobby tier).
   - **Why:** Automatic deployments on every `git push` to `Xiee-t/CozySpace`, free global CDN, automatic SSL certificates, unlimited preview deployments for pull requests, and instant DNS for custom domains.
2. **Cloudflare Pages (Best Bandwidth & Performance)**
   - **Cost:** \$0 / month.
   - **Why:** Truly unlimited bandwidth, 500 builds/month, served from Cloudflare's ultra-fast global edge network (over 300+ cities).
3. **GitHub Pages (Simplest Fallback)**
   - **Cost:** \$0 / month.
   - **Why:** Built directly into the `Xiee-t/CozySpace` repository.

### 3.2 Backend: Supabase Free Tier Capabilities
* **Database:** 500 MB Postgres database (plenty for thousands of notes, events, and hugs).
* **Storage:** 1 GB file storage (ideal for couples' memory photo albums).
* **Realtime:** 200 concurrent WebSocket connections (a couple only needs 2!).
* **Auth:** Up to 50,000 monthly active users.
* **Cost:** **\$0.00 / month forever**.

---

## 4. Supabase Database Schema (PostgreSQL DDL)

Execute this script in the **Supabase SQL Editor** to establish the complete relational database, complete with automatic timestamps and Row Level Security (RLS) protecting couple privacy.

```sql
-- 1. Create Space / Couple Group Table
create table if not exists public.spaces (
    id uuid primary key default gen_random_uuid(),
    space_name text not null default 'Our Cozy Space',
    invite_code text unique default substring(md5(random()::text) from 1 for 8),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Profiles Table (Linked to Supabase Auth)
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    space_id uuid references public.spaces(id) on delete set null,
    display_name text not null,
    theme_color text default '#f472b6',
    avatar_url text,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Hugs Tracker
create table if not exists public.hugs (
    id bigint generated always as identity primary key,
    space_id uuid not null references public.spaces(id) on delete cascade,
    sender_id uuid not null references public.profiles(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Love Notes Table
create table if not exists public.love_notes (
    id bigint generated always as identity primary key,
    space_id uuid not null references public.spaces(id) on delete cascade,
    author_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    body text not null,
    color text default '#fef08a',
    is_pinned boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Calendar Events & Milestones
create table if not exists public.calendar_events (
    id bigint generated always as identity primary key,
    space_id uuid not null references public.spaces(id) on delete cascade,
    creator_id uuid references public.profiles(id) on delete set null,
    title text not null,
    event_date date not null,
    event_type text default 'date_night', -- 'anniversary', 'milestone', 'plan'
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Shared Photo Memories
create table if not exists public.photos (
    id bigint generated always as identity primary key,
    space_id uuid not null references public.spaces(id) on delete cascade,
    uploader_id uuid not null references public.profiles(id) on delete cascade,
    storage_path text not null,
    caption text,
    taken_at date default current_date,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Live Activity Log
create table if not exists public.activity_logs (
    id bigint generated always as identity primary key,
    space_id uuid not null references public.spaces(id) on delete cascade,
    actor_id uuid not null references public.profiles(id) on delete cascade,
    action_type text not null, -- 'hug_sent', 'note_added', 'calendar_updated', 'photo_shared'
    details text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Enable Row Level Security (RLS) on all tables
alter table public.spaces enable row level security;
alter table public.profiles enable row level security;
alter table public.hugs enable row level security;
alter table public.love_notes enable row level security;
alter table public.calendar_events enable row level security;
alter table public.photos enable row level security;
alter table public.activity_logs enable row level security;

-- 9. Basic RLS Access Policies for Authenticated Users
create policy "Users can view their space" on public.spaces
    for select to authenticated
    using (id in (select space_id from public.profiles where id = auth.uid()));

create policy "Users can view members in their space" on public.profiles
    for select to authenticated
    using (space_id in (select space_id from public.profiles where id = auth.uid()));

create policy "Users can update own profile" on public.profiles
    for update to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);

create policy "Space members can view notes" on public.love_notes
    for select to authenticated
    using (space_id in (select space_id from public.profiles where id = auth.uid()));

create policy "Space members can insert notes" on public.love_notes
    for insert to authenticated
    with check (space_id in (select space_id from public.profiles where id = auth.uid()));

create policy "Space members can view hugs" on public.hugs
    for select to authenticated
    using (space_id in (select space_id from public.profiles where id = auth.uid()));

create policy "Space members can send hugs" on public.hugs
    for insert to authenticated
    with check (space_id in (select space_id from public.profiles where id = auth.uid()));

create policy "Space members can view calendar" on public.calendar_events
    for select to authenticated
    using (space_id in (select space_id from public.profiles where id = auth.uid()));

create policy "Space members can manage calendar" on public.calendar_events
    for all to authenticated
    using (space_id in (select space_id from public.profiles where id = auth.uid()));

create policy "Space members can view photos" on public.photos
    for select to authenticated
    using (space_id in (select space_id from public.profiles where id = auth.uid()));

create policy "Space members can upload photos" on public.photos
    for insert to authenticated
    with check (space_id in (select space_id from public.profiles where id = auth.uid()));

-- 10. Enable Supabase Realtime on critical tables
alter publication supabase_realtime add table public.hugs;
alter publication supabase_realtime add table public.love_notes;
alter publication supabase_realtime add table public.activity_logs;
```

---

## 5. Step-by-Step Implementation Instructions

### Step 1: Initialize the Supabase Project
1. Log in to [Supabase](https://supabase.com).
2. Click **New Project** and name it `CozySpace`.
3. Select your closest geographical region and choose a secure database password.
4. Navigate to the **SQL Editor** tab in the sidebar and run the SQL script from Section 4.
5. Navigate to **Storage**, click **New Bucket**, name it `photos`, and configure it as a restricted or authenticated bucket.
6. Copy your **Project URL** and **Publishable `anon` Key** from **Project Settings > API**.

### Step 2: Connect Frontend to Supabase
1. In your frontend repository, install the official Supabase JavaScript SDK or include it via CDN in `index.html`:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   ```
2. Initialize Supabase in `app.js`:
   ```javascript
   const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
   const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';
   const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
   ```
3. Subscribe to real-time hug events:
   ```javascript
   supabase
     .channel('realtime:hugs')
     .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hugs' }, payload => {
       triggerHeartAnimation();
       incrementHugCounter();
     })
     .subscribe();
   ```

### Step 3: Deploy Frontend to Vercel (Free)
1. Go to [Vercel](https://vercel.com) and sign in with GitHub.
2. Click **Add New... > Project** and select `Xiee-t/CozySpace`.
3. In **Build and Output Settings**:
   - If using Vite: Framework Preset **Vite**, Build Command `npm run build`, Output Directory `dist`.
   - If using static HTML/JS: Framework Preset **Other**, Output Directory `./`.
4. Add Environment Variables:
   - `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-anon-key`
5. Click **Deploy**. Your site will be live instantly with a free `*.vercel.app` URL and automatic HTTPS.

---

## 6. Future Expansion Roadmap

* 💌 **Letter Time Capsules:** Lock letters until a specific future date or milestone.
* 🎵 **Shared Spotify Soundtrack:** Embed a synchronized mini-player with the couple's favorite playlist.
* 📍 **Timezone & Distance Widget:** Live local weather, clock, and distance calculator between the couple.
* 📱 **PWA (Progressive Web App):** Installable directly onto mobile home screens with offline caching and mobile push notifications.
