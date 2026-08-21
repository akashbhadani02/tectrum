const SHEET_NAME = "Leads";
const HEADERS = ["id","leadInDate","clientName","clientMobile","architectName","architectMobile","salesPerson","leadGivenBy","quotation","amount","dealed","hotLead","address","area","currentStatus","nextFollowUpDate"];

function doGet() {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return json_([]);
  return json_(values.slice(1).map(rowToObject_));
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents || "{}");
  const sheet = getSheet_();
  if (body.action === "save") {
    const data = body.data || {};
    const values = HEADERS.map(h => data[h] ?? "");
    const all = sheet.getDataRange().getValues();
    const idx = all.findIndex((r,i)=>i>0 && String(r[0])===String(data.id));
    if (idx > 0) sheet.getRange(idx+1,1,1,HEADERS.length).setValues([values]);
    else sheet.appendRow(values);
    return json_({ok:true});
  }
  if (body.action === "delete") {
    const all = sheet.getDataRange().getValues();
    const idx = all.findIndex((r,i)=>i>0 && String(r[0])===String(body.id));
    if (idx > 0) sheet.deleteRow(idx+1);
    return json_({ok:true});
  }
  return json_({ok:false,error:"Unknown action"});
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  return sh;
}
function rowToObject_(r) {
  const o={}; HEADERS.forEach((h,i)=>o[h]=r[i] instanceof Date ? Utilities.formatDate(r[i], Session.getScriptTimeZone(), "yyyy-MM-dd") : r[i]); return o;
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
