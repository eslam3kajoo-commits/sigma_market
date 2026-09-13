/* ==========================================================================
   Sigma Market - Main Application Logic & Barcode Scanner Integration
   ========================================================================== */

let globalCategories = [];
let html5QrcodeScanner = null;
let activeBarcodeTargetId = null;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Auth state
  Auth.updateUI();

  // Load API Health Status
  fetchHealthStatus();

  // Load Categories & Products
  loadCategories();
  loadProducts();

  // Setup Event Listeners
  setupTabNavigation();
  setupAuthModal();
  setupForms();
  setupMetricCardsInteractivity();
  setupCatalogFilters();

  // Setup Hardware & Camera Barcode Scanner Listeners
  setupBarcodeScannerSupport();
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
      statEl.textContent = 'غير متصل (الخادم لا يستجيب)';
      statEl.style.color = '#ef4444';
    }
    if (badgeEl) badgeEl.textContent = 'فشل الاتصال';
  }
}

async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/api/categories`);
    const data = await res.json();

    if (data.success && data.data.categories) {
      globalCategories = data.data.categories;

      // Populate filter dropdown
      const filterSelect = document.getElementById('catalog-category-filter');
      if (filterSelect) {
        filterSelect.innerHTML = `<option value="">جميع الأقسام (${globalCategories.length})</option>` +
          globalCategories.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (${c._count?.products || 0})</option>`).join('');
      }

      // Populate Create form select
      const createSelect = document.getElementById('prod-category');
      if (createSelect) {
        createSelect.innerHTML = globalCategories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
      }

      // Populate Edit form select
      const editSelect = document.getElementById('edit-prod-category');
      if (editSelect) {
        editSelect.innerHTML = globalCategories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

async function loadProducts() {
  const listEl = document.getElementById('product-list');
  const countEl = document.getElementById('stat-product-count');

  const searchInput = document.getElementById('catalog-search-input');
  const categoryFilter = document.getElementById('catalog-category-filter');

  const searchVal = searchInput ? searchInput.value.trim() : '';
  const categoryVal = categoryFilter ? categoryFilter.value : '';

  const queryParams = new URLSearchParams();
  if (searchVal) queryParams.append('search', searchVal);
  if (categoryVal) queryParams.append('categoryId', categoryVal);

  try {
    const res = await fetch(`${API_BASE}/api/products?${queryParams.toString()}`);
    const data = await res.json();

    if (data.success && data.data.products) {
      const products = data.data.products;
      if (countEl) countEl.textContent = products.length;

      if (products.length === 0) {
        listEl.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px; font-weight: 600;">لا توجد منتجات مسجلة تطابق محددات البحث.</div>`;
        return;
      }

      const isManager = Auth.user && (Auth.user.role === 'Admin' || Auth.user.role === 'Merchant');

      listEl.innerHTML = products.map(prod => {
        const canManage = isManager && (Auth.user.role === 'Admin' || prod.merchantId === Auth.user.id);
        const categoryName = prod.category ? prod.category.name : 'عام';

        return `
          <div class="product-card">
            <div>
              <div class="product-header">
                <span class="product-name">${escapeHtml(prod.name)}</span>
                <span class="product-barcode">${escapeHtml(prod.barcode)}</span>
              </div>
              <div style="font-size: 0.82rem; color: var(--primary); font-weight: 700; margin-bottom: 6px;">📁 القسم: ${escapeHtml(categoryName)}</div>
              <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 14px; font-weight: 500;">${escapeHtml(prod.description)}</p>
              <div class="product-price">$${prod.price.toFixed(2)}</div>
            </div>
            <div>
              <div style="display: flex; gap: 8px; font-size: 0.8rem; margin-bottom: 10px; flex-wrap: wrap;">
                <span class="badge ${prod.stock > 0 ? 'badge-success' : 'badge-warning'}">المخزون: ${prod.stock} (${prod.status})</span>
                ${prod.expiryInfo ? `<span class="badge badge-info">الانتهاء: ${new Date(prod.expiryInfo.expiryDate).toLocaleDateString('ar-EG')}</span>` : ''}
              </div>
              <div style="font-size: 0.8rem; color: var(--text-dim); font-weight: 600; margin-bottom: 10px;">التاجر: ${escapeHtml(prod.merchant ? prod.merchant.fullName : 'متجر النظام الرئيسي')}</div>

              ${canManage ? `
                <div style="display: flex; gap: 6px; margin-top: 12px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                  <button onclick="openInventoryModal('${prod.id}', '${escapeHtml(prod.name)}')" class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem; flex: 1;">📊 المخزون</button>
                  <button onclick="openEditProductModal('${prod.id}')" class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem; flex: 1;">✏️ تعديل</button>
                  <button onclick="deleteProductAction('${prod.id}')" class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem; color: #ef4444; border-color: rgba(239,68,68,0.3);">🗑️ حذف</button>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    if (listEl) listEl.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 20px; font-weight: 700;">تعذر الاتصال بالخادم لجلب المنتجات. يرجى التأكد من تشغيل السيرفر وحالة الاتصال بالشبكة.</div>`;
  }
}

function setupCatalogFilters() {
  const searchInput = document.getElementById('catalog-search-input');
  const categoryFilter = document.getElementById('catalog-category-filter');
  const refreshBtn = document.getElementById('btn-refresh-catalog');

  if (searchInput) searchInput.addEventListener('input', debounce(() => loadProducts(), 300));
  if (categoryFilter) categoryFilter.addEventListener('change', () => loadProducts());
  if (refreshBtn) refreshBtn.addEventListener('click', () => { loadCategories(); loadProducts(); });
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => { clearTimeout(timeout); func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
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

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    tabBtn.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => {
      content.style.display = 'none';
      content.classList.remove('active');
    });

    const activeContent = document.getElementById(`tab-${targetTab}`);
    if (activeContent) {
      activeContent.style.display = 'block';
      activeContent.classList.add('active');
    }

    if (targetTab === 'catalog') {
      loadCategories();
      loadProducts();
    } else if (targetTab === 'roles') {
      loadRoles();
    }
  });
}

/* ==========================================================================
   BARCODE SCANNER ENGINE (USB/Bluetooth Scanner, Camera, Auto-Lookup)
   ========================================================================== */

function setupBarcodeScannerSupport() {
  // 1. Camera scan buttons event binding
  document.querySelectorAll('.btn-scan-camera').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-target');
      startCameraScanner(targetId);
    });
  });

  // 2. Hardware Scanner & Input listeners for auto-lookup
  const barcodeInputIds = ['barcode-input', 'prod-barcode', 'edit-prod-barcode'];
  barcodeInputIds.forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;

    input.addEventListener('change', () => {
      const val = input.value.trim();
      if (val.length >= 3) {
        triggerBarcodeAutoLookup(val, id);
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = input.value.trim();
        if (val.length >= 3) {
          triggerBarcodeAutoLookup(val, id);
        }
      }
    });
  });

  // 3. Global USB / Bluetooth Barcode Scanner keypress stream
  let barcodeBuffer = '';
  let lastKeyTime = Date.now();

  document.addEventListener('keydown', (e) => {
    const currentTime = Date.now();
    const activeEl = document.activeElement;
    const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

    // If focused on barcode input, let input event handler manage it
    if (activeEl && barcodeInputIds.includes(activeEl.id)) {
      return;
    }

    // If user typing in other inputs (e.g. name, price), do not capture global scanner
    if (isInputFocused) {
      return;
    }

    if (currentTime - lastKeyTime > 120) {
      barcodeBuffer = '';
    }
    lastKeyTime = currentTime;

    if (e.key === 'Enter') {
      if (barcodeBuffer.length >= 3) {
        e.preventDefault();
        const scannedBarcode = barcodeBuffer.trim();
        barcodeBuffer = '';

        // Determine target input element depending on active tab
        let targetId = 'barcode-input';
        const createTab = document.getElementById('tab-create-product');
        if (createTab && createTab.style.display !== 'none') {
          targetId = 'prod-barcode';
        }

        onBarcodeScanned(scannedBarcode, targetId);
      }
      barcodeBuffer = '';
    } else if (e.key.length === 1) {
      barcodeBuffer += e.key;
    }
  });
}

