# PRY Cloudflare Worker

This Worker protects the public frontend and forwards approved API calls to the
Google Apps Script backend. Spreadsheet credentials and the Apps Script shared
secret are never sent to the browser.

## Deploy

1. Create or sign in to a Cloudflare account.
2. From this directory, run `npx wrangler login`.
3. Update `ALLOWED_ORIGINS` and `GAS_WEB_APP_URL` in `wrangler.toml`.
4. Add the officer access key:

   ```powershell
   npx wrangler secret put OFFICER_KEY
   ```

5. Add the secret returned by Apps Script `configureExternalHosting()`:

   ```powershell
   npx wrangler secret put GAS_SHARED_SECRET
   ```

6. Run `npx wrangler deploy`.
7. Copy the resulting `workers.dev` URL into the root `web.config.js`.

Use a long, unique officer key. It is entered by officers in the frontend and
kept only in browser session storage. Rotate it using the same Wrangler command
if it is shared accidentally.
