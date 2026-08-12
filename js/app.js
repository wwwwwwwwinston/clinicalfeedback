/* ============================================
   CLINIQ - Core Application JavaScript
   Role Management, Account Switching, Navigation
   ============================================ */

// --- All Available Accounts ---
const ACCOUNTS = {
  students: [
    { id: 'jc', name: 'James Chen', initials: 'JC', year: 'Year 3', placement: 'Outpatient Clinic', avatarClass: 'avatar-blue', sessions: 24, progress: 82 },
    { id: 'ma', name: 'Maria Alvarez', initials: 'MA', year: 'Year 3', placement: 'Surgery Ward', avatarClass: 'avatar-purple', sessions: 21, progress: 79 },
    { id: 'rj', name: 'Rajesh Johal', initials: 'RJ', year: 'Year 3', placement: 'Emergency Dept', avatarClass: 'avatar-orange', sessions: 19, progress: 74 },
    { id: 'lk', name: 'Lena Kowalski', initials: 'LK', year: 'Year 3', placement: 'ICU', avatarClass: 'avatar-green', sessions: 22, progress: 80 },
    { id: 'tn', name: 'Thomas Nguyen', initials: 'TN', year: 'Year 3', placement: 'Paediatrics', avatarClass: 'avatar-blue', sessions: 15, progress: 61 },
    { id: 'ah', name: 'Aisha Hassan', initials: 'AH', year: 'Year 3', placement: 'Community', avatarClass: 'avatar-purple', sessions: 18, progress: 67 },
  ],
  ces: [
    { id: 'sp', name: 'Dr Sarah Palmer', initials: 'SP', specialty: 'Clinical Nutrition', avatarClass: 'avatar-green', students: 8 },
    { id: 'dk', name: 'Dr Amy Kim', initials: 'AK', specialty: 'Critical Care Nutrition', avatarClass: 'avatar-blue', students: 6 },
    { id: 'dl', name: 'Dr Robert Lee', initials: 'RL', specialty: 'Paediatric Nutrition', avatarClass: 'avatar-orange', students: 5 },
  ],
  admins: [
    { id: 'mt', name: 'Prof Michael Torres', initials: 'MT', title: 'Programme Director', avatarClass: 'avatar-purple' },
  ]
};

// Current state
let currentRole = localStorage.getItem('cliniq_role') || 'student';
let currentAccountId = localStorage.getItem('cliniq_account') || 'jc';

function getCurrentAccount() {
  if (currentRole === 'student') return ACCOUNTS.students.find(s => s.id === currentAccountId) || ACCOUNTS.students[0];
  if (currentRole === 'ce') return ACCOUNTS.ces.find(c => c.id === currentAccountId) || ACCOUNTS.ces[0];
  return ACCOUNTS.admins[0];
}

function getCurrentRole() {
  return currentRole;
}

// --- Role & Account Switching ---
function switchRole(role) {
  currentRole = role;
  localStorage.setItem('cliniq_role', role);
  // Set default account for the role
  if (role === 'student') currentAccountId = localStorage.getItem('cliniq_student') || 'jc';
  else if (role === 'ce') currentAccountId = localStorage.getItem('cliniq_ce') || 'sp';
  else currentAccountId = 'mt';
  localStorage.setItem('cliniq_account', currentAccountId);

  updateRoleSwitcher();
  updateSidebarUser();
  updateNavVisibility();
  updatePageContent();
  updateAccountSwitcher();
  const acct = getCurrentAccount();
  showNotification(`Switched to ${role === 'ce' ? 'Clinical Educator' : role === 'admin' ? 'Admin' : 'Student'} view (${acct.name})`, 'success');
}

function switchAccount(accountId) {
  currentAccountId = accountId;
  localStorage.setItem('cliniq_account', accountId);
  if (currentRole === 'student') localStorage.setItem('cliniq_student', accountId);
  else if (currentRole === 'ce') localStorage.setItem('cliniq_ce', accountId);

  updateSidebarUser();
  updatePageContent();
  updateAccountSwitcher();
  const acct = getCurrentAccount();
  showNotification(`Logged in as ${acct.name}`, 'success');
}

