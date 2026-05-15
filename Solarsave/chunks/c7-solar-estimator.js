/* SolarSave — ประเมินขนาดโซล่า (จาก legacy/index.html) */
const CONFIG = {
            API_URL: 'https://script.google.com/macros/s/AKfycbxhjoMOkKROo4zsfqU9v1DL5_-cOiV2w-bzawRukMT7aHjMx1YNLQ3--rirkB-ZO1ww/exec',
            COST_PER_UNIT: 4.5,
            DAYS_IN_MONTH: 30,
            SUN_HOURS: 4,
            PRICE_PER_KWP: 30000,
            AREA_PER_KWP: 6,
            CHART_LABEL_MAX: 15,
            PANEL_SHARE: 0.40,
            INVERTER_SHARE: 0.25,
            INSTALL_SHARE: 0.35,
        };

        const TAB_IDS = ['dashboard', 'calculator', 'history'];
        const tabEls = {};
        const navEls = {};
        const ui = {};

        let historySearchQuery = '';
        let historyFilterRaf = 0;
        let billInputRaf = 0;

        function escapeHtml(str) {
            if (str == null) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }

        function swalTheme() {
            const dark = document.documentElement.classList.contains('dark');
            return { background: dark ? '#1f2937' : '#fff', color: dark ? '#fff' : '#374151' };
        }

        const EST_STORAGE_KEY = 'solarsave_estimator_history_v1';
