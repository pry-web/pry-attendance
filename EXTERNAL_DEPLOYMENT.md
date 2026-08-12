# PRY External Production Deployment

This is the recommended production architecture:

```text
Officer browser (GitHub Pages, HTTPS, live camera)
        |
        v
Cloudflare Worker (CORS + officer access key + hidden backend secret)
        |
        v
Google Apps Script JSON API
        |
        v
Google Sheets + Google Drive
```

The frontend contains no Google credentials or backend secrets. Google Sheets
remains the shared database. Apps Script still owns all attendance validation,
duplicate prevention, event management, reports, and Drive operations.

## Part 1 — Prepare Apps Script

1. Update `Code.gs` and `appsscript.json` in the existing Apps Script project.
2. Save the project.
3. Run `configureExternalHosting()` from the Apps Script editor. Because it
   requires an argument, create and temporarily run this helper with your final
   GitHub Pages address:

   ```javascript
   function configureMyExternalSite() {
     console.log(configureExternalHosting('https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPOSITORY'));
   }
   ```

4. Copy the returned `apiSecret` somewhere private. Never add it to GitHub.
5. Delete the temporary helper after it succeeds.
6. Choose **Deploy → Manage deployments → Edit → New version**.
7. Deploy as a Web app with:
   - Execute as: **Me**
   - Access: **Anyone** (anonymous access is required for the Worker-to-Worker request)
8. Copy the Apps Script `/exec` URL.

The Apps Script endpoint is still protected: every `doPost` request must carry
the long secret stored in Script Properties. Anonymous visitors cannot invoke
an allowlisted API operation without it. Once external hosting is configured,
opening the Apps Script URL displays only a link to the external frontend.

## Part 2 — Deploy the Cloudflare Worker

1. Open `cloudflare-worker/wrangler.toml`.
2. Replace `ALLOWED_ORIGINS` with the frontend origin. For a GitHub project page,
   the origin normally has no repository path:

   ```toml
   ALLOWED_ORIGINS = "https://YOUR-GITHUB-USERNAME.github.io"
   ```

3. Replace `GAS_WEB_APP_URL` with the Apps Script `/exec` URL.
4. Open PowerShell in `cloudflare-worker` and run:

   ```powershell
   npx wrangler login
   npx wrangler secret put OFFICER_KEY
   npx wrangler secret put GAS_SHARED_SECRET
   npx wrangler deploy
   ```

5. For `OFFICER_KEY`, enter a new long key that officers will type when opening
   the system. Do not reuse the Apps Script secret.
6. For `GAS_SHARED_SECRET`, enter the `apiSecret` returned by Apps Script.
7. Copy the deployed `https://...workers.dev` URL.
8. Verify `https://...workers.dev/health` returns an `ok` response.

If Node.js is not installed, use the Cloudflare dashboard instead: create a
Worker, paste `cloudflare-worker/src/index.js` into its editor, then add
`ALLOWED_ORIGINS` and `GAS_WEB_APP_URL` as normal variables and `OFFICER_KEY`
and `GAS_SHARED_SECRET` as encrypted secrets under the Worker's settings.

## Part 3 — Configure and publish GitHub Pages

1. In `web.config.js`, replace the placeholder with the Worker URL:

   ```javascript
   window.PRY_CONFIG = {
     apiUrl: 'https://pry-attendance-api.YOUR-SUBDOMAIN.workers.dev',
   };
   ```

2. Create a GitHub repository and upload/push this project. Do not upload:
   - `.venv-local/`
   - `local_data/`
   - local Excel databases
   - any API or officer secrets
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, select **GitHub Actions**.
5. Push to the `main` branch or run the Pages workflow manually.
6. Open the resulting `https://USERNAME.github.io/REPOSITORY/` URL.
7. Enter the `OFFICER_KEY` when prompted.

The included workflow runs `npm run build:web` and publishes only the generated
single-page site from `dist/`.

## Part 4 — Production test

1. Open the GitHub Pages URL on two phones.
2. Confirm the interface says Google Sheets / shared online.
3. Save or select an attendance session.
4. Click **Start Camera**, grant permission, and scan a participant QR.
5. Confirm the attendance row appears in the event Google Sheet.
6. Scan the same QR on the second phone and confirm it is rejected as duplicate.
7. Test participants, sessions, reports, final Excel export, and the offline queue.

## Security maintenance

- Rotate the officer key with `npx wrangler secret put OFFICER_KEY` if it leaks.
- Rotate the backend secret by running `rotateExternalApiSecret()` in Apps
  Script, then immediately update `GAS_SHARED_SECRET` in Cloudflare.
- Never place either secret in `web.config.js`, frontend JavaScript, GitHub
  Actions variables, screenshots, or documentation.
- GitHub Pages is public. Only application code and static assets belong there;
  participant and attendance records remain behind the secured API.
