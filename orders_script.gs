/**
 * TONG'S STYLE — Orders to Google Sheets
 * =========================================
 * SETUP (do this once):
 *
 * 1. Go to sheets.google.com → create a new spreadsheet.
 *    Name the sheet tab "Orders" (lowercase tab at the bottom).
 *
 * 2. In the spreadsheet, go to: Extensions > Apps Script
 *
 * 3. Delete the default code, paste in everything below the dashed line.
 *
 * 4. Click: Deploy > New deployment
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    → Click Deploy, then copy the URL it gives you.
 *
 * 5. Open tongsstyle_v2.html, find the line:
 *      const SHEET_URL = 'PASTE_YOUR_SCRIPT_URL_HERE';
 *    Replace PASTE_YOUR_SCRIPT_URL_HERE with the URL you just copied.
 *
 * 6. Save the HTML file. Orders will now appear as rows in your spreadsheet.
 *
 * NOTE: Every time you change the script you must create a NEW deployment
 * (Deploy > New deployment) — not "Manage deployments" > edit.
 * -----------------------------------------------------------------------
 */

function doPost(e) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Orders') || ss.getActiveSheet();

  // Write header row on first use
  if (sheet.getLastRow() === 0) {
    const headers = ['Timestamp', 'Name', 'Email', 'Phone', 'Date Needed', 'Message'];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
         .setFontWeight('bold')
         .setBackground('#EEC724'); // saffron to match the brand
  }

  sheet.appendRow([
    new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
    e.parameter.name    || '',
    e.parameter.email   || '',
    e.parameter.phone   || '',
    e.parameter.date    || '',
    e.parameter.message || ''
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'success' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Handles browser test-open of the script URL
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: "TONG'S STYLE orders endpoint is live." }))
    .setMimeType(ContentService.MimeType.JSON);
}
