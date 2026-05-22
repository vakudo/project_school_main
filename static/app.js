let equipment = [];
let userAccounts = [];

const bodyEl = document.getElementById('equipmentBody');
const searchEl = document.getElementById('search');
const locationFilterEl = document.getElementById('locationFilter');
const resetFiltersEl = document.getElementById('resetFilters');
const statTotalEl = document.getElementById('statTotal');
const statActiveEl = document.getElementById('statActive');
const statRepairEl = document.getElementById('statRepair');
const toastEl = document.getElementById('toast');
const form = document.getElementById('addForm');
const quickBtn = document.getElementById('addQuickBtn');
const cancelForm = document.getElementById('cancelForm');
const formPanel = document.getElementById('formPanel');
const themeToggle = document.getElementById('themeToggle');
const root = document.documentElement;
const tabButtons = document.querySelectorAll('.tab-btn');
let activeStatus = '';
const currentUser = window.CURRENT_USER || '';
const serviceModal = document.getElementById('serviceModal');
const serviceClose = document.getElementById('serviceClose');
const serviceCancel = document.getElementById('serviceCancel');
const serviceForm = document.getElementById('serviceForm');
const serviceOwnerInput = document.getElementById('serviceOwner');
const servicePhoneInput = document.getElementById('servicePhone');
const serviceNoteInput = document.getElementById('serviceNote');
let modalTargetId = null;
const issueModal = document.getElementById('issueModal');
const issueClose = document.getElementById('issueClose');
const issueCancel = document.getElementById('issueCancel');
const issueForm = document.getElementById('issueForm');
const issueOwnerInput = document.getElementById('issueOwner');
const issuePhoneInput = document.getElementById('issuePhone');
const exportModal = document.getElementById('exportModal');
const exportClose = document.getElementById('exportClose');
const exportCancel = document.getElementById('exportCancel');
const exportForm = document.getElementById('exportForm');
const exportBtn = document.getElementById('exportBtn');
const isAdmin = Boolean(window.IS_ADMIN);
const accountForm = document.getElementById('accountForm');
const accountFormReset = document.getElementById('accountFormReset');
const accountListEl = document.getElementById('accountList');
const accountModal = document.getElementById('accountModal');
const accountClose = document.getElementById('accountClose');
const accountCancel = document.getElementById('accountCancel');
const accountEditForm = document.getElementById('accountEditForm');
const accountEditId = document.getElementById('accountEditId');
const accountEditEmail = document.getElementById('accountEditEmail');
const accountEditPassword = document.getElementById('accountEditPassword');
const accountEditRole = document.getElementById('accountEditRole');

async function loadEquipment() {
  try {
    const res = await fetch('/api/equipment');
    if (!res.ok) throw new Error('load_failed');
    const data = await res.json();
    equipment = data.items || [];
    render();
  } catch (err) {
    console.error(err);
    showToast('Не удалось загрузить оборудование');
  }
}

async function loadAccounts() {
  if (!isAdmin || !accountListEl) return;
  try {
    const res = await fetch('/api/accounts');
    if (!res.ok) throw new Error('load_accounts_failed');
    const data = await res.json();
    userAccounts = data.accounts || [];
    renderAccounts();
  } catch (err) {
    console.error(err);
    showToast('Не удалось загрузить учётные записи');
  }
}

