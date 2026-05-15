/* รายชื่อสถานที่ + ประสิทธิภาพ */
var _locationCache_ = null;

function getAllKnownLocations_() {
  if (_locationCache_) return _locationCache_;
  const set = new Set();
  state.records.forEach(function (r) {
    if (r.location) set.add(String(r.location).trim());
  });
  (state.customers || []).forEach(function (c) {
    if (c.location) set.add(String(c.location).trim());
  });
  _locationCache_ = Array.from(set).filter(Boolean).sort(function (a, b) {
    return a.localeCompare(b, 'th');
  });
  return _locationCache_;
}

function invalidateLocationCache_() {
  _locationCache_ = null;
}

function escapeHtmlAttr_(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function refreshLocationDatalists_() {
  const locs = getAllKnownLocations_();
  const opts = locs.map(function (l) {
    return '<option value="' + escapeHtmlAttr_(l) + '"></option>';
  }).join('');
  ['locationList', 'custRegLocationList'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = opts;
  });
}

function bindLocationAutocomplete_() {
  const locInput = document.getElementById('location');
  if (locInput && !locInput._acBound) {
    locInput._acBound = true;
    locInput.addEventListener('focus', refreshLocationDatalists_);
    locInput.addEventListener('input', function () {
      const v = locInput.value.trim().toLowerCase();
      if (!v) return;
      const match = getAllKnownLocations_().find(function (l) {
        return l.toLowerCase() === v || l.toLowerCase().indexOf(v) === 0;
      });
      if (match && locInput.value.trim() !== match) {
        /* ไม่บังคับ autofill — แค่ datalist แนะนำ */
      }
    });
  }
}

function scheduleUiRefresh_(fn) {
  if (window.requestAnimationFrame) {
    requestAnimationFrame(fn);
  } else {
    setTimeout(fn, 0);
  }
}
