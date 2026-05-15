function refreshBillCustomerOptions_() {
  const sel = document.getElementById('billCustomerId');
  if (!sel) return;
  const cur = sel.value;
  let html = '<option value="">— อัตโนมัติจากชื่อสถานที่ —</option>';
  (state.customers || []).forEach(function (c) {
    const label = (c.displayName || c.login) + (c.location ? ' — ' + c.location : ' (ไม่มีสถานที่ในระบบ)');
    html += '<option value="' + String(c.id).replace(/"/g, '&quot;') + '">' + label.replace(/</g, '&lt;') + '</option>';
  });
  sel.innerHTML = html;
  if (cur) sel.value = cur;
}

function syncBillCustomerFromLocation_() {
  const sel = document.getElementById('billCustomerId');
  if (!sel || state.role === 'customer') return;
  const c = findCustomerByLocation_(document.getElementById('location').value);
  sel.value = c ? String(c.id) : '';
}

async function handleCalculate(e) {
  e.preventDefault();
  const billCustEl = document.getElementById('billCustomerId');
  const explicitCust = billCustEl ? billCustEl.value : '';
  const raw = {
    id: document.getElementById('editId').value || Date.now().toString(),
    location: document.getElementById('location').value,
    customerId: resolveRecordCustomerId_(document.getElementById('location').value, explicitCust),
    month: document.getElementById('billMonth').value,
    phase: document.getElementById('phaseType').value,
    inputMode: document.querySelector('input[name="inputMode"]:checked').value,
    rateNormal: document.getElementById('phaseType').value !== '3tou' ? (parseFloat(document.getElementById('baseRate').value) || 0) : 0,
    ratePeak: document.getElementById('phaseType').value === '3tou' ? (parseFloat(document.getElementById('ratePeak').value) || 0) : 0,
    rateOffPeak: document.getElementById('phaseType').value === '3tou' ? (parseFloat(document.getElementById('rateOffPeak').value) || 0) : 0,
    rateHoliday: document.getElementById('phaseType').value === '3tou' ? (parseFloat(document.getElementById('rateHoliday').value) || 0) : 0,
    ft: parseFloat(document.getElementById('ftRate').value) || 0,
    serviceFee: parseFloat(document.getElementById('serviceFee').value) || 0,
    discount: parseFloat(document.getElementById('discountPercent').value) || 0,
    gridData: {},
    solarData: {},
    touGrid: {},
    touSolar: {}
  };

  let grid = 0;
  let solar = 0;
  if (raw.phase === '1') {
    if (raw.inputMode === 'unit') {
      grid = parseFloat(document.getElementById('gridUnits1').value) || 0;
      solar = parseFloat(document.getElementById('solarUnits1').value) || 0;
    } else {
      grid = calcDiff('gridPrev1', 'gridCurr1', 'gridRes1');
      solar = calcDiff('solarPrev1', 'solarCurr1', 'solarRes1');
      raw.gridData.L1 = { prev: document.getElementById('gridPrev1').value, curr: document.getElementById('gridCurr1').value };
      raw.solarData.L1 = { prev: document.getElementById('solarPrev1').value, curr: document.getElementById('solarCurr1').value };
    }
  } else if (raw.phase === '3') {
    ['L1', 'L2', 'L3'].forEach(function (l) {
      let g = 0;
      let s = 0;
      if (raw.inputMode === 'unit') {
        g = parseFloat(document.getElementById('gridUnits' + l).value) || 0;
        s = parseFloat(document.getElementById('solarUnits' + l).value) || 0;
        raw.gridData[l] = g;
        raw.solarData[l] = s;
      } else {
        g = calcDiff('gridPrev' + l, 'gridCurr' + l, 'gridRes' + l);
        s = calcDiff('solarPrev' + l, 'solarCurr' + l, 'solarRes' + l);
        raw.gridData[l] = { prev: document.getElementById('gridPrev' + l).value, curr: document.getElementById('gridCurr' + l).value, unit: g };
        raw.solarData[l] = { prev: document.getElementById('solarPrev' + l).value, curr: document.getElementById('solarCurr' + l).value, unit: s };
      }
      grid += g;
      solar += s;
    });
  } else if (raw.phase === '3tou') {
    ['Peak', 'Off', 'Hol'].forEach(function (l) {
      const k = l.toLowerCase();
      let g = 0;
      let s = 0;
      if (raw.inputMode === 'unit') {
        g = parseFloat(document.getElementById('gridUnits' + l).value) || 0;
        s = parseFloat(document.getElementById('solarUnits' + l).value) || 0;
        raw.touGrid[k] = g;
        raw.touSolar[k] = s;
      } else {
        g = calcDiff('gridPrev' + l, 'gridCurr' + l, 'gridRes' + l);
        s = calcDiff('solarPrev' + l, 'solarCurr' + l, 'solarRes' + l);
        raw.touGrid[k] = { prev: document.getElementById('gridPrev' + l).value, curr: document.getElementById('gridCurr' + l).value, unit: g };
        raw.touSolar[k] = { prev: document.getElementById('solarPrev' + l).value, curr: document.getElementById('solarCurr' + l).value, unit: s };
      }
      grid += g;
      solar += s;
    });
  }

  raw.grid = grid;
  raw.solar = solar;
  const rec = calculateFinancials(raw);

  document.getElementById('pvBefSub').innerText = formatCurrency(rec.gridSubtotal + rec.solarFullSubtotal - rec.gridVat - rec.solarFullVat);
  document.getElementById('pvBefVat').innerText = formatCurrency((rec.valY) - (rec.valY / 1.07));
  document.getElementById('pvBefTotal').innerText = formatCurrency(rec.valY);

  document.getElementById('pvAftGrid').innerText = formatCurrency(rec.valA);
  document.getElementById('pvAftSolar').innerText = formatCurrency(rec.valC);
  document.getElementById('pvDiscountVal').innerText = rec.discount;
  document.getElementById('pvAftTotal').innerText = formatCurrency(rec.valX);
  document.getElementById('pvSavedMoney').innerText = formatCurrency(rec.valZ);

  document.getElementById('calcDetailsContent').innerHTML = rec.calcStepsHTML;
  document.getElementById('resultPreview').classList.remove('hidden');

  if (e.submitter) {
    if (document.getElementById('editId').value) {
      const idx = state.records.findIndex(function (r) { return r.id === rec.id; });
      state.records[idx] = rec;
      showToast('อัพเดทข้อมูลสำเร็จ');
    } else {
      state.records.push(rec);
      showToast('บันทึกข้อมูลสำเร็จ');
    }
    state.records.sort(function (a, b) { return b.month.localeCompare(a.month); });
    await backendSaveRecord(rec);
    if (typeof invalidateLocationCache_ === 'function') invalidateLocationCache_();
    if (typeof refreshLocationDatalists_ === 'function') refreshLocationDatalists_();
    updateLocationFilterOptions();
    updateDashboardCards();
    renderTable();
    renderCustomerTab();
    setTimeout(function () { switchTab('history'); resetForm(); }, 1500);
  }
}

function editRecord(id) {
  const r = state.records.find(function (r) { return r.id === id; });
  if (!r) return;
  document.getElementById('editId').value = r.id;
  document.getElementById('location').value = r.location;
  const billCust = document.getElementById('billCustomerId');
  if (billCust) billCust.value = r.customerId || '';
  document.getElementById('phaseType').value = r.phase;

  if (fpMonth) { fpMonth.setDate(r.month); } else { document.getElementById('billMonth').value = r.month; }

  document.getElementById('baseRate').value = r.rateNormal || 0;
  document.getElementById('ratePeak').value = r.ratePeak || 0;
  document.getElementById('rateOffPeak').value = r.rateOffPeak || 0;
  document.getElementById('rateHoliday').value = r.rateHoliday || 0;
  document.getElementById('ftRate').value = r.ft;
  document.getElementById('serviceFee').value = r.serviceFee || 0;
  document.getElementById('discountPercent').value = r.discount;

  document.querySelector('input[name="inputMode"][value="' + (r.inputMode || 'unit') + '"]').checked = true;
  togglePhaseInputs();

  if (r.phase === '1') {
    if (r.inputMode === 'meter') {
      document.getElementById('gridPrev1').value = (r.gridData && r.gridData.L1 && r.gridData.L1.prev) || '';
      document.getElementById('gridCurr1').value = (r.gridData && r.gridData.L1 && r.gridData.L1.curr) || '';
      document.getElementById('solarPrev1').value = (r.solarData && r.solarData.L1 && r.solarData.L1.prev) || '';
      document.getElementById('solarCurr1').value = (r.solarData && r.solarData.L1 && r.solarData.L1.curr) || '';
      calcDiff('gridPrev1', 'gridCurr1', 'gridRes1');
      calcDiff('solarPrev1', 'solarCurr1', 'solarRes1');
    } else {
      document.getElementById('gridUnits1').value = r.grid;
      document.getElementById('solarUnits1').value = r.solar;
    }
  } else if (r.phase === '3') {
    ['L1', 'L2', 'L3'].forEach(function (l) {
      if (r.inputMode === 'meter') {
        document.getElementById('gridPrev' + l).value = (r.gridData && r.gridData[l] && r.gridData[l].prev) || '';
        document.getElementById('gridCurr' + l).value = (r.gridData && r.gridData[l] && r.gridData[l].curr) || '';
        document.getElementById('solarPrev' + l).value = (r.solarData && r.solarData[l] && r.solarData[l].prev) || '';
        document.getElementById('solarCurr' + l).value = (r.solarData && r.solarData[l] && r.solarData[l].curr) || '';
        calcDiff('gridPrev' + l, 'gridCurr' + l, 'gridRes' + l);
        calcDiff('solarPrev' + l, 'solarCurr' + l, 'solarRes' + l);
      } else {
        document.getElementById('gridUnits' + l).value = (r.gridData && r.gridData[l]) || (r.grid / 3).toFixed(2);
        document.getElementById('solarUnits' + l).value = (r.solarData && r.solarData[l]) || (r.solar / 3).toFixed(2);
      }
    });
  } else if (r.phase === '3tou') {
    ['Peak', 'Off', 'Hol'].forEach(function (l) {
      const k = l.toLowerCase();
      if (r.inputMode === 'meter') {
        document.getElementById('gridPrev' + l).value = (r.touGrid && r.touGrid[k] && r.touGrid[k].prev) || '';
        document.getElementById('gridCurr' + l).value = (r.touGrid && r.touGrid[k] && r.touGrid[k].curr) || '';
        document.getElementById('solarPrev' + l).value = (r.touSolar && r.touSolar[k] && r.touSolar[k].prev) || '';
        document.getElementById('solarCurr' + l).value = (r.touSolar && r.touSolar[k] && r.touSolar[k].curr) || '';
        calcDiff('gridPrev' + l, 'gridCurr' + l, 'gridRes' + l);
        calcDiff('solarPrev' + l, 'solarCurr' + l, 'solarRes' + l);
      } else {
        document.getElementById('gridUnits' + l).value = (r.touGrid && typeof r.touGrid[k] === 'number') ? r.touGrid[k] : ((r.touGrid && r.touGrid[k]) || 0);
        document.getElementById('solarUnits' + l).value = (r.touSolar && typeof r.touSolar[k] === 'number') ? r.touSolar[k] : ((r.touSolar && r.touSolar[k]) || 0);
      }
    });
  }

  document.getElementById('resultPreview').classList.add('hidden');
  switchTab('calculator');
}

async function deleteRecord(id) {
  if (confirm('ยืนยันการลบข้อมูลประวัตินี้?')) {
    state.records = state.records.filter(function (r) { return r.id !== id; });
    await backendDeleteRecord(id);
    updateLocationFilterOptions();
    updateDashboardCards();
    renderTable();
    renderCustomerTab();
    showToast('ลบข้อมูลสำเร็จ');
  }
}

function resetForm() {
  document.getElementById('calcForm').reset();
  document.getElementById('editId').value = '';
  const billCust = document.getElementById('billCustomerId');
  if (billCust) billCust.value = '';
  if (fpMonth) fpMonth.setDate(new Date());
  document.getElementById('baseRate').value = state.settings.rateNormal;
  document.getElementById('ratePeak').value = state.settings.ratePeak || 5.7982;
  document.getElementById('rateOffPeak').value = state.settings.rateOffPeak || 2.6369;
  document.getElementById('rateHoliday').value = state.settings.rateHoliday || 2.6369;
  document.getElementById('ftRate').value = state.settings.ft;
  document.getElementById('serviceFee').value = state.settings.serviceFee;
  document.getElementById('discountPercent').value = '20';
  document.querySelector('input[name="inputMode"][value="unit"]').checked = true;
  document.querySelectorAll('span[id^="gridRes"], span[id^="solarRes"]').forEach(function (el) { el.innerText = '0.00'; });
  document.getElementById('resultPreview').classList.add('hidden');
  togglePhaseInputs();
}