function render() {
  const rows = filteredData().map(item => `
    <div class="row">
      <div>
        <div>${item.name}</div>
        <div class="muted">${item.note || 'Пока нет примечаний'}</div>
      </div>
      <div class="muted">${item.serial}</div>
      <div>${item.location || '—'}</div>
      <div>${item.owner || '—'}${item.ownerPhone ? ' · ' + item.ownerPhone : ''}</div>
      <div><span class="chip status ${item.status}">${statusLabel(item.status)}</span></div>
      ${item.serviceOwner ? `<div class="muted service-line">Сервис: ${item.serviceOwner}${item.servicePhone ? ' · ' + item.servicePhone : ''}</div>` : ''}
      <div class="row-actions">
        <button class="btn ghost small" data-action="issue" data-id="${item.id}">Выдать</button>
        <button class="btn ghost small" data-action="stock" data-id="${item.id}">Вернуть</button>
        <button class="btn ghost small" data-action="service" data-id="${item.id}">Сервис</button>
        <button class="btn ghost small" data-action="label" data-id="${item.id}">QR/печать</button>
      </div>
    </div>
  `);
  bodyEl.innerHTML = rows.join('') || `<div class="row"><div>Ничего не найдено</div></div>`;
  updateStats();
  fillLocationFilter();
}

function renderAccounts() {
  if (!accountListEl) return;
  if (!userAccounts.length) {
    accountListEl.innerHTML = '<div class="muted">Пока нет дополнительных учётных записей</div>';
    return;
  }
  const rows = userAccounts.map(acc => `
    <div class="account-item" data-id="${acc.id}">
      <div>
        <div>${acc.email}</div>
        <div class="muted">${roleLabel(acc.role)}</div>
      </div>
      <div class="account-actions">
        <span class="account-role">${roleLabel(acc.role)}</span>
        <button class="btn ghost small" data-action="edit-account" data-id="${acc.id}">Изменить</button>
      </div>
    </div>
  `);
  accountListEl.innerHTML = rows.join('');
}

function filteredData() {
  const term = searchEl.value.trim().toLowerCase();
  const status = activeStatus;
  const loc = locationFilterEl.value;

  return equipment.filter(item => {
    const hay = `${item.name} ${item.serial} ${item.location} ${item.owner}`.toLowerCase();
    const matchesTerm = !term || hay.includes(term);
    const matchesStatus = status === 'assigned'
      ? item.status === 'repair' && item.serviceOwner && currentUser && item.serviceOwner.toLowerCase() === currentUser.toLowerCase()
      : (!status || item.status === status);
    const matchesLoc = !loc || item.location === loc;
    return matchesTerm && matchesStatus && matchesLoc;
  });
}

function statusLabel(code) {
  switch (code) {
    case 'active': return 'В работе';
    case 'idle': return 'Свободен';
    case 'repair': return 'Сервис';
    default: return code;
  }
}

function roleLabel(role) {
  return role === 'admin' ? 'Администратор' : 'Пользователь';
}

function updateStats() {
  statTotalEl.textContent = equipment.length;
  statActiveEl.textContent = equipment.filter(i => i.status === 'active').length;
  statRepairEl.textContent = equipment.filter(i => i.status === 'repair').length;
}

function fillLocationFilter() {
  const unique = Array.from(new Set(equipment.map(i => i.location).filter(Boolean)));
  const options = ['<option value="">Все</option>', ...unique.map(loc => `<option value="${loc}">${loc}</option>`)];
  const current = locationFilterEl.value;
  locationFilterEl.innerHTML = options.join('');
  if (unique.includes(current)) locationFilterEl.value = current;
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 1600);
}

async function addEquipment(formData) {
  const payload = {
    name: formData.get('name'),
    serial: formData.get('serial'),
    location: formData.get('location'),
    owner: formData.get('owner'),
    note: formData.get('note') || '',
  };
  const res = await fetch('/api/equipment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    showToast('Не удалось добавить оборудование');
    return;
  }
  const data = await res.json();
  const newItem = data.item;
  equipment = [newItem, ...equipment];
  render();
  showToast('Оборудование добавлено, QR готов');
}

