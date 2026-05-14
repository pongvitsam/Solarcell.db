/* --- LOGIN & ROLE UI SWITCHER --- */
function switchLoginState(targetState) {
  const sel = document.getElementById('roleSelectState');
  const cust = document.getElementById('customerLoginState');
  const staff = document.getElementById('staffLoginState');
  [sel, cust, staff].forEach(function (el) {
    el.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
    el.classList.remove('opacity-100', 'scale-100');
  });
  setTimeout(function () {
    const t = targetState === 'customer' ? cust : (targetState === 'staff' ? staff : sel);
    t.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
    t.classList.add('opacity-100', 'scale-100');
  }, 300);
}

function handleCustomerMockLogin(e) {
  e.preventDefault();
  state.isLoggedIn = true;
  state.user = 'คุณลูกค้า (Mockup)';
  state.role = 'customer';
  setupUIByRole();
  showToast('เข้าสู่ระบบสำเร็จ (ฐานะลูกค้า)');
}

function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('username').value;
  const p = document.getElementById('password').value;
  const foundUser = state.staffAccounts.find(function (acc) { return acc.username === u && acc.password === p; });

  if (foundUser) {
    state.isLoggedIn = true;
    state.user = foundUser.username;
    state.role = foundUser.role;
    setupUIByRole();
    showToast('เข้าสู่ระบบสำเร็จ (' + foundUser.role.toUpperCase() + ')');
  } else {
    alert('Username หรือ Password ไม่ถูกต้อง!');
  }
}

function setupUIByRole() {
  document.getElementById('displayUsername').innerText = state.user;
  document.getElementById('displayUserInitials').innerText = state.user.charAt(0).toUpperCase();
  document.getElementById('displayUserRole').innerText = state.role === 'admin' ? 'Administrator' : (state.role === 'staff' ? 'เจ้าหน้าที่การไฟฟ้า' : 'ผู้ใช้ไฟฟ้า');

  document.getElementById('nav-calculator').style.display = state.role === 'customer' ? 'none' : 'flex';
  document.getElementById('nav-customers').style.display = state.role === 'customer' ? 'none' : 'flex';
  document.getElementById('nav-settings').style.display = state.role === 'admin' ? 'flex' : 'none';

  document.getElementById('loginView').style.display = 'none';
  document.getElementById('appView').classList.remove('hidden');
  switchTab('dashboard');
}

function handleLogout() {
  state.isLoggedIn = false;
  document.getElementById('appView').classList.add('hidden');
  switchLoginState('select');
  document.getElementById('loginView').style.display = 'flex';
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('-translate-x-full');
}

function switchTab(tabId) {
  state.currentTab = tabId;
  document.querySelectorAll('.tab-content').forEach(function (el) { el.classList.add('hidden'); });
  document.getElementById('tab-' + tabId).classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach(function (btn) {
    btn.classList.remove('bg-primary-500/20', 'text-primary-700', 'dark:text-primary-300');
    btn.classList.add('text-gray-600', 'dark:text-gray-300');
  });
  const activeBtn = document.getElementById('nav-' + tabId);
  if (activeBtn) {
    activeBtn.classList.remove('text-gray-600', 'dark:text-gray-300');
    activeBtn.classList.add('bg-primary-500/20', 'text-primary-700', 'dark:text-primary-300');
  }

  const titles = { dashboard: 'แดชบอร์ดสรุปผล', calculator: 'คำนวณ & บันทึกค่าไฟ', history: 'ประวัติข้อมูลรวม', customers: 'ข้อมูลผู้ใช้ไฟ', settings: 'ตั้งค่าส่วนกลางระบบ' };
  document.getElementById('pageTitle').innerText = titles[tabId];
  if (tabId === 'dashboard') initDashboardChart();
  if (window.innerWidth < 768) toggleSidebar();
}

function toggleTheme(forceDark) {
  const html = document.documentElement;
  const icon = document.getElementById('themeIcon');
  if (forceDark === true || html.classList.contains('light')) {
    html.classList.remove('light');
    html.classList.add('dark');
    icon.classList.replace('ph-moon', 'ph-sun');
    icon.classList.replace('text-gray-700', 'text-yellow-400');
    state.theme = 'dark';
  } else {
    html.classList.remove('dark');
    html.classList.add('light');
    icon.classList.replace('ph-sun', 'ph-moon');
    icon.classList.replace('text-yellow-400', 'text-gray-700');
    state.theme = 'light';
  }
  const darkThemeLink = document.getElementById('flatpickr-dark-theme');
  if (darkThemeLink) darkThemeLink.disabled = state.theme !== 'dark';
  if (myChart) initDashboardChart();
  if (modalChartInstance) modalChartInstance.update();
}

