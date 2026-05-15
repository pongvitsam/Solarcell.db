function renderCustomerTab() {
  const tb = document.getElementById('customersTableBody');
  tb.innerHTML = '';
  const grouped = {};
  getRecordsForView().forEach(function (r) {
    if (!grouped[r.location]) grouped[r.location] = [];
    grouped[r.location].push(r);
  });
  Object.keys(grouped).sort().forEach(function (loc) {
    const recs = grouped[loc];
    let sZ = 0;
    recs.forEach(function (r) { sZ += r.valZ; });
    const sortedRecs = recs.slice().sort(function (a, b) { return b.month.localeCompare(a.month); });
    const latestDate = formatMonthThai(sortedRecs[0].month);
    const esc = loc.replace(/'/g, "\\'");
    tb.innerHTML += '<tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">' +
      '<td class="px-4 py-4 font-bold dark:text-white"><i class="ph-fill ph-house-line mr-2 text-primary-500"></i>' + loc + '<br><span class="text-xs text-gray-500 font-normal">อัปเดตล่าสุด: ' + latestDate + '</span></td>' +
      '<td class="px-4 py-4 text-center"><span class="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-2 py-1 rounded-lg text-xs font-bold">' + recs.length + ' รอบบิล</span></td>' +
      '<td class="px-4 py-4 text-right font-bold text-green-600">' + formatCurrency(sZ) + '</td>' +
      '<td class="px-4 py-4 text-center space-x-2">' +
      '<button onclick="viewCustomerHistory(\'' + esc + '\')" class="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-lg transition text-xs font-bold"><i class="ph ph-table mr-1"></i> ดูข้อมูลบิล</button>' +
      '<button onclick="openLocationSummary(\'' + esc + '\')" class="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-600 rounded-lg transition text-xs font-bold"><i class="ph ph-chart-pie-slice mr-1"></i> ดูรายงานสรุป</button>' +
      '</td></tr>';
  });
}

function renderTable() {
  const tb = document.getElementById('historyTableBody');
  tb.innerHTML = '';
  const filter = document.getElementById('historyFilter').value;
  const viewRecs = getRecordsForView();
  let displayRecs = filter === 'ALL' ? viewRecs : viewRecs.filter(function (r) { return r.location === filter; });
  if (!displayRecs.length) {
    document.getElementById('emptyState').classList.remove('hidden');
    return;
  }
  document.getElementById('emptyState').classList.add('hidden');

  const grouped = {};
  displayRecs.forEach(function (r) {
    if (!grouped[r.location]) grouped[r.location] = [];
    grouped[r.location].push(r);
  });
  Object.keys(grouped).sort().forEach(function (loc, i) {
    const recs = grouped[loc].sort(function (a, b) { return b.month.localeCompare(a.month); });
    let sumGrid = 0;
    let sumSolar = 0;
    let sumX = 0;
    let sumZ = 0;
    recs.forEach(function (r) {
      sumGrid += r.grid;
      sumSolar += r.solar;
      sumX += r.valX;
      sumZ += r.valZ;
    });
    const gId = 'g-' + i;
    const esc = loc.replace(/'/g, "\\'");

    tb.innerHTML += '<tr class="bg-primary-50/60 dark:bg-primary-900/20 cursor-pointer border-b-2 dark:border-gray-700" onclick="toggleGroup(\'' + gId + '\')">' +
      '<td class="px-4 py-4 font-bold dark:text-white flex items-center"><div class="w-6"><i class="ph ph-caret-right transition-transform" id="icon-' + gId + '"></i></div><span class="truncate">' + loc + '</span> <span class="ml-2 text-xs font-normal text-primary-600 bg-white/60 dark:bg-black/20 px-2 rounded-full">' + recs.length + ' ด.</span></td>' +
      '<td class="px-4 py-4 text-center text-gray-400">-</td><td class="px-4 py-4 text-right font-semibold dark:text-gray-300">' + sumGrid.toFixed(2) + '</td><td class="px-4 py-4 text-right font-semibold text-yellow-600">' + sumSolar.toFixed(2) + '</td><td class="px-4 py-4 text-right font-bold text-purple-600">' + formatCurrency(sumX) + '</td><td class="px-4 py-4 text-right font-bold text-green-600">' + formatCurrency(sumZ) + '</td>' +
      '<td class="px-4 py-4 text-center"><button onclick="event.stopPropagation(); openLocationSummary(\'' + esc + '\')" class="text-teal-600 bg-teal-50 px-3 py-1 rounded-xl text-xs font-bold hover:bg-teal-100 transition">ดูสรุป</button></td></tr>';

    recs.forEach(function (r) {
      const badge = r.phase === '3tou'
        ? '<span class="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px]">TOU</span>'
        : '<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px]">' + r.phase + ' เฟส</span>';
      const custBtns = state.role !== 'customer'
        ? '<button onclick="editRecord(\'' + r.id + '\')" class="text-blue-500 bg-blue-50 p-1.5 rounded-lg hover:bg-blue-100 transition" title="แก้ไข"><i class="ph ph-pencil-simple text-lg"></i></button><button onclick="deleteRecord(\'' + r.id + '\')" class="text-red-500 bg-red-50 p-1.5 rounded-lg hover:bg-red-100 transition" title="ลบ"><i class="ph ph-trash text-lg"></i></button>'
        : '<span class="text-xs text-gray-400">ดูได้อย่างเดียว</span>';
      tb.innerHTML += '<tr class="hidden g-child-' + gId + ' hover:bg-gray-50 dark:hover:bg-gray-800 border-b dark:border-gray-700 bg-white dark:bg-gray-900/20">' +
        '<td class="px-4 py-3 pl-12 text-sm dark:text-gray-300"><i class="ph ph-calendar-blank text-primary-400"></i> ' + formatMonthThai(r.month) + '</td>' +
        '<td class="px-4 py-3 text-center">' + badge + ' <span class="text-xs text-green-600">(-' + r.discount + '%)</span></td>' +
        '<td class="px-4 py-3 text-right text-sm dark:text-gray-400">' + r.grid.toFixed(2) + '</td><td class="px-4 py-3 text-right text-sm text-yellow-600/80">' + r.solar.toFixed(2) + '</td><td class="px-4 py-3 text-right text-sm text-purple-600/90">' + formatCurrency(r.valX) + '</td><td class="px-4 py-3 text-right text-sm font-semibold text-green-600/90">' + formatCurrency(r.valZ) + '</td>' +
        '<td class="px-4 py-3 text-center space-x-1 no-print">' + custBtns + '</td></tr>';
    });
  });
}

function toggleGroup(gId) {
  const rows = document.querySelectorAll('.g-child-' + gId);
  const icon = document.getElementById('icon-' + gId);
  let expand = false;
  rows.forEach(function (r) {
    if (r.classList.contains('hidden')) {
      r.classList.remove('hidden');
      expand = true;
    } else r.classList.add('hidden');
  });
  if (expand) icon.classList.add('rotate-90');
  else icon.classList.remove('rotate-90');
}

function viewCustomerHistory(loc) {
  document.getElementById('historyFilter').value = loc;
  renderTable();
  switchTab('history');
  setTimeout(function () {
    const firstGroup = document.querySelector('[onclick^="toggleGroup"]');
    if (firstGroup) firstGroup.click();
  }, 100);
}

function updateLocationFilterOptions() {
  const s1 = document.getElementById('dashLocationFilter');
  const s2 = document.getElementById('historyFilter');
  const cur1 = s1.value;
  const cur2 = s2.value;
  const locs = Array.from(new Set(getRecordsForView().map(function (r) { return r.location; }))).sort();

  if (state.role === 'customer' && state.currentCustomer) {
    const loc = (state.currentCustomer.location || '').trim();
    const opt = loc
      ? '<option value="' + loc.replace(/"/g, '&quot;') + '">📍 ' + loc + '</option>'
      : '<option value="">— ยังไม่ผูกสถานที่ —</option>';
    s1.innerHTML = opt;
    s2.innerHTML = opt;
    if (loc) {
      s1.value = loc;
      s2.value = loc;
    }
    return;
  }

  const html = '<option value="ALL">🌍 ทุกสถานที่รวมกันทั้งหมด</option>' + locs.map(function (l) { return '<option value="' + l.replace(/"/g, '&quot;') + '">📍 ' + l + '</option>'; }).join('');
  s1.innerHTML = html;
  s2.innerHTML = html;
  if (locs.indexOf(cur1) >= 0) s1.value = cur1;
  if (locs.indexOf(cur2) >= 0) s2.value = cur2;
}

function updateDashboardCards() {
  const filterLoc = document.getElementById('dashLocationFilter').value;
  let displayRecords = getRecordsForView();

  if (filterLoc !== 'ALL') {
    displayRecords = displayRecords.filter(function (r) { return r.location === filterLoc; });
    document.getElementById('dashChartTitle').innerText = 'ภาพรวมพลังงานและการประหยัด - ' + filterLoc;
  } else {
    document.getElementById('dashChartTitle').innerText = 'ภาพรวมพลังงานและการประหยัด (Solar vs Grid)';
  }

  let totalSaved = 0;
  let totalSolar = 0;
  let totalPeaRevenue = 0;
  displayRecords.forEach(function (r) {
    totalSaved += (r.valZ || 0);
    totalSolar += (r.solar || 0);
    totalPeaRevenue += (r.valX || 0);
  });

  document.getElementById('dashTotalSaved').innerText = formatCurrency(totalSaved);
  document.getElementById('dashTotalPEARevenue').innerText = formatCurrency(totalPeaRevenue);
  document.getElementById('dashTotalSolar').innerHTML = totalSolar.toFixed(0) + ' <span class="text-sm font-normal text-gray-500">kWh</span>';
  document.getElementById('dashTotalRecords').innerHTML = displayRecords.length + ' <span class="text-sm font-normal text-gray-500">รายการ</span>';

  if (state.currentTab === 'dashboard') {
    initDashboardChart(displayRecords, filterLoc);
    updateLeaderboard();
  }
}

function updateLeaderboard() {
  const sec = document.getElementById('leaderboardSection');
  const tbody = document.getElementById('leaderboardBody');
  const filterLoc = document.getElementById('dashLocationFilter').value;

  if (filterLoc !== 'ALL' || state.role === 'customer') {
    sec.classList.add('hidden');
    return;
  }
  sec.classList.remove('hidden');

  const stats = {};
  getRecordsForView().forEach(function (r) {
    if (!stats[r.location]) stats[r.location] = { saved: 0, solar: 0 };
    stats[r.location].saved += (r.valZ || 0);
    stats[r.location].solar += (r.solar || 0);
  });
  const sorted = Object.keys(stats).map(function (l) {
    return { loc: l, saved: stats[l].saved, solar: stats[l].solar };
  }).sort(function (a, b) { return b.saved - a.saved; });

  tbody.innerHTML = sorted.map(function (s, i) {
    let badge = i === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' : (i === 1 ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' : (i === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-400' : 'bg-transparent text-gray-500'));
    let icon = i < 3 ? '<i class="ph-fill ph-medal text-lg"></i>' : (i + 1);
    return '<tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b dark:border-gray-700">' +
      '<td class="px-4 py-3 text-center"><div class="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ' + badge + '">' + icon + '</div></td>' +
      '<td class="px-4 py-3 font-semibold dark:text-white">' + s.loc + '</td>' +
      '<td class="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">' + formatCurrency(s.saved) + '</td>' +
      '<td class="px-4 py-3 text-right text-yellow-600 dark:text-yellow-400">' + s.solar.toLocaleString('th-TH', { maximumFractionDigits: 2 }) + ' kWh</td></tr>';
  }).join('');
}
