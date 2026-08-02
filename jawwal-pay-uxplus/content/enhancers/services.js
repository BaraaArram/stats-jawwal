// Services page enhancer - builds DOM programmatically
console.log('[JawwalPay UX+] services.js loaded');

// Load shared components
function getExtensionRootUrl() {
  if (window.__jawwalpayRuntimeUrlBase) {
    return window.__jawwalpayRuntimeUrlBase;
  }
  const script = document.currentScript;
  if (script?.src) {
    return new URL('../../', script.src).href;
  }
  return '';
}

const runtimeUrlBase = getExtensionRootUrl();
const sharedComponentsScript = document.createElement('script');
sharedComponentsScript.src = runtimeUrlBase + 'content/shared-components.js';
document.head.appendChild(sharedComponentsScript);

// Load shared layout CSS
const sharedStyles = document.createElement('link');
sharedStyles.rel = 'stylesheet';
sharedStyles.href = runtimeUrlBase + 'styles/layout-components.css';
document.head.appendChild(sharedStyles);

function enhanceServicesPage() {
  try {
    console.log('[JawwalPay UX+] Injecting services page design...');
    extractDataAndInject();
  } catch (error) {
    console.error('[JawwalPay UX+] Error enhancing services page:', error);
  }
}

function extractDataAndInject() {
  try {
    const originalBody = document.body;
    console.log('[JawwalPay UX+] Starting data extraction...');
    
    const { userName: extractedUserName, userRole: extractedUserRole, navLinks } = extractPageMetadata(originalBody);
    const userName = typeof extractedUserName === 'string' && extractedUserName.trim() ? extractedUserName.trim() : 'User';
    const userRole = typeof extractedUserRole === 'string' && extractedUserRole.trim() ? extractedUserRole.trim() : 'Agent';
    console.log('[JawwalPay UX+] Extracted metadata:', { userName, userRole, navLinksCount: Object.keys(navLinks).length });
    
    // Extract service card URLs from original page
    const serviceUrls = {};
    const serviceCards = originalBody.querySelectorAll('.blog-img.btnImage, a[href*="/agent/"], a[href*="/wallet/"], a[href*="/reflectCashIn/"], a[href*="/shoppingCard/"], a[href*="/form/"]');
    serviceCards.forEach(card => {
      const href = card.getAttribute('href');
      const text = card.textContent.trim();
      if (href && text) {
        serviceUrls[text] = href;
      }
    });
    console.log('[JawwalPay UX+] Extracted service URLs:', Object.keys(serviceUrls).length);
    
    // Build the enhanced design programmatically
    const overlayContainer = document.createElement('div');
    overlayContainer.id = 'jawwalpay-uxplus-overlay';
    overlayContainer.style.cssText = 'position:fixed;inset:0;z-index:999999;background:var(--paper);overflow-y:auto;overflow-x:hidden;visibility:visible;';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    
    // Add page-specific CSS only
    const style = document.createElement('style');
    style.textContent = getPageSpecificCSS();
    overlayContainer.appendChild(style);
    
    // Build the HTML structure
    overlayContainer.appendChild(buildServicesPageHTML(navLinks, serviceUrls, userName, userRole));
    
    document.body.appendChild(overlayContainer);
    
    // Initialize shared component functionality
    initNavTabs(overlayContainer);
    initDropdowns(overlayContainer);
    
    console.log('[JawwalPay UX+] Overlay created and appended to body');
    console.log('[JawwalPay UX+] Services page design injected with real URLs');
  } catch (error) {
    console.error('[JawwalPay UX+] Error in extractDataAndInject:', error);
  }
}

