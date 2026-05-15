/* --- LOGIN & ROLE UI --- */
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
    if (targetState === 'customer') switchCustomerAuthTab('login');
  }, 300);
}

function switchCustomerAuthTab(tab) {
  const loginPanel = document.getElementById('customerAuthLogin');
  const regPanel = document.getElementById('customerAuthRegister');
  const tabLogin = document.getElementById('custTabLogin');
  const tabReg = document.getElementById('custTabRegister');
  if (!loginPanel || !regPanel) return;
  if (tab === 'register') {
    loginPanel.classList.add('hidden');
    regPanel.classList.remove('hidden');
    tabReg.classList.add('bg-white', 'dark:bg-gray-700', 'shadow', 'text-primary-600');
    tabLogin.classList.remove('bg-white', 'dark:bg-gray-700', 'shadow', 'text-primary-600');
  } else {
    regPanel.classList.add('hidden');
    loginPanel.classList.remove('hidden');
    tabLogin.classList.add('bg-white', 'dark:bg-gray-700', 'shadow', 'text-primary-600');
    tabReg.classList.remove('bg-white', 'dark:bg-gray-700', 'shadow', 'text-primary-600');
  }
}

function persistSession_() {
  window.__SOLARSAVE_SESSION__.save({
    role: state.role,
    user: state.user,
    currentCustomer: state.currentCustomer
  });
}

function clearSession_() {
  window.__SOLARSAVE_SESSION__.clear();
}

function enterCustomerSession_(customer) {
  state.isLoggedIn = true;
  state.role = 'customer';
  state.currentCustomer = customer;
  state.user = customer.displayName || customer.login;
  persistSession_();
  setupUIByRole();
  showToast('เข้าสู่ระบบสำเร็จ');
}