async function persistUpdate(id, changes) {
  const res = await fetch(`/api/equipment/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  });
  if (!res.ok) throw new Error('update_failed');
  const data = await res.json();
  const updated = data.item;
  equipment = equipment.map(i => i.id === id ? updated : i);
  render();
}

async function createAccount(formData) {
  const payload = {
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role') || 'user',
  };
  const res = await fetch('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let message = 'Не удалось создать учётную запись';
    try {
      const err = await res.json();
      if (err?.error === 'email_exists') message = 'Такой email уже используется';
    } catch (e) {
      // ignore parse errors
    }
    showToast(message);
    return;
  }
  const data = await res.json();
  if (data.account) {
    userAccounts = [data.account, ...userAccounts];
    renderAccounts();
    showToast('Учётная запись добавлена');
  }
}

async function updateAccount(id, payload) {
  const res = await fetch(`/api/accounts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let message = 'Не удалось обновить учётную запись';
    try {
      const err = await res.json();
      if (err?.error === 'email_exists') message = 'Такой email уже используется';
    } catch (e) {
      // ignore parse errors
    }
    showToast(message);
    throw new Error('account_update_failed');
  }
  const data = await res.json();
  if (data.account) {
    userAccounts = userAccounts.map(acc => acc.id === id ? data.account : acc);
    renderAccounts();
    showToast('Учётная запись обновлена');
  }
}

function openAccountModal(account) {
  if (!accountModal || !account) return;
  accountEditId.value = account.id;
  accountEditEmail.value = account.email || '';
  accountEditPassword.value = '';
  accountEditRole.value = account.role || 'user';
  accountModal.classList.add('show');
}

searchEl.addEventListener('input', render);
locationFilterEl.addEventListener('change', render);
resetFiltersEl.addEventListener('click', () => {
  searchEl.value = '';
  activeStatus = '';
  locationFilterEl.value = '';
  tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.status === ''));
  render();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = new FormData(form);
  await addEquipment(data);
  form.reset();
});

quickBtn.addEventListener('click', () => {
  formPanel.scrollIntoView({ behavior: 'smooth' });
});

cancelForm.addEventListener('click', () => {
  form.reset();
});

if (accountForm && isAdmin) {
  accountForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(accountForm);
    await createAccount(data);
    accountForm.reset();
  });
}

if (accountFormReset && accountForm && isAdmin) {
  accountFormReset.addEventListener('click', () => {
    accountForm.reset();
  });
}

if (accountListEl && isAdmin) {
  accountListEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="edit-account"]');
    if (!btn) return;
    const acc = userAccounts.find(item => item.id === btn.dataset.id);
    if (acc) openAccountModal(acc);
  });
}

function setTheme(theme) {
  root.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  if (themeToggle) {
    const icon = themeToggle.querySelector('.icon');
    if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️';
    themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему');
  }
}

const initialTheme = localStorage.getItem('theme') || 'light';
setTheme(initialTheme);

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(next);
  });
}

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    activeStatus = btn.dataset.status || '';
    tabButtons.forEach(b => b.classList.toggle('active', b === btn));
    render();
  });
});

bodyEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  const item = equipment.find(i => i.id === id);
  if (!item) return;

  if (action === 'label') {
    const url = item.label_url || `/equipment/${id}/label`;
    window.open(url, '_blank');
    return;
  }

  if (action === 'issue') {
    modalTargetId = id;
    issueOwnerInput.value = item.owner || '';
    issuePhoneInput.value = item.ownerPhone || '';
    issueModal.classList.add('show');
    return;
  }

  if (action === 'stock') {
    try {
      await persistUpdate(id, { status: 'idle', serviceOwner: '', servicePhone: '' });
      showToast('Переведено в склад');
    } catch (err) {
      showToast('Не удалось обновить');
    }
    return;
  }

  if (action === 'service') {
    modalTargetId = id;
    serviceOwnerInput.value = item.serviceOwner || currentUser || '';
    servicePhoneInput.value = item.servicePhone || '';
    serviceNoteInput.value = item.note || '';
    serviceModal.classList.add('show');
    return;
  }
});

function closeModal(modalEl) {
  modalEl.classList.remove('show');
  modalTargetId = null;
}

