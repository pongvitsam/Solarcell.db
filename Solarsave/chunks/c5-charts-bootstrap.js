function initDashboardChart(recordsToDisplay, filterLoc) {
  if (recordsToDisplay === undefined) recordsToDisplay = state.records;
  if (filterLoc === undefined) filterLoc = (document.getElementById('dashLocationFilter') && document.getElementById('dashLocationFilter').value) || 'ALL';
  const canvas = document.getElementById('savingsChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (myChart) myChart.destroy();
  if (!recordsToDisplay || recordsToDisplay.length === 0) return;

  const sortedRecords = recordsToDisplay.slice().sort(function (a, b) { return a.month.localeCompare(b.month); });
  let labels = [];
  let dataSolar = [];
  let dataGrid = [];
  let dataSaved = [];

  if (filterLoc === 'ALL') {
    const monthlyData = {};
    sortedRecords.forEach(function (r) {
      if (!monthlyData[r.month]) monthlyData[r.month] = { solar: 0, grid: 0, saved: 0 };
      monthlyData[r.month].solar += (r.solar || 0);
      monthlyData[r.month].grid += (r.grid || 0);
      monthlyData[r.month].saved += (r.valZ || 0);
    });
    const sortedMonths = Object.keys(monthlyData).sort();
    labels = sortedMonths.map(function (m) { return formatMonthThai(m); });
    dataSolar = sortedMonths.map(function (m) { return monthlyData[m].solar; });
    dataGrid = sortedMonths.map(function (m) { return monthlyData[m].grid; });
    dataSaved = sortedMonths.map(function (m) { return monthlyData[m].saved; });
  } else {
    labels = sortedRecords.map(function (r) { return formatMonthThai(r.month); });
    dataSolar = sortedRecords.map(function (r) { return r.solar || 0; });
    dataGrid = sortedRecords.map(function (r) { return r.grid || 0; });
    dataSaved = sortedRecords.map(function (r) { return r.valZ || 0; });
  }

  const textColor = state.theme === 'dark' ? '#e2e8f0' : '#475569';
  const gridColor = state.theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  myChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { type: 'line', label: 'ยอดประหยัดรวม (บาท)', data: dataSaved, borderColor: 'rgba(34, 197, 94, 1)', backgroundColor: 'rgba(34, 197, 94, 0.2)', borderWidth: 2, yAxisID: 'y1', tension: 0.3, pointBackgroundColor: 'rgba(34, 197, 94, 1)' },
        { type: 'bar', label: 'Solar (kWh)', data: dataSolar, backgroundColor: 'rgba(234, 179, 8, 0.8)', borderRadius: 4, yAxisID: 'y', stack: 'Stack 0' },
        { type: 'bar', label: 'Grid (kWh)', data: dataGrid, backgroundColor: 'rgba(59, 130, 246, 0.8)', borderRadius: 4, yAxisID: 'y', stack: 'Stack 0' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { stacked: true, ticks: { color: textColor, font: { family: 'Prompt' } }, grid: { display: false } },
        y: { type: 'linear', display: true, position: 'left', stacked: true, ticks: { color: textColor, font: { family: 'Prompt' } }, grid: { color: gridColor }, title: { display: true, text: 'หน่วยไฟฟ้า (kWh)', color: textColor, font: { family: 'Prompt' } } },
        y1: { type: 'linear', display: true, position: 'right', ticks: { color: 'rgba(34, 197, 94, 1)', font: { family: 'Prompt' } }, grid: { drawOnChartArea: false }, title: { display: true, text: 'จำนวนเงิน (บาท)', color: 'rgba(34, 197, 94, 1)', font: { family: 'Prompt' } } }
      },
      plugins: {
        legend: { labels: { color: textColor, font: { family: 'Prompt' } } },
        tooltip: {
          titleFont: { family: 'Prompt' },
          bodyFont: { family: 'Prompt' },
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== null) {
                if (context.datasetIndex === 0) {
                  label += new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(context.parsed.y);
                } else {
                  label += context.parsed.y.toLocaleString('th-TH', { maximumFractionDigits: 2 }) + ' kWh';
                }
              }
              return label;
            }
          }
        }
      }
    }
  });
}