let historyData = [];
function loadEstimatorHistory_() {
  try {
    const raw = localStorage.getItem(EST_STORAGE_KEY);
    historyData = raw ? JSON.parse(raw) : [];
  } catch (e) { historyData = []; }
}
function saveEstimatorHistory_() {
  try { localStorage.setItem(EST_STORAGE_KEY, JSON.stringify(historyData)); } catch (e) {}
}
loadEstimatorHistory_();
let billCount = 1;
        let roofCount = 1;
        let myChartInstance = null;

        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        const openBtn = document.getElementById('openSidebarBtn');
        const closeBtn = document.getElementById('closeSidebarBtn');

        function toggleSidebar() {
            if (!sidebar || !overlay) return;
            const isClosed = sidebar.classList.contains('-translate-x-full');
            if (isClosed) {
                sidebar.classList.remove('-translate-x-full');
                overlay.classList.remove('hidden');
                requestAnimationFrame(() => overlay.classList.add('opacity-100'));
            } else {
                sidebar.classList.add('-translate-x-full');
                overlay.classList.remove('opacity-100');
                setTimeout(() => overlay.classList.add('hidden'), 300);
            }
        }

        if (openBtn) openBtn.addEventListener('click', toggleSidebar);
        if (closeBtn) closeBtn.addEventListener('click', toggleSidebar);
        if (overlay) overlay.addEventListener('click', toggleSidebar);

        window.addEventListener('DOMContentLoaded', async () => {
            ui.historyTableBody = document.getElementById('historyTableBody');
            ui.dashTotalKw = document.getElementById('dash-total-kw');
            ui.dashTotalSave = document.getElementById('dash-total-save');
            ui.dashTotalRecords = document.getElementById('dash-total-records');
            ui.tabDashboard = document.getElementById('tab-dashboard');
            ui.displayAverageBill = document.getElementById('displayAverageBill');
            ui.calcForm = document.getElementById('calcForm');
            ui.savingChart = document.getElementById('savingChart');
            ui.pageTitle = document.getElementById('pageTitle');

            TAB_IDS.forEach((id) => {
                tabEls[id] = document.getElementById('tab-' + id);
                navEls[id] = document.getElementById('nav-' + id);
            });

            loadEstimatorHistory_();
            updateHistoryTable();

            const historySearch = document.getElementById('historySearchInput');
            if (historySearch) {
                historySearch.addEventListener('input', () => {
                    historySearchQuery = historySearch.value.trim().toLowerCase();
                    if (historyFilterRaf) cancelAnimationFrame(historyFilterRaf);
                    historyFilterRaf = requestAnimationFrame(() => {
                        historyFilterRaf = 0;
                        updateHistoryTable();
                    });
                });
            }

            if (ui.calcForm) {
                ui.calcForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    simulateCalculation();
                });
            }

            document.getElementById('notiBtn')?.addEventListener('click', () => {
                Swal.fire({
                    title: 'ไม่มีการแจ้งเตือนใหม่',
                    icon: 'info',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000,
                    ...swalTheme(),
                });
            });

            document.getElementById('themeToggle')?.addEventListener('click', toggleDarkMode);
        });

        function refreshSavingChart() {
            const canvas = ui.savingChart || document.getElementById('savingChart');
            if (!canvas) return;

            if (historyData.length === 0) {
                if (myChartInstance) {
                    myChartInstance.destroy();
                    myChartInstance = null;
                }
                return;
            }

            const chartData = historyData.slice().reverse();
            const maxLen = CONFIG.CHART_LABEL_MAX;
            const labels = chartData.map((item) => {
                const loc = item.location || '';
                return loc.length > maxLen ? loc.slice(0, maxLen) + '…' : loc;
            });
            const data = chartData.map((item) => item.save * 12);

            const isDark = document.documentElement.classList.contains('dark');
            const textColor = isDark ? '#e5e7eb' : '#4b5563';
            const gridColor = isDark ? '#374151' : '#f3f4f6';
            const tickFont = { family: "'Prompt', sans-serif" };

            if (myChartInstance) {
                myChartInstance.data.labels = labels;
                myChartInstance.data.datasets[0].data = data;
                const sc = myChartInstance.options.scales;
                if (sc?.y?.ticks) sc.y.ticks.color = textColor;
                if (sc?.y?.grid) sc.y.grid.color = gridColor;
                if (sc?.x?.ticks) sc.x.ticks.color = textColor;
                if (myChartInstance.options.plugins?.legend?.labels) {
                    myChartInstance.options.plugins.legend.labels.color = textColor;
                }
                const tt = myChartInstance.options.plugins?.tooltip;
                if (tt) {
                    tt.backgroundColor = isDark ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)';
                    tt.titleColor = isDark ? '#fff' : '#1f2937';
                    tt.bodyColor = isDark ? '#d1d5db' : '#4b5563';
                    tt.borderColor = isDark ? '#374151' : '#e5e7eb';
                }
                myChartInstance.update('none');
                return;
            }

            myChartInstance = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'ประหยัดค่าไฟได้ต่อปี (บาท)',
                        data,
                        backgroundColor: 'rgba(168, 85, 247, 0.8)',
                        hoverBackgroundColor: 'rgba(147, 51, 234, 1)',
                        borderRadius: 8,
                        borderSkipped: false,
                        barPercentage: 0.6,
                    }],
                },
                options: {
                    animation: false,
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: gridColor, drawBorder: false },
                            ticks: {
                                color: textColor,
                                callback: (value) => '฿' + Number(value).toLocaleString(),
                                font: tickFont,
                            },
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: textColor, font: tickFont },
                        },
                    },
                    plugins: {
                        legend: {
                            labels: { color: textColor, font: { ...tickFont, size: 14 } },
                        },
                        tooltip: {
                            backgroundColor: isDark ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                            titleColor: isDark ? '#fff' : '#1f2937',
                            bodyColor: isDark ? '#d1d5db' : '#4b5563',
                            borderColor: isDark ? '#374151' : '#e5e7eb',
                            borderWidth: 1,
                            padding: 12,
                            titleFont: { family: "'Prompt', sans-serif", size: 14 },
                            bodyFont: { family: "'Prompt', sans-serif", size: 13 },
                            callbacks: {
                                label: (ctx) => ' ฿' + ctx.parsed.y.toLocaleString() + ' / ปี',
                            },
                        },
                    },
                },
            });
        }

        // Theme Toggle
        function toggleDarkMode() {
            document.documentElement.classList.toggle('dark');
            const dash = ui.tabDashboard || document.getElementById('tab-dashboard');
            if (myChartInstance && dash && dash.classList.contains('block')) {
                refreshSavingChart();
            }
        }

        function switchTab(tabId) {
            TAB_IDS.forEach((id) => {
                const el = tabEls[id];
                if (!el) return;
                el.classList.toggle('hidden', id !== tabId);
                el.classList.toggle('block', id === tabId);
            });
            TAB_IDS.forEach((id) => {
                const btn = navEls[id];
                if (!btn) return;
                const on = id === tabId;
                btn.classList.toggle('bg-brand-50', on);
                btn.classList.toggle('text-brand-700', on);
                btn.classList.toggle('dark:bg-brand-900/30', on);
                btn.classList.toggle('dark:text-brand-300', on);
                btn.classList.toggle('text-gray-600', !on);
                btn.classList.toggle('dark:text-gray-300', !on);
            });

            const titles = { dashboard: 'แดชบอร์ดภาพรวม', calculator: 'เครื่องมือคำนวณ', history: 'ประวัติการประเมิน' };
            if (ui.pageTitle) ui.pageTitle.textContent = titles[tabId] || '';

            if (window.innerWidth < 768) toggleSidebar();

            if (tabId === 'dashboard') {
                requestAnimationFrame(() => refreshSavingChart());
            }
        }

        // Thai Buddhist Date Formatter
        function getThaiDate() {
            const date = new Date();
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear() + 543;
            return `${day}/${month}/${year}`;
        }

        // Dynamic Bills Logic
        function addBill() {
            billCount++;
            const container = document.getElementById('billsContainer');
            const div = document.createElement('div');
            div.className = 'flex items-center gap-3 bill-item mt-3';
            div.innerHTML = `
                <div class="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-sm shrink-0">${billCount}</div>
                <div class="relative flex-1">
                    <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500">฿</span>
                    <input type="number" oninput="calculateAverageBill()" required min="1" placeholder="ค่าไฟเดือนที่ ${billCount}" class="bill-input w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors shadow-sm">
                </div>
                <button type="button" onclick="removeBill(this)" class="w-10 h-10 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors shrink-0">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
            container.appendChild(div);
        }

        function removeBill(btn) {
            btn.parentElement.remove();
            calculateAverageBill();
            // Re-index
            const items = document.querySelectorAll('.bill-item');
            billCount = items.length;
            items.forEach((item, index) => {
                item.querySelector('div:first-child').innerText = index + 1;
                item.querySelector('input').placeholder = `ค่าไฟเดือนที่ ${index + 1}`;
            });
        }

        function calculateAverageBill() {
            const inputs = document.querySelectorAll('.bill-input');
            let sum = 0;
            let validCount = 0;
            inputs.forEach((input) => {
                const val = parseFloat(input.value);
                if (!isNaN(val) && val > 0) {
                    sum += val;
                    validCount++;
                }
            });
            const avg = validCount > 0 ? sum / validCount : 0;
            if (billInputRaf) cancelAnimationFrame(billInputRaf);
            billInputRaf = requestAnimationFrame(() => {
                billInputRaf = 0;
                const el = ui.displayAverageBill || document.getElementById('displayAverageBill');
                if (el) {
                    el.textContent = avg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                }
            });
            return avg;
        }

        // Roof Form Logic
        function toggleRoofInput() {
            const opt = document.querySelector('input[name="roofOption"]:checked').value;
            const container = document.getElementById('roofInputsContainer');
            if (opt === 'yes') {
                container.classList.remove('hidden');
                document.querySelectorAll('.roof-input').forEach(input => input.setAttribute('required', 'true'));
            } else {
                container.classList.add('hidden');
                document.querySelectorAll('.roof-input').forEach(input => input.removeAttribute('required'));
            }
        }

        function addRoof() {
            roofCount++;
            const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const indexLetter = letters[(roofCount - 1) % 26];
            
            const container = document.getElementById('roofList');
            const div = document.createElement('div');
            div.className = 'flex items-center gap-3 roof-item';
            div.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">${indexLetter}</div>
                <div class="relative flex-1">
                    <input type="number" min="1" required placeholder="ขนาดพื้นที่ (ตร.ม.)" class="roof-input w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm">
                </div>
                <button type="button" onclick="removeRoof(this)" class="w-10 h-10 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 transition-colors shrink-0">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
            container.appendChild(div);
        }

        function removeRoof(btn) {
            btn.parentElement.remove();
            const items = document.querySelectorAll('.roof-item');
            roofCount = items.length;
            const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            items.forEach((item, index) => {
                item.querySelector('div:first-child').textContent = letters[index % 26];
            });
        }

        // Simulation Calculation
        function simulateCalculation() {
            try {
                const billAmount = calculateAverageBill();
                if (billAmount <= 0) {
                    Swal.fire('ข้อผิดพลาด', 'กรุณากรอกค่าไฟฟ้าให้ถูกต้อง', 'error');
                    return;
                }

                const locationName = document.getElementById('locationName').value.trim() || 'ไม่ระบุสถานที่';
                const usageType = document.getElementById('usageType').value;
                const { COST_PER_UNIT, DAYS_IN_MONTH, SUN_HOURS, PRICE_PER_KWP, AREA_PER_KWP, PANEL_SHARE, INVERTER_SHARE, INSTALL_SHARE } = CONFIG;

                let dayUsageRatio = 0.5;
                if (usageType === 'office') dayUsageRatio = 0.75;
                else if (usageType === 'night') dayUsageRatio = 0.25;

                const monthlyUnits = billAmount / COST_PER_UNIT;
                const dailyUnits = monthlyUnits / DAYS_IN_MONTH;
                const targetDailySolarUnits = dailyUnits * dayUsageRatio;
                const exactKw = targetDailySolarUnits / SUN_HOURS;

                let recommendKw = 3;
                if (exactKw > 7.5) recommendKw = 10;
                else if (exactKw > 3.5) recommendKw = 5;

                let warningHtml = '';
                let areaInfoHtml = '';
                const roofOption = document.querySelector('input[name="roofOption"]:checked').value;
                const minArea3Kw = 3 * AREA_PER_KWP;

                if (roofOption === 'yes') {
                    const roofInputs = document.querySelectorAll('.roof-input');
                    let totalArea = 0;
                    roofInputs.forEach((input) => {
                        totalArea += parseFloat(input.value) || 0;
                    });

                    const requiredArea = recommendKw * AREA_PER_KWP;

                    if (totalArea < minArea3Kw) {
                        Swal.fire({
                            title: 'พื้นที่หลังคาน้อยเกินไป',
                            text: `คุณมีพื้นที่รวม ${totalArea} ตร.ม. แต่ระบบขนาดเริ่มต้น (3 kWp) ต้องการพื้นที่อย่างน้อย ${minArea3Kw} ตร.ม.`,
                            icon: 'error',
                            ...swalTheme(),
                        });
                        return;
                    }

                    if (totalArea < requiredArea) {
                        const originalKw = recommendKw;
                        if (totalArea >= 5 * AREA_PER_KWP) recommendKw = 5;
                        else if (totalArea >= minArea3Kw) recommendKw = 3;

                        warningHtml = `<div class="mt-4 bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 text-sm text-left">
                            <p class="text-yellow-800 dark:text-yellow-300 font-semibold"><i class="fa-solid fa-triangle-exclamation"></i> ปรับลดขนาดเนื่องจากพื้นที่จำกัด</p>
                            <p class="text-yellow-700 dark:text-yellow-400 mt-1">จากค่าไฟควรติด ${originalKw} kWp แต่พื้นที่คุณมี ${totalArea} ตร.ม. (ต้องการ ${originalKw * AREA_PER_KWP} ตร.ม.) ระบบจึงแนะนำให้ติดตั้งสูงสุดที่ <b>${recommendKw} kWp</b></p>
                        </div>`;
                    } else {
                        areaInfoHtml = `<div class="mt-4 text-sm text-green-600 dark:text-green-400 font-medium"><i class="fa-solid fa-circle-check"></i> พื้นที่ ${totalArea} ตร.ม. เพียงพอสำหรับการติดตั้ง ${recommendKw} kWp</div>`;
                    }
                } else {
                    areaInfoHtml = `<div class="mt-4 bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800 text-sm text-left">
                        <p class="text-blue-800 dark:text-blue-300 font-semibold"><i class="fa-solid fa-info-circle"></i> การเตรียมพื้นที่</p>
                        <p class="text-blue-700 dark:text-blue-400 mt-1">ขนาด ${recommendKw} kWp ต้องการพื้นที่ว่างบนหลังคาประมาณ <b>${recommendKw * AREA_PER_KWP} ตร.ม.</b></p>
                    </div>`;
                }

                let savedMonthly = recommendKw * SUN_HOURS * DAYS_IN_MONTH * COST_PER_UNIT;
                savedMonthly = Math.min(savedMonthly, billAmount);
                savedMonthly = Math.round(savedMonthly);

                const totalCost = recommendKw * PRICE_PER_KWP;
                const panelCost = totalCost * PANEL_SHARE;
                const inverterCost = totalCost * INVERTER_SHARE;
                const installCost = totalCost * INSTALL_SHARE;

                const paybackYears = totalCost / (savedMonthly * 12);

                const newRecord = {
                    date: getThaiDate(),
                    location: locationName,
                    bill: billAmount,
                    size: recommendKw,
                    save: savedMonthly,
                    payback: paybackYears,
                    totalCost,
                    panelCost,
                    inverterCost,
                    installCost,
                    warningHtml,
                    areaInfoHtml,
                };

                historyData.unshift(newRecord);
                saveEstimatorHistory_();
                updateHistoryTable();

                saveEstimatorHistory_();

                const locHtml = escapeHtml(locationName);

                Swal.fire({
                    title: 'ประเมินความคุ้มค่าสำเร็จ!',
                    html: `
                        <div class="mt-2 text-left">
                            <p class="text-brand-700 dark:text-brand-300 font-semibold mb-3 border-b border-gray-200 dark:border-gray-700 pb-2"><i class="fa-solid fa-location-dot mr-1"></i> ${locHtml}</p>
                            <p class="text-gray-600 dark:text-gray-300 text-sm mb-1">จากค่าไฟเฉลี่ย: <strong class="text-lg text-gray-800 dark:text-white">฿${billAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong> / เดือน</p>
                            <p class="text-gray-600 dark:text-gray-300 text-sm mb-4">ขนาดติดตั้งที่เหมาะสม: <strong class="text-2xl text-brand-500">${recommendKw} kWp</strong></p>
                            <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800 shadow-inner flex flex-col justify-center items-center">
                                <p class="text-green-700 dark:text-green-400 text-sm font-medium mb-1">คาดว่าจะประหยัดเงินได้</p>
                                <h3 class="text-3xl font-bold text-green-500">฿${savedMonthly.toLocaleString()}</h3>
                                <p class="text-green-600 dark:text-green-500 text-xs mt-1">ต่อเดือน</p>
                            </div>
                            <div class="mt-4 flex gap-3 text-sm">
                                <div class="flex-1 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
                                    <p class="text-gray-500 dark:text-gray-400 mb-1">งบประมาณเริ่มต้น</p>
                                    <p class="font-bold text-gray-800 dark:text-white">฿${totalCost.toLocaleString()}</p>
                                </div>
                                <div class="flex-1 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50 text-center">
                                    <p class="text-blue-600 dark:text-blue-400 mb-1">ระยะเวลาคืนทุน</p>
                                    <p class="font-bold text-blue-500">${paybackYears.toFixed(2)} ปี</p>
                                </div>
                            </div>
                            ${warningHtml}
                            ${areaInfoHtml}
                        </div>
                    `,
                    icon: 'success',
                    confirmButtonText: 'ไปที่หน้าประวัติเพื่อดูรายละเอียด',
                    confirmButtonColor: '#a855f7',
                    showCancelButton: true,
                    cancelButtonText: 'ปิด',
                    ...swalTheme(),
                    customClass: {
                        popup: 'rounded-3xl',
                        title: 'text-2xl font-bold text-gray-800 dark:text-white',
                    },
                }).then((result) => {
                    if (result.isConfirmed) switchTab('history');
                    const form = ui.calcForm || document.getElementById('calcForm');
                    if (form) form.reset();
                    const disp = ui.displayAverageBill || document.getElementById('displayAverageBill');
                    if (disp) disp.textContent = '0.00';
                    const billItems = document.querySelectorAll('.bill-item');
                    for (let i = 1; i < billItems.length; i++) billItems[i].remove();
                    billCount = 1;
                    toggleRoofInput();
                });
            } catch (error) {
                console.error('Calculation Error:', error);
                Swal.fire('ข้อผิดพลาด', 'เกิดปัญหาในการประมวลผล กรุณาลองใหม่อีกครั้ง', 'error');
            }
        }

        function updateHistoryTable() {
            const tbody = ui.historyTableBody || document.getElementById('historyTableBody');
            if (!tbody) return;

            let totalKw = 0;
            let totalSave = 0;
            historyData.forEach((item) => {
                totalKw += item.size;
                totalSave += item.save * 12;
            });

            const q = historySearchQuery;
            const rows = historyData
                .map((item, index) => ({ item, index }))
                .filter(({ item }) => !q || String(item.location || '').toLowerCase().includes(q));

            let html = '';
            if (historyData.length === 0) {
                html = '<tr><td colspan="6" class="text-center py-8 text-gray-400">ยังไม่มีประวัติการคำนวณ</td></tr>';
            } else if (rows.length === 0) {
                html = '<tr><td colspan="6" class="text-center py-8 text-gray-400">ไม่พบรายการที่ตรงกับการค้นหา</td></tr>';
            } else {
                for (const { item, index } of rows) {
                    const loc = escapeHtml(item.location || '');
                    const dt = escapeHtml(item.date || '');
                    html += `
                        <tr class="hover:bg-brand-50/50 dark:hover:bg-gray-700/50 transition-colors group">
                            <td class="py-3 px-4">${dt}</td>
                            <td class="py-3 px-4 font-medium">${loc}</td>
                            <td class="py-3 px-4 text-gray-500">฿${item.bill.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                            <td class="py-3 px-4"><span class="bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300 py-1 px-3 rounded-full text-xs font-bold">${item.size} kWp</span></td>
                            <td class="py-3 px-4 text-green-500 font-medium">฿${item.save.toLocaleString()}</td>
                            <td class="py-3 px-4 text-center">
                                <button type="button" onclick="viewHistoryDetail(${index})" class="text-brand-500 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 mr-3 transition-colors" title="ดูรายละเอียด"><i class="fa-solid fa-eye"></i></button>
                                <button type="button" onclick="deleteHistory(${index})" class="text-gray-400 hover:text-red-500 transition-colors" title="ลบ"><i class="fa-solid fa-trash"></i></button>
                            </td>
                        </tr>`;
                }
            }
            tbody.innerHTML = html;

            if (ui.dashTotalKw) ui.dashTotalKw.textContent = String(totalKw);
            if (ui.dashTotalSave) ui.dashTotalSave.textContent = totalSave.toLocaleString();
            if (ui.dashTotalRecords) ui.dashTotalRecords.textContent = String(historyData.length);

            const dash = ui.tabDashboard || document.getElementById('tab-dashboard');
            if (dash && dash.classList.contains('block')) {
                refreshSavingChart();
            }
        }

        function deleteHistory(index) {
            Swal.fire({
                title: 'ยืนยันการลบ?',
                text: 'ลบประวัตินี้แล้วจะไม่สามารถกู้คืนได้',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'ใช่, ลบเลย!',
                cancelButtonText: 'ยกเลิก',
                ...swalTheme(),
            }).then((result) => {
                if (result.isConfirmed) {
                    historyData.splice(index, 1);
                    saveEstimatorHistory_();
                    updateHistoryTable();
                    Swal.fire({
                        title: 'ลบเรียบร้อย!',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false,
                        ...swalTheme(),
                    });
                }
            });
        }

        // View Detail & Edit Budget Modal
        function viewHistoryDetail(index) {
            const item = historyData[index];
            if (!item) return;
            const resultHtml = `<div class="text-left mt-4 space-y-2">
                <div class="flex justify-between items-end border-b border-gray-200 dark:border-gray-700 pb-2 mb-3">
                    <p class="text-brand-700 dark:text-brand-300 font-semibold"><i class="fa-solid fa-location-dot mr-1"></i> ${escapeHtml(item.location || '')}</p>
                    <button onclick="resetDefaultCost(${index})" class="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 px-2 py-1 rounded transition-colors"><i class="fa-solid fa-rotate-left"></i> คืนค่าเริ่มต้น</button>
                </div>
                <div class="grid grid-cols-2 gap-2 text-sm">
                    <div>
                        <p class="text-gray-500 dark:text-gray-400">จากค่าไฟเฉลี่ย</p>
                        <p class="font-semibold text-lg">฿${item.bill.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                    </div>
                    <div>
                        <p class="text-gray-500 dark:text-gray-400">ขนาดระบบที่เหมาะสม</p>
                        <p class="font-semibold text-brand-600 dark:text-brand-400 text-lg">${item.size} kWp</p>
                    </div>
                </div>
                
                <div class="mt-4 bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-800 flex justify-between items-center">
                    <p class="text-green-700 dark:text-green-400 text-sm font-medium">ประหยัดเงินได้ประมาณ</p>
                    <p class="text-green-500 text-xl font-bold">฿${item.save.toLocaleString()} <span class="text-sm font-normal text-green-600 dark:text-green-500">/ เดือน</span></p>
                </div>
                
                <div class="mt-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800 flex justify-between items-center transition-colors duration-300" id="payback-container-${index}">
                    <p class="text-blue-700 dark:text-blue-400 text-sm font-medium">ระยะเวลาคืนทุน <span class="text-xs font-normal text-blue-500">(อัปเดตตามงบ)</span></p>
                    <p class="text-blue-500 text-xl font-bold transition-all" id="detail-payback-${index}">${(item.payback || 0).toFixed(2)} ปี</p>
                </div>
                
                <div class="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner">
                    <div class="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3 mb-3">
                        <p class="font-bold text-gray-800 dark:text-gray-100 flex items-center">
                            <i class="fa-solid fa-wallet text-brand-500 mr-2"></i> งบประมาณรวม
                        </p>
                        <p class="font-bold text-brand-600 dark:text-brand-400 text-xl transition-all" id="detail-total-${index}">฿${item.totalCost.toLocaleString()}</p>
                    </div>
                    <div class="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                        <p class="text-xs text-brand-600 dark:text-brand-300 mb-2 bg-brand-50 dark:bg-brand-900/30 p-2 rounded-lg border border-brand-100 dark:border-brand-800">
                            <i class="fa-solid fa-pen-to-square"></i> คุณสามารถแก้ไขราคาเพื่อเปรียบเทียบจุดคุ้มทุนใหม่ได้ทันที
                        </p>
                        
                        <div class="flex justify-between items-center">
                            <span class="flex items-center"><i class="fa-solid fa-solar-panel text-blue-500 w-5"></i> ค่าแผงโซล่าเซลล์</span> 
                            <div class="relative">
                                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">฿</span>
                                <input type="number" id="edit-panel-${index}" value="${item.panelCost}" class="w-32 pl-7 pr-3 py-1.5 text-right font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white shadow-sm hover:border-brand-300" oninput="recalculatePayback(${index})">
                            </div>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="flex items-center"><i class="fa-solid fa-car-battery text-yellow-500 w-5"></i> ค่าอินเวอร์เตอร์</span> 
                            <div class="relative">
                                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">฿</span>
                                <input type="number" id="edit-inverter-${index}" value="${item.inverterCost}" class="w-32 pl-7 pr-3 py-1.5 text-right font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white shadow-sm hover:border-brand-300" oninput="recalculatePayback(${index})">
                            </div>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="flex items-center"><i class="fa-solid fa-tools text-gray-400 w-5"></i> อุปกรณ์/ค่าติดตั้ง</span> 
                            <div class="relative">
                                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">฿</span>
                                <input type="number" id="edit-install-${index}" value="${item.installCost}" class="w-32 pl-7 pr-3 py-1.5 text-right font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none transition-all dark:text-white shadow-sm hover:border-brand-300" oninput="recalculatePayback(${index})">
                            </div>
                        </div>
                    </div>
                </div>

                ${item.warningHtml || ''}
                ${item.areaInfoHtml || ''}
               </div>`;

            Swal.fire({
                title: 'เปรียบเทียบงบประมาณ',
                html: resultHtml,
                showConfirmButton: true,
                confirmButtonText: 'บันทึกและปิด',
                confirmButtonColor: '#a855f7',
                ...swalTheme(),
                customClass: {
                    popup: 'rounded-3xl',
                    title: 'text-xl font-bold text-brand-700 dark:text-brand-400',
                    htmlContainer: 'text-left'
                }
            });
        }

        function recalculatePayback(index) {
            const item = historyData[index];
            const panelInput = document.getElementById(`edit-panel-${index}`);
            const inverterInput = document.getElementById(`edit-inverter-${index}`);
            const installInput = document.getElementById(`edit-install-${index}`);

            if(!panelInput || !inverterInput || !installInput) return;

            const panel = parseFloat(panelInput.value) || 0;
            const inverter = parseFloat(inverterInput.value) || 0;
            const install = parseFloat(installInput.value) || 0;

            const newTotal = panel + inverter + install;
            
            document.getElementById(`detail-total-${index}`).innerText = `฿${newTotal.toLocaleString()}`;
            
            let newPaybackDisplay = "ไม่สามารถคำนวณได้";
            if (item.save > 0) {
                const newPayback = newTotal / (item.save * 12);
                newPaybackDisplay = `${newPayback.toFixed(2)} ปี`;
                item.payback = newPayback;
            }
            
            document.getElementById(`detail-payback-${index}`).innerText = newPaybackDisplay;
            
            const container = document.getElementById(`payback-container-${index}`);
            if (container) {
                container.classList.add('bg-brand-100', 'dark:bg-brand-900/40');
                container.classList.remove('bg-blue-50', 'dark:bg-blue-900/20');
                setTimeout(() => {
                    container.classList.remove('bg-brand-100', 'dark:bg-brand-900/40');
                    container.classList.add('bg-blue-50', 'dark:bg-blue-900/20');
                }, 400);
            }

            item.panelCost = panel;
            item.inverterCost = inverter;
            item.installCost = install;
            item.totalCost = newTotal;
        }

        function resetDefaultCost(index) {
            const item = historyData[index];
            if (!item) return;

            const { PRICE_PER_KWP, PANEL_SHARE, INVERTER_SHARE, INSTALL_SHARE } = CONFIG;
            const defaultTotal = item.size * PRICE_PER_KWP;
            const defaultPanel = defaultTotal * PANEL_SHARE;
            const defaultInverter = defaultTotal * INVERTER_SHARE;
            const defaultInstall = defaultTotal * INSTALL_SHARE;
            const panelInput = document.getElementById(`edit-panel-${index}`);
            const inverterInput = document.getElementById(`edit-inverter-${index}`);
            const installInput = document.getElementById(`edit-install-${index}`);

            // ถ้าเจอช่อง Input ให้เปลี่ยนค่ากลับเป็นค่ามาตรฐาน
            if (panelInput && inverterInput && installInput) {
                panelInput.value = defaultPanel;
                inverterInput.value = defaultInverter;
                installInput.value = defaultInstall;

                // เรียกใช้ฟังก์ชันคำนวณใหม่เพื่ออัปเดตตัวเลขหน้าจอและบันทึกค่ากลับ
                recalculatePayback(index);
                
                // แจ้งเตือนว่าคืนค่าแล้ว
                Swal.fire({
                    title: 'คืนค่าเริ่มต้นแล้ว',
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    showConfirmButton: false,
                    timer: 1500,
                    ...swalTheme(),
                });
            }
        }
    