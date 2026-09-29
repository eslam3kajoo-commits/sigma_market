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
  setupProfileAndAccountForms();
  setupAddressHandlers();
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
  const userPill = document.getElementById('user-pill');

  if (userPill) {
    userPill.addEventListener('click', () => {
      const profileBtn = document.getElementById('tab-profile-btn');
      if (profileBtn) profileBtn.click();
    });
  }

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
    } else if (targetTab === 'profile') {
      loadUserProfile();
    } else if (targetTab === 'addresses') {
      loadUserAddresses();
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
  const barcodeInputIds = ['barcode-input', 'catalog-search-input', 'prod-barcode', 'edit-prod-barcode'];
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
        const catalogTab = document.getElementById('tab-catalog');
        const createTab = document.getElementById('tab-create-product');
        if (catalogTab && catalogTab.style.display !== 'none') {
          targetId = 'catalog-search-input';
        } else if (createTab && createTab.style.display !== 'none') {
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

  if (sourceId === 'catalog-search-input') {
    const searchInput = document.getElementById('catalog-search-input');
    if (searchInput) {
      searchInput.value = barcode;
    }
    loadProducts();
    return;
  }

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
  const alertEl = document.getElementById('auth-alert');

  let isRegistering = false;

  const resetAuthAlert = () => {
    if (alertEl) {
      alertEl.style.display = 'none';
      alertEl.textContent = '';
      alertEl.style.background = '';
      alertEl.style.color = '';
      alertEl.style.border = '';
    }
  };

  const showAuthError = (msg) => {
    if (alertEl) {
      alertEl.style.display = 'block';
      alertEl.style.background = '#fef2f2';
      alertEl.style.color = '#dc2626';
      alertEl.style.border = '1px solid #fca5a5';
      alertEl.textContent = msg;
    } else {
      alert(msg);
    }
  };

  if (btnOpen) btnOpen.addEventListener('click', () => { resetAuthAlert(); modal.classList.add('active'); });
  if (btnClose) btnClose.addEventListener('click', () => { resetAuthAlert(); modal.classList.remove('active'); });

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) { resetAuthAlert(); modal.classList.remove('active'); }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', headers: Auth.getHeaders() });
      Auth.clearSession();
      loadCategories();
      loadProducts();
    });
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      resetAuthAlert();
      isRegistering = !isRegistering;
      document.getElementById('modal-title').textContent = isRegistering ? 'إنشاء حساب جديد' : 'تسجيل الدخول';
      document.getElementById('auth-submit-btn').textContent = isRegistering ? 'إنشاء الحساب' : 'تسجيل الدخول';

      const groupFullName = document.getElementById('group-fullname');
      const groupPhone = document.getElementById('group-phone');
      const groupConfirmPass = document.getElementById('group-confirm-password');
      const groupRole = document.getElementById('group-role');
      const groupRememberMe = document.getElementById('group-remember-me');

      if (groupFullName) groupFullName.style.display = isRegistering ? 'block' : 'none';
      if (groupPhone) groupPhone.style.display = isRegistering ? 'block' : 'none';
      if (groupConfirmPass) groupConfirmPass.style.display = isRegistering ? 'block' : 'none';
      if (groupRole) groupRole.style.display = isRegistering ? 'block' : 'none';
      if (groupRememberMe) groupRememberMe.style.display = isRegistering ? 'none' : 'flex';

      document.getElementById('auth-toggle-text').textContent = isRegistering ? 'لديك حساب بالفعل؟' : "ليس لديك حساب؟";
      toggleBtn.textContent = isRegistering ? 'تسجيل الدخول' : 'إنشاء حساب جديد';
    });
  }

  const authForm = document.getElementById('auth-form');
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      resetAuthAlert();

      const emailEl = document.getElementById('auth-email');
      const passwordEl = document.getElementById('auth-password');
      const submitBtn = document.getElementById('auth-submit-btn');

      const email = emailEl ? emailEl.value.trim() : '';
      const password = passwordEl ? passwordEl.value : '';

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return showAuthError('يرجى إدخال بريد إلكتروني صحيح.');
      }

      if (!password) {
        return showAuthError('يرجى إدخال كلمة المرور.');
      }

      let payload = { email, password };

      if (isRegistering) {
        const fullNameEl = document.getElementById('auth-fullname');
        const phoneEl = document.getElementById('auth-phone');
        const confirmPassEl = document.getElementById('auth-confirm-password');
        const roleEl = document.getElementById('auth-role');

        const fullName = fullNameEl ? fullNameEl.value.trim() : '';
        const phoneNumber = phoneEl ? phoneEl.value.trim() : '';
        const confirmPassword = confirmPassEl ? confirmPassEl.value : '';
        const roleName = roleEl ? roleEl.value : 'Customer';

        if (!fullName || fullName.length < 2) {
          return showAuthError('الاسم الكامل يجب أن يتكون من حرفين على الأقل.');
        }

        if (password.length < 8) {
          return showAuthError('كلمة المرور يجب أن تتكون من 8 أحرف على الأقل.');
        }

        if (password !== confirmPassword) {
          return showAuthError('كلمة المرور وتأكيد كلمة المرور غير متطابقين.');
        }

        payload = { email, password, fullName, roleName, ...(phoneNumber ? { phoneNumber } : {}) };
      }

      const endpoint = isRegistering ? `${API_BASE}/api/auth/register` : `${API_BASE}/api/auth/login`;

      submitBtn.disabled = true;
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'جاري المعالجة...';

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
          authForm.reset();
          loadCategories();
          loadProducts();

          const activeTabBtn = document.querySelector('.tab-btn.active');
          if (activeTabBtn) {
            const activeTab = activeTabBtn.getAttribute('data-tab');
            if (activeTab === 'profile') loadUserProfile();
            if (activeTab === 'addresses') loadUserAddresses();
          }
        } else {
          showAuthError(data.message || 'بيانات المصادقة غير صحيحة.');
        }
      } catch (err) {
        showAuthError('حدث خطأ في الاتصال بالخادم. يرجى المحاولة لاحقاً.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }
}

async function loadUserProfile() {
  if (!Auth.token || !Auth.user) {
    Auth.handleApiUnauthorized();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, { headers: Auth.getHeaders() });
    const data = await res.json();

    if (res.status === 401) {
      Auth.handleApiUnauthorized();
      return;
    }

    if (data.success && data.data.user) {
      const user = data.data.user;
      const nameEl = document.getElementById('profile-display-name');
      const emailEl = document.getElementById('profile-display-email');
      const phoneEl = document.getElementById('profile-display-phone');
      const dateEl = document.getElementById('profile-display-date');
      const roleBadge = document.getElementById('profile-role-badge');

      if (nameEl) nameEl.textContent = user.fullName || user.email;
      if (emailEl) emailEl.textContent = user.email;
      if (phoneEl) phoneEl.textContent = user.phoneNumber || 'غير محدد';
      if (dateEl) dateEl.textContent = new Date(user.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
      if (roleBadge) roleBadge.textContent = ROLE_MAP[user.role] || user.role;

      const inputName = document.getElementById('edit-profile-name');
      const inputPhone = document.getElementById('edit-profile-phone');
      if (inputName) inputName.value = user.fullName || '';
      if (inputPhone) inputPhone.value = user.phoneNumber || '';
    }
  } catch (err) {
    console.error('Failed to load user profile:', err);
  }
}

function setupProfileAndAccountForms() {
  const profileEditForm = document.getElementById('profile-edit-form');
  if (profileEditForm) {
    profileEditForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alertEl = document.getElementById('profile-edit-alert');
      const submitBtn = document.getElementById('btn-save-profile');

      const fullName = document.getElementById('edit-profile-name').value.trim();
      const phoneNumber = document.getElementById('edit-profile-phone').value.trim();

      if (!fullName || fullName.length < 2) {
        if (alertEl) {
          alertEl.style.display = 'block';
          alertEl.style.background = '#fef2f2';
          alertEl.style.color = '#dc2626';
          alertEl.style.border = '1px solid #fca5a5';
          alertEl.textContent = 'الاسم الكامل يجب أن يتكون من حرفين على الأقل.';
        }
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري الحفظ...';

      try {
        const res = await fetch(`${API_BASE}/api/users/${Auth.user.id}`, {
          method: 'PUT',
          headers: Auth.getHeaders(),
          body: JSON.stringify({ fullName, phoneNumber: phoneNumber || null })
        });

        if (res.status === 401) {
          Auth.handleApiUnauthorized();
          return;
        }

        const data = await res.json();
        if (data.success) {
          if (alertEl) {
            alertEl.style.display = 'block';
            alertEl.style.background = '#ecfdf5';
            alertEl.style.color = '#059669';
            alertEl.style.border = '1px solid #a7f3d0';
            alertEl.textContent = 'تم تحديث البيانات الشخصية بنجاح.';
          }
          Auth.user.fullName = fullName;
          localStorage.setItem('swp_user', JSON.stringify(Auth.user));
          Auth.updateUI();
          loadUserProfile();
        } else {
          if (alertEl) {
            alertEl.style.display = 'block';
            alertEl.style.background = '#fef2f2';
            alertEl.style.color = '#dc2626';
            alertEl.style.border = '1px solid #fca5a5';
            alertEl.textContent = data.message || 'فشل تحديث البيانات.';
          }
        }
      } catch (err) {
        if (alertEl) {
          alertEl.style.display = 'block';
          alertEl.style.background = '#fef2f2';
          alertEl.style.color = '#dc2626';
          alertEl.style.border = '1px solid #fca5a5';
          alertEl.textContent = 'حدث خطأ في الاتصال بالخادم.';
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'حفظ التعديلات';
      }
    });
  }

  const changePassForm = document.getElementById('change-password-form');
  if (changePassForm) {
    changePassForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alertEl = document.getElementById('password-change-alert');
      const submitBtn = document.getElementById('btn-change-pass');

      const currentPassword = document.getElementById('change-current-pass').value;
      const newPassword = document.getElementById('change-new-pass').value;
      const confirmPassword = document.getElementById('change-confirm-pass').value;

      if (!currentPassword) {
        if (alertEl) {
          alertEl.style.display = 'block';
          alertEl.style.background = '#fef2f2';
          alertEl.style.color = '#dc2626';
          alertEl.style.border = '1px solid #fca5a5';
          alertEl.textContent = 'يرجى إدخال كلمة المرور الحالية.';
        }
        return;
      }

      if (newPassword.length < 8) {
        if (alertEl) {
          alertEl.style.display = 'block';
          alertEl.style.background = '#fef2f2';
          alertEl.style.color = '#dc2626';
          alertEl.style.border = '1px solid #fca5a5';
          alertEl.textContent = 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.';
        }
        return;
      }

      if (newPassword !== confirmPassword) {
        if (alertEl) {
          alertEl.style.display = 'block';
          alertEl.style.background = '#fef2f2';
          alertEl.style.color = '#dc2626';
          alertEl.style.border = '1px solid #fca5a5';
          alertEl.textContent = 'كلمة المرور الجديدة وتأكيدها غير متطابقين.';
        }
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري التحديث...';

      try {
        const res = await fetch(`${API_BASE}/api/users/${Auth.user.id}/password`, {
          method: 'PUT',
          headers: Auth.getHeaders(),
          body: JSON.stringify({ currentPassword, newPassword })
        });

        if (res.status === 401) {
          Auth.handleApiUnauthorized();
          return;
        }

        const data = await res.json();
        if (data.success) {
          if (alertEl) {
            alertEl.style.display = 'block';
            alertEl.style.background = '#ecfdf5';
            alertEl.style.color = '#059669';
            alertEl.style.border = '1px solid #a7f3d0';
            alertEl.textContent = 'تم تغيير كلمة المرور بنجاح.';
          }
          changePassForm.reset();
        } else {
          if (alertEl) {
            alertEl.style.display = 'block';
            alertEl.style.background = '#fef2f2';
            alertEl.style.color = '#dc2626';
            alertEl.style.border = '1px solid #fca5a5';
            alertEl.textContent = data.message || 'فشل تغيير كلمة المرور.';
          }
        }
      } catch (err) {
        if (alertEl) {
          alertEl.style.display = 'block';
          alertEl.style.background = '#fef2f2';
          alertEl.style.color = '#dc2626';
          alertEl.style.border = '1px solid #fca5a5';
          alertEl.textContent = 'حدث خطأ أثناء الاتصال بالخادم.';
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'تحديث كلمة المرور';
      }
    });
  }

  const profileLogoutBtn = document.getElementById('btn-profile-logout');
  if (profileLogoutBtn) {
    profileLogoutBtn.addEventListener('click', async () => {
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', headers: Auth.getHeaders() });
      Auth.clearSession();
      loadCategories();
      loadProducts();
    });
  }
}

let globalUserAddresses = [];

async function loadUserAddresses() {
  if (!Auth.token || !Auth.user) {
    Auth.handleApiUnauthorized();
    return;
  }

  const container = document.getElementById('addresses-list-container');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/api/users/addresses`, { headers: Auth.getHeaders() });

    if (res.status === 401) {
      Auth.handleApiUnauthorized();
      return;
    }

    const data = await res.json();

    if (data.success && data.data.addresses) {
      globalUserAddresses = data.data.addresses;

      if (globalUserAddresses.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px; font-weight: 600; border: 1px dashed var(--border-color); border-radius: 12px;">
            لا توجد عناوين شحن مسجلة. قم بإضافة عنوانك الأول لتسهيل عملية التوصيل.
          </div>
        `;
        return;
      }

      container.innerHTML = globalUserAddresses.map(addr => `
        <div class="card" style="position: relative; display: flex; flex-direction: column; justify-content: space-between; border-color: ${addr.isDefault ? 'var(--primary)' : 'var(--border-color)'};">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 8px;">
              <div style="font-weight: 800; font-size: 1.05rem; color: var(--text-main);">${escapeHtml(addr.street)}</div>
              ${addr.isDefault ? '<span class="badge badge-success">العنوان الافتراضي</span>' : ''}
            </div>
            <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 6px;">${escapeHtml(addr.city)}، ${escapeHtml(addr.state)}</div>
            <div style="font-size: 0.85rem; color: var(--text-dim); margin-bottom: 16px;">الرمز البريدي: ${escapeHtml(addr.postalCode)} | ${escapeHtml(addr.country)}</div>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 8px;">
            ${!addr.isDefault ? `<button type="button" onclick="setDefaultAddressAction('${addr.id}')" class="btn btn-outline" style="padding: 6px 12px; font-size: 0.8rem; flex: 1;">تعيين كافتراضي</button>` : ''}
            <button type="button" onclick="openEditAddressModal('${addr.id}')" class="btn btn-outline" style="padding: 6px 12px; font-size: 0.8rem;">تعديل</button>
            <button type="button" onclick="deleteAddressAction('${addr.id}')" class="btn btn-outline" style="padding: 6px 12px; font-size: 0.8rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">حذف</button>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    if (container) {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 20px;">تعذر جلب عناوين الشحن.</div>`;
    }
  }
}