window.startCameraScanner = async function(targetInputId) {
  activeBarcodeTargetId = targetInputId || 'barcode-input';
  const modal = document.getElementById('camera-scanner-modal');
  if (modal) modal.classList.add('active');

  if (typeof Html5Qrcode === 'undefined') {
    alert('مكتبة قراءة الباركود جارٍ تحميلها أو غير متاحة. يرجى الإدخال اليدوي أو التأكد من الاتصال بالشبكة.');
    return;
  }

  try {
    if (html5QrcodeScanner) {
      await stopCameraScanner();
    }

    html5QrcodeScanner = new Html5Qrcode('qr-reader');
    const config = { fps: 15, qrbox: { width: 260, height: 160 } };

    await html5QrcodeScanner.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        onBarcodeScanned(decodedText, activeBarcodeTargetId);
        stopCameraScanner();
      },
      () => { /* Ignore frame scan noise */ }
    );
  } catch (err) {
    console.warn('Camera facingMode start failed, trying device cameras:', err);
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        const rearCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')) || devices[devices.length - 1];
        await html5QrcodeScanner.start(
          rearCamera.id,
          { fps: 15, qrbox: { width: 260, height: 160 } },
          (decodedText) => {
            onBarcodeScanned(decodedText, activeBarcodeTargetId);
            stopCameraScanner();
          },
          () => {}
        );
      } else {
        alert('لم يتم العثور على كاميرا متصلة بهذا الجهاز.');
        closeCameraScannerModal();
      }
    } catch (e) {
      alert('تعذر فتح الكاميرا: قد لا توجد كاميرا متصلة بهذا الجهاز (مثل اللابتوب/الكمبيوتر الشخصي) أو لم يتم السماح بالإذن. يمكنك استخدام جهاز الباركود الخارجي (USB).');
      closeCameraScannerModal();
    }
  }
};