function openLocationSummary(loc) {
  currentModalLoc = loc;
  document.getElementById('modalSubtitle').innerText = loc;

  const recs = state.records.filter(function (r) { return r.location === loc; }).sort(function (a, b) { return b.month.localeCompare(a.month); });
  let mHtml = '<option value="ALL">รวมทุกเดือน (สะสม)</option>';
  recs.forEach(function (r) { mHtml += '<option value="' + r.month + '">' + formatMonthThai(r.month) + '</option>'; });
  document.getElementById('modMonthFilter').innerHTML = mHtml;
  document.getElementById('modMonthFilter').value = 'ALL';

  document.getElementById('summaryModal').classList.remove('hidden');
  document.getElementById('summaryModal').classList.add('flex');
  setTimeout(function () {
    document.getElementById('summaryModal').classList.remove('opacity-0');
    document.getElementById('summaryModalContent').classList.remove('scale-95');
  }, 10);

  filterModalSummary();
}

function closeSummaryModal() {
  document.getElementById('summaryModal').classList.add('opacity-0');
  document.getElementById('summaryModalContent').classList.add('scale-95');
  setTimeout(function () {
    document.getElementById('summaryModal').classList.add('hidden');
    document.getElementById('summaryModal').classList.remove('flex');
  }, 300);
}

function filterModalSummary() {
  const loc = currentModalLoc;
  const filterMonth = document.getElementById('modMonthFilter').value;
  let recs = state.records.filter(function (r) { return r.location === loc; });
  if (filterMonth !== 'ALL') recs = recs.filter(function (r) { return r.month === filterMonth; });
  recs.sort(function (a, b) { return a.month.localeCompare(b.month); });

  let sumA = 0, sumB = 0, sumC = 0, sumY = 0, sumX = 0, sumZ = 0, sumGridUnits = 0, sumSolarUnits = 0;
  recs.forEach(function (r) {
    sumA += (r.valA || 0);
    sumB += (r.valB || 0);
    sumC += (r.valC || 0);
    sumY += (r.valY || 0);
    sumX += (r.valX || 0);
    sumZ += (r.valZ || 0);
    sumGridUnits += (r.grid || 0);
    sumSolarUnits += (r.solar || 0);
  });

  document.getElementById('modCustTotalSaved').innerText = formatCurrency(sumZ);
  document.getElementById('modCustTotalSolarUnits').innerText = sumSolarUnits.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kWh';
  document.getElementById('modCustTotalPaid').innerText = formatCurrency(sumX);

  document.getElementById('modCardA').innerText = formatCurrency(sumA);
  document.getElementById('modCardB').innerText = formatCurrency(sumB);
  document.getElementById('modCardC').innerText = formatCurrency(sumC);
  document.getElementById('modCardY').innerText = formatCurrency(sumY);
  document.getElementById('modCardX').innerText = formatCurrency(sumX);
  document.getElementById('modCardZ').innerText = formatCurrency(sumZ);

  if (recs.length > 0) document.getElementById('modCardC_Disc').innerText = recs[recs.length - 1].discount;

  document.getElementById('modCustMonthCount').innerText = filterMonth === 'ALL' ? (recs.length + ' เดือน') : '1 เดือน';
  document.getElementById('modCustTotalGridUnits').innerText = sumGridUnits.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kWh';
  document.getElementById('modCustTotalSolarUnitsList').innerText = sumSolarUnits.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kWh';
  if (recs.length > 0) document.getElementById('modCustDiscount').innerText = recs[recs.length - 1].discount + '%';

  renderModalChart(recs);

  const explanationEl = document.getElementById('modCalcExplanation');
  if (explanationEl) {
    if (recs.length > 0) explanationEl.innerHTML = recs[recs.length - 1].calcStepsHTML;
    else explanationEl.innerHTML = 'ไม่มีข้อมูลการคำนวณ';
  }
}

