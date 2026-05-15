/**
 * SolarSave — Google Apps Script backend
 * Spreadsheet: 1FF43MELkRFwvul3-hUUCE4VA0YZ4wl_4jkim2eU2uIk
 *
 * วิธีใช้: สร้างโปรเจกต์ Apps Script (หรือผูกกับสเปรดชีต) วางโค้ดนี้
 * Deploy > New deployment > Web app
 *   Execute as: Me
 *   Who has access: Anyone
 * จากนั้นนำ URL ที่ลงท้ายด้วย /exec ไปใส่ใน Solarsave/config.js → GAS_WEB_APP_URL
 */
var SPREADSHEET_ID = '1FF43MELkRFwvul3-hUUCE4VA0YZ4wl_4jkim2eU2uIk';

function doGet(e) {
  return handleRequest_(e && e.parameter ? e.parameter : {});
}

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse(e.postData.contents || '{}');
  } catch (err) {
    return jsonOut_({ ok: false, error: 'Invalid JSON body' });
  }
  return handleRequest_(body);
}

function jsonOut_(obj) {
  var out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

function handleRequest_(p) {
  try {
    ensureSheets_();
    var action = String(p.action || '');
    if (action === 'loadAll') return jsonOut_(loadAll_());
    if (action === 'saveRecord') return jsonOut_(saveRecord_(p.record));
    if (action === 'deleteRecord') return jsonOut_(deleteRecord_(p.id));
    if (action === 'saveSettings') return jsonOut_(saveSettings_(p.settings));
    if (action === 'saveStaffAccounts') return jsonOut_(saveStaffAccounts_(p.staffAccounts));
    if (action === 'registerCustomer') return jsonOut_(registerCustomer_(p.customer));
    if (action === 'loginCustomer') return jsonOut_(loginCustomer_(p.login, p.password));
    return jsonOut_({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function ensureSheets_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh;

  sh = ss.getSheetByName('Settings');
  if (!sh) {
    sh = ss.insertSheet('Settings');
    sh.getRange(1, 1, 1, 6).setValues([['rateNormal', 'ratePeak', 'rateOffPeak', 'rateHoliday', 'ft', 'serviceFee']]);
    sh.getRange(2, 1, 1, 6).setValues([[4.5, 5.7982, 2.6369, 2.6369, 0.3972, 312.24]]);
  }

  sh = ss.getSheetByName('Staff');
  if (!sh) {
    sh = ss.insertSheet('Staff');
    sh.getRange(1, 1, 1, 4).setValues([['id', 'username', 'password', 'role']]);
    sh.getRange(2, 1, 2, 4).setValues([
      ['1', 'admin', '1234', 'admin']
    ]);
  }

  sh = ss.getSheetByName('Customers');
  if (!sh) {
    sh = ss.insertSheet('Customers');
    sh.getRange(1, 1, 1, 6).setValues([['id', 'login', 'password', 'displayName', 'location', 'createdAt']]);
  }

  sh = ss.getSheetByName('Records');
  if (!sh) {
    sh = ss.insertSheet('Records');
    sh.getRange(1, 1, 1, 2).setValues([['id', 'json']]);
  }
}

function loadAll_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var settings = readSettings_(ss);
  var staffAccounts = readStaff_(ss);
  var records = readRecords_(ss);
  var customers = readCustomers_(ss);
  return { ok: true, settings: settings, staffAccounts: staffAccounts, records: records, customers: customers };
}

function readSettings_(ss) {
  var sh = ss.getSheetByName('Settings');
  var headers = sh.getRange(1, 1, 1, 6).getValues()[0];
  var vals = sh.getRange(2, 1, 2, 6).getValues()[0];
  var o = {};
  for (var i = 0; i < headers.length; i++) {
    o[String(headers[i])] = vals[i];
  }
  return {
    rateNormal: Number(o.rateNormal),
    ratePeak: Number(o.ratePeak),
    rateOffPeak: Number(o.rateOffPeak),
    rateHoliday: Number(o.rateHoliday),
    ft: Number(o.ft),
    serviceFee: Number(o.serviceFee)
  };
}

function readStaff_(ss) {
  var sh = ss.getSheetByName('Staff');
  var data = sh.getDataRange().getValues();
  var out = [];
  for (var r = 1; r < data.length; r++) {
    out.push({
      id: String(data[r][0]),
      username: String(data[r][1]),
      password: String(data[r][2]),
      role: String(data[r][3])
    });
  }
  return out;
}

function readRecords_(ss) {
  var sh = ss.getSheetByName('Records');
  var data = sh.getDataRange().getValues();
  var out = [];
  for (var r = 1; r < data.length; r++) {
    var id = data[r][0];
    var j = data[r][1];
    if (!id || !j) continue;
    try {
      var obj = JSON.parse(String(j));
      if (!obj.id) obj.id = String(id);
      out.push(obj);
    } catch (e) {
      // skip bad row
    }
  }
  return out;
}

function saveSettings_(settings) {
  if (!settings || typeof settings !== 'object') return { ok: false, error: 'Missing settings' };
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName('Settings');
  sh.getRange(2, 1, 1, 6).setValues([[
    Number(settings.rateNormal),
    Number(settings.ratePeak),
    Number(settings.rateOffPeak),
    Number(settings.rateHoliday),
    Number(settings.ft),
    Number(settings.serviceFee)
  ]]);
  return { ok: true };
}

function saveStaffAccounts_(list) {
  if (!Array.isArray(list)) return { ok: false, error: 'staffAccounts must be array' };
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName('Staff');
  sh.clearContents();
  sh.getRange(1, 1, 1, 4).setValues([['id', 'username', 'password', 'role']]);
  if (list.length === 0) return { ok: true };
  var rows = list.map(function (a) {
    return [String(a.id), String(a.username), String(a.password), String(a.role)];
  });
  sh.getRange(2, 1, rows.length, 4).setValues(rows);
  return { ok: true };
}

function readCustomers_(ss) {
  var sh = ss.getSheetByName('Customers');
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  var out = [];
  for (var r = 1; r < data.length; r++) {
    if (!data[r][0] || !data[r][1]) continue;
    out.push({
      id: String(data[r][0]),
      login: String(data[r][1]),
      displayName: String(data[r][3] || ''),
      location: String(data[r][4] || ''),
      createdAt: String(data[r][5] || '')
    });
  }
  return out;
}

function readCustomersWithPassword_(ss) {
  var sh = ss.getSheetByName('Customers');
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  var out = [];
  for (var r = 1; r < data.length; r++) {
    if (!data[r][0] || !data[r][1]) continue;
    out.push({
      id: String(data[r][0]),
      login: String(data[r][1]),
      password: String(data[r][2] || ''),
      displayName: String(data[r][3] || ''),
      location: String(data[r][4] || ''),
      createdAt: String(data[r][5] || '')
    });
  }
  return out;
}

function registerCustomer_(customer) {
  if (!customer || !customer.login || !customer.password) {
    return { ok: false, error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' };
  }
  var login = String(customer.login).trim();
  if (!login) return { ok: false, error: 'ชื่อผู้ใช้ไม่ถูกต้อง' };
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var list = readCustomersWithPassword_(ss);
  for (var i = 0; i < list.length; i++) {
    if (list[i].login.toLowerCase() === login.toLowerCase()) {
      return { ok: false, error: 'ชื่อผู้ใช้นี้มีในระบบแล้ว' };
    }
  }
  var id = String(Date.now());
  var sh = ss.getSheetByName('Customers');
  sh.appendRow([
    id,
    login,
    String(customer.password),
    String(customer.displayName || login),
    String(customer.location || ''),
    new Date().toISOString()
  ]);
  return {
    ok: true,
    customer: {
      id: id,
      login: login,
      displayName: String(customer.displayName || login),
      location: String(customer.location || '')
    }
  };
}

function loginCustomer_(login, password) {
  if (!login || !password) return { ok: false, error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' };
  var key = String(login).trim().toLowerCase();
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var list = readCustomersWithPassword_(ss);
  for (var i = 0; i < list.length; i++) {
    if (list[i].login.toLowerCase() === key && String(list[i].password).trim() === String(password).trim()) {
      return {
        ok: true,
        customer: {
          id: list[i].id,
          login: list[i].login,
          displayName: list[i].displayName,
          location: list[i].location
        }
      };
    }
  }
  return { ok: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
}

function saveRecord_(record) {
  if (!record || !record.id) return { ok: false, error: 'Missing record.id' };
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName('Records');
  var data = sh.getDataRange().getValues();
  var rowIndex = -1;
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][0]) === String(record.id)) {
      rowIndex = r + 1;
      break;
    }
  }
  var json = JSON.stringify(stripForStorage_(record));
  if (rowIndex === -1) {
    sh.appendRow([String(record.id), json]);
  } else {
    sh.getRange(rowIndex, 1, 1, 2).setValues([[String(record.id), json]]);
  }
  return { ok: true };
}

function deleteRecord_(id) {
  if (id === undefined || id === null || id === '') return { ok: false, error: 'Missing id' };
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sh = ss.getSheetByName('Records');
  var data = sh.getDataRange().getValues();
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][0]) === String(id)) {
      sh.deleteRow(r + 1);
      return { ok: true };
    }
  }
  return { ok: true };
}

/** ลบฟิลด์ที่คำนวณแล้วออกจาก JSON เก็บแค่ข้อมูลดิบ + id (ลดขนาด) — ฝั่งเว็บจะคำนวณใหม่ */
function stripForStorage_(rec) {
  var o = JSON.parse(JSON.stringify(rec));
  delete o.gridSubtotal;
  delete o.gridVat;
  delete o.solarFullSubtotal;
  delete o.solarFullVat;
  delete o.solarNetSubtotal;
  delete o.solarNetVat;
  delete o.valA;
  delete o.valB;
  delete o.valC;
  delete o.valY;
  delete o.valX;
  delete o.valZ;
  delete o.calcStepsHTML;
  return o;
}
