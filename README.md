# WGM Golf Cup

Live scoring for the WGM Golf Cup: a Ryder Cup–style match-play team
competition (two teams of six, 18 singles matches over three days, 10 points
to win).

## How it fits together

- **App:** React + Vite (`src/`). Mobile-first; deployed on Vercel.
- **Database:** Supabase. All tables, security rules and starting data are in
  [`supabase/schema.sql`](supabase/schema.sql).
- **Scoring:** only hole-by-hole results are stored ("who won each hole").
  Positions (1 UP, 2&1…), points and projections are calculated in
  `src/lib/` and the same rules are checked again by the database.
- **Players** pick their name (remembered on the device) and can score their
  own group's matches. **Admins** sign in with an emailed link.

## Running it on this computer

```bash
npm install
npm run dev
```

Then open http://localhost:5173. Needs a `.env.local` file containing:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Never put the Supabase secret / service_role key in the app or in Git.

## Checks

```bash
npm test
npm run lint
npm run build
```

## Deploying

Pushing to the `main` branch on GitHub makes Vercel rebuild the live site.
The two `VITE_SUPABASE_…` values are set in Vercel → Project → Settings →
Environment Variables.

In Supabase → Authentication → URL Configuration, the **Site URL** must be the
live address, and **Redirect URLs** must include both the live address and
`http://localhost:5173`, or admin sign-in links won't work.
