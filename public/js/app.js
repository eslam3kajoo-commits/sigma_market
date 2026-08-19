/* ==========================================================================
   Sigma Market - Main Application Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Auth state
  Auth.updateUI();

  // Load API Health Status
  fetchHealthStatus();

  // Load Products Catalog
  loadProducts();

  // Setup Event Listeners
  setupTabNavigation();
  setupAuthModal();
  setupForms();
  setupMetricCardsInteractivity();
});

async function fetchHealthStatus() {
  const statEl = document.getElementById('stat-api-status');
  const badgeEl = document.getElementById('api-status-badge');
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    const data = await res.json();
    if (data.success) {
      if (statEl) statEl.textContent = 'نشط ويعمل (200)';
      if (statEl) statEl.style.color = '#059669';
      if (badgeEl) badgeEl.textContent = 'نشط';
    } else {
      if (statEl) statEl.textContent = 'خطأ بالخادم';
      if (badgeEl) badgeEl.textContent = 'تحذير';
    }
  } catch (err) {
    if (statEl) {
      statEl.textContent = 'غير متصل';
      statEl.style.color = '#ef4444';
    }
    if (badgeEl) badgeEl.textContent = 'معطل';
  }
}

async function loadProducts() {
  const listEl = document.getElementById('product-list');
  const countEl = document.getElementById('stat-product-count');

  try {
    const res = await fetch(`${API_BASE}/api/products`);
    const data = await res.json();

    if (data.success && data.data.products) {
      const products = data.data.products;
      if (countEl) countEl.textContent = products.length;

      if (products.length === 0) {
        listEl.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px; font-weight: 600;">لا توجد منتجات مسجلة حالياً في كتالوج السوبرماركت والضمان.</div>`;
        return;
      }

      listEl.innerHTML = products.map(prod => `
        <div class="product-card">
          <div>
            <div class="product-header">
              <span class="product-name">${escapeHtml(prod.name)}</span>
              <span class="product-barcode">${escapeHtml(prod.barcode)}</span>
            </div>
            <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 14px; font-weight: 500;">${escapeHtml(prod.description)}</p>
            <div class="product-price">$${prod.price.toFixed(2)}</div>
          </div>
          <div>
            <div style="display: flex; gap: 8px; font-size: 0.8rem; margin-bottom: 10px; flex-wrap: wrap;">
              <span class="badge ${prod.stock > 0 ? 'badge-success' : 'badge-warning'}">المخزون: ${prod.stock}</span>
              ${prod.expiryInfo ? `<span class="badge badge-info">الانتهاء: ${new Date(prod.expiryInfo.expiryDate).toLocaleDateString('ar-EG')}</span>` : ''}
            </div>
            <div style="font-size: 0.8rem; color: var(--text-dim); font-weight: 600;">التاجر: ${escapeHtml(prod.merchant ? prod.merchant.fullName : 'متجر النظام الرئيسي')}</div>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    if (listEl) listEl.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 20px; font-weight: 700;">تعذر تحميل كتالوج المنتجات.</div>`;
  }
}

function setupTabNavigation() {
  const container = document.querySelector('.tab-container');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.tab-btn');
    if (!tabBtn) return;

    e.preventDefault();
    const targetTab = tabBtn.getAttribute('data-tab');
    if (!targetTab) return;

    // 1. Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    // 2. Add active class to clicked button
    tabBtn.classList.add('active');

    // 3. Hide all tab content sections
    document.querySelectorAll('.tab-content').forEach(content => {
      content.style.display = 'none';
      content.classList.remove('active');
    });

    // 4. Show the selected tab content container
    const activeContent = document.getElementById(`tab-${targetTab}`);
    if (activeContent) {
      activeContent.style.display = 'block';
      activeContent.classList.add('active');
    }

    // 5. Trigger relevant tab data loading
    if (targetTab === 'catalog') {
      loadProducts();
    } else if (targetTab === 'roles') {
      loadRoles();
    }
  });
}

async function loadRoles() {
  const rolesListEl = document.getElementById('roles-list');
  try {
    const res = await fetch(`${API_BASE}/api/roles`, { headers: Auth.getHeaders() });
    const data = await res.json();

    if (data.success && data.data.roles) {
      rolesListEl.innerHTML = data.data.roles.map(role => {
        const translatedRoleName = ROLE_MAP[role.name] || role.name;
        return `
          <div class="card" style="padding: 22px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="font-size: 1.15rem; color: var(--primary); font-weight: 800;">${escapeHtml(translatedRoleName)}</h3>
                <span class="badge badge-info">${role._count.users} مستخدمين</span>
              </div>
              <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 14px; font-weight: 500;">${escapeHtml(role.description)}</p>
              <div style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 18px;">
                <strong style="color: var(--text-main);">الصلاحيات:</strong> ${role.permissions.map(p => `<code style="background: #fff7ed; color: var(--primary); padding: 2px 8px; border-radius: 4px; margin-left: 4px; font-weight: 700; border: 1px solid rgba(249,115,22,0.2);">${escapeHtml(p)}</code>`).join(' ')}
              </div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button onclick="demoLogin('${role.name}')" class="btn btn-primary" style="flex: 1; padding: 8px 12px; font-size: 0.82rem;">
                🚀 تجربة الدخول كـ (${translatedRoleName})
              </button>
              <button onclick="openRegisterForRole('${role.name}')" class="btn btn-outline" style="padding: 8px 12px; font-size: 0.82rem;">
                حساب جديد
              </button>
            </div>
          </div>
        `;
      }).join('');
    } else {
      rolesListEl.innerHTML = renderFallbackRolesUI();
    }
  } catch (err) {
    rolesListEl.innerHTML = renderFallbackRolesUI();
  }
}

function renderFallbackRolesUI() {
  const roles = [
    { name: 'Admin', title: 'مدير النظام (أدمن)', desc: 'وصول شامل لإدارة كافة التجار، المستخدمين، المنتجات، والعمولات.' },
    { name: 'Merchant', title: 'تاجر (مدير المتجر)', desc: 'إضافة المنتجات، تتبع المخزون، إدارة مبيعات الفرع والتصفية الفورية.' },
    { name: 'Customer', title: 'عميل (مشتري)', desc: 'تصفح المنتجات والباركود، إجراء الطلبات والتأمين بالضمان الرقمي.' },
    { name: 'Charity', title: 'جمعية خيرية', desc: 'استلام وتتبع التبرعات الأغذية والمنتجات قبل انتهاء الصلاحية.' }
  ];

  return roles.map(role => `
    <div class="card" style="padding: 22px; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h3 style="font-size: 1.15rem; color: var(--primary); font-weight: 800;">${escapeHtml(role.title)}</h3>
          <span class="badge badge-info">دور أساسي</span>
        </div>
        <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 16px; font-weight: 500;">${escapeHtml(role.desc)}</p>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button onclick="demoLogin('${role.name}')" class="btn btn-primary" style="flex: 1; padding: 8px 12px; font-size: 0.82rem;">
          🚀 تجربة الدخول كـ (${role.title})
        </button>
        <button onclick="openRegisterForRole('${role.name}')" class="btn btn-outline" style="padding: 8px 12px; font-size: 0.82rem;">
          حساب جديد
        </button>
      </div>
    </div>
  `).join('');
}

window.demoLogin = async function(roleName) {
  const credentialsMap = {
    'Admin': { email: 'admin@sigmamarket.local', password: 'AdminSecure2026!' },
    'Merchant': { email: 'merchant@sigmamarket.local', password: 'MerchantSecure2026!' },
    'Customer': { email: 'customer@sigmamarket.local', password: 'CustomerSecure2026!' },
    'Charity': { email: 'charity@sigmamarket.local', password: 'CharitySecure2026!' }
  };

  const creds = credentialsMap[roleName];
  if (!creds) return;

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds)
    });
    const data = await res.json();
    if (data.success) {
      Auth.setSession(data.data.token, data.data.user);
      loadProducts();
      const translatedRole = ROLE_MAP[roleName] || roleName;
      alert(`تم تسجيل الدخول بنجاح كـ (${translatedRole})! تم تفعيل الصلاحيات والتجربة الحية.`);

      if (roleName === 'Merchant' || roleName === 'Admin') {
        const createTab = document.querySelector('[data-tab="create-product"]');
        if (createTab) createTab.click();
      } else {
        const catalogTab = document.querySelector('[data-tab="catalog"]');
        if (catalogTab) catalogTab.click();
      }
    } else {
      alert(`خطأ أثناء الدخول التجريبي: ${data.message}`);
    }
  } catch (err) {
    alert('فشل الاتصال بالخادم للدخول التجريبي.');
  }
};

window.openRegisterForRole = function(roleName) {
  const modal = document.getElementById('auth-modal');
  const roleSelect = document.getElementById('auth-role');
  const toggleBtn = document.getElementById('auth-toggle-btn');

  if (roleSelect) roleSelect.value = roleName;

  if (toggleBtn && document.getElementById('modal-title').textContent !== 'إنشاء حساب جديد') {
    toggleBtn.click();
  }

  if (modal) modal.classList.add('active');
};

function setupAuthModal() {
  const modal = document.getElementById('auth-modal');
  const btnOpen = document.getElementById('btn-login-modal');
  const btnClose = document.getElementById('modal-close');
  const btnLogout = document.getElementById('btn-logout');
  const toggleBtn = document.getElementById('auth-toggle-btn');

  let isRegistering = false;

  btnOpen.addEventListener('click', () => modal.classList.add('active'));
  btnClose.addEventListener('click', () => modal.classList.remove('active'));

  // Close modal when clicking outside content box
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });

  btnLogout.addEventListener('click', async () => {
    await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', headers: Auth.getHeaders() });
    Auth.clearSession();
    loadProducts();
  });

  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isRegistering = !isRegistering;
    document.getElementById('modal-title').textContent = isRegistering ? 'إنشاء حساب جديد' : 'تسجيل الدخول';
    document.getElementById('auth-submit-btn').textContent = isRegistering ? 'إنشاء الحساب' : 'تسجيل الدخول';
    document.getElementById('group-fullname').style.display = isRegistering ? 'block' : 'none';
    document.getElementById('group-role').style.display = isRegistering ? 'block' : 'none';
    document.getElementById('auth-toggle-text').textContent = isRegistering ? 'لديك حساب بالفعل؟' : "ليس لديك حساب؟";
    toggleBtn.textContent = isRegistering ? 'تسجيل الدخول' : 'إنشاء حساب جديد';
  });

  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const fullName = document.getElementById('auth-fullname').value;
    const roleName = document.getElementById('auth-role').value;

    const endpoint = isRegistering ? `${API_BASE}/api/auth/register` : `${API_BASE}/api/auth/login`;
    const payload = isRegistering
      ? { email, password, fullName, roleName }
      : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        Auth.setSession(data.data.token, data.data.user);
        modal.classList.remove('active');
        loadProducts();
        const userRoleAr = ROLE_MAP[data.data.user.role] || data.data.user.role;
        alert(`مرحباً بك، ${data.data.user.fullName || data.data.user.email}! تم تفعيل الحساب كـ (${userRoleAr}).`);
      } else {
        alert(`خطأ: ${data.message}`);
      }
    } catch (err) {
      alert('فشلت عملية طلب المصادقة. يرجى التأكد من البيانات والخادم.');
    }
  });
}

function setupForms() {
  // Barcode Lookup Form
  const barcodeForm = document.getElementById('barcode-search-form');
  if (barcodeForm) {
    barcodeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const barcode = document.getElementById('barcode-input').value.trim();
      const resultEl = document.getElementById('barcode-result');

      resultEl.innerHTML = '<div style="color: var(--text-muted); font-weight: 600;">جاري البحث في السجل...</div>';

      try {
        const res = await fetch(`${API_BASE}/api/products/barcode/${encodeURIComponent(barcode)}`);
        const data = await res.json();

        if (data.success && data.data.product) {
          const p = data.data.product;
          resultEl.innerHTML = `
            <div style="background: rgba(16, 185, 129, 0.08); border: 1.5px solid #10b981; padding: 18px; border-radius: var(--radius-md);">
              <h3 style="color: #059669; margin-bottom: 10px; font-weight: 800;">✔ مسجل وموثق بالضمان</h3>
              <p style="margin-bottom: 4px;"><strong>المنتج:</strong> ${escapeHtml(p.name)}</p>
              <p style="margin-bottom: 4px;"><strong>الباركود:</strong> <code style="background: #ffffff; padding: 2px 6px; border-radius: 4px;">${escapeHtml(p.barcode)}</code></p>
              <p style="margin-bottom: 4px;"><strong>السعر:</strong> $${p.price.toFixed(2)}</p>
              <p style="margin-bottom: 4px;"><strong>الحالة:</strong> ${escapeHtml(p.status)}</p>
              ${p.expiryInfo ? `<p><strong>تاريخ الضمان والصلاحية:</strong> ${new Date(p.expiryInfo.expiryDate).toLocaleDateString('ar-EG')}</p>` : ''}
            </div>
          `;
        } else {
          resultEl.innerHTML = `
            <div style="background: rgba(239, 68, 68, 0.08); border: 1.5px solid #ef4444; padding: 18px; border-radius: var(--radius-md); color: #dc2626; font-weight: 600;">
              ✖ لا يوجد سجل ضمان أو منتج مطابق للباركود '${escapeHtml(barcode)}'.
            </div>
          `;
        }
      } catch (err) {
        resultEl.innerHTML = `<div style="color: #ef4444; font-weight: 700;">فشلت عملية البحث عن الباركود.</div>`;
      }
    });
  }

  // Create Product Form (Merchant/Admin)
  const createForm = document.getElementById('create-product-form');
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('prod-name').value;
      const description = document.getElementById('prod-desc').value;
      const price = parseFloat(document.getElementById('prod-price').value);
      const stock = parseInt(document.getElementById('prod-stock').value, 10);
      const barcode = document.getElementById('prod-barcode').value;
      const expiryDate = document.getElementById('prod-expiry').value;

      try {
        const res = await fetch(`${API_BASE}/api/products`, {
          method: 'POST',
          headers: Auth.getHeaders(),
          body: JSON.stringify({ name, description, price, stock, barcode, expiryDate: expiryDate || undefined })
        });

        const data = await res.json();

        if (data.success) {
          alert('تم تسجيل المنتج بنجاح في السوبرماركت والضمان!');
          createForm.reset();
          loadProducts();
          document.querySelector('[data-tab="catalog"]').click();
        } else {
          alert(`فشلت العملية: ${data.message}`);
        }
      } catch (err) {
        alert('حدث خطأ أثناء إضافة المنتج.');
      }
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

function setupMetricCardsInteractivity() {
  const cardApiStatus = document.getElementById('card-api-status');
  const cardActiveRole = document.getElementById('card-active-role');
  const cardProductCount = document.getElementById('card-product-count');

  if (cardApiStatus) {
    cardApiStatus.addEventListener('click', async () => {
      const statEl = document.getElementById('stat-api-status');
      if (statEl) statEl.textContent = 'جاري الفحص...';
      await fetchHealthStatus();
      alert('تم إعادة فحص اتصال خوادم الـ API بنجاح (HTTP 200 OK).');
    });
  }

  if (cardActiveRole) {
    cardActiveRole.addEventListener('click', () => {
      const rolesTab = document.querySelector('[data-tab="roles"]');
      if (rolesTab) rolesTab.click();
    });
  }

  if (cardProductCount) {
    cardProductCount.addEventListener('click', () => {
      const catalogTab = document.querySelector('[data-tab="catalog"]');
      if (catalogTab) catalogTab.click();
    });
  }
}