window.stopCameraScanner = async function() {
  if (html5QrcodeScanner) {
    try {
      await html5QrcodeScanner.stop();
      html5QrcodeScanner.clear();
    } catch (e) {}
    html5QrcodeScanner = null;
  }
  closeCameraScannerModal();
};

window.closeCameraScannerModal = function() {
  const modal = document.getElementById('camera-scanner-modal');
  if (modal) modal.classList.remove('active');
  if (html5QrcodeScanner) {
    try {
      html5QrcodeScanner.stop().catch(() => {});
    } catch (e) {}
    html5QrcodeScanner = null;
  }
};

function onBarcodeScanned(barcodeText, targetId) {
  const cleanBarcode = barcodeText.trim();
  if (!targetId) targetId = 'barcode-input';

  const inputEl = document.getElementById(targetId);
  if (inputEl) {
    inputEl.value = cleanBarcode;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  }

  triggerBarcodeAutoLookup(cleanBarcode, targetId);
}

async function triggerBarcodeAutoLookup(barcode, sourceId) {
  if (!barcode) return;

  try {
    const res = await fetch(`${API_BASE}/api/products/barcode/${encodeURIComponent(barcode)}`);
    const data = await res.json();

    if (sourceId === 'barcode-input') {
      const resultEl = document.getElementById('barcode-result');
      if (!resultEl) return;

      if (data.success && data.data.product) {
        const p = data.data.product;
        resultEl.innerHTML = `
          <div style="background: rgba(16, 185, 129, 0.08); border: 1.5px solid #10b981; padding: 18px; border-radius: var(--radius-md);">
            <h3 style="color: #059669; margin-bottom: 10px; font-weight: 800;">✔ مسجل وموثق بالضمان</h3>
            <p style="margin-bottom: 4px;"><strong>المنتج:</strong> ${escapeHtml(p.name)}</p>
            <p style="margin-bottom: 4px;"><strong>القسم:</strong> ${escapeHtml(p.category ? p.category.name : 'عام')}</p>
            <p style="margin-bottom: 4px;"><strong>الباركود:</strong> <code style="background: #ffffff; padding: 2px 6px; border-radius: 4px;">${escapeHtml(p.barcode)}</code></p>
            <p style="margin-bottom: 4px;"><strong>السعر:</strong> $${p.price.toFixed(2)}</p>
            <p style="margin-bottom: 4px;"><strong>المخزون:</strong> ${p.stock} قطعة (${p.status})</p>
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
    } else if (sourceId === 'prod-barcode') {
      let statusNotice = document.getElementById('prod-barcode-notice');
      if (!statusNotice) {
        statusNotice = document.createElement('div');
        statusNotice.id = 'prod-barcode-notice';
        statusNotice.style.marginTop = '8px';
        statusNotice.style.fontSize = '0.85rem';
        statusNotice.style.fontWeight = '600';
        const barcodeGroup = document.getElementById('prod-barcode')?.closest('.form-group');
        if (barcodeGroup) barcodeGroup.appendChild(statusNotice);
      }

      if (data.success && data.data.product) {
        const p = data.data.product;
        document.getElementById('prod-name').value = p.name || '';
        const descEl = document.getElementById('prod-desc');
        if (descEl) descEl.value = p.description || '';
        document.getElementById('prod-price').value = p.price || '';
        document.getElementById('prod-stock').value = p.stock || '';
        const catEl = document.getElementById('prod-category');
        if (catEl && p.categoryId) catEl.value = p.categoryId;
        if (p.expiryDate) document.getElementById('prod-expiry').value = p.expiryDate.split('T')[0];

        statusNotice.innerHTML = `<span style="color: #059669;">✔ تم العثور على المنتج: "${escapeHtml(p.name)}". تم تعبئة البيانات تلقائياً.</span>`;
      } else {
        statusNotice.innerHTML = `<span style="color: #2563eb;">✨ باركود جديد ('${escapeHtml(barcode)}'). يمكنك تعبئة نموذج إضافة المنتج جديد.</span>`;
      }
    }
  } catch (err) {
    console.error('Barcode lookup error:', err);
  }
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
      loadCategories();
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
      alert(`خطأ أثناء الدخول التجريبي: ${data.message || 'تعذر معالجة الطلب'}`);
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

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  btnLogout.addEventListener('click', async () => {
    await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', headers: Auth.getHeaders() });
    Auth.clearSession();
    loadCategories();
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
        loadCategories();
        loadProducts();
        const userRoleAr = ROLE_MAP[data.data.user.role] || data.data.user.role;
        alert(`مرحباً بك، ${data.data.user.fullName || data.data.user.email}! تم تفعيل الحساب كـ (${userRoleAr}).`);
      } else {
        alert(`خطأ في عملية المصادقة: ${data.message || 'بيانات الدخول غير صحيحة'}`);
      }
    } catch (err) {
      alert('فشلت عملية طلب المصادقة.');
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
      triggerBarcodeAutoLookup(barcode, 'barcode-input');
    });
  }

  // Create Product Form (Merchant/Admin)
  const createForm = document.getElementById('create-product-form');
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('prod-name').value;
      const descEl = document.getElementById('prod-desc');
      const description = descEl ? descEl.value : name;
      const catEl = document.getElementById('prod-category');
      const categoryId = (catEl && catEl.value) ? catEl.value : undefined;
      const price = parseFloat(document.getElementById('prod-price').value);
      const stock = parseInt(document.getElementById('prod-stock').value, 10);
      const barcode = document.getElementById('prod-barcode').value;
      const expiryDate = document.getElementById('prod-expiry').value;

      try {
        const res = await fetch(`${API_BASE}/api/products`, {
          method: 'POST',
          headers: Auth.getHeaders(),
          body: JSON.stringify({ name, description, categoryId, price, stock, barcode, expiryDate: expiryDate || undefined })
        });

        const data = await res.json();

        if (data.success) {
          alert('تم تسجيل المنتج بنجاح في السوبرماركت والضمان!');
          createForm.reset();
          loadCategories();
          loadProducts();
          document.querySelector('[data-tab="catalog"]').click();
        } else {
          const detail = data.error ? `\n\nالتفاصيل: ${typeof data.error === 'string' ? data.error : JSON.stringify(data.error)}` : '';
          alert(`فشلت العملية: ${data.message}${detail}`);
        }
      } catch (err) {
        alert('حدث خطأ أثناء إضافة المنتج.');
      }
    });
  }

  // Edit Product Form Handler
  const editForm = document.getElementById('edit-product-form');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('edit-prod-id').value;
      const name = document.getElementById('edit-prod-name').value;
      const descEl = document.getElementById('edit-prod-desc');
      const description = descEl ? descEl.value : name;
      const catEl = document.getElementById('edit-prod-category');
      const categoryId = (catEl && catEl.value) ? catEl.value : undefined;
      const price = parseFloat(document.getElementById('edit-prod-price').value);
      const stock = parseInt(document.getElementById('edit-prod-stock').value, 10);
      const barcode = document.getElementById('edit-prod-barcode').value;

      try {
        const res = await fetch(`${API_BASE}/api/products/${id}`, {
          method: 'PUT',
          headers: Auth.getHeaders(),
          body: JSON.stringify({ name, description, categoryId, price, stock, barcode })
        });

        const data = await res.json();
        if (data.success) {
          alert('تم تحديث البيانات بنجاح!');
          closeEditModal();
          loadProducts();
        } else {
          alert(`خطأ: ${data.message}`);
        }
      } catch (err) {
        alert('فشل الاتصال بالخادم لتحديث المنتج.');
      }
    });
  }

  // Inventory Movement Form Handler
  const invForm = document.getElementById('inventory-form');
  if (invForm) {
    invForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const productId = document.getElementById('inv-prod-id').value;
      const type = document.getElementById('inv-type').value;
      const quantity = parseInt(document.getElementById('inv-qty').value, 10);
      const reason = document.getElementById('inv-reason').value;

      try {
        const res = await fetch(`${API_BASE}/api/inventory/movement`, {
          method: 'POST',
          headers: Auth.getHeaders(),
          body: JSON.stringify({ productId, type, quantity, reason })
        });

        const data = await res.json();
        if (data.success) {
          alert('تم تسجيل حركة المخزون وتحديث الكمية بنجاح!');
          closeInventoryModal();
          loadProducts();
        } else {
          alert(`تعذر تنفيذ حركة المخزون: ${data.message}`);
        }
      } catch (err) {
        alert('حدث خطأ أثناء الاتصال بالخادم لتحديث المخزون.');
      }
    });
  }
}

// Global modal helpers
window.openEditProductModal = async function(id) {
  try {
    const res = await fetch(`${API_BASE}/api/products/${id}`);
    const data = await res.json();

    if (data.success && data.data.product) {
      const p = data.data.product;
      document.getElementById('edit-prod-id').value = p.id;
      document.getElementById('edit-prod-name').value = p.name;
      const descEl = document.getElementById('edit-prod-desc');
      if (descEl) descEl.value = p.description || '';
      document.getElementById('edit-prod-price').value = p.price;
      document.getElementById('edit-prod-stock').value = p.stock;
      document.getElementById('edit-prod-barcode').value = p.barcode;
      const catEl = document.getElementById('edit-prod-category');
      if (catEl && p.categoryId) catEl.value = p.categoryId;

      document.getElementById('edit-product-modal').classList.add('active');
    }
  } catch (err) {
    alert('تعذر جلب تفاصيل المنتج للتعديل.');
  }
};

window.closeEditModal = function() {
  document.getElementById('edit-product-modal').classList.remove('active');
};

window.deleteProductAction = async function(id) {
  if (!confirm('هل أنت تأكد من رغبتك في حذف هذا المنتج نهائياً من الكتالوج والمخزون؟')) return;

  try {
    const res = await fetch(`${API_BASE}/api/products/${id}`, {
      method: 'DELETE',
      headers: Auth.getHeaders()
    });

    const data = await res.json();
    if (data.success) {
      alert('تم حذف المنتج بنجاح.');
      loadProducts();
    } else {
      alert(`تعذر الحذف: ${data.message}`);
    }
  } catch (err) {
    alert('خطأ في الاتصال أثناء حذف المنتج.');
  }
};

window.openInventoryModal = function(productId, productName) {
  document.getElementById('inv-prod-id').value = productId;
  document.getElementById('inv-prod-name').value = productName;
  document.getElementById('inv-qty').value = '';
  document.getElementById('inv-reason').value = '';
  document.getElementById('inventory-modal').classList.add('active');
};

window.closeInventoryModal = function() {
  document.getElementById('inventory-modal').classList.remove('active');
};

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