function renderModalChart(locRecords) {
  const ctx = document.getElementById('modalChart').getContext('2d');
  if (modalChartInstance) modalChartInstance.destroy();

  const textColor = state.theme === 'dark' && !document.body.classList.contains('printing-modal') ? '#e2e8f0' : '#475569';
  const gridColor = state.theme === 'dark' && !document.body.classList.contains('printing-modal') ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  const labels = locRecords.map(function (r) { return formatMonthThai(r.month); });
  const dataBillBefore = locRecords.map(function (r) { return r.valY || 0; });
  const dataGridBill = locRecords.map(function (r) { return r.valA || 0; });
  const dataSolarBill = locRecords.map(function (r) { return r.valC || 0; });

  modalChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'ค่าไฟกรณีไม่มีโซล่า (บาท)', data: dataBillBefore, type: 'line', borderColor: 'rgba(239, 68, 68, 1)', backgroundColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 2, pointBackgroundColor: 'rgba(239, 68, 68, 1)', fill: false, tension: 0.3 },
        { label: 'ไฟการไฟฟ้า (Grid)', data: dataGridBill, backgroundColor: 'rgba(59, 130, 246, 0.8)', borderRadius: 4, stack: 'Stack 0' },
        { label: 'ไฟโซล่า (Solar)', data: dataSolarBill, backgroundColor: 'rgba(168, 85, 247, 0.8)', borderRadius: 4, stack: 'Stack 0' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { stacked: true, ticks: { color: textColor, font: { family: 'Prompt' } }, grid: { display: false } },
        y: { stacked: true, ticks: { color: textColor, font: { family: 'Prompt' } }, grid: { color: gridColor } }
      },
      plugins: {
        legend: { display: true, position: 'bottom', labels: { color: textColor, font: { family: 'Prompt' } } },
        tooltip: {
          titleFont: { family: 'Prompt' },
          bodyFont: { family: 'Prompt' },
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(context.parsed.y);
              }
              return label;
            },
            footer: function (tooltipItems) {
              let before = 0;
              let after = 0;
              tooltipItems.forEach(function (ti) {
                if (ti.datasetIndex === 0) before = ti.parsed.y;
                if (ti.datasetIndex === 1 || ti.datasetIndex === 2) after += ti.parsed.y;
              });
              const saved = before - after;
              return '\n💰 เดือนนี้ประหยัดได้: ' + new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(saved);
            }
          }
        }
      }
    }
  });
}

function printCustomerReport() {
  document.body.classList.add('printing-modal');
  window.print();
  setTimeout(function () { document.body.classList.remove('printing-modal'); }, 500);
}

function exportToCSV() {
  if (state.records.length === 0) {
    alert('ไม่มีข้อมูลสำหรับ Export');
    return;
  }
  let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
  csvContent += 'รอบบิล,สถานที่,ระบบไฟฟ้า,ส่วนลดโซล่า(%),การไฟฟ้า(kWh),โซล่าเซลล์(kWh),รวมลูกค้าชำระ(บาท),ประหยัดได้(บาท)\n';

  state.records.forEach(function (r) {
    const row = r.month + ',' + r.location + ',' + r.phase + ',' + r.discount + ',' + (r.grid || 0).toFixed(2) + ',' + (r.solar || 0).toFixed(2) + ',' + (r.valX || 0).toFixed(2) + ',' + (r.valZ || 0).toFixed(2);
    csvContent += row + '\n';
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'solarsave_report.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

document.addEventListener('DOMContentLoaded', async function () {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) toggleTheme(true);

  await loadBackendData();
  recalculateMockData();

  fpMonth = flatpickr('#billMonth', {
    locale: 'th',
    plugins: [new monthSelectPlugin({ shorthand: true, dateFormat: 'Y-m', altFormat: 'F Y' })],
    altInput: true,
    altInputClass: 'glass-input w-full pl-10 pr-4 py-2.5 rounded-xl cursor-pointer text-gray-800 dark:text-gray-200 transition-all font-medium',
    defaultDate: new Date()
  });
  updateLocationFilterOptions();
  renderTable();
  updateDashboardCards();
  loadSettingsToForm();
  resetForm();
  renderStaffTable();
  renderCustomerTab();
});
