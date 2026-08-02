// Page enhancer registry
// To add a new page enhancer, add an entry here: pageName -> scriptPath
// Enhancer modules auto-execute when loaded
const ENHANCER_REGISTRY = {
  'login': 'content/enhancers/login.js',
  'dashboard': 'content/enhancers/dashboard.js',
  'main': 'content/enhancers/main.js',
  'services': 'content/enhancers/services.js',
  'editCustomer': 'content/enhancers/editCustomer.js',
  'registration': 'content/enhancers/registration.js',
  'validateOTPCode': 'content/enhancers/validateOTPCode.js',
  'previousRegistration': 'content/enhancers/previousRegistration.js'
};

async function init() {
  try {
    const result = await chrome.storage.local.get('enabled');
    const enabled = result.enabled !== false; // default true
    
    if (!enabled) {
      console.log('[JawwalPay UX+] Extension is disabled. Doing nothing.');
      return;
    }
    
    console.log('[JawwalPay UX+] Extension is enabled. Detecting page...');

    // Expose the extension resource base URL to injected page scripts.
    const runtimeUrlBase = chrome.runtime.getURL('');
    const normalizedRuntimeUrlBase = runtimeUrlBase.endsWith('/') ? runtimeUrlBase : `${runtimeUrlBase}/`;
    window.__jawwalpayRuntimeUrlBase = normalizedRuntimeUrlBase;
    console.log('[JawwalPay UX+] Set runtime URL base:', normalizedRuntimeUrlBase);
    
    // Detect current page
    const currentPage = detectCurrentPage();
    
    // Inject design system CSS (regardless of page)
    injectDesignSystem();
    
    // Load shared components first
    console.log('[JawwalPay UX+] Loading shared components...');
    const sharedComponentsScript = document.createElement('script');
    sharedComponentsScript.src = chrome.runtime.getURL('content/shared-components.js');
    sharedComponentsScript.onload = () => {
      console.log('[JawwalPay UX+] Shared components loaded');
      
      // Load shared layout CSS
      const sharedStyles = document.createElement('link');
      sharedStyles.rel = 'stylesheet';
      sharedStyles.href = chrome.runtime.getURL('styles/layout-components.css');
      document.head.appendChild(sharedStyles);
      
      // Load cache DB helper before the API hub
      console.log('[JawwalPay UX+] Loading cache DB helper...');
      const cacheDbScript = document.createElement('script');
      cacheDbScript.src = chrome.runtime.getURL('content/team-cache-db.js');
      cacheDbScript.onload = () => {
        console.log('[JawwalPay UX+] Cache DB helper loaded');

        // Load API hub next
        console.log('[JawwalPay UX+] Loading API hub...');
        const apiHubScript = document.createElement('script');
        apiHubScript.src = chrome.runtime.getURL('content/api-hub.js');
        apiHubScript.onload = () => {
          console.log('[JawwalPay UX+] API hub loaded');
          
          // Dispatch to appropriate enhancer
          const enhancerScript = ENHANCER_REGISTRY[currentPage];
          if (enhancerScript) {
            console.log(`[JawwalPay UX+] Loading enhancer for page: ${currentPage}`);
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL(enhancerScript);
            // Pass runtime URL base as a data attribute
            script.dataset.runtimeUrlBase = normalizedRuntimeUrlBase;
            document.head.appendChild(script);
          } else {
            console.log(`[JawwalPay UX+] No enhancer registered for page: ${currentPage}`);
          }
        };
        apiHubScript.onerror = () => {
          console.error('[JawwalPay UX+] Failed to load API hub');
        };
        document.head.appendChild(apiHubScript);
      };
      cacheDbScript.onerror = () => {
        console.error('[JawwalPay UX+] Failed to load cache DB helper');
      };
      document.head.appendChild(cacheDbScript);
    };
    sharedComponentsScript.onerror = () => {
      console.error('[JawwalPay UX+] Failed to load shared components');
    };
    document.head.appendChild(sharedComponentsScript);
    
  } catch (error) {
    console.error('[JawwalPay UX+] Error initializing:', error);
  }
}

// Run at document_idle
init();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getDetectedPage') {
    const currentPage = detectCurrentPage();
    sendResponse({ page: currentPage });
  } else if (request.action === 'enableEnhancement') {
    console.log('[JawwalPay UX+] Enable enhancement requested');
    // Re-initialize the enhancement
    init();
    sendResponse({ success: true });
  } else if (request.action === 'disableEnhancement') {
    console.log('[JawwalPay UX+] Disable enhancement requested');
    // Remove the overlay and restore original page
    removeEnhancement();
    sendResponse({ success: true });
  }
  return true; // Keep message channel open for async response
});

function removeEnhancement() {
  console.log('[JawwalPay UX+] Starting enhancement removal...');
  
  // Remove the overlay container if it exists (for dashboard)
  const overlay = document.getElementById('jawwalpay-uxplus-overlay');
  if (overlay) {
    console.log('[JawwalPay UX+] Found overlay, removing...');
    overlay.remove();
    console.log('[JawwalPay UX+] Removed overlay');
  } else {
    console.log('[JawwalPay UX+] No overlay found');
  }
  
  // Remove any injected styles
  const injectedStyles = document.querySelectorAll('style[data-jawwalpay-uxplus]');
  injectedStyles.forEach(style => style.remove());
  console.log('[JawwalPay UX+] Removed injected styles:', injectedStyles.length);
  
  // Remove design system CSS files (they use chrome.runtime.getURL)
  const allLinks = document.querySelectorAll('link[rel="stylesheet"]');
  allLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href.includes('design-tokens.css') || href.includes('components.css'))) {
      console.log('[JawwalPay UX+] Removing design system CSS:', href);
      link.remove();
    }
  });
  
  // Remove any other overlays that might have been created
  const allOverlays = document.querySelectorAll('[id*="jawwal"], [id*="overlay"]');
  allOverlays.forEach(ol => {
    console.log('[JawwalPay UX+] Removing additional overlay:', ol.id);
    ol.remove();
  });
  
  // Check if this is the login page and restore original content
  const currentPage = detectCurrentPage();
  console.log('[JawwalPay UX+] Current page for cleanup:', currentPage);
  console.log('[JawwalPay UX+] Has saved login content:', !!window.jawwalpayOriginalLoginBodyContent);
  
  if (currentPage === 'login' && window.jawwalpayOriginalLoginBodyContent) {
    console.log('[JawwalPay UX+] Restoring original login page content');
    document.body.innerHTML = window.jawwalpayOriginalLoginBodyContent;
    document.body.removeAttribute('style');
    console.log('[JawwalPay UX+] Login page restored');
  } else {
    // For dashboard and other pages, just make the body visible
    document.body.style.visibility = 'visible';
    document.body.style.overflow = 'auto';
    document.body.removeAttribute('style');
    console.log('[JawwalPay UX+] Made original body visible again');
  }
  
  console.log('[JawwalPay UX+] Enhancement removal complete');
}
