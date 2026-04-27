// ===== STORAGE =====
const DB = {
  get: (key) => JSON.parse(localStorage.getItem(key) || 'null'),
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
};

const getApps = () => DB.get('jt_applications') || [];
const setApps = (data) => DB.set('jt_applications', data);
const getSteps = () => DB.get('jt_steps') || [];
const setSteps = (data) => DB.set('jt_steps', data);
const getUser = () => DB.get('jt_user');
const setUser = (name) => DB.set('jt_user', name);

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ===== STATUS CONFIG =====
const STATUS_LABELS = {
  saved: 'Sauvegardée',
  applied: 'Postulée',
  interview: 'Entretien',
  offer: 'Offre reçue',
  rejected: 'Refusée',
};

const STEP_LABELS = {
  applied: 'Candidature envoyée',
  confirmation: 'Accusé de réception',
  interview_hr: 'Entretien RH',
  interview_manager: 'Entretien manager',
  test: 'Test / Cas pratique',
  offer: 'Offre reçue',
  rejected: 'Refus',
  custom: 'Étape libre',
};

const STEP_TO_STATUS = {
  applied: 'applied',
  confirmation: 'applied',
  interview_hr: 'interview',
  interview_manager: 'interview',
  test: 'interview',
  offer: 'offer',
  rejected: 'rejected',
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  if (user) {
    showApp(user);
  } else {
    showLogin();
  }

  bindEvents();
});

function showLogin() {
  document.getElementById('login-screen').classList.add('active');
  document.getElementById('app-screen').classList.remove('active');
}

function showApp(userName) {
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('app-screen').classList.add('active');
  document.getElementById('user-name').textContent = userName;
  document.getElementById('user-avatar').textContent = userName[0].toUpperCase();
  navigateTo('dashboard');
}

// ===== NAVIGATION =====
let currentPage = 'dashboard';
let currentAppId = null;

function navigateTo(page) {
  currentPage = page;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById('page-' + page).classList.add('active');
  document.querySelector('[data-page="' + page + '"]').classList.add('active');
  document.getElementById('page-title').textContent = {
    dashboard: 'Dashboard',
    applications: 'Candidatures',
    kanban: 'Kanban',
  }[page];

  renderPage(page);
}

function renderPage(page) {
  if (page === 'dashboard') renderDashboard();
  if (page === 'applications') renderApplications();
  if (page === 'kanban') renderKanban();
}

// ===== EVENTS =====
function bindEvents() {
  // Login
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('username').value.trim();
    if (!name) return;
    setUser(name);
    showApp(name);
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    DB.set('jt_user', null);
    showLogin();
  });

  // Nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.page);
      closeSidebar();
    });
  });

  // Mobile sidebar
  document.getElementById('menu-btn').addEventListener('click', openSidebar);
  document.getElementById('sidebar-close').addEventListener('click', closeSidebar);

  // Add button
  document.getElementById('add-btn').addEventListener('click', () => openAppModal());

  // App modal
  document.getElementById('modal-close').addEventListener('click', closeAppModal);
  document.getElementById('modal-cancel').addEventListener('click', closeAppModal);
  document.getElementById('modal-application').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAppModal();
  });
  document.getElementById('application-form').addEventListener('submit', saveApplication);

  // Detail modal
  document.getElementById('detail-close').addEventListener('click', closeDetailModal);
  document.getElementById('modal-detail').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDetailModal();
  });
  document.getElementById('detail-edit').addEventListener('click', () => {
    const app = getApps().find(a => a.id === currentAppId);
    closeDetailModal();
    openAppModal(app);
  });
  document.getElementById('detail-delete').addEventListener('click', () => {
    if (!confirm('Supprimer cette candidature ?')) return;
    const apps = getApps().filter(a => a.id !== currentAppId);
    setApps(apps);
    const steps = getSteps().filter(s => s.application_id !== currentAppId);
    setSteps(steps);
    closeDetailModal();
    renderPage(currentPage);
    showToast('Candidature supprimée');
  });

  // Step modal
  document.getElementById('add-step-btn').addEventListener('click', openStepModal);
  document.getElementById('step-close').addEventListener('click', closeStepModal);
  document.getElementById('step-cancel').addEventListener('click', closeStepModal);
  document.getElementById('modal-step').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeStepModal();
  });
  document.getElementById('step-type').addEventListener('change', (e) => {
    document.getElementById('custom-title-group').style.display =
      e.target.value === 'custom' ? 'flex' : 'none';
  });
  document.getElementById('step-form').addEventListener('submit', saveStep);

  // Search & filter
  document.getElementById('search-input').addEventListener('input', renderApplications);
  document.getElementById('filter-status').addEventListener('change', renderApplications);
}

