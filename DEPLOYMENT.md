# Deploying IBONA to other hosts (Vercel, EdgeOne, Netlify, Cloudflare)

Lovable already publishes your app to `https://ibona-stream-african-pulse.lovable.app`
(click **Publish** in the top-right). The same TanStack Start build also runs on any
modern host. The backend (Lovable Cloud / Supabase) keeps running where it is — only
the web app moves.

## Required environment variables (every host)

Copy these from `.env` into the host's project settings:

```
VITE_SUPABASE_URL=https://buxlzcsvnrouezmsvald.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<the publishable anon key>
VITE_SUPABASE_PROJECT_ID=buxlzcsvnrouezmsvald
SUPABASE_URL=https://buxlzcsvnrouezmsvald.supabase.co
SUPABASE_PUBLISHABLE_KEY=<the publishable anon key>
```

> Never paste `SUPABASE_SERVICE_ROLE_KEY` into a public host. Lovable Cloud handles
> privileged operations on the server — your deployed app only needs the publishable
> key.

## Vercel

1. Push the repo to GitHub (use the **GitHub** button in Lovable).
2. On vercel.com → **New Project** → import the repo.
3. Framework preset: **Other** (Vite). Build command: `bun run build`. Output: `dist`.
4. Add the env vars above in **Project Settings → Environment Variables**.
5. Deploy. Vercel handles SSR + edge functions automatically.

## Tencent EdgeOne Pages

1. EdgeOne Pages → **Connect Git** → pick the repo.
2. Build command: `bun run build`. Publish directory: `dist`.
3. Add env vars in **Project → Environment Variables**.
4. Deploy. EdgeOne serves the static + SSR worker bundle that TanStack Start emits.

## Netlify

1. **Add new site → Import an existing project**.
2. Build command: `bun run build`, Publish directory: `dist`.
3. Add env vars in **Site settings → Environment variables**.
4. Deploy.

## Cloudflare Pages / Workers

The default `wrangler.jsonc` already targets a Cloudflare Worker.
Run `bunx wrangler deploy` after `bun run build`, or connect the repo to
Cloudflare Pages with the same build settings as above.

## After deploying — Supabase Auth redirect URLs

In **Lovable Cloud → Authentication → URL Configuration**, add your new domain
(`https://your-app.vercel.app`, etc.) to the allowed redirect URLs so
sign-in / Google OAuth works from the new host.