function getPageSpecificCSS() {
  return `
.page{padding:28px 0 64px;flex:1;}
#jawwalpay-uxplus-overlay{display:flex;flex-direction:column;min-height:100vh;}
.section-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:16px;}
.section-head h2{font-family:'Cairo';font-size:18px;font-weight:800;margin:0;}
.section-head .link{font-size:12.5px;font-weight:600;color:var(--jp-green-dark);display:flex;align-items:center;gap:4px;}
.eyebrow{font-size:11.5px;font-weight:700;color:var(--jp-green-dark);letter-spacing:.04em;margin:0 0 4px;text-transform:uppercase;}
.services-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius-lg);padding:24px;box-shadow:var(--shadow-sm);margin-bottom:28px;}
.svc-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;}
.svc-tile{border:1px solid var(--line);border-radius:var(--radius-md);padding:18px 12px 16px;text-align:center;cursor:pointer;transition:border-color .18s, box-shadow .18s, transform .18s, background .18s;display:flex;flex-direction:column;align-items:center;gap:10px;background:#fff;text-decoration:none;}
.svc-tile:hover{border-color:var(--jp-green);box-shadow:var(--shadow-md);transform:translateY(-3px);background:var(--jp-green-pale-2);}
.svc-ic-wrap{width:60px;height:60px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:var(--jp-green-pale-2);transition:background .18s;}
.svc-tile:hover .svc-ic-wrap{background:#fff;}
.svc-ic-wrap.icon-only{background:var(--jp-green-pale-2);}
.svc-tile:hover .svc-ic-wrap.icon-only{background:#fff;}
.svc-ic-wrap.icon-only svg{width:28px;height:28px;}
.svc-tile span{font-size:12.5px;font-weight:600;color:var(--ink);line-height:1.35;}
.svc-tile .svc-tag{position:absolute;top:10px;left:10px;background:var(--jp-green-pale);color:var(--jp-green-dark);font-size:9.5px;font-weight:800;padding:2px 7px;border-radius:999px;letter-spacing:.02em;}
.svc-tile{position:relative;}
.page-title-bar{padding:22px 0 0;}
.breadcrumb{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ink-soft);margin-bottom:10px;}
.breadcrumb a{color:var(--ink-soft);transition:color .15s;}
.breadcrumb a:hover{color:var(--jp-green-dark);}
.breadcrumb svg{width:11px;height:11px;opacity:.6;}
.breadcrumb .current{color:var(--jp-green-dark);font-weight:700;}
.page-title-row{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:22px;}
.page-title-row h1{font-family:'Cairo';font-size:24px;font-weight:800;margin:0;display:flex;align-items:center;gap:12px;}
.page-title-row h1 .icon-badge{width:44px;height:44px;border-radius:12px;background:var(--jp-green-pale);color:var(--jp-green-dark);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.page-title-row p{font-size:13px;color:var(--ink-soft);margin:4px 0 0;font-weight:500;}
@media (max-width:980px){.svc-grid{grid-template-columns:repeat(3,1fr);}}
@media (max-width:760px){.svc-grid{grid-template-columns:repeat(2,1fr);}}
`;
}

