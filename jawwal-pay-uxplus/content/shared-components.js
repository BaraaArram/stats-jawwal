// Jawwal Pay UX+ - Shared Layout Components
// Reusable HTML component generators for page enhancers

/**
 * Generate utility bar HTML
 */
function getUtilityBarHTML() {
  return `
<div class="utility-bar">
  <div class="wrap">
    <div class="utility-links">
    </div>
    <div class="app-links">
      <span>حمّل التطبيق</span>
    </div>
  </div>
</div>`;
}

/**
 * Normalize display names from portal payloads such as email-style identities.
 */
function normalizeDisplayName(value) {
  if (value == null || value === '') return '';
  const text = String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const firstSegment = text.split('@').find(Boolean) || text;
  return firstSegment.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Generate main header HTML
 * @param {Object} options - Header options
 * @param {string} options.userName - User name to display
 * @param {string} options.userRole - User role to display
 */
function getHeaderHTML(options = {}) {
  const { userName = 'User', userRole = 'Agent', notificationCount = 0, notificationHtml = '' } = options;
  const displayUserName = normalizeDisplayName(userName) || 'User';
  const initials = displayUserName
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';
  const hasNotifications = Number(notificationCount) > 0;
  const notifBadge = hasNotifications ? `<span class="notif-count">${notificationCount}</span>` : '';
  const notifContent = notificationHtml
    ? `<div class="notif-html">${notificationHtml}</div>`
    : `<div class="notif-empty">...</div>`;

  return `
<header class="main-header">
  <div class="wrap">
    <div class="brand">
      <img src="https://i.imgur.com/LmK7Bbg.png" alt="Jawwal Pay">
      <div class="brand-text">
        <b>Jawwal Pay Business</b>
        <span>المنصة الالكترونية</span>
      </div>
    </div>

    <div class="search-box">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      <input type="text" placeholder="ابحث عن خدمة أو حركة...">
    </div>

    <div class="header-actions">
      <div class="dropdown" id="notifDD">
        <button class="icon-btn" onclick="toggleDD('notifDD')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3a5 5 0 0 0-5 5v3.2c0 .6-.2 1.2-.6 1.7L5 15h14l-1.4-2.1c-.4-.5-.6-1.1-.6-1.7V8a5 5 0 0 0-5-5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.5 18a2.5 2.5 0 0 0 5 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          ${hasNotifications ? notifBadge : '<span class="dot"></span>'}
        </button>
        <div class="dropdown-panel notif-panel">
          <div class="dd-title">الإشعارات</div>
          ${notifContent}
        </div>
      </div>

      <div class="dropdown" id="userDD">
        <div class="user-chip" onclick="toggleDD('userDD')">
          <div class="user-avatar">${initials}</div>
          <div class="u-meta">
            <b>${displayUserName}</b>
            <span>${userRole}</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="dropdown-panel">
          <div class="dd-title">الحساب</div>
          <a href="#"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.8"/><path d="M4 20c1.5-3.5 4.7-5 8-5s6.5 1.5 8 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg> ملف المستخدم</a>
          <a href="#"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" stroke-width="1.8"/></svg> تغيير كلمة المرور</a>
          <a href="#"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" stroke-width="1.8"/></svg> تغيير الرمز السري (PIN)</a>
          <a href="#"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" stroke-width="1.8"/></svg> تعيين الرمز السري (PIN)</a>
          <div class="divider"></div>
          <div class="dd-title">التطبيق</div>
          <a href="#"><img src="https://i.imgur.com/KRMB4z8.png" style="width:15px;height:15px;filter:invert(56%) sepia(53%) saturate(456%) hue-rotate(51deg);"> تحميل لأندرويد</a>
          <a href="#"><img src="https://i.imgur.com/eGZ91jg.png" style="width:15px;height:15px;filter:invert(20%);"> تحميل لآيفون</a>
          <div class="divider"></div>
          <a href="#" class="danger"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> تسجيل خروج</a>
        </div>
      </div>
    </div>
  </div>
</header>`;
}

/**
 * Generate navigation bar HTML
 * @param {string} activeTab - The active tab name (merchant, agent, security, support)
 */
function renderHeaderNotifications(container = document) {
  if (!container || !window.JawwalPayAPI?.fetchNotifications) {
    return Promise.resolve(null);
  }

  const badge = container.querySelector('#notifCountBadge');
  const panelContent = container.querySelector('#notifPanelContent');
  if (!badge && !panelContent) {
    return Promise.resolve(null);
  }

  return window.JawwalPayAPI.fetchNotifications().then((data) => {
    const count = Number(data?.count ?? data?.notifications ?? 0);
    const htmlContent = typeof data?.htmlContent === 'string' ? data.htmlContent : '';

    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.className = 'notif-count';
        badge.style.display = 'inline-flex';
      } else {
        badge.textContent = '';
        badge.className = 'dot';
        badge.style.display = 'inline-flex';
      }
    }

    if (panelContent) {
      panelContent.innerHTML = htmlContent
        ? `<div class="notif-html">${htmlContent}</div>`
        : `<div class="notif-empty"><svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M12 3a5 5 0 0 0-5 5v3.2c0 .6-.2 1.2-.6 1.7L5 15h14l-1.4-2.1c-.4-.5-.6-1.1-.6-1.7V8a5 5 0 0 0-5-5Z" stroke="currentColor" stroke-width="1.5"/></svg><div>لا توجد إشعارات جديدة</div></div>`;
    }

    return data;
  }).catch(() => null);
}