function openAccountPicker() {
  // Remove existing modal
  const existing = document.getElementById('accountPickerModal');
  if (existing) existing.remove();

  const accounts = currentRole === 'student' ? ACCOUNTS.students : currentRole === 'ce' ? ACCOUNTS.ces : ACCOUNTS.admins;
  const roleLabel = currentRole === 'student' ? 'Student' : currentRole === 'ce' ? 'Clinical Educator' : 'Admin';

  let accountListHTML = '';
  accounts.forEach(acct => {
    const isActive = acct.id === currentAccountId;
    const extra = currentRole === 'student'
      ? `<div class="text-xs text-muted">${acct.year} | ${acct.placement} | ${acct.sessions} sessions</div>`
      : currentRole === 'ce'
      ? `<div class="text-xs text-muted">${acct.specialty} | ${acct.students} students</div>`
      : `<div class="text-xs text-muted">${acct.title}</div>`;

    accountListHTML += `
      <div onclick="switchAccount('${acct.id}'); closeAccountPicker();"
           style="display:flex; align-items:center; gap:12px; padding:14px; background:${isActive ? 'var(--primary-light)' : 'var(--bg)'}; border-radius:var(--radius); border:1.5px solid ${isActive ? 'var(--primary)' : 'var(--border)'}; cursor:pointer; transition:all 0.2s;"
           onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='${isActive ? 'var(--primary)' : 'var(--border)'}'"
      >
        <div class="avatar avatar-md ${acct.avatarClass}">${acct.initials}</div>
        <div style="flex:1;">
          <div class="font-semibold text-sm">${acct.name}</div>
          ${extra}
        </div>
        ${isActive ? '<span class="badge badge-blue"><i class="ri-checkbox-circle-fill"></i> Active</span>' : '<span class="text-xs text-muted">Click to switch</span>'}
      </div>`;
  });

  const modal = document.createElement('div');
  modal.id = 'accountPickerModal';
  modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.5); backdrop-filter:blur(4px); z-index:10000; display:flex; align-items:center; justify-content:center; padding:20px;';
  modal.innerHTML = `
    <div style="background:#fff; border-radius:var(--radius-xl); max-width:480px; width:100%; box-shadow:var(--shadow-lg); animation:modalIn 0.3s ease; max-height:80vh; overflow:hidden; display:flex; flex-direction:column;">
      <div style="padding:24px 24px 0; display:flex; align-items:center; justify-content:space-between;">
        <div>
          <h3 style="font-size:1.1rem; font-weight:700;">Switch ${roleLabel} Account</h3>
          <p style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">Select an account to log in as</p>
        </div>
        <button onclick="closeAccountPicker()" style="width:32px; height:32px; border-radius:var(--radius); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; cursor:pointer; background:var(--bg);"><i class="ri-close-line"></i></button>
      </div>
      <div style="padding:20px 24px; overflow-y:auto; display:flex; flex-direction:column; gap:10px;">
        ${accountListHTML}
      </div>
    </div>
  `;
  modal.addEventListener('click', (e) => { if (e.target === modal) closeAccountPicker(); });
  document.body.appendChild(modal);
}

function closeAccountPicker() {
  const modal = document.getElementById('accountPickerModal');
  if (modal) modal.remove();
}

// --- Update Account Switcher Button in Sidebar ---
function updateAccountSwitcher() {
  const switcherBtn = document.getElementById('accountSwitcherBtn');
  if (!switcherBtn) return;
  const acct = getCurrentAccount();
  switcherBtn.innerHTML = `
    <span class="nav-icon"><i class="ri-swap-line"></i></span>
    Switch Account
    <span class="nav-badge" style="background:var(--primary); font-size:0.6rem;">${acct.initials}</span>
  `;
}

function updateRoleSwitcher() {
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.classList.remove('active', 'active-ce', 'active-admin');
    if (btn.dataset.role === currentRole) {
      if (currentRole === 'student') btn.classList.add('active');
      else if (currentRole === 'ce') btn.classList.add('active-ce');
      else if (currentRole === 'admin') btn.classList.add('active-admin');
    }
  });
}

function updateSidebarUser() {
  const acct = getCurrentAccount();
  const avatar = document.querySelector('.sidebar-user .user-avatar');
  const name = document.querySelector('.sidebar-user .user-name');
  const roleEl = document.querySelector('.sidebar-user .user-role');
  if (avatar) {
    avatar.textContent = acct.initials;
    avatar.className = 'user-avatar';
  }
  if (name) name.textContent = acct.name;
  if (roleEl) {
    if (currentRole === 'student') roleEl.textContent = `${acct.year} Dietetics Student`;
    else if (currentRole === 'ce') roleEl.textContent = `Clinical Educator - ${acct.specialty}`;
    else roleEl.textContent = acct.title;
  }
}

function updateNavVisibility() {
  document.querySelectorAll('[data-roles]').forEach(el => {
    const allowedRoles = el.dataset.roles.split(',');
    el.style.display = allowedRoles.includes(currentRole) ? '' : 'none';
  });
  document.querySelectorAll('[data-section-roles]').forEach(el => {
    const allowedRoles = el.dataset.sectionRoles.split(',');
    el.style.display = allowedRoles.includes(currentRole) ? '' : 'none';
  });
}

function updatePageContent() {
  document.querySelectorAll('[data-visible-roles]').forEach(el => {
    const allowedRoles = el.dataset.visibleRoles.split(',');
    el.style.display = allowedRoles.includes(currentRole) ? '' : 'none';
  });
  const acct = getCurrentAccount();
  const welcomeName = document.getElementById('welcomeName');
  if (welcomeName) welcomeName.textContent = acct.name;

  // Update dynamic student stats if visible
  if (currentRole === 'student') {
    const statSessions = document.getElementById('statSessions');
    const statProgress = document.getElementById('statProgress');
    if (statSessions) statSessions.textContent = acct.sessions;
    if (statProgress) statProgress.textContent = acct.progress + '%';
  }
}

