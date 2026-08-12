# PRY Camp Attendance System — Google Apps Script Edition

> **Recommended production hosting:** use the standalone GitHub Pages frontend,
> Cloudflare Worker proxy, Apps Script API, and Google Sheets database described
> in `EXTERNAL_DEPLOYMENT.md`. This avoids the Apps Script camera sandbox while
> retaining the existing shared spreadsheet backend.

This version is rebuilt around the workflow discussed for Pentecostal Royal Youth camps:

- **Event type is chosen when creating the camp**
  - **DPRY** → participants are grouped only by **Church**
  - **NPRY** → participants are grouped only by **District**
- **Google Apps Script** hosts the web app and handles server-side logic.
- **Google Sheets** is the shared live database.
- **Google Drive** stores the PRY root folder, registry, event folders, and event spreadsheets.
- **Tailwind CSS** is precompiled into `Tailwind.html` for the Apps Script UI.
- **Excel/XLSX** is used for participant templates/import and final attendance export.
- **QR scanning** works from the deployed HTTPS web app using `html5-qrcode`.
- **IndexedDB** stores pending scans locally when a device temporarily loses internet after the app is already loaded.

## What the system creates in Google Drive

The first time `setupSystem()` runs, the script creates:

```text
PRY Attendance System/
├── PRY Attendance Registry          (Google Sheet)
└── <event folders are created later>
```

When an event is created, for example `NPRY 2027`, the system creates:

```text
PRY Attendance System/
└── NPRY_2027_<event-id>/
    └── NPRY 2027 Attendance         (Google Sheet)
```

Each event spreadsheet contains:

- `Camp Info`
- `Participants`
- `Attendance Log`
- `Sessions`
- `README`

Deleting an event removes it from the registry. In the deployed Google version,
its event folder and attendance spreadsheet are moved to Google Drive Trash. In
local development mode, its event, participant, and attendance rows are removed
from the local XLSX workbook after typing `DELETE` in the confirmation dialog.

## Attendance logic

A participant may have multiple attendance rows throughout a 3–5 day camp.

A unique attendance is defined by:

```text
Participant ID + Day + Session
```

Example:

```text
NPRY26-00015 + Day 2 + Opening Worship
```

If the same participant is scanned again at another station for the same Day + Session, the server returns `DUPLICATE` and does not insert another attendance row.

Multiple named sessions can be created for the same day. They are saved in the event's `Sessions` sheet and become available to every scanner station.

### DPRY reports

Attendance is grouped by **Church**.

### NPRY reports

Attendance is grouped by **District**.

For every day the report shows:

- Registered
- Each manually named attendance session
- Daily unique attendance
- Absent for the entire day
- Attendance rate

## Files to create in Google Apps Script

Create these files in one Apps Script project:

```text
Code.gs
Index.html
App.html
Tailwind.html
Theme.html
Logo.html
appsscript.json
```

`PreviewMock.html`, `preview.html`, the Tailwind source/build files, and this README are development/download helpers and are not required in the deployed Apps Script project.

## Deployment

1. Open Google Apps Script and create a new project.
2. Replace the default `Code.gs` with the included `Code.gs`.
3. Create HTML files named exactly:
   - `Index`
   - `App`
   - `Tailwind`
   - `Theme`
   - `Logo`
4. Paste the corresponding file contents.
5. In Project Settings, enable viewing the `appsscript.json` manifest if necessary, then use the included manifest. The timezone is `Asia/Manila`.
6. From the editor, run `productionReadinessCheck()` once. This initializes the
   Drive folder and registry, validates existing event spreadsheets, and returns
   the production URLs and readiness result.
7. Approve the requested Google Drive / Google Sheets permissions.
8. Click **Deploy → New deployment → Web app**.
9. For the shared camp setup, deploy the app to **execute as the deploying account** so every station writes through the same owner-controlled Drive/Sheets data.
10. Choose the access level your Google account / Workspace policy allows for the officers who will use it.
11. Deploy and copy the `/exec` web app URL.
12. Open that HTTPS URL on officer phones, laptops, or tablets.

The included manifest explicitly uses Google Drive and Google Sheets scopes and
configures the web app to execute as the deploying account. Its default access
is `ANYONE`, which means a signed-in Google user; choose a stricter domain option
in the deployment dialog when your Google Workspace policy supports it.

`LocalBridge.html`, `local_server.py`, `local_data/`, and the local XLSX workbook
are development-only files. Do not add them to the Apps Script project. In the
deployed UI, the local labels automatically change as follows:

- `Local XLSX mode` → `Google Sheets mode`
- `Local workbook roster` → `Live Google Sheet roster`
- `XLSX / Local offline` → `Sheets / Shared online`
- `Local Spreadsheet Storage` → `Google Drive Storage`

## Local offline development