function getNavHTML(activeTab = 'merchant', navLinks = {}) {
  const getLink = (text, fallback) => navLinks[text] || fallback;

  return `
<nav class="nav-bar">
  <div class="wrap">
    <div class="nav-tabs">
      <div class="nav-tab ${activeTab === 'merchant' ? 'active' : ''}" data-tab="merchant"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.8"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="1.8"></path></svg> خدمات المحفظة</div>
      <div class="nav-tab ${activeTab === 'agent' ? 'active' : ''}" data-tab="agent"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.4" stroke="currentColor" stroke-width="1.8"></circle><path d="M4.5 20c1.6-4 4.5-5.6 7.5-5.6S17.9 16 19.5 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path></svg> الوكيل</div>
      <div class="nav-tab ${activeTab === 'securityModule' ? 'active' : ''}" data-tab="securityModule"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path></svg> الأمن والحماية</div>
      <div class="nav-tab ${activeTab === 'support' ? 'active' : ''}" data-tab="support"><svg viewBox="0 0 24 24" fill="none"><path d="M4 6a2 2 0 0 1 2-2h2l2 5-2 1a10 10 0 0 0 6 6l1-2 5 2v2a2 2 0 0 1-2 2C10.6 20 4 13.4 4 6Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path></svg> الدعم الفني</div>
    </div>
  </div>
</nav>

<div class="subnav ${activeTab === 'merchant' ? 'active' : ''}" id="sub-merchant">
  <div class="wrap">
    <a href="${getLink('الرئيسية','/merchant/index')}" class="active">الرئيسية</a>
    <a href="${getLink('خدمات الدفع وتحويل الأموال','/merchant/paymentServices')}">خدمات الدفع وتحويل الأموال</a>
    <a href="${getLink('خدمات مضافة Jawwal Pay','/merchant/additionalServices')}">خدمات مضافة Jawwal Pay</a>
    <a href="${getLink('تقارير الحركات','/merchant/transactionsServices')}">تقارير الحركات</a>
    <a href="${getLink('مسار العمل','/workflowOrder/services')}">مسار العمل</a>
  </div>
</div>
<div class="subnav ${activeTab === 'agent' ? 'active' : ''}" id="sub-agent">
  <div class="wrap">
    <a href="${getLink('خدمات الافراد والاعمال','/agent/businessServices')}">خدمات الافراد والاعمال</a>
    <a href="${getLink('خدمات الوكلاء الفرعيين','/agent/subAgentServices')}">خدمات الوكلاء الفرعيين</a>
    <a href="${getLink('تقييماتي','/agentView/showMySubAgent')}">تقييماتي</a>
  </div>
</div>
<div class="subnav ${activeTab === 'security' ? 'active' : ''}" id="sub-security">
  <div class="wrap"><a href="${getLink('المستخدمين','/users/list')}">المستخدمين</a></div>
</div>
<div class="subnav ${activeTab === 'support' ? 'active' : ''}" id="sub-support">
  <div class="wrap"><a href="${getLink('الشكاوى والاقتراحات','/feedback/index')}">الشكاوى والاقتراحات</a></div>
</div>`;
}

/**
 * Extract page metadata like user name and navigation links from the original page DOM.
 * This allows enhancers to reuse the same extraction logic across multiple pages.
 * @param {HTMLElement} root
 */