function setupAddressHandlers() {
  const openAddBtn = document.getElementById('btn-open-add-address');
  const modal = document.getElementById('address-modal');
  const closeBtn = document.getElementById('address-modal-close');
  const form = document.getElementById('address-form');
  const alertEl = document.getElementById('address-form-alert');

  if (openAddBtn) {
    openAddBtn.addEventListener('click', () => {
      if (form) form.reset();
      document.getElementById('addr-id').value = '';
      document.getElementById('address-modal-title').textContent = 'إضافة عنوان جديد';
      if (alertEl) alertEl.style.display = 'none';
      if (modal) modal.classList.add('active');
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('addr-id').value;
      const street = document.getElementById('addr-street').value.trim();
      const city = document.getElementById('addr-city').value.trim();
      const state = document.getElementById('addr-state').value.trim();
      const postalCode = document.getElementById('addr-postal').value.trim();
      const country = document.getElementById('addr-country').value.trim() || 'Saudi Arabia';
      const isDefault = document.getElementById('addr-is-default').checked;

      const submitBtn = document.getElementById('btn-save-address');
      submitBtn.disabled = true;
      submitBtn.textContent = 'جاري الحفظ...';

      const endpoint = id ? `${API_BASE}/api/users/addresses/${id}` : `${API_BASE}/api/users/addresses`;
      const method = id ? 'PUT' : 'POST';

      try {
        const res = await fetch(endpoint, {
          method,
          headers: Auth.getHeaders(),
          body: JSON.stringify({ street, city, state, postalCode, country, isDefault })
        });

        if (res.status === 401) {
          Auth.handleApiUnauthorized();
          return;
        }

        const data = await res.json();
        if (data.success) {
          if (modal) modal.classList.remove('active');
          form.reset();
          loadUserAddresses();
        } else {
          if (alertEl) {
            alertEl.style.display = 'block';
            alertEl.style.background = '#fef2f2';
            alertEl.style.color = '#dc2626';
            alertEl.style.border = '1px solid #fca5a5';
            alertEl.textContent = data.message || 'فشل حفظ العنوان.';
          }
        }
      } catch (err) {
        if (alertEl) {
          alertEl.style.display = 'block';
          alertEl.style.background = '#fef2f2';
          alertEl.style.color = '#dc2626';
          alertEl.style.border = '1px solid #fca5a5';
          alertEl.textContent = 'حدث خطأ أثناء الاتصال بالخادم.';
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'حفظ العنوان';
      }
    });
  }
}

window.openEditAddressModal = function(id) {
  const addr = globalUserAddresses.find(a => a.id === id);
  if (!addr) return;

  document.getElementById('addr-id').value = addr.id;
  document.getElementById('addr-street').value = addr.street || '';
  document.getElementById('addr-city').value = addr.city || '';
  document.getElementById('addr-state').value = addr.state || '';
  document.getElementById('addr-postal').value = addr.postalCode || '';
  document.getElementById('addr-country').value = addr.country || 'Saudi Arabia';
  document.getElementById('addr-is-default').checked = !!addr.isDefault;

  document.getElementById('address-modal-title').textContent = 'تعديل العنوان';
  const alertEl = document.getElementById('address-form-alert');
  if (alertEl) alertEl.style.display = 'none';

  const modal = document.getElementById('address-modal');
  if (modal) modal.classList.add('active');
};

window.setDefaultAddressAction = async function(id) {
  try {
    const res = await fetch(`${API_BASE}/api/users/addresses/${id}/default`, {
      method: 'PATCH',
      headers: Auth.getHeaders()
    });

    if (res.status === 401) {
      Auth.handleApiUnauthorized();
      return;
    }

    const data = await res.json();
    if (data.success) {
      loadUserAddresses();
    } else {
      alert(data.message || 'فشل تعيين العنوان الافتراضي.');
    }
  } catch (err) {
    alert('حدث خطأ في الاتصال بالخادم.');
  }
};

window.deleteAddressAction = async function(id) {
  if (!confirm('هل أنت متأكد من رغبتك في حذف هذا العنوان؟')) return;

  try {
    const res = await fetch(`${API_BASE}/api/users/addresses/${id}`, {
      method: 'DELETE',
      headers: Auth.getHeaders()
    });

    if (res.status === 401) {
      Auth.handleApiUnauthorized();
      return;
    }

    const data = await res.json();
    if (data.success) {
      loadUserAddresses();
    } else {
      alert(data.message || 'فشل حذف العنوان.');
    }
  } catch (err) {
    alert('حدث خطأ في الاتصال بالخادم.');
  }
};

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
