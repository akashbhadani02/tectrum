# Lead Follow-up Manager — Vercel + MongoDB Atlas

## GitHub / Vercel
Upload the contents of this folder to the root of your GitHub repository, then import the repository in Vercel.

Do NOT set a custom Output Directory. Use:
- Framework Preset: Other
- Build Command: empty
- Output Directory: empty
- Install Command: npm install

## Vercel Environment Variable
Project Settings → Environment Variables:
`MONGODB_URI` = your MongoDB Atlas connection string.

Redeploy after adding the variable.

## Files
- `index.html` — website
- `api/leads.js` — Vercel serverless API
- `seed-data.json` — existing data
- `package.json` — API dependencies

## Import
Use **Import Data** in the website to upload JSON or CSV. Existing IDs are updated; new IDs are inserted.

## MongoDB Atlas
Create a database user and allow the deployment to connect. For quick testing, Atlas Network Access can allow `0.0.0.0/0`; use a more restricted setup for production where practical.

## Security
Before public production use, add authentication/authorization for write, delete and import operations.