function extractPageMetadata(root = document.body) {
  const userSelectors = [
    'a.nav-link.-toggle[role="button"]',
    'a.nav-link[data-toggle="dropdown"][role="button"]',
    '.header-top-menu .nav-link',
    '.user-chip .u-meta b',
    '.DownloadUser .nav-link'
  ];

  let userName = 'User';
  for (const selector of userSelectors) {
    const el = root.querySelector(selector);
    if (el) {
      const text = el.textContent.replace(/\s+/g, ' ').trim();
      if (text) {
        userName = normalizeDisplayName(text) || text;
        break;
      }
    }
  }

  const navLinks = {};
  root.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    const text = link.textContent.trim().replace(/\s+/g, ' ');
    if (!href || href === '#' || href === '#top' || href.startsWith('javascript:') || !text) return;
    if (!(text in navLinks)) {
      navLinks[text] = href;
    }
  });

  return {
    userName,
    userRole: 'Agent',
    navLinks
  };
}

/**
 * Generate news ticker HTML
 */
function getNewsTickerHTML() {
  return `
<div class="news-strip">
  <div class="wrap">
    <div class="news-badge">
      <svg viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
      جديد
    </div>
    <div class="news-text-mask">
      <div class="news-text">تم إضافة خدمة جديدة: تحويل الأموال الفوري - متاحة الآن لجميع العملاء | صيانة مجدولة: سيتم إجراء صيانة للنظام يوم الجمعة من الساعة 2:00 ص إلى 4:00 ص | عرض خاص: رسوم مجانية على جميع التحويلات الداخلية خلال شهر يوليو</div>
    </div>
    <button class="news-more" aria-label="المزيد من الأخبار">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  </div>
</div>`;
}

/**
 * Generate footer HTML
 */
function getFooterHTML() {
  return `
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-col">
        <b>تواصل معنا</b>
        <div class="footer-contact">
          <a href="tel:1177"><span class="f-ic"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span> اتصل بنا على 1177</a>
          <a href="mailto:sales@jawwalpay.ps"><span class="f-ic"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2Z" stroke="currentColor" stroke-width="1.8"/><path d="M22 6l-10 7L2 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span> ارسل ملاحظات</a>
          <a href="#"><span class="f-ic"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span> رقم بيفيدك</a>
        </div>
      </div>
      <div class="footer-col">
        <b>تابعنا</b>
        <div class="footer-social">
          <a href="#" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
          <a href="#" aria-label="Twitter"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
          <a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" stroke-width="2"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" stroke="currentColor" stroke-width="2"/><path d="M17.5 6.5h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></a>
        </div>
      </div>
      <div class="footer-col">
        <b>روابط</b>
        <div class="footer-links">
          <a href="#">www.JawwalPay.ps</a>
          <a href="#">سياسة الخصوصية</a>
          <a href="#">الشروط والأحكام</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <span>Jawwal Pay © جميع الحقوق محفوظة</span>
      <span>مرخص من سلطة النقد الفلسطينية</span>
    </div>
  </div>
</footer>`;
}

/**
 * Initialize navigation tab switching
 * @param {HTMLElement} container - The container element to search within
 */
function initNavTabs(container = document) {
  const tabs = container.querySelectorAll('.nav-tab');
  const tabItems = container.querySelectorAll('.nav-tabs li');
  const tabPanes = container.querySelectorAll('.tab-pane, .subnav');

  tabs.forEach(tab => {
    tab.addEventListener('click', function(event) {
      event.preventDefault();
      const tabName = this.getAttribute('data-tab');

      tabItems.forEach(item => item.classList.remove('active'));
      this.closest('li')?.classList.add('active');

      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');

      tabPanes.forEach(pane => {
        pane.classList.remove('active');
        if (pane.id === tabName || pane.id === 'sub-' + tabName) {
          pane.classList.add('active');
        }
      });
    });
  });
}

/**
 * Dropdown toggle function
 * @param {string} id - The dropdown ID
 */
function toggleDD(id) {
  const dd = document.getElementById(id);
  const allDDs = document.querySelectorAll('.dropdown');
  
  allDDs.forEach(d => {
    if (d.id !== id) d.classList.remove('open');
  });
  
  dd.classList.toggle('open');
}

/**
 * Initialize dropdown functionality
 * @param {HTMLElement} container - The container element to search within
 */
function initDropdowns(container = document) {
  // Close dropdowns when clicking outside
  container.addEventListener('click', function(e) {
    if (!e.target.closest('.dropdown')) {
      container.querySelectorAll('.dropdown').forEach(dd => {
        dd.classList.remove('open');
      });
    }
  });
}

// Export functions for use in enhancers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getUtilityBarHTML,
    getHeaderHTML,
    getNavHTML,
    getNewsTickerHTML,
    getFooterHTML,
    initNavTabs,
    initDropdowns,
    toggleDD
  };
}
