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
  loadAdminCategories();
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

async function loadAdminCategories() {
  const tbody = document.getElementById('admin-categories-tbody');
  if (!tbody) return;

  try {
    const res = await fetch(`${API_BASE}/api/categories`);
    const data = await res.json();

    if (data.success && data.data.categories) {
      const categories = data.data.categories;
      if (categories.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); font-weight: 600;">لا توجد أقسام مسجلة حالياً. قم بإضافة قسم جديد.</td></tr>`;
        return;
      }

      tbody.innerHTML = categories.map(c => `
        <tr>
          <td><strong>${escapeHtml(c.name)}</strong></td>
          <td>${escapeHtml(c.description || 'بدون وصف')}</td>
          <td><span class="badge badge-info">${c._count ? c._count.products : 0} منتجات</span></td>
          <td>${new Date(c.createdAt).toLocaleDateString('ar-EG')}</td>
          <td>
            <button onclick="openEditCategoryModal('${c.id}', '${escapeHtml(c.name)}', '${escapeHtml(c.description || '')}')" class="btn btn-outline" style="padding: 4px 10px; font-size: 0.8rem;">✏️ تعديل</button>
            <button onclick="deleteCategoryAction('${c.id}')" class="btn btn-outline" style="padding: 4px 10px; font-size: 0.8rem; color: #ef4444; border-color: rgba(239,68,68,0.3); margin-right: 4px;">🗑️ حذف</button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ef4444; font-weight: 700;">فشل جلب قائمة الأقسام.</td></tr>`;
  }
}

window.openCreateCategoryModal = function() {
  document.getElementById('cat-id').value = '';
  document.getElementById('cat-name').value = '';
  document.getElementById('cat-desc').value = '';
  document.getElementById('cat-modal-title').textContent = 'إضافة قسم جديد';
  document.getElementById('category-modal').classList.add('active');
};

window.openEditCategoryModal = function(id, name, description) {
  document.getElementById('cat-id').value = id;
  document.getElementById('cat-name').value = name;
  document.getElementById('cat-desc').value = description;
  document.getElementById('cat-modal-title').textContent = 'تعديل قسم';
  document.getElementById('category-modal').classList.add('active');
};

window.closeCategoryModal = function() {
  document.getElementById('category-modal').classList.remove('active');
};

window.deleteCategoryAction = async function(id) {
  if (!confirm('هل أنت تأكد من حذف هذا القسم؟ سيتم إلغاء ربطه من المنتجات الحالية.')) return;

  try {
    const res = await fetch(`${API_BASE}/api/categories/${id}`, {
      method: 'DELETE',
      headers: Auth.getHeaders()
    });

    const data = await res.json();
    if (data.success) {
      alert('تم حذف القسم بنجاح.');
      loadAdminCategories();
    } else {
      alert(`تعذر حذف القسم: ${data.message}`);
    }
  } catch (err) {
    alert('حدث خطأ أثناء حذف القسم.');
  }
};

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

// Bind handlers to window object
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

  // Category form submit
  const catForm = document.getElementById('category-form');
  if (catForm) {
    catForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('cat-id').value;
      const name = document.getElementById('cat-name').value.trim();
      const description = document.getElementById('cat-desc').value.trim();

      const method = id ? 'PUT' : 'POST';
      const endpoint = id ? `${API_BASE}/api/categories/${id}` : `${API_BASE}/api/categories`;

      try {
        const res = await fetch(endpoint, {
          method,
          headers: Auth.getHeaders(),
          body: JSON.stringify({ name, description })
        });

        const data = await res.json();
        if (data.success) {
          alert('تم حفظ القسم بنجاح!');
          closeCategoryModal();
          loadAdminCategories();
        } else {
          alert(`خطأ: ${data.message}`);
        }
      } catch (err) {
        alert('فشل حفظ بيانات القسم.');
      }
    });
  }

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
      const categoriesTab = document.getElementById('admin-tab-categories');
      const systemTab = document.getElementById('admin-tab-system');

      if (usersTab) usersTab.style.display = target === 'users' ? 'block' : 'none';
      if (categoriesTab) categoriesTab.style.display = target === 'categories' ? 'block' : 'none';
      if (systemTab) systemTab.style.display = target === 'system' ? 'block' : 'none';
    });
  }
}