// --- Sidebar Toggle ---
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.toggle('open');
}

document.addEventListener('click', (e) => {
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.querySelector('.btn-icon');
  if (window.innerWidth <= 768 && sidebar && !sidebar.contains(e.target) && menuBtn && !menuBtn.contains(e.target)) {
    sidebar.classList.remove('open');
  }
});

// --- Tabs ---
function initTabs() {
  document.querySelectorAll('.tab-nav').forEach(nav => {
    const btns = nav.querySelectorAll('.tab-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const group = nav.dataset.tabGroup || 'default';
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.tab;
        document.querySelectorAll(`.tab-pane[data-tab-group="${group}"]`).forEach(pane => {
          pane.classList.toggle('active', pane.dataset.tab === target);
        });
      });
    });
  });
}

// --- Animate on Scroll ---
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.card, .stat-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(12px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });
}

// --- Progress Bar Animation ---
function animateProgressBars() {
  document.querySelectorAll('.progress-bar').forEach(bar => {
    const width = bar.style.width;
    bar.style.width = '0';
    setTimeout(() => { bar.style.width = width; }, 200);
  });
}

// --- Notification System ---
function showNotification(message, type = 'info') {
  const notif = document.createElement('div');
  notif.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 99999;
    padding: 14px 20px; border-radius: 10px;
    background: ${type === 'success' ? '#DCFCE7' : type === 'error' ? '#FEE2E2' : '#E8F4FD'};
    color: ${type === 'success' ? '#15803D' : type === 'error' ? '#B91C1C' : '#084E8A'};
    border: 1px solid ${type === 'success' ? '#BBF7D0' : type === 'error' ? '#FECACA' : '#BAE6FD'};
    font-size: 0.85rem; font-weight: 600;
    box-shadow: 0 8px 24px rgba(0,0,0,0.1);
    animation: modalIn 0.3s ease;
    display: flex; align-items: center; gap: 8px;
    max-width: 420px;
  `;
  const icon = type === 'success' ? 'ri-checkbox-circle-line' : type === 'error' ? 'ri-error-warning-line' : 'ri-information-line';
  notif.innerHTML = `<i class="${icon}"></i> ${message}`;
  document.body.appendChild(notif);
  setTimeout(() => {
    notif.style.opacity = '0';
    notif.style.transition = 'opacity 0.3s';
    setTimeout(() => notif.remove(), 300);
  }, 3500);
}

// --- Editable Content ---
function toggleEdit(el) {
  const section = el.closest('.editable-section');
  const contentEl = section.querySelector('.editable-content');
  if (!contentEl) return;
  
  if (section.classList.contains('editing')) {
    contentEl.contentEditable = 'false';
    section.classList.remove('editing');
    el.innerHTML = '<i class="ri-edit-line"></i>';
    showNotification('Changes saved successfully', 'success');
  } else {
    if (currentRole !== 'student' && currentRole !== 'admin') {
      showNotification('Only students and admins can edit content', 'error');
      return;
    }
    contentEl.contentEditable = 'true';
    contentEl.focus();
    section.classList.add('editing');
    el.innerHTML = '<i class="ri-check-line"></i>';
    showNotification('Edit mode enabled - make your changes', 'info');
  }
}

// --- Feedback Summary Actions ---
function confirmSection(btn) {
  const card = btn.closest('.summary-action-card');
  if (card) {
    card.style.borderColor = '#BBF7D0';
    card.style.background = 'var(--success-light)';
    card.querySelector('.action-status').innerHTML = '<span class="badge badge-green"><i class="ri-checkbox-circle-line"></i> Confirmed</span>';
  }
  showNotification('Section confirmed', 'success');
}

function rejectSection(btn) {
  const card = btn.closest('.summary-action-card');
  if (card) {
    card.style.borderColor = '#FECACA';
    card.style.background = 'var(--danger-light)';
    card.querySelector('.action-status').innerHTML = '<span class="badge badge-red"><i class="ri-close-circle-line"></i> Rejected</span>';
  }
  showNotification('Section rejected - will be reviewed', 'info');
}

// --- Settings & Goals ---
function openSettings() {
  showNotification('Settings panel - configure account preferences', 'info');
}

function generateGoals() {
  showNotification('Generating personalised learning goals from feedback analysis...', 'info');
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initScrollAnimations();
  setTimeout(animateProgressBars, 300);
  // Initialise role & account system
  updateRoleSwitcher();
  updateSidebarUser();
  updateNavVisibility();
  updatePageContent();
  updateAccountSwitcher();
});