// ===== SIDEBAR =====
function openSidebar() { document.getElementById('sidebar').classList.add('open'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); }

// ===== DASHBOARD =====
function renderDashboard() {
  const apps = getApps();
  document.getElementById('stat-total').textContent = apps.length;
  document.getElementById('stat-applied').textContent = apps.filter(a => a.status === 'applied').length;
  document.getElementById('stat-interview').textContent = apps.filter(a => a.status === 'interview').length;
  document.getElementById('stat-offer').textContent = apps.filter(a => a.status === 'offer').length;

  const recent = [...apps].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  const container = document.getElementById('recent-list');
  container.innerHTML = recent.length
    ? recent.map(renderAppCard).join('')
    : emptyState('Aucune candidature', 'Commencez par en ajouter une !');

  container.querySelectorAll('.app-card').forEach(card => {
    card.addEventListener('click', () => openDetailModal(card.dataset.id));
  });
}

// ===== APPLICATIONS =====
function renderApplications() {
  const search = document.getElementById('search-input').value.toLowerCase();
  const status = document.getElementById('filter-status').value;
  let apps = getApps();

  if (search) apps = apps.filter(a =>
    a.company.toLowerCase().includes(search) ||
    a.role.toLowerCase().includes(search)
  );
  if (status) apps = apps.filter(a => a.status === status);

  apps.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const container = document.getElementById('applications-list');
  container.innerHTML = apps.length
    ? apps.map(renderAppCard).join('')
    : emptyState('Aucune candidature trouvée', 'Modifiez les filtres ou ajoutez une candidature.');

  container.querySelectorAll('.app-card').forEach(card => {
    card.addEventListener('click', () => openDetailModal(card.dataset.id));
  });
}

// ===== KANBAN =====
function renderKanban() {
  const apps = getApps();
  const statuses = ['saved', 'applied', 'interview', 'offer', 'rejected'];

  statuses.forEach(status => {
    const filtered = apps.filter(a => a.status === status);
    document.getElementById('k-' + status).textContent = filtered.length;
    const container = document.getElementById('kanban-' + status);
    container.innerHTML = filtered.length
      ? filtered.map(a => `
          <div class="kanban-card" data-id="${a.id}">
            <div class="kanban-card-role">${esc(a.role)}</div>
            <div class="kanban-card-company">${esc(a.company)}</div>
            <div class="kanban-card-date">${formatDate(a.created_at)}</div>
          </div>
        `).join('')
      : '';

    container.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('click', () => openDetailModal(card.dataset.id));
    });
  });
}

// ===== APP CARD HTML =====
function renderAppCard(app) {
  return `
    <div class="app-card" data-id="${app.id}">
      <div class="app-logo">${app.company[0].toUpperCase()}</div>
      <div class="app-info">
        <div class="app-role">${esc(app.role)}</div>
        <div class="app-company">${esc(app.company)}</div>
        <div class="app-meta">
          ${app.location ? `<span>📍 ${esc(app.location)}</span>` : ''}
          ${app.contract_type ? `<span>📄 ${esc(app.contract_type)}</span>` : ''}
          ${app.salary ? `<span>💰 ${esc(app.salary)}</span>` : ''}
        </div>
      </div>
      <div class="app-card-right">
        <span class="badge badge-${app.status}">${STATUS_LABELS[app.status]}</span>
        <span class="app-date">${formatDate(app.created_at)}</span>
      </div>
    </div>
  `;
}

// ===== APP MODAL =====
function openAppModal(app = null) {
  const form = document.getElementById('application-form');
  form.reset();

  if (app) {
    document.getElementById('modal-title').textContent = 'Modifier la candidature';
    document.getElementById('form-id').value = app.id;
    document.getElementById('form-company').value = app.company || '';
    document.getElementById('form-role').value = app.role || '';
    document.getElementById('form-location').value = app.location || '';
    document.getElementById('form-contract').value = app.contract_type || '';
    document.getElementById('form-salary').value = app.salary || '';
    document.getElementById('form-status').value = app.status || 'saved';
    document.getElementById('form-url').value = app.url || '';
    document.getElementById('form-notes').value = app.description || '';
  } else {
    document.getElementById('modal-title').textContent = 'Nouvelle candidature';
    document.getElementById('form-id').value = '';
  }

  document.getElementById('modal-application').classList.remove('hidden');
}

function closeAppModal() {
  document.getElementById('modal-application').classList.add('hidden');
}

