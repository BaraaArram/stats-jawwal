// Page detection configuration
// Each entry has: page name, DOM check function, URL check function
const PAGE_DETECTION_RULES = [
  {
    page: 'login',
    domCheck: () => document.querySelector('#loginForm') !== null,
    urlCheck: () => window.location.pathname.includes('/login/auth')
  },
  {
    page: 'dashboard',
    domCheck: () => document.querySelector('#transactionHistoryTable') !== null || document.querySelector('.balance-card') !== null,
    urlCheck: () => window.location.pathname.includes('/merchant/index') || window.location.pathname.includes('/dashboard')
  },
  {
    page: 'main',
    domCheck: () => document.querySelector('#transactionHistoryTable') !== null,
    urlCheck: () => window.location.pathname.includes('/merchant/index')
  },
  {
    page: 'services',
    domCheck: () => document.querySelectorAll('.blog-img.btnImage').length > 0,
    urlCheck: () => window.location.pathname.includes('/agent/businessServices')
  },
  {
    page: 'editCustomer',
    domCheck: () => document.querySelector('#customerForm') !== null,
    urlCheck: () => window.location.pathname.startsWith('/agent/editCustomer')
  },
  {
    page: 'validateOTPCode',
    domCheck: () => document.querySelector('form#registrationForm') !== null && window.location.pathname.includes('/agent/validateOTPCode'),
    urlCheck: () => window.location.pathname.includes('/agent/validateOTPCode')
  },
  {
    page: 'registration',
    domCheck: () => window.location.pathname.includes('/agent/registration') && (document.querySelector('.otp-boxes') !== null || document.querySelector('input[type="tel"][maxlength="10"]') !== null),
    urlCheck: () => window.location.pathname.includes('/agent/registration')
  },
  {
    page: 'previousRegistration',
    domCheck: () => window.location.pathname.includes('/agent/previousRegistration') || document.title.includes('استعلام عن قائمة المشتركين'),
    urlCheck: () => window.location.pathname.includes('/agent/previousRegistration')
  }
];

function detectCurrentPage() {
  for (const rule of PAGE_DETECTION_RULES) {
    // Try DOM check first (more reliable)
    if (rule.domCheck()) {
      console.log(`[JawwalPay UX+] Detected page: ${rule.page} via DOM check`);
      return rule.page;
    }
    
    // Fallback to URL check
    if (rule.urlCheck()) {
      console.log(`[JawwalPay UX+] Detected page: ${rule.page} via URL check`);
      return rule.page;
    }
  }
  
  console.log('[JawwalPay UX+] Detected page: unknown');
  return 'unknown';
}