[serviceClose, serviceCancel].forEach(btn => btn && btn.addEventListener('click', () => closeModal(serviceModal)));
[issueClose, issueCancel].forEach(btn => btn && btn.addEventListener('click', () => closeModal(issueModal)));
[exportClose, exportCancel].forEach(btn => btn && btn.addEventListener('click', () => closeModal(exportModal)));
[accountClose, accountCancel].forEach(btn => btn && btn.addEventListener('click', () => closeModal(accountModal)));

serviceModal.addEventListener('click', (e) => { if (e.target === serviceModal) closeModal(serviceModal); });
issueModal.addEventListener('click', (e) => { if (e.target === issueModal) closeModal(issueModal); });
exportModal.addEventListener('click', (e) => { if (e.target === exportModal) closeModal(exportModal); });
if (accountModal) {
  accountModal.addEventListener('click', (e) => { if (e.target === accountModal) closeModal(accountModal); });
}

if (accountEditForm && isAdmin) {
  accountEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const accountId = accountEditId.value;
    if (!accountId) return closeModal(accountModal);
    const payload = {
      email: accountEditEmail.value.trim(),
      role: accountEditRole.value,
    };
    if (accountEditPassword.value.trim()) {
      payload.password = accountEditPassword.value.trim();
    }
    try {
      await updateAccount(accountId, payload);
    } catch (err) {
      // toast already показан в updateAccount
    }
    closeModal(accountModal);
  });
}

serviceForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!modalTargetId) return closeModal(serviceModal);
  try {
    await persistUpdate(modalTargetId, {
      serviceOwner: serviceOwnerInput.value.trim(),
      servicePhone: servicePhoneInput.value.trim(),
      note: serviceNoteInput.value.trim(),
      status: 'repair',
    });
    showToast('Передано в сервис, QR обновлен');
  } catch (err) {
    showToast('Не удалось обновить');
  }
  closeModal(serviceModal);
});

issueForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!modalTargetId) return closeModal(issueModal);
  try {
    await persistUpdate(modalTargetId, {
      owner: issueOwnerInput.value.trim(),
      ownerPhone: issuePhoneInput.value.trim(),
      status: 'active',
      serviceOwner: '',
      servicePhone: '',
    });
    showToast('Оборудование выдано');
  } catch (err) {
    showToast('Не удалось обновить');
  }
  closeModal(issueModal);
});

if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    exportModal.classList.add('show');
  });
}

exportForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const fields = Array.from(exportForm.querySelectorAll('input[name="fields"]:checked')).map(i => i.value);
  const formatInput = exportForm.querySelector('input[name="format"]:checked');
  const format = formatInput ? formatInput.value : 'xlsx';
  const data = filteredData().map(item => {
    const row = {};
    fields.forEach(f => row[fieldLabel(f)] = item[f] || '');
    return row;
  });

  if (data.length === 0) {
    showToast('Нет данных для выгрузки');
    return;
  }

  if (format === 'csv') {
    downloadCSV(data);
  } else {
    downloadXLSX(data);
  }
  closeModal(exportModal);
});

function fieldLabel(key) {
  const map = {
    name: 'Наименование',
    serial: 'Инв. номер',
    location: 'Локация',
    owner: 'Ответственный',
    ownerPhone: 'Телефон ответственного',
    status: 'Статус',
    serviceOwner: 'Сервис',
    servicePhone: 'Телефон сервиса',
    note: 'Примечание',
  };
  return map[key] || key;
}

function downloadCSV(data) {
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(';'),
    ...data.map(row => headers.map(h => `"${String(row[h]).replace(/"/g, '""')}"`).join(';')),
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'equipment.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function downloadXLSX(data) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Оборудование');
  XLSX.writeFile(wb, 'equipment.xlsx');
}

loadEquipment();
if (isAdmin) {
  loadAccounts();
}