function formatMonthThai(yyyy_mm) {
  if (!yyyy_mm) return '';
  const parts = yyyy_mm.split('-');
  const year = parts[0];
  const month = parts[1];
  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return thaiMonths[parseInt(month, 10) - 1] + ' ' + (parseInt(year, 10) + 543);
}

function formatCurrency(num) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(num);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').innerText = message;
  toast.classList.remove('translate-y-20', 'opacity-0');
  setTimeout(function () { toast.classList.add('translate-y-20', 'opacity-0'); }, 3000);
}

function loadSettingsToForm() {
  document.getElementById('setRateNormal').value = state.settings.rateNormal;
  document.getElementById('setFtRate').value = state.settings.ft;
  document.getElementById('setServiceFee').value = state.settings.serviceFee;
  document.getElementById('setRatePeak').value = state.settings.ratePeak;
  document.getElementById('setRateOffPeak').value = state.settings.rateOffPeak;
  document.getElementById('setRateHoliday').value = state.settings.rateHoliday;
}

async function handleSaveSettings(e) {
  e.preventDefault();
  state.settings.rateNormal = parseFloat(document.getElementById('setRateNormal').value);
  state.settings.ft = parseFloat(document.getElementById('setFtRate').value);
  state.settings.serviceFee = parseFloat(document.getElementById('setServiceFee').value);
  state.settings.ratePeak = parseFloat(document.getElementById('setRatePeak').value);
  state.settings.rateOffPeak = parseFloat(document.getElementById('setRateOffPeak').value);
  state.settings.rateHoliday = parseFloat(document.getElementById('setRateHoliday').value);
  await backendSaveSettings();
  resetForm();
  showToast('บันทึกเรทค่าไฟส่วนกลางสำเร็จ');
}

function renderStaffTable() {
  const tb = document.getElementById('staffTableBody');
  tb.innerHTML = '';
  state.staffAccounts.forEach(function (acc) {
    const badge = acc.role === 'admin'
      ? '<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">Admin</span>'
      : '<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">Staff</span>';
    tb.innerHTML += '<tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">' +
      '<td class="px-4 py-2 dark:text-white">' + acc.username + '</td><td class="px-4 py-2 text-gray-400">••••••••</td><td class="px-4 py-2 text-center">' + badge + '</td>' +
      '<td class="px-4 py-2 text-center space-x-2"><button onclick="editStaff(\'' + acc.id + '\')" class="text-blue-500 hover:underline">แก้ไข</button><button onclick="deleteStaff(\'' + acc.id + '\')" class="text-red-500 hover:underline">ลบ</button></td></tr>';
  });
}

function resetStaffForm() {
  document.getElementById('staffAccountForm').reset();
  document.getElementById('staffEditId').value = '';
  document.getElementById('staffUsername').focus();
}

async function handleSaveStaff(e) {
  e.preventDefault();
  const id = document.getElementById('staffEditId').value;
  const u = document.getElementById('staffUsername').value;
  const p = document.getElementById('staffPassword').value;
  const r = document.getElementById('staffRole').value;
  if (id) {
    const idx = state.staffAccounts.findIndex(function (x) { return x.id === id; });
    state.staffAccounts[idx] = { id: id, username: u, password: p, role: r };
    showToast('อัปเดตบัญชีสำเร็จ');
  } else {
    state.staffAccounts.push({ id: Date.now().toString(), username: u, password: p, role: r });
    showToast('เพิ่มบัญชีสำเร็จ');
  }
  await backendSaveStaff();
  renderStaffTable();
  resetStaffForm();
}

function editStaff(id) {
  const acc = state.staffAccounts.find(function (x) { return x.id === id; });
  if (acc) {
    document.getElementById('staffEditId').value = acc.id;
    document.getElementById('staffUsername').value = acc.username;
    document.getElementById('staffPassword').value = acc.password;
    document.getElementById('staffRole').value = acc.role;
  }
}

async function deleteStaff(id) {
  if (confirm('ยืนยันการลบบัญชีนี้?')) {
    state.staffAccounts = state.staffAccounts.filter(function (x) { return x.id !== id; });
    await backendSaveStaff();
    renderStaffTable();
    showToast('ลบบัญชีสำเร็จ');
  }
}
