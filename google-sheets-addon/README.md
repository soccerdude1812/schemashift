# SchemaShift — Google Sheets Add-on

Analyze schemas, detect drift, and track data quality without leaving your spreadsheet.

## Installation

1. Open any Google Sheet
2. Go to **Extensions > Apps Script**
3. Delete any existing code in `Code.gs`
4. Copy the contents of `Code.gs` from this folder and paste it in
5. Click **+** next to Files, select **HTML**, name it `Sidebar`
6. Copy the contents of `Sidebar.html` from this folder and paste it in
7. Click **+** next to Files, select **Script**, name it `appsscript`
8. Replace its contents with `appsscript.json` from this folder
9. Save all files (Ctrl+S)
10. Close the Apps Script editor
11. Refresh your Google Sheet
12. You'll see a new **SchemaShift** menu in the toolbar

## Usage

1. Open a Google Sheet with data (headers in row 1, data below)
2. Click **SchemaShift > Analyze Sheet**
3. The sidebar opens and automatically:
   - Reads your sheet data
   - Detects column types (email, date, integer, URL, currency, etc.)
   - Calculates data quality score
   - Compares against previous analysis to detect schema drift

### Features

- **Type Detection**: 12 type classifiers (email, URL, date, datetime, integer, float, boolean, currency, phone, UUID, IP address, string)
- **Quality Score**: Measures data completeness across all columns
- **Drift Detection**: Tracks added/removed/changed columns between analyses
- **Track Source**: Sends data to SchemaShift API for persistent tracking and ML-powered analysis
- **Zero Upload**: Reads data directly from your sheet — no downloading or re-uploading

## Permissions

The add-on requires:
- **spreadsheets.currentonly**: Read data from the current spreadsheet only
- **script.container.ui**: Show the sidebar UI