async function handleCustomerLogin(e) {
  e.preventDefault();
  const login = document.getElementById('custLoginId').value.trim();
  const password = document.getElementById('custLoginPassword').value;
  if (!login || !password) {
    showToast('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
    return;
  }
  if (!window.__SOLARSAVE_GAS__.url()) {
    showToast('ระบบยังไม่เชื่อมต่อเซิร์ฟเวอร์ (ตั้งค่า GAS_WEB_APP_URL)');
    return;
  }
  const r = await window.__SOLARSAVE_GAS__.loginCustomer(login, password);
  if (r.ok && r.customer) {
    enterCustomerSession_(r.customer);
    return;
  }
  showToast(r.error || 'เข้าสู่ระบบไม่สำเร็จ');
}

async function handleCustomerRegister(e) {
  e.preventDefault();
  const login = document.getElementById('custRegLogin').value.trim();
  const password = document.getElementById('custRegPassword').value;
  const displayName = document.getElementById('custRegName').value.trim();
  const location = document.getElementById('custRegLocation').value.trim();
  if (!login || !password) {
    showToast('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
    return;
  }
  if (!window.__SOLARSAVE_GAS__.url()) {
    showToast('ระบบยังไม่เชื่อมต่อเซิร์ฟเวอร์');
    return;
  }
  const r = await window.__SOLARSAVE_GAS__.registerCustomer({
    login: login,
    password: password,
    displayName: displayName || login,
    location: location
  });
  if (r.ok && r.customer) {
    showToast('สมัครสมาชิกสำเร็จ');
    enterCustomerSession_(r.customer);
    return;
  }
  showToast(r.error || 'สมัครสมาชิกไม่สำเร็จ');
}

function handleCustomerForgotPassword(e) {
  if (e) e.preventDefault();
  showToast('กรุณาติดต่อเจ้าหน้าที่การไฟฟ้าเพื่อรีเซ็ตรหัสผ่าน');
}

async function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value;
  if (!u || !p) {
    showToast('กรุณากรอก Username และ Password');
    return;
  }
  await loadBackendData();
  const foundUser = state.staffAccounts.find(function (acc) {
    return acc.username === u && acc.password === p;
  });
  if (foundUser) {
    state.isLoggedIn = true;
    state.user = foundUser.username;
    state.role = foundUser.role;
    state.currentCustomer = null;
    persistSession_();
    setupUIByRole();
    showToast('เข้าสู่ระบบสำเร็จ (' + foundUser.role.toUpperCase() + ')');
  } else {
    showToast('Username หรือ Password ไม่ถูกต้อง');
  }
}

function setupUIByRole() {
  document.getElementById('displayUsername').innerText = state.user;
  document.getElementById('displayUserInitials').innerText = (state.user || 'U').charAt(0).toUpperCase();
  document.getElementById('displayUserRole').innerText = state.role === 'admin'
    ? 'Administrator'
    : (state.role === 'staff' ? 'เจ้าหน้าที่การไฟฟ้า' : 'ผู้ใช้ไฟฟ้า');

  document.getElementById('nav-calculator').style.display = state.role === 'customer' ? 'none' : 'flex';
  document.getElementById('nav-customers').style.display = state.role === 'customer' ? 'none' : 'flex';
  document.getElementById('nav-settings').style.display = state.role === 'admin' ? 'flex' : 'none';
  const billWrap = document.getElementById('billCustomerWrap');
  if (billWrap) billWrap.classList.toggle('hidden', state.role === 'customer');
  if (state.role !== 'customer' && typeof refreshBillCustomerOptions_ === 'function') refreshBillCustomerOptions_();

  document.getElementById('loginView').style.display = 'none';
  document.getElementById('appView').classList.remove('hidden');

  scheduleUiRefresh_(function () {
    if (typeof refreshLocationDatalists_ === 'function') refreshLocationDatalists_();
    updateLocationFilterOptions();
    updateDashboardCards();
    renderTable();
    renderCustomerTab();
    switchTab('dashboard');
  });
}

function handleLogout() {
  state.isLoggedIn = false;
  state.user = null;
  state.currentCustomer = null;
  clearSession_();
  document.getElementById('appView').classList.add('hidden');
  switchLoginState('select');
  document.getElementById('loginView').style.display = 'flex';
  const uf = document.getElementById('username');
  const pf = document.getElementById('password');
  if (uf) uf.value = '';
  if (pf) pf.value = '';
}

async function restoreSessionIfAny_() {
  const s = window.__SOLARSAVE_SESSION__.load();
  if (!s || !s.role) return false;
  await loadBackendData();
  if (s.role === 'customer' && s.currentCustomer) {
    const c = state.customers.find(function (x) { return x.id === s.currentCustomer.id; });
    state.currentCustomer = c || s.currentCustomer;
    state.isLoggedIn = true;
    state.role = 'customer';
    state.user = state.currentCustomer.displayName || state.currentCustomer.login;
    setupUIByRole();
    return true;
  }
  if (s.role === 'admin' || s.role === 'staff') {
    const acc = state.staffAccounts.find(function (x) { return x.username === s.user; });
    if (!acc) return false;
    state.isLoggedIn = true;
    state.role = acc.role;
    state.user = acc.username;
    state.currentCustomer = null;
    setupUIByRole();
    return true;
  }
  return false;
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

  const titles = {
    dashboard: 'แดชบอร์ดสรุปผล',
    calculator: 'คำนวณ & บันทึกค่าไฟ',
    history: 'ประวัติข้อมูลรวม',
    customers: 'ข้อมูลผู้ใช้ไฟ',
    settings: 'ตั้งค่าส่วนกลางระบบ'
  };
  document.getElementById('pageTitle').innerText = titles[tabId];
  if (tabId === 'dashboard') initDashboardChart();
  if (tabId === 'history') renderTable();
  if (tabId === 'customers') renderCustomerTab();
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
  const u = document.getElementById('staffUsername').value.trim();
  const p = document.getElementById('staffPassword').value;
  const r = document.getElementById('staffRole').value;
  if (!u || !p) {
    showToast('กรุณากรอก Username และ Password');
    return;
  }
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
