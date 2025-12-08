const sampleData = [
  { name: 'Сварочный аппарат Lincoln', serial: 'INV-2025-014', location: 'Цех 3 / Сварка', owner: 'Иванов И.И.', ownerPhone: '+7 900 000-10-10', status: 'active', note: 'Смена насадки раз в неделю', serviceOwner: '', servicePhone: '' },
  { name: 'Компрессор Atlas', serial: 'INV-2024-102', location: 'Цех 1 / Компрессоры', owner: 'Петров А.А.', ownerPhone: '+7 900 000-10-11', status: 'repair', note: 'Ожидает клапан', serviceOwner: 'techlead@example.com', servicePhone: '+7 900 000-00-01' },
  { name: 'Гидравлический пресс', serial: 'INV-2023-310', location: 'Цех 2 / Пресс', owner: 'Сидоров С.С.', ownerPhone: '+7 900 000-10-12', status: 'idle', note: '', serviceOwner: '', servicePhone: '' },
  { name: 'Шлифовальный станок', serial: 'INV-2025-021', location: 'Цех 4 / Мехобработка', owner: 'Кузнецов Д.Д.', ownerPhone: '+7 900 000-10-13', status: 'active', note: 'Нужен ежедневный осмотр', serviceOwner: '', servicePhone: '' },
  { name: 'Погрузчик Still', serial: 'INV-2024-210', location: 'Склад', owner: 'Горбунов В.В.', ownerPhone: '+7 900 000-10-14', status: 'active', note: 'Резервный аккумулятор', serviceOwner: '', servicePhone: '' },
  { name: 'Лазерный резак', serial: 'INV-2024-450', location: 'Цех 4 / Резка', owner: 'Ким Е.Е.', ownerPhone: '+7 900 000-10-15', status: 'repair', note: 'Настройка оптики', serviceOwner: 'service@example.com', servicePhone: '+7 900 000-00-02' },
];

let equipment = [...sampleData];

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
let modalTargetSerial = null;
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

function render() {
  const rows = filteredData().map(item => `
    <div class="row">
      <div>
        <div>${item.name}</div>
        <div class="muted">${item.note || 'Без комментария'}</div>
      </div>
      <div class="muted">${item.serial}</div>
      <div>${item.location}</div>
      <div>${item.owner || 'Не назначен'} ${item.ownerPhone ? '• ' + item.ownerPhone : ''}</div>
      <div><span class="chip status ${item.status}">${statusLabel(item.status)}</span></div>
      ${item.serviceOwner ? `<div class="muted service-line">Обслуживает: ${item.serviceOwner} ${item.servicePhone ? '• ' + item.servicePhone : ''}</div>` : ''}
      <div class="row-actions">
        <button class="btn ghost small" data-action="issue" data-serial="${item.serial}">Выдать</button>
        <button class="btn ghost small" data-action="stock" data-serial="${item.serial}">На склад</button>
        <button class="btn ghost small" data-action="service" data-serial="${item.serial}">Обслуживание</button>
      </div>
    </div>
  `);
  bodyEl.innerHTML = rows.join('') || `<div class="row"><div>Ничего не найдено</div></div>`;
  updateStats();
  fillLocationFilter();
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
    case 'active': return 'Выдано';
    case 'idle': return 'Склад';
    case 'repair': return 'Обслуживание';
    default: return code;
  }
}

function updateStats() {
  statTotalEl.textContent = equipment.length;
  statActiveEl.textContent = equipment.filter(i => i.status === 'active').length;
  statRepairEl.textContent = equipment.filter(i => i.status === 'repair').length;
}

function fillLocationFilter() {
  const unique = Array.from(new Set(equipment.map(i => i.location)));
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

function addEquipment(formData) {
  const item = {
    name: formData.get('name'),
    serial: formData.get('serial'),
    location: formData.get('location'),
    owner: formData.get('owner'),
    ownerPhone: '',
    status: 'idle',
    note: formData.get('note') || '',
    serviceOwner: '',
    servicePhone: '',
  };
  equipment = [item, ...equipment];
  render();
  showToast('Сохранено');
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

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(form);
  addEquipment(data);
  form.reset();
});

quickBtn.addEventListener('click', () => {
  formPanel.scrollIntoView({ behavior: 'smooth' });
});

cancelForm.addEventListener('click', () => {
  form.reset();
});

function setTheme(theme) {
  root.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  if (themeToggle) {
    const icon = themeToggle.querySelector('.icon');
    if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️';
    themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Светлая тема' : 'Темная тема');
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

bodyEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const serial = btn.dataset.serial;
  const action = btn.dataset.action;
  const item = equipment.find(i => i.serial === serial);
  if (!item) return;

  if (action === 'issue') {
    modalTargetSerial = serial;
    issueOwnerInput.value = item.owner || '';
    issuePhoneInput.value = item.ownerPhone || '';
    issueModal.classList.add('show');
  }

  if (action === 'stock') {
    item.status = 'idle';
    item.serviceOwner = '';
    item.servicePhone = '';
  }

  if (action === 'service') {
    modalTargetSerial = serial;
    serviceOwnerInput.value = item.serviceOwner || currentUser || '';
    servicePhoneInput.value = item.servicePhone || '';
    serviceNoteInput.value = item.note || '';
    serviceModal.classList.add('show');
  }

  render();
  showToast('Статус обновлен');
});

function closeModal(modalEl) {
  modalEl.classList.remove('show');
  modalTargetSerial = null;
}

[serviceClose, serviceCancel].forEach(btn => btn.addEventListener('click', () => closeModal(serviceModal)));
[issueClose, issueCancel].forEach(btn => btn.addEventListener('click', () => closeModal(issueModal)));
[exportClose, exportCancel].forEach(btn => btn.addEventListener('click', () => closeModal(exportModal)));

serviceModal.addEventListener('click', (e) => { if (e.target === serviceModal) closeModal(serviceModal); });
issueModal.addEventListener('click', (e) => { if (e.target === issueModal) closeModal(issueModal); });
exportModal.addEventListener('click', (e) => { if (e.target === exportModal) closeModal(exportModal); });

serviceForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!modalTargetSerial) return closeModal(serviceModal);
  const item = equipment.find(i => i.serial === modalTargetSerial);
  if (!item) return closeModal(serviceModal);

  item.serviceOwner = serviceOwnerInput.value.trim();
  item.servicePhone = servicePhoneInput.value.trim();
  item.note = serviceNoteInput.value.trim();
  item.status = 'repair';

  closeModal(serviceModal);
  render();
  showToast('Статус обновлен');
});

issueForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!modalTargetSerial) return closeModal(issueModal);
  const item = equipment.find(i => i.serial === modalTargetSerial);
  if (!item) return closeModal(issueModal);

  item.owner = issueOwnerInput.value.trim();
  item.ownerPhone = issuePhoneInput.value.trim();
  item.status = 'active';
  item.serviceOwner = '';
  item.servicePhone = '';

  closeModal(issueModal);
  render();
  showToast('Статус обновлен');
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
    showToast('Нет данных для экспорта');
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
    name: 'Название',
    serial: 'Инв. номер',
    location: 'Локация',
    owner: 'Ответственный',
    ownerPhone: 'Телефон ответственного',
    status: 'Статус',
    serviceOwner: 'Обслуживание — ответственный',
    servicePhone: 'Обслуживание — телефон',
    note: 'Комментарий',
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

render();
