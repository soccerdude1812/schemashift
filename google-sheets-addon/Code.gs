/**
 * SchemaShift — Google Sheets Add-on
 * Analyze schemas, detect drift, and track data quality without leaving your spreadsheet.
 */

const API_BASE = 'https://schemashift-api.vercel.app/api/v1';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SchemaShift')
    .addItem('Analyze Sheet', 'showSidebar')
    .addSeparator()
    .addItem('About', 'showAbout')
    .toMenu();
}

function onInstall(e) {
  onOpen(e);
}

function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('SchemaShift')
    .setWidth(360);
  SpreadsheetApp.getUi().showSidebar(html);
}

function showAbout() {
  const html = HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;padding:16px;">' +
    '<h2>SchemaShift</h2>' +
    '<p>Intelligent schema drift detection for your spreadsheets.</p>' +
    '<p><a href="https://schemashift.vercel.app" target="_blank">schemashift.vercel.app</a></p>' +
    '</div>'
  ).setWidth(300).setHeight(150);
  SpreadsheetApp.getUi().showModalDialog(html, 'About SchemaShift');
}

/**
 * Read data from the active sheet and return structured info.
 * Called from the sidebar via google.script.run.
 */
function getSheetData() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getDataRange();
  const values = range.getValues();

  if (values.length < 2) {
    return { error: 'Sheet needs at least a header row and one data row.' };
  }

  const headers = values[0].map(String);
  const dataRows = values.slice(1);
  const sheetName = sheet.getName();
  const spreadsheetName = SpreadsheetApp.getActiveSpreadsheet().getName();
  const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();

  // Build column samples (first 100 rows, up to 20 columns)
  const columns = [];
  const maxCols = Math.min(headers.length, 20);
  const maxRows = Math.min(dataRows.length, 100);

  for (let c = 0; c < maxCols; c++) {
    const samples = [];
    let nullCount = 0;
    for (let r = 0; r < maxRows; r++) {
      const val = dataRows[r][c];
      if (val === '' || val === null || val === undefined) {
        nullCount++;
      } else {
        samples.push(String(val));
      }
    }
    columns.push({
      name: headers[c] || `column_${c}`,
      samples: samples.slice(0, 10),
      nullCount: nullCount,
      totalRows: maxRows,
    });
  }

  return {
    spreadsheetId: spreadsheetId,
    spreadsheetName: spreadsheetName,
    sheetName: sheetName,
    rowCount: dataRows.length,
    columnCount: headers.length,
    columns: columns,
    headers: headers.slice(0, maxCols),
  };
}

/**
 * Convert sheet data to CSV and send to SchemaShift API for analysis.
 */
function analyzeWithApi(sessionId) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getDataRange();
  const values = range.getValues();

  if (values.length < 2) {
    return { error: 'Sheet needs at least a header row and one data row.' };
  }

  // Convert to CSV (limit to 500 rows for performance)
  const maxRows = Math.min(values.length, 501); // header + 500 data rows
  const csvLines = [];
  for (let r = 0; r < maxRows; r++) {
    const line = values[r].map(function(cell) {
      const str = String(cell);
      if (str.indexOf(',') >= 0 || str.indexOf('"') >= 0 || str.indexOf('\n') >= 0) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }).join(',');
    csvLines.push(line);
  }
  const csvContent = csvLines.join('\n');
  const fileName = SpreadsheetApp.getActiveSpreadsheet().getName() + ' - ' + sheet.getName() + '.csv';

  // Send to SchemaShift API
  try {
    const boundary = 'SchemaShiftBoundary' + Date.now();
    const body =
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="file"; filename="' + fileName + '"\r\n' +
      'Content-Type: text/csv\r\n\r\n' +
      csvContent + '\r\n' +
      '--' + boundary + '--\r\n';

    const options = {
      method: 'post',
      contentType: 'multipart/form-data; boundary=' + boundary,
      payload: body,
      headers: {
        'X-Session-ID': sessionId || 'sheets-addon-anonymous',
      },
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(API_BASE + '/scan', options);
    const status = response.getResponseCode();
    const responseText = response.getContentText();

    if (status >= 200 && status < 300) {
      return JSON.parse(responseText);
    } else {
      Logger.log('API error: ' + status + ' ' + responseText);
      return { error: 'API returned ' + status + ': ' + responseText.substring(0, 200) };
    }
  } catch (e) {
    Logger.log('API call failed: ' + e.message);
    return { error: 'Failed to connect to SchemaShift API: ' + e.message };
  }
}

/**
 * Get or create a session for this user.
 */
function getOrCreateSession() {
  const userProps = PropertiesService.getUserProperties();
  let sessionId = userProps.getProperty('schemashift_session_id');

  if (sessionId) {
    return sessionId;
  }

  try {
    const options = {
      method: 'get',
      muteHttpExceptions: true,
    };
    const response = UrlFetchApp.fetch(API_BASE + '/session', options);
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      sessionId = data.id || data.session_id;
      if (sessionId) {
        userProps.setProperty('schemashift_session_id', sessionId);
        return sessionId;
      }
    }
  } catch (e) {
    Logger.log('Session creation failed: ' + e.message);
  }

  // Fallback: generate a UUID-like ID
  sessionId = Utilities.getUuid();
  userProps.setProperty('schemashift_session_id', sessionId);
  return sessionId;
}
