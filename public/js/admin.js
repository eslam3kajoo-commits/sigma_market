/* ==========================================================================
   Sigma Market - Admin Panel Integration Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  verifyAdminAccess();
});

async function verifyAdminAccess() {
  const unauthorizedCard = document.getElementById('admin-unauthorized-card');
  const adminBody = document.getElementById('admin-panel-body');

  if (!Auth.user || Auth.user.role !== 'Admin') {
    if (unauthorizedCard) unauthorizedCard.style.display = 'block';
    if (adminBody) adminBody.style.display = 'none';
    return;
  }

  if (unauthorizedCard) unauthorizedCard.style.display = 'none';
  if (adminBody) adminBody.style.display = 'block';

  loadAdminMetrics();
  loadAdminUsers();
  setupAdminEvents();
}

async function loadAdminMetrics() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/metrics`, { headers: Auth.getHeaders() });
    const data = await res.json();

    if (data.success && data.data.metrics) {
      const m = data.data.metrics;
      document.getElementById('m-users').textContent = m.totalUsers;
      document.getElementById('m-merchants').textContent = m.totalMerchants;
      document.getElementById('m-customers').textContent = m.totalCustomers;
      document.getElementById('m-charities').textContent = m.totalCharities;
      document.getElementById('m-products').textContent = m.totalProducts;
    }
  } catch (err) {
    console.error('فشل تحميل الإحصائيات:', err);
  }
}

async function loadAdminUsers() {
  const tbody = document.getElementById('admin-users-tbody');
  const roleFilter = document.getElementById('user-role-filter').value;
  const search = document.getElementById('user-search-input').value;

  let url = `${API_BASE}/api/admin/users?`;
  if (roleFilter) url += `role=${encodeURIComponent(roleFilter)}&`;
  if (search) url += `search=${encodeURIComponent(search)}&`;

  try {
    const res = await fetch(url, { headers: Auth.getHeaders() });
    const data = await res.json();

    if (data.success && data.data.users) {
      const users = data.data.users;
      if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); font-weight: 600;">لا يوجد مستخدمين يطابقون شروط البحث.</td></tr>`;
        return;
      }

      tbody.innerHTML = users.map(u => {
        const translatedRole = ROLE_MAP[u.role.name] || u.role.name;
        const isStatusActive = u.status === 'ACTIVE';
        const translatedStatus = isStatusActive ? 'نشط' : 'معطل';

        return `
          <tr>
            <td><strong>${escapeHtml(u.fullName)}</strong></td>
            <td>${escapeHtml(u.email)}</td>
            <td><span class="badge badge-info">${escapeHtml(translatedRole)}</span></td>
            <td>
              <span class="badge ${isStatusActive ? 'badge-success' : 'badge-warning'}">
                ${escapeHtml(translatedStatus)}
              </span>
            </td>
            <td>${new Date(u.createdAt).toLocaleDateString('ar-EG')}</td>
            <td>
              <button onclick="toggleStatus('${u.id}', '${u.status}')" class="btn btn-outline" style="padding: 4px 10px; font-size: 0.8rem; font-weight: 700;">
                ${isStatusActive ? 'تجميد الحساب' : 'تفعيل الحساب'}
              </button>
              <button onclick="promptRoleChange('${u.id}', '${u.role.name}')" class="btn btn-outline" style="padding: 4px 10px; font-size: 0.8rem; font-weight: 700; margin-right: 4px;">
                تعديل الدور
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444; font-weight: 700;">تعذر الاتصال بالخادم لجلب قائمة المستخدمين. يرجى التأكد من تشغيل السيرفر وحالة الاتصال.</td></tr>`;
  }
}

async function toggleStatus(userId, currentStatus) {
  const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
  const actionText = newStatus === 'ACTIVE' ? 'تفعيل' : 'تجميد';
  if (!confirm(`هل أنت تأكد من ${actionText} حساب المستخدم؟`)) return;

  try {
    const res = await fetch(`${API_BASE}/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: Auth.getHeaders(),
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();

    if (data.success) {
      loadAdminUsers();
      loadAdminMetrics();
    } else {
      alert(`فشلت العملية: ${data.message}`);
    }
  } catch (err) {
    alert('فشل تحديث حالة المستخدم.');
  }
}

async function promptRoleChange(userId, currentRole) {
  const newRole = prompt(`أدخل الدور الجديد للمستخدم (Customer = عميل, Merchant = تاجر, Charity = جمعية خيرية, Admin = مدير النظام):`, currentRole);
  if (!newRole || newRole === currentRole) return;

  if (!['Customer', 'Merchant', 'Charity', 'Admin'].includes(newRole)) {
    alert('اسم الدور المحدد غير صحيح. يجب اختيار أحد الأدوار المعرفة.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: Auth.getHeaders(),
      body: JSON.stringify({ roleName: newRole })
    });
    const data = await res.json();

    if (data.success) {
      loadAdminUsers();
      loadAdminMetrics();
    } else {
      alert(`فشل تغيير الدور: ${data.message}`);
    }
  } catch (err) {
    alert('فشل تحديث دور المستخدم.');
  }
}

// Bind handlers to window object for inline onclick attributes
window.toggleStatus = toggleStatus;
window.promptRoleChange = promptRoleChange;

function setupAdminEvents() {
  document.getElementById('user-search-input').addEventListener('input', loadAdminUsers);
  document.getElementById('user-role-filter').addEventListener('change', loadAdminUsers);

  document.getElementById('btn-admin-logout').addEventListener('click', async () => {
    await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', headers: Auth.getHeaders() });
    Auth.clearSession();
    window.location.href = './index.html';
  });

  const adminNav = document.querySelector('.admin-nav');
  if (adminNav) {
    adminNav.addEventListener('click', (e) => {
      const btn = e.target.closest('.admin-nav-btn');
      if (!btn) return;

      e.preventDefault();
      document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const target = btn.getAttribute('data-admin-tab');
      const usersTab = document.getElementById('admin-tab-users');
      const systemTab = document.getElementById('admin-tab-system');

      if (usersTab) usersTab.style.display = target === 'users' ? 'block' : 'none';
      if (systemTab) systemTab.style.display = target === 'system' ? 'block' : 'none';
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
