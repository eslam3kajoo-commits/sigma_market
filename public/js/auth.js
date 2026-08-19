/* ==========================================================================
   Sigma Market - Client Authentication State Manager
   ========================================================================== */

const API_BASE = (window.location.port === '3000') ? '' : 'http://localhost:3000';

const ROLE_MAP = {
  'Admin': 'مدير النظام (أدمن)',
  'Merchant': 'تاجر (مدير المتجر)',
  'Customer': 'عميل',
  'Charity': 'جمعية خيرية'
};

const Auth = {
  token: localStorage.getItem('swp_token') || null,
  user: JSON.parse(localStorage.getItem('swp_user') || 'null'),

  setSession(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('swp_token', token);
    localStorage.setItem('swp_user', JSON.stringify(user));
    this.updateUI();
  },

  clearSession() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('swp_token');
    localStorage.removeItem('swp_user');
    this.updateUI();
  },

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  },

  updateUI() {
    const userPill = document.getElementById('user-pill');
    const userRoleBadge = document.getElementById('user-role-badge');
    const userName = document.getElementById('user-name');
    const btnLoginModal = document.getElementById('btn-login-modal');
    const btnLogout = document.getElementById('btn-logout');
    const statActiveRole = document.getElementById('stat-active-role');
    const statRoleBadge = document.getElementById('stat-role-badge');
    const statRoleDesc = document.getElementById('stat-role-desc');
    const tabCreateProductBtn = document.getElementById('tab-create-product-btn');

    const btnAdminPanel = document.getElementById('btn-admin-panel');

    if (this.user) {
      const translatedRole = ROLE_MAP[this.user.role] || this.user.role || 'مستخدم';
      if (userPill) userPill.style.display = 'inline-block';
      if (userRoleBadge) userRoleBadge.textContent = translatedRole;
      if (userName) userName.textContent = this.user.fullName || this.user.email;
      if (btnLoginModal) btnLoginModal.style.display = 'none';
      if (btnLogout) btnLogout.style.display = 'inline-flex';

      if (btnAdminPanel) {
        btnAdminPanel.style.display = (this.user.role === 'Admin') ? 'inline-flex' : 'none';
      }

      if (statActiveRole) statActiveRole.textContent = translatedRole;
      if (statRoleBadge) statRoleBadge.textContent = 'مسجل وموثوق';
      if (statRoleDesc) statRoleDesc.textContent = `تم الدخول بالبريد الإلكتروني: ${this.user.email}`;

      // Display merchant tab if Merchant or Admin
      if (tabCreateProductBtn) {
        if (this.user.role === 'Merchant' || this.user.role === 'Admin') {
          tabCreateProductBtn.style.display = 'inline-block';
        } else {
          tabCreateProductBtn.style.display = 'none';
        }
      }
    } else {
      if (userPill) userPill.style.display = 'none';
      if (btnLoginModal) btnLoginModal.style.display = 'inline-flex';
      if (btnLogout) btnLogout.style.display = 'none';
      if (btnAdminPanel) btnAdminPanel.style.display = 'none';

      if (statActiveRole) statActiveRole.textContent = 'زائر متصفح';
      if (statRoleBadge) statRoleBadge.textContent = 'زائر';
      if (statRoleDesc) statRoleDesc.textContent = 'قم بتسجيل الدخول لاختبار صلاحيات الوصول الجدارية';
      if (tabCreateProductBtn) tabCreateProductBtn.style.display = 'none';
    }
  }
};
