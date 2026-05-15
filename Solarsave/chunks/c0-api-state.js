/* SolarSave — API + state (production) */
(function () {
  'use strict';

  var CFG = typeof window !== 'undefined' && window.SOLARSAVE_CONFIG ? window.SOLARSAVE_CONFIG : {};
  var GAS_WEB_APP_URL = String(CFG.GAS_WEB_APP_URL || '').trim();
  var SESSION_KEY = 'solarsave_session_v1';

  window.__SOLARSAVE_GAS__ = {
    url: function () { return GAS_WEB_APP_URL; },
    call: function (action, extra) {
      if (!GAS_WEB_APP_URL) return Promise.resolve({ ok: false, offline: true });
      var payload = JSON.stringify(Object.assign({ action: action }, extra || {}));
      return fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: payload
      }).then(function (res) { return res.text(); }).then(function (txt) {
        try { return JSON.parse(txt); } catch (e) { return { ok: false, error: txt || 'parse' }; }
      }).catch(function (err) { return { ok: false, error: String(err.message || err) }; });
    },
    loadAll: function () { return window.__SOLARSAVE_GAS__.call('loadAll'); },
    saveRecord: function (record) { return window.__SOLARSAVE_GAS__.call('saveRecord', { record: record }); },
    deleteRecord: function (id) { return window.__SOLARSAVE_GAS__.call('deleteRecord', { id: id }); },
    saveSettings: function (settings) { return window.__SOLARSAVE_GAS__.call('saveSettings', { settings: settings }); },
    saveStaffAccounts: function (staffAccounts) { return window.__SOLARSAVE_GAS__.call('saveStaffAccounts', { staffAccounts: staffAccounts }); },
    registerCustomer: function (customer) { return window.__SOLARSAVE_GAS__.call('registerCustomer', { customer: customer }); },
    loginCustomer: function (login, password) { return window.__SOLARSAVE_GAS__.call('loginCustomer', { login: login, password: password }); }
  };

  window.__SOLARSAVE_SESSION__ = {
    save: function (data) {
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
    },
    load: function () {
      try {
        var raw = sessionStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },
    clear: function () {
      try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    }
  };
})();

const state = {
  isLoggedIn: false,
  user: null,
  role: 'customer',
  currentCustomer: null,
  theme: 'light',
  currentTab: 'dashboard',
  settings: { rateNormal: 4.50, ratePeak: 5.7982, rateOffPeak: 2.6369, rateHoliday: 2.6369, ft: 0.3972, serviceFee: 312.24 },
  staffAccounts: [],
  customers: [],
  records: []
};

let myChart = null;
let modalChartInstance = null;
let fpMonth = null;
let currentModalLoc = '';

function findCustomerByLocation_(loc) {
  var t = String(loc || '').trim().toLowerCase();
  if (!t) return null;
  return (state.customers || []).find(function (c) {
    return c.location && String(c.location).trim().toLowerCase() === t;
  }) || null;
}

function resolveRecordCustomerId_(location, explicitId) {
  if (explicitId) return String(explicitId);
  var c = findCustomerByLocation_(location);
  return c ? String(c.id) : '';
}

function getRecordsForView() {
  if (state.role === 'customer' && state.currentCustomer) {
    var loc = (state.currentCustomer.location || '').trim();
    var cid = String(state.currentCustomer.id || '');
    if (loc) {
      return state.records.filter(function (r) {
        return r.location === loc || (cid && String(r.customerId || '') === cid);
      });
    }
    return state.records.filter(function (r) { return cid && String(r.customerId || '') === cid; });
  }
  return state.records;
}

async function applyBackendPayload_(data) {
  if (!data || !data.ok) return false;
  if (data.settings && typeof data.settings === 'object') {
    state.settings.rateNormal = Number(data.settings.rateNormal) || state.settings.rateNormal;
    state.settings.ratePeak = Number(data.settings.ratePeak) || state.settings.ratePeak;
    state.settings.rateOffPeak = Number(data.settings.rateOffPeak) || state.settings.rateOffPeak;
    state.settings.rateHoliday = Number(data.settings.rateHoliday) || state.settings.rateHoliday;
    state.settings.ft = Number(data.settings.ft) || state.settings.ft;
    state.settings.serviceFee = Number(data.settings.serviceFee) || state.settings.serviceFee;
  }
  if (Array.isArray(data.staffAccounts)) state.staffAccounts = data.staffAccounts;
  if (Array.isArray(data.customers)) state.customers = data.customers;
  if (Array.isArray(data.records)) {
    state.records = data.records.map(function (raw) { return calculateFinancials(raw); });
  }
  if (typeof invalidateLocationCache_ === 'function') invalidateLocationCache_();
  return true;
}

async function loadBackendData() {
  var r = await window.__SOLARSAVE_GAS__.loadAll();
  if (r.offline) return false;
  if (r.ok) {
    await applyBackendPayload_(r);
    return true;
  }
  showToast('โหลดจาก Google Sheet ไม่สำเร็จ: ' + (r.error || 'unknown'));
  return false;
}

function backendErrorMsg_(r, fallback) {
  if (!r || r.ok) return '';
  return (r.error || fallback || 'unknown').toString().slice(0, 120);
}

async function backendSaveRecord(rec) {
  if (!window.__SOLARSAVE_GAS__.url()) return { ok: false };
  var r = await window.__SOLARSAVE_GAS__.saveRecord(rec);
  if (!r.ok) showToast('บันทึกลง Sheet ไม่สำเร็จ: ' + backendErrorMsg_(r, 'network'));
  return r;
}

async function backendDeleteRecord(id) {
  if (!window.__SOLARSAVE_GAS__.url()) return { ok: false };
  return window.__SOLARSAVE_GAS__.deleteRecord(id);
}

async function backendSaveSettings() {
  if (!window.__SOLARSAVE_GAS__.url()) return { ok: false };
  var r = await window.__SOLARSAVE_GAS__.saveSettings(Object.assign({}, state.settings));
  if (!r.ok) showToast('บันทึกตั้งค่า Sheet ไม่สำเร็จ: ' + backendErrorMsg_(r, 'network'));
  return r;
}

async function backendSaveStaff() {
  if (!window.__SOLARSAVE_GAS__.url()) return { ok: false };
  var r = await window.__SOLARSAVE_GAS__.saveStaffAccounts(state.staffAccounts.slice());
  if (!r.ok) showToast('บันทึกบัญชี Staff ลง Sheet ไม่สำเร็จ: ' + backendErrorMsg_(r, 'network'));
  return r;
}
