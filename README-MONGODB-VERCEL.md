# MongoDB Atlas + Vercel setup

1. Upload these files to the ROOT of your GitHub repository.
2. Import the repository into Vercel.
3. Framework Preset: Other.
4. Build Command: empty.
5. Output Directory: empty.
6. Install Command: npm install.
7. Vercel Settings -> Environment Variables:
   MONGODB_URI = your FULL MongoDB Atlas connection string.
8. Redeploy.

MongoDB Atlas:
- Database Access: create/verify a Database User.
- Network Access: allow the deployment to reach Atlas.
- Database name used by this project: lead_followup.
- Collection: leads (created automatically on first insert).

IMPORTANT:
Do not put a real MongoDB password in GitHub. Keep it only in Vercel Environment Variables.
If a password contains @, #, %, :, /, ?, etc., URL-encode the password portion of the URI.

## Excel Import
The Import Data button accepts `.xlsx` and `.xls` files. The first worksheet is imported. Column headers should match the lead field names.

### Flexible import
The importer does not require exact column names. It recognizes common variants, falls back to the sheet column order for lead sheets, allows missing columns, and preserves unknown columns under `extraData`.
