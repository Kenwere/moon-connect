# WiFi Billing System

Multi-tenant hotspot billing frontend for ISPs, built with Vite, React, Tailwind, and Supabase.

## Local setup

1. Install dependencies:

```sh
npm install
```

2. Create your environment file:

```sh
copy .env.example .env
```

3. Add your Supabase project values to `.env`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
```

4. Start the app:

```sh
npm run dev
```

If `.env` is missing, the app now shows a setup screen instead of a white screen.

## Supabase setup

1. Create a new Supabase project.
2. Open the SQL editor and run the files in `supabase/migrations` in timestamp order.
3. In Supabase, copy:
   - Project URL
   - Publishable anon key
4. Put those values in `.env`.

## Go live

You can deploy this frontend to Vercel, Netlify, or any static host that supports Vite builds.

### Required production environment variables

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

### Deploy steps

1. Push this repo to GitHub.
2. Import it into Vercel or Netlify.
3. Set the two `VITE_...` environment variables in the hosting dashboard.
4. Run the production build command:

```sh
npm run build
```

5. Publish the generated `dist` output.
