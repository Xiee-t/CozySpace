# CozySpace

A private, real-time digital sanctuary for couples. A shared space to send hugs, exchange notes, record memories, and countdown to meaningful milestones.

---

## Architecture and Technology Stack

- **Frontend Language & Stack:** Pure JavaScript (ES2022), semantic HTML5, modern CSS3
- **Hosting & CDN:** Vercel Production
- **Backend as a Service:** Supabase (PostgreSQL, Supabase Auth OAuth/Credentials, Supabase Realtime WebSockets)

---

## Project Structure

```
CozySpace/
├── index.html         # Single-page application entry point & view templates
├── style.css          # Design tokens, responsive grids, and aesthetic palettes
├── app.js             # Client-side state, auth lifecycle & Supabase bindings
├── supabase.js        # Supabase JavaScript client bundle
├── build.js           # Static distribution build script
├── package.json       # Project metadata & build scripts
├── vercel.json        # Production routing & edge configuration
└── docs/
    └── PROJECT_PITCH.md # Architecture specification & database schema
```

---

## Build and Deployment

```bash
# Build the production distribution
npm run build

# Deploy to Vercel
vercel --prod
```
