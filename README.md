# Godrej Nest Premier League 2026

A React + Vite event site with three registration paths (Player, Owner, Audience), an organiser dashboard, payment tracking, and CSV export. The dashboard refreshes shared registrations every 12 seconds.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`, then `npm run dev`.
3. Without Supabase settings, registrations are saved in this browser only. Use **Admin → View registrations on this device** to inspect or export them.

## Shared registrations on Vercel

1. Create a Supabase project and run [`supabase.sql`](./supabase.sql) in its SQL editor.
2. Add these environment variables in Vercel (Project → Settings → Environment Variables):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (server side only; never add this as a `VITE_` variable)
   - `ADMIN_PASSWORD`
3. Deploy this repository as a Vite project. Vercel detects the Vite build; the included `vercel.json` routes API requests to the serverless function.
4. Visit **Admin** on the site and enter `ADMIN_PASSWORD`. Registration details are private behind this API password. Mark payments as Paid after matching the provided payment reference to your payment records.

Registrants can include a UPI/payment transaction reference, but this site does not collect money or verify payment automatically. The organiser records confirmation in the dashboard.

## GitHub

Create an empty repository on GitHub, then from this folder run:

```sh
git init
git add .
git commit -m "Create GNPL 2026 tournament website"
git branch -M main
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

Connect that repository in Vercel and add the environment variables above. Do not commit `.env` or service role keys.