For UI editing and end-to-end testing without deploying to Apps Script, run the
local development adapter from PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-local.ps1
```

The first run creates a private Python environment and installs `openpyxl`, so
internet access is needed once for that dependency. Later runs work without an
internet connection. The browser opens at `http://localhost:8000`.

Local test data is stored in this real Excel workbook:

```text
local_data/PRY_Attendance_Local.xlsx
```

The local server rebuilds the page from `Index.html`, `App.html`, and
`Tailwind.html` on every refresh, so edits are visible after reloading the
browser. Excel import/export and the QR camera libraries are served from the
local `vendor` folder.

Important limitations:

- Google Sheets itself cannot be read or written without an internet connection.
- Local mode uses the XLSX workbook above; the deployed version continues to use
  Google Sheets through `Code.gs`.
- Close the local workbook in Excel before adding or scanning records in the web
  app because Excel locks the file while it is open.
- Stop the development server with `Ctrl+C`.

## Camera use

Use the deployed Apps Script web app URL directly in the browser. It is served over HTTPS, which is required by modern browsers for camera access.

Google Apps Script currently blocks continuous `getUserMedia()` camera access
inside its sandboxed HTML frame. Therefore, the deployed `/exec` version uses
**Open Camera to Scan QR**: on a phone it opens the camera through an image
capture control, reads the QR from the captured photo, and records attendance.
This avoids the permanent `NotAllowedError` produced by the Apps Script frame.

Local development can still use the continuous live camera because localhost
is not inside Google's sandbox. For continuous live scanning in production, the
scanner frontend must be hosted on a separate HTTPS domain outside Apps Script.
Officers can also type/scan the Participant ID or use a USB/Bluetooth scanner.

## Excel participant template

Inside an active event, click **Download Excel Template**.

DPRY template:

```text
Church | ENTER CHURCH NAME HERE

Full Name | Category | Role
```

NPRY template:

```text
District | ENTER DISTRICT NAME HERE

Full Name | Category | Role
```

Each workbook represents one Church for DPRY or one District for NPRY. The group
name is entered once in cell `B1`, and all participant rows in that workbook are
assigned to it during import. Churches/Districts can complete their own files and
return them to registration officers. After receiving a file, click **Import
Excel** in the system. Older templates that repeat Church/District on every row
remain supported.

The template uses a blue group label, a yellow group-name input cell, and
separate blue, green, and orange highlights for Full Name, Category, and Role.

## Final Excel export

The Reports page has **Export Final Excel**.

The workbook contains:

- Participants
- Attendance Log
- Church Summary or District Summary
- Session Summary
- Camp Info

All exported sheets use PRY-branded headers, colored sheet tabs, alternating row
shading, borders, filters, frozen header rows, readable column widths, and print
settings. `PRESENT` attendance cells are highlighted in green.

New Google event spreadsheets receive the same branded header treatment. After
updating an existing Apps Script deployment, run `applySpreadsheetTheme()` once
to restyle the registry and all existing event spreadsheets.

## Offline safety behavior

This is an **online shared system**, so internet is needed to initially open the Google-hosted web app and synchronize attendance.

If the page is already loaded and the connection temporarily drops:

1. The scanner can keep using the roster already loaded in the browser.
2. New scans are stored in IndexedDB as pending records.
3. When internet returns, click **Sync Pending**, or the app will attempt to sync automatically.
4. The server still checks duplicates against the central Google Sheet when pending records arrive.

For a real camp, do not rely on this as a fully offline application. Test the venue internet and keep at least one fallback attendance method.

## Tailwind CSS development

`Tailwind.html` is already compiled and ready to paste into Apps Script.

For local UI development, the project also includes:

```text
tailwind.source.css
build-tailwind.js
package.json
```

Install Tailwind and rebuild after changing utility classes:

```bash
npm install
npm run build:css
```

This regenerates:

```text
tailwind.compiled.css
Tailwind.html
```

## External browser libraries

The deployed `Index.html` loads:

- SheetJS CE 0.18.5 for reading XLSX participant files
- ExcelJS 4.4.0 for styled templates and final XLSX exports
- html5-qrcode 2.3.8 for camera QR scanning

Both are loaded over HTTPS because Apps Script HTML Service requires active external content to use HTTPS.

## Important pre-camp testing

Before using this for a live DPRY/NPRY camp, test with multiple phones at the same time:

- Create a test event.
- Import 50–100 sample participants.
- Print several QR name tags.
- Scan the same participant from two devices to verify duplicate prevention.
- Turn one phone's internet off after the app is loaded and verify pending queue behavior.
- Reconnect and sync pending records.
- Verify Church/District totals and final XLSX export.

This package is an MVP foundation. For larger national events, authentication, stricter officer permissions, rate/load testing, and operational backups should be added before production use.
