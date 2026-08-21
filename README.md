# Lead Follow-up Manager — GitHub + Vercel + MongoDB Atlas

## Deploy
1. Upload this folder to a GitHub repository.
2. Import that repository in Vercel.
3. In Vercel Project Settings → Environment Variables, add:
   `MONGODB_URI` = your MongoDB Atlas connection string.
4. Redeploy.

No MongoDB password is stored in frontend files.

## MongoDB Atlas
Create a database user and allow Vercel connections in Atlas Network Access. For quick testing, `0.0.0.0/0` can be allowed, but a production setup should use appropriate network/security controls.

## Import
After deployment, open the website and use **Import Data**.
Supported:
- JSON array, such as `seed-data.json`
- CSV with the same field names

Same `id` updates an existing lead; a new `id` creates a new lead.

## Important
For production, authentication/authorization should be added before exposing write/import/delete endpoints publicly.