function saveApplication(e) {
  e.preventDefault();
  const id = document.getElementById('form-id').value;
  const apps = getApps();

  const data = {
    company: document.getElementById('form-company').value.trim(),
    role: document.getElementById('form-role').value.trim(),
    location: document.getElementById('form-location').value.trim(),
    contract_type: document.getElementById('form-contract').value.trim(),
    salary: document.getElementById('form-salary').value.trim(),
    status: document.getElementById('form-status').value,
    url: document.getElementById('form-url').value.trim(),
    description: document.getElementById('form-notes').value.trim(),
  };

  if (id) {
    const idx = apps.findIndex(a => a.id === id);
    apps[idx] = { ...apps[idx], ...data, updated_at: new Date().toISOString() };
    setApps(apps);
    showToast('Candidature modifiée', 'success');
  } else {
    const newApp = {
      id: uid(),
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    apps.unshift(newApp);
    setApps(apps);
    showToast('Candidature ajoutée', 'success');
  }

  closeAppModal();
  renderPage(currentPage);
}

// ===== DETAIL MODAL =====
function openDetailModal(id) {
  currentAppId = id;
  const app = getApps().find(a => a.id === id);
  if (!app) return;

  document.getElementById('detail-title').textContent = app.role;
  document.getElementById('detail-company').textContent = app.company;

  const meta = document.getElementById('detail-meta');
  meta.innerHTML = `
    <span class="badge badge-${app.status}">${STATUS_LABELS[app.status]}</span>
    ${app.location ? `<span class="meta-item">📍 ${esc(app.location)}</span>` : ''}
    ${app.contract_type ? `<span class="meta-item">📄 ${esc(app.contract_type)}</span>` : ''}
    ${app.salary ? `<span class="meta-item">💰 ${esc(app.salary)}</span>` : ''}
    ${app.url ? `<a href="${esc(app.url)}" target="_blank" class="meta-item btn btn-sm btn-secondary">🔗 Voir l'offre</a>` : ''}
  `;

  renderTimeline(id);
  document.getElementById('modal-detail').classList.remove('hidden');
}

function closeDetailModal() {
  document.getElementById('modal-detail').classList.add('hidden');
  currentAppId = null;
}

// ===== TIMELINE =====
function renderTimeline(appId) {
  const steps = getSteps()
    .filter(s => s.application_id === appId)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const container = document.getElementById('timeline-list');

  if (!steps.length) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:13px;padding:8px 0;">Aucune étape. Ajoutez la première !</p>`;
    return;
  }

  container.innerHTML = steps.map(step => {
    const dotClass = { done: 'dot-done', current: 'dot-current', upcoming: 'dot-upcoming' }[step.status];
    const dotChar = { done: '✓', current: '●', upcoming: '○' }[step.status];
    return `
      <div class="timeline-item">
        <div class="timeline-dot ${dotClass}">${dotChar}</div>
        <div class="timeline-content">
          <div class="timeline-title">${esc(step.title)}</div>
          <div class="timeline-date">${formatDate(step.date)}${step.time ? ' à ' + step.time : ''}</div>
          ${step.notes ? `<div class="timeline-notes">${esc(step.notes)}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ===== STEP MODAL =====
function openStepModal() {
  document.getElementById('step-form').reset();
  document.getElementById('step-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('custom-title-group').style.display = 'none';
  document.getElementById('modal-step').classList.remove('hidden');
}

function closeStepModal() {
  document.getElementById('modal-step').classList.add('hidden');
}

function saveStep(e) {
  e.preventDefault();
  const type = document.getElementById('step-type').value;
  const customTitle = document.getElementById('step-title').value.trim();
  const title = type === 'custom' ? (customTitle || 'Étape libre') : STEP_LABELS[type];

  const step = {
    id: uid(),
    application_id: currentAppId,
    title,
    step_type: type,
    date: document.getElementById('step-date').value,
    time: document.getElementById('step-time').value,
    status: document.getElementById('step-status').value,
    notes: document.getElementById('step-notes').value.trim(),
    created_at: new Date().toISOString(),
  };

  const steps = getSteps();
  steps.push(step);
  setSteps(steps);

  // Update application status if step has a mapped status
  if (STEP_TO_STATUS[type]) {
    const apps = getApps();
    const idx = apps.findIndex(a => a.id === currentAppId);
    if (idx !== -1) {
      apps[idx].status = STEP_TO_STATUS[type];
      apps[idx].updated_at = new Date().toISOString();
      setApps(apps);
    }
  }

  closeStepModal();
  renderTimeline(currentAppId);
  renderPage(currentPage);
  showToast('Étape ajoutée', 'success');
}

// ===== TOAST =====
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast' + (type ? ' ' + type : '');
  setTimeout(() => { toast.classList.add('hidden'); }, 2500);
}

// ===== UTILS =====
function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function emptyState(title, sub) {
  return `
    <div class="empty-state">
      <div class="empty-icon">📋</div>
      <p><strong>${title}</strong></p>
      <p style="margin-top:4px;font-size:13px;">${sub}</p>
    </div>
  `;
}