function buildServicesPageHTML(navLinks, serviceUrls, userName = 'User', userRole = 'Agent') {
  const getUrl = (text, fallback) => navLinks[text] || serviceUrls[text] || fallback;
  const container = document.createElement('div');
  
  // Build service cards
  const services = [
    {text: 'خدمة التسجيل', url: getUrl('خدمة التسجيل', 'https://business.jawwalpay.ps/agent/registration'), color: 'var(--jp-green-dark)', icon: '<path d="M9 12h6M9 16h4M8 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke-linejoin="round"/><path d="M9 8h6" stroke-linecap="round"/>'},
    {text: 'تسجيلات سابقة', url: getUrl('تسجيلات سابقة', 'https://business.jawwalpay.ps/agent/previousRegistration'), color: 'var(--blue)', icon: '<path d="M3 12a9 9 0 1 0 3-6.7" stroke-linecap="round"/><path d="M3 4v5h5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 8v4l3 2" stroke-linecap="round" stroke-linejoin="round"/>'},
    {text: 'استعلام عن محفظة', url: getUrl('استعلام عن محفظة', 'https://business.jawwalpay.ps/wallet/walletInquiry'), color: 'var(--violet)', icon: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18" /><circle cx="16.5" cy="14" r="1" fill="var(--violet)" stroke="none"/>'},
    {text: 'إيداع الأموال', url: getUrl('إيداع الأموال', 'https://business.jawwalpay.ps/agent/cashin'), color: 'var(--jp-green-dark)', icon: '<path d="M12 19V5M6 11l6-6 6 6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19h14" stroke-linecap="round"/>'},
    {text: 'إيداع نقدي (محفظة Reflect)', url: getUrl('إيداع نقدي (محفظة Reflect)', 'https://business.jawwalpay.ps/reflectCashIn/create'), color: 'var(--teal)', tag: 'Reflect', icon: '<path d="M12 19V5M6 11l6-6 6 6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19h14" stroke-linecap="round"/>'},
    {text: 'سحب الأموال', url: getUrl('سحب الأموال', 'https://business.jawwalpay.ps/agent/cashout'), color: 'var(--amber)', icon: '<path d="M12 5v14M6 13l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 5h14" stroke-linecap="round"/>'},
    {text: 'سحب نقدي لفئة الأعمال', url: getUrl('سحب نقدي لفئة الأعمال', 'https://business.jawwalpay.ps/agent/businessCashout'), color: 'var(--amber)', icon: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M12 12v4M10 14h4" stroke-linecap="round"/>'},
    {text: 'إيداع نقدي لفئة الأعمال', url: getUrl('إيداع نقدي لفئة الأعمال', 'https://business.jawwalpay.ps/agent/businessCashin'), color: 'var(--jp-green-dark)', icon: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M12 11v6M9 14h6" stroke-linecap="round"/>'},
    {text: 'بطاقات مسبقة الدفع', url: getUrl('بطاقات مسبقة الدفع', 'https://business.jawwalpay.ps/shoppingCard/index'), color: 'var(--blue)', icon: '<rect x="2.5" y="5.5" width="19" height="13" rx="2.2"/><path d="M2.5 10h19" stroke-width="2"/><path d="M6 15h4" stroke-linecap="round"/>'},
    {text: 'النموذج', url: getUrl('النموذج', 'https://business.jawwalpay.ps/form/index'), color: 'var(--jp-green-dark)', icon: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke-linejoin="round"/><path d="M14 3v5h5" stroke-linejoin="round"/><path d="M9 13h6M9 17h6" stroke-linecap="round"/>'},
    {text: 'النماذج المرسلة', url: getUrl('النماذج المرسلة', 'https://business.jawwalpay.ps/form/list'), color: 'var(--violet)', icon: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke-linejoin="round"/><path d="M14 3v5h5" stroke-linejoin="round"/><path d="m9 14 2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/>'}
  ];
  
  let cardsHTML = '';
  services.forEach(svc => {
    cardsHTML += `<a class="svc-tile" href="${svc.url}"><div class="svc-ic-wrap icon-only"><svg viewBox="0 0 24 24" fill="none" stroke="${svc.color}" stroke-width="1.8">${svc.icon}</svg></div>${svc.tag ? `<span class="svc-tag">${svc.tag}</span>` : ''}<span>${svc.text}</span></a>`;
  });
  
  // Build HTML using shared components
  container.innerHTML = `
${getUtilityBarHTML()}
${getHeaderHTML({ userName, userRole })}
${getNavHTML('agent', navLinks)}
<div class="page"><div class="wrap"><div class="page-title-bar"><div class="breadcrumb"><a href="#">الرئيسية</a><span class="current">خدمات الأفراد والأعمال</span></div><div class="page-title-row"><h1>قائمة خدمات الأفراد والأعمال</h1></div><p>اختر الخدمة التي تريد تنفيذها من الوكيل نيابةً عن الأفراد أو المنشآت التجارية</p></div><div class="services-card"><div class="section-head"><p class="eyebrow">الخدمات المتاحة</p><h2>خدمات الأفراد والأعمال</h2></div><div class="svc-grid">${cardsHTML}</div></div></div></div>
${getFooterHTML()}
`;
  
  return container;
}

// Run the enhancer
enhanceServicesPage();
