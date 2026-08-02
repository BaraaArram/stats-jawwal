// Dashboard page enhancer - injects reference HTML with real data
let originalBodyContent = null; // Store original body content for restoration

// Shared components and API hub are loaded by the loader before this script executes
// API functions are available via window.JawwalPayAPI

// Capture runtime URL base at script load time
(function() {
  let runtimeUrlBase = window.__jawwalpayRuntimeUrlBase;
  if (!runtimeUrlBase) {
    // Try to get from the script tag that loaded this file
    const currentScript = document.currentScript;
    if (currentScript && currentScript.dataset && currentScript.dataset.runtimeUrlBase) {
      runtimeUrlBase = currentScript.dataset.runtimeUrlBase;
    } else if (currentScript && currentScript.src) {
      // Derive from script src
      const scriptUrl = new URL(currentScript.src);
      runtimeUrlBase = scriptUrl.origin + '/';
    }
  }
  if (runtimeUrlBase) {
    window.__jawwalpayRuntimeUrlBase = runtimeUrlBase;
    console.log('[JawwalPay UX+] Captured runtime URL base:', runtimeUrlBase);
  } else {
    console.error('[JawwalPay UX+] Failed to capture runtime URL base');
  }
})();

// Helper function to calculate string similarity (Levenshtein distance-based)
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const costs = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  
  return (longer.length - costs[shorter.length]) / longer.length;
}

function enhanceDashboardPage() {
  try {
    console.log('[JawwalPay UX+] Injecting new design immediately...');
    extractDataAndInject();
  } catch (error) {
    console.error('[JawwalPay UX+] Error enhancing dashboard page:', error);
  }
}

// Fallback function when API hub is not loaded
function extractDataFromDOMAndInject(originalBody) {
  try {
    console.log('[JawwalPay UX+] Using DOM extraction fallback');
    
    // Extract balance data and user info from the original page
    let balanceAmount = '0.00';
    let commissionBalance = '0.00';
    let rollbackCount = '0';
    let transactionValue = '0.00';
    let transactionCount = '0';
    let userName = 'User';
    let userRole = 'Agent';

    const agentBalanceEl = originalBody.querySelector('.AgentAccounId');
    const commissionEl = originalBody.querySelector('.commissionAccountId');
    const rollbackEl = originalBody.querySelector('.rollBackTransactionToday');
    const amountEl = originalBody.querySelector('.amountOfTransactionToday');
    const countEl = originalBody.querySelector('.numberOfTransactionToday');
    const userNameEl = originalBody.querySelector('a.nav-link.-toggle[role="button"]') || originalBody.querySelector('a.nav-link[data-toggle="dropdown"][role="button"]') || originalBody.querySelector('.header-top-menu .nav-link') || originalBody.querySelector('.user-chip .u-meta b') || originalBody.querySelector('.DownloadUser .nav-link');

    if (agentBalanceEl) balanceAmount = agentBalanceEl.textContent.trim() || balanceAmount;
    if (commissionEl) commissionBalance = commissionEl.textContent.trim() || commissionBalance;
    if (rollbackEl) rollbackCount = rollbackEl.textContent.trim() || rollbackCount;
    if (amountEl) transactionValue = amountEl.textContent.trim() || transactionValue;
    if (countEl) transactionCount = countEl.textContent.trim() || transactionCount;
    if (userNameEl) userName = userNameEl.textContent.replace(/\s+/g, ' ').trim() || userName;

    const pageText = originalBody.textContent;
    if (!commissionEl) {
      const commMatch = pageText.match(/رصيد حساب العمولة[:\s]*(\d+\.?\d*)/);
      if (commMatch) commissionBalance = commMatch[1];
    }
    if (!rollbackEl) {
      const rollbackMatch = pageText.match(/حركات استرجاع اليوم[:\s]*(\d+)/);
      if (rollbackMatch) rollbackCount = rollbackMatch[1];
    }
    if (!transactionValue || transactionValue === '0.00') {
      const txValueMatch = pageText.match(/قيمة حركات اليوم[:\s]*(\d+\.?\d*)/);
      if (txValueMatch) transactionValue = txValueMatch[1];
    }
    if (!transactionCount || transactionCount === '0') {
      const txCountMatch = pageText.match(/عدد حركات اليوم[:\s]*(\d+)/);
      if (txCountMatch) transactionCount = txCountMatch[1];
    }

    const { userName: extractedUserName, userRole: extractedUserRole, navLinks: navMenuUrls } = extractPageMetadata(originalBody);
    userName = typeof extractedUserName === 'string' && extractedUserName.trim() ? extractedUserName.trim() : userName;
    userRole = typeof extractedUserRole === 'string' && extractedUserRole.trim() ? extractedUserRole.trim() : userRole;

    console.log('[JawwalPay UX+] Extracted stats:', { balanceAmount, commissionBalance, rollbackCount, transactionValue, transactionCount, userName });

    // Extract news items from DOM
    const newsItems = [];
    const newsTicker = originalBody.querySelector('#newsTicker');
    if (newsTicker) {
      newsTicker.querySelectorAll('a').forEach(link => {
        const title = link.textContent.trim().replace(/\s+/g, ' ');
        if (!title) return;
        newsItems.push({
          title,
          href: link.getAttribute('href') || 'javascript:void(0)',
          onclick: link.getAttribute('onclick') || ''
        });
      });
      if (newsItems.length === 0) {
        const title = newsTicker.textContent.trim().replace(/\s+/g, ' ');
        if (title) {
          newsItems.push({ title, href: 'javascript:void(0)', onclick: '' });
        }
      }
    }

    if (newsItems.length === 0) {
      const moreNews = originalBody.querySelector('.moreNews');
      if (moreNews) {
        newsItems.push({
          title: moreNews.textContent.trim().replace(/\s+/g, ' '),
          href: moreNews.getAttribute('href') || 'javascript:void(0)',
          onclick: moreNews.getAttribute('onclick') || ''
        });
      }
    }

    // Extract service card URLs
    const serviceCardUrls = {};
    const serviceCards = Array.from(originalBody.querySelectorAll('.j-widget-inner-box'));
    serviceCards.forEach(card => {
      const label = card.querySelector('label span') || card.querySelector('span');
      if (!label) return;
      const labelText = label.textContent.trim();
      if (!labelText) return;

      const hrefLink = card.querySelector('a[href]');
      if (hrefLink) {
        const href = hrefLink.getAttribute('href');
        if (href && href !== '#' && !href.startsWith('javascript:')) {
          serviceCardUrls[labelText] = href.startsWith('http') ? href : new URL(href, window.location.origin).href;
          return;
        }
      }

      const onclickValue = card.getAttribute('onclick') || card.querySelector('[onclick]')?.getAttribute('onclick');
      if (onclickValue) {
        const match = onclickValue.match(/loadHref\(['"]([^'"]+)['"]\)/) || onclickValue.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/) || onclickValue.match(/location\.href\s*=\s*['"]([^'"]+)['"]/);
        if (match) {
          serviceCardUrls[labelText] = match[1];
          return;
        }
      }

      const dataHref = card.dataset?.href || card.dataset?.url;
      if (dataHref) {
        serviceCardUrls[labelText] = dataHref;
      }
    });

    // Extract image URLs
    const imageUrls = {};
    originalBody.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src');
      const alt = img.getAttribute('alt') || '';
      if (src && !src.startsWith('data:')) {
        const fullSrc = src.startsWith('/') ? 'https://business.jawwalpay.ps' + src : src;
        const parent = img.closest('.j-widget-inner-box');
        if (parent) {
          const label = parent.querySelector('label span');
          if (label) {
            const labelText = label.textContent.trim();
            imageUrls[labelText] = fullSrc;
          }
        }
        imageUrls[alt || src] = fullSrc;
      }
    });

    // Extract transactions using regex
    const transactions = [];
    const allText = originalBody.textContent;
    const txPattern = /(TX-\d+)\s+(\d+\/\d+\/\d+\s+\d+:\d+)\s+([^\s]+(?:\s+[^\s]+)*)\s+([^\s]+(?:\s+[^\s]+)*)\s+([^\s]+(?:\s+[^\s]+)*)\s+(\d+•••\d+)\s+([+-]?\d+\.?\d*)\s*₪\s+(نعم|لا)/g;
    let match;
    while ((match = txPattern.exec(allText)) !== null) {
      const txData = {
        id: match[1],
        date: match[2],
        type: match[3],
        typeClass: 'topup',
        sender: match[4],
        receiver: match[5],
        mobile: match[6],
        amount: match[7],
        neg: match[7].includes('-'),
        reversed: match[8] === 'نعم'
      };
      
      if (txData.type.includes('فاتورة') || txData.type.includes('bill')) txData.typeClass = 'bill';
      else if (txData.type.includes('حزمة') || txData.type.includes('bundle')) txData.typeClass = 'bundle';
      else if (txData.type.includes('استرجاع') || txData.type.includes('rollback')) txData.typeClass = 'rollback';
      
      transactions.push(txData);
    }

    console.log('[JawwalPay UX+] Extracted', transactions.length, 'transactions from DOM');

    // Build and inject the UI
    buildAndInjectUI(balanceAmount, commissionBalance, rollbackCount, transactionValue, transactionCount, userName, transactions, serviceCardUrls, newsItems, navMenuUrls);
    
  } catch (error) {
    console.error('[JawwalPay UX+] Error in DOM extraction fallback:', error);
  }
}

function buildAndInjectUI(balanceAmount, commissionBalance, rollbackCount, transactionValue, transactionCount, userName, transactions, serviceCardUrls, newsItems, navMenuUrls) {
  // Create an overlay container for the new design
  const overlayContainer = document.createElement('div');
  overlayContainer.id = 'jawwalpay-uxplus-overlay';
  overlayContainer.style.cssText = 'position:fixed;inset:0;z-index:999999;background:var(--paper);overflow-y:auto;overflow-x:hidden;visibility:visible;';
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  
  // Add page-specific CSS
  const style = document.createElement('style');
  style.textContent = getDashboardPageCSS();
  overlayContainer.appendChild(style);
  
  // Build HTML using shared components
  const dashboardHTML = buildDashboardHTML(balanceAmount, commissionBalance, rollbackCount, transactionValue, transactionCount, userName, transactions, serviceCardUrls, newsItems, navMenuUrls);
  overlayContainer.appendChild(dashboardHTML);
  
  document.body.appendChild(overlayContainer);
  
  // Initialize shared component functionality
  initNavTabs(overlayContainer);
  initDropdowns(overlayContainer);
  
  // Balance show/hide functionality
  let visible = true;
  window.toggleBalance = function(){
    visible = !visible;
    const val = document.getElementById('heroVal');
    const icon = document.getElementById('eyeIcon');
    if(visible){
      val.textContent = balanceAmount;
      icon.innerHTML = '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="#fff" stroke-width="1.8"/>';
    } else {
      val.textContent = '••••••';
      icon.innerHTML = '<path d="M3 3l18 18" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><path d="M10.6 5.2A10.6 10.6 0 0 1 22 12s-1 1.9-2.9 3.6M6.6 6.6C4.2 8.1 2 12 2 12s3.6 7 10 7c1.4 0 2.7-.3 3.9-.8" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';
    }
  };
  
  // Populate transaction table
  const txBody = document.getElementById('txBody');
  const txData = transactions.length > 0 ? transactions : [];
  txBody.innerHTML = txData.map(t=>`<tr><td class="tx-id">${t.id}</td><td>${t.date}</td><td><span class="type-pill ${t.typeClass}">${t.type}</span></td><td>${t.sender}</td><td>${t.receiver}</td><td>${t.mobile}</td><td class="tx-amount ${t.neg?'neg':'pos'}">${t.neg?'-':'+'}${t.amount} ₪</td><td><span class="status-pill ${t.reversed?'yes':'no'}">${t.reversed?'نعم':'لا'}</span></td></tr>`).join('');
  
  console.log('[JawwalPay UX+] Dashboard design injected successfully (DOM fallback)');
}

async function extractDataAndInject() {
  try {
    const originalBody = document.body;
    
    // Show loading state
    showLoadingState();
    
    // Check if API hub is loaded
    if (!window.JawwalPayAPI) {
      console.error('[JawwalPay UX+] API hub not loaded. Please reload the extension.');
      hideLoadingState();
      // Fallback to DOM extraction only
      extractDataFromDOMAndInject(originalBody);
      return;
    }
    
    // Try to get cache data from the backend first.
    let cacheData = null;
    try {
      cacheData = await window.JawwalPayAPI.getOrRefreshCurrentUserCache();
    } catch (e) {
      console.warn('[JawwalPay UX+] Cache backend lookup failed:', e);
    }

    // Fetch data from APIs using the API hub
    const [merchantInfo, transactionsData, newsData, notificationsData] = await Promise.all([
      window.JawwalPayAPI.fetchMerchantInfo(),
      window.JawwalPayAPI.fetchLastTransactions(),
      window.JawwalPayAPI.fetchNews(),
      window.JawwalPayAPI.fetchNotifications()
    ]);
    
    // Prefer cache data when available for merchant/team stats.
    const fallbackStats = cacheData?.teamStats?.stats ? cacheData.teamStats.stats : null;
    const effectiveMerchantInfo = fallbackStats && typeof fallbackStats === 'object' ? fallbackStats : merchantInfo;

    // Extract balance data from API response
    let balanceAmount = '0.00';
    let commissionBalance = '0.00';
    let rollbackCount = '0';
    let transactionValue = '0.00';
    let transactionCount = '0';
    let notificationCount = 0;
    let notificationHtml = '';
    
    if (effectiveMerchantInfo && typeof effectiveMerchantInfo === 'object') {
      const normalizeNumber = (value) => {
        if (value === null || value === undefined || value === '') return '0.00';
        if (typeof value === 'number') return value.toFixed(2);
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed.toFixed(2) : String(value);
      };

      balanceAmount = normalizeNumber(effectiveMerchantInfo.agentBalance ?? effectiveMerchantInfo.merchantBalance);
      commissionBalance = normalizeNumber(effectiveMerchantInfo.commissionBalance);
      transactionValue = normalizeNumber(effectiveMerchantInfo.amountOfTransactionToday);
      transactionCount = String(effectiveMerchantInfo.numberOfTransactionToday ?? '0');
      // Rollback count might need to be derived from transactions or another endpoint
    }

    if (notificationsData && typeof notificationsData === 'object') {
      notificationCount = Number(notificationsData.count ?? notificationsData.notifications ?? 0);
      notificationHtml = typeof notificationsData.htmlContent === 'string' ? notificationsData.htmlContent : '';
    }
    
    // Fallback to DOM extraction if API fails
    if (!merchantInfo || typeof merchantInfo !== 'object') {
      console.log('[JawwalPay UX+] API failed, falling back to DOM extraction');
      const agentBalanceEl = originalBody.querySelector('.AgentAccounId');
      const commissionEl = originalBody.querySelector('.commissionAccountId');
      const rollbackEl = originalBody.querySelector('.rollBackTransactionToday');
      const amountEl = originalBody.querySelector('.amountOfTransactionToday');
      const countEl = originalBody.querySelector('.numberOfTransactionToday');

      if (agentBalanceEl) balanceAmount = agentBalanceEl.textContent.trim() || balanceAmount;
      if (commissionEl) commissionBalance = commissionEl.textContent.trim() || commissionBalance;
      if (rollbackEl) rollbackCount = rollbackEl.textContent.trim() || rollbackCount;
      if (amountEl) transactionValue = amountEl.textContent.trim() || transactionValue;
      if (countEl) transactionCount = countEl.textContent.trim() || transactionCount;

      const pageText = originalBody.textContent;
      if (!commissionEl) {
        const commMatch = pageText.match(/رصيد حساب العمولة[:\s]*(\d+\.?\d*)/);
        if (commMatch) commissionBalance = commMatch[1];
      }
      if (!rollbackEl) {
        const rollbackMatch = pageText.match(/حركات استرجاع اليوم[:\s]*(\d+)/);
        if (rollbackMatch) rollbackCount = rollbackMatch[1];
      }
      if (!transactionValue || transactionValue === '0.00') {
        const txValueMatch = pageText.match(/قيمة حركات اليوم[:\s]*(\d+\.?\d*)/);
        if (txValueMatch) transactionValue = txValueMatch[1];
      }
      if (!transactionCount || transactionCount === '0') {
        const txCountMatch = pageText.match(/عدد حركات اليوم[:\s]*(\d+)/);
        if (txCountMatch) transactionCount = txCountMatch[1];
      }
    }
    
    // Extract user info from DOM (not available in API)
    let userName = 'User';
    let userRole = 'Agent';
    const userNameEl = originalBody.querySelector('a.nav-link.-toggle[role="button"]') || originalBody.querySelector('a.nav-link[data-toggle="dropdown"][role="button"]') || originalBody.querySelector('.header-top-menu .nav-link') || originalBody.querySelector('.user-chip .u-meta b') || originalBody.querySelector('.DownloadUser .nav-link');
    if (userNameEl) userName = userNameEl.textContent.replace(/\s+/g, ' ').trim() || userName;

    const { userName: extractedUserName, userRole: extractedUserRole, navLinks: navMenuUrls } = extractPageMetadata(originalBody);
    userName = typeof extractedUserName === 'string' && extractedUserName.trim() ? extractedUserName.trim() : userName;
    userRole = typeof extractedUserRole === 'string' && extractedUserRole.trim() ? extractedUserRole.trim() : userRole;

    console.log('[JawwalPay UX+] Stats:', { balanceAmount, commissionBalance, rollbackCount, transactionValue, transactionCount, userName });
    console.log('[JawwalPay UX+] Navigation metadata:', { navMenuUrlsCount: Object.keys(navMenuUrls).length });

    // Extract news from API or fallback to DOM
    const newsItems = [];
    if (newsData && typeof newsData === 'object') {
      if (newsData.responseType === 'html' && newsData.htmlContent) {
        const htmlItems = extractNewsItemsFromHtml(newsData.htmlContent);
        htmlItems.forEach(item => newsItems.push(item));
      } else {
        const items = normalizeDataRows(newsData);
        items.forEach(item => {
          if (Array.isArray(item)) {
            const title = extractTextFromValue(item[0]);
            if (title) {
              newsItems.push({
                title,
                href: `javascript:void(0);`,
                onclick: ''
              });
            }
            return;
          }

          if (typeof item === 'object' && item !== null) {
            const title = extractTextFromValue(item.title || item.title1 || item.name || item.text || item.label);
            if (title) {
              newsItems.push({
                title,
                href: `javascript:void(0);`,
                onclick: item?.id ? `getNewsForm(${item.id})` : ''
              });
            }
          }
        });
      }
    }
    
    // Fallback to DOM extraction for news
    if (newsItems.length === 0) {
      const newsTicker = originalBody.querySelector('#newsTicker');
      if (newsTicker) {
        newsTicker.querySelectorAll('a').forEach(link => {
          const title = link.textContent.trim().replace(/\s+/g, ' ');
          if (!title) return;
          newsItems.push({
            title,
            href: link.getAttribute('href') || 'javascript:void(0)',
            onclick: link.getAttribute('onclick') || ''
          });
        });
        if (newsItems.length === 0) {
          const title = newsTicker.textContent.trim().replace(/\s+/g, ' ');
          if (title) {
            newsItems.push({ title, href: 'javascript:void(0)', onclick: '' });
          }
        }
      }

      if (newsItems.length === 0) {
        const moreNews = originalBody.querySelector('.moreNews');
        if (moreNews) {
          newsItems.push({
            title: moreNews.textContent.trim().replace(/\s+/g, ' '),
            href: moreNews.getAttribute('href') || 'javascript:void(0)',
            onclick: moreNews.getAttribute('onclick') || ''
          });
        }
      }
    }

    console.log('[JawwalPay UX+] News items:', newsItems);

    const serviceCardUrls = {};
    const serviceCards = Array.from(originalBody.querySelectorAll('.j-widget-inner-box'));
    serviceCards.forEach(card => {
      const label = card.querySelector('label span') || card.querySelector('span');
      if (!label) return;
      const labelText = label.textContent.trim();
      if (!labelText) return;

      const hrefLink = card.querySelector('a[href]');
      if (hrefLink) {
        const href = hrefLink.getAttribute('href');
      if (href && href !== '#' && !href.startsWith('javascript:')) {
        serviceCardUrls[labelText] = href.startsWith('http') ? href : new URL(href, window.location.origin).href;
        return;
      }
    }

      const onclickValue = card.getAttribute('onclick') || card.querySelector('[onclick]')?.getAttribute('onclick');
      if (onclickValue) {
        const match = onclickValue.match(/loadHref\(['"]([^'"]+)['"]\)/) || onclickValue.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/) || onclickValue.match(/location\.href\s*=\s*['"]([^'"]+)['"]/);
        if (match) {
          serviceCardUrls[labelText] = match[1];
          return;
        }
      }

      const dataHref = card.dataset?.href || card.dataset?.url;
      if (dataHref) {
        serviceCardUrls[labelText] = dataHref;
      }
    });

    console.log('[JawwalPay UX+] Extracted service card URLs:', serviceCardUrls);
    
    // Extract navigation menu URLs from original page
    // Extract image URLs from original page
    const imageUrls = {};
    originalBody.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src');
      const alt = img.getAttribute('alt') || '';
      const width = img.getAttribute('width') || '';
      if (src && !src.startsWith('data:')) {
        // Use the full URL if it's relative
        const fullSrc = src.startsWith('/') ? 'https://business.jawwalpay.ps' + src : src;
        // Also try to find the label text near the image for service cards
        const parent = img.closest('.j-widget-inner-box');
        if (parent) {
          const label = parent.querySelector('label span');
          if (label) {
            const labelText = label.textContent.trim();
            imageUrls[labelText] = fullSrc;
          }
        }
        imageUrls[alt || src] = fullSrc;
      }
    });
    console.log('[JawwalPay UX+] Extracted image URLs:', imageUrls);
    
    // Extract transactions from API or fallback to DOM
    const transactions = [];
    if (transactionsData && typeof transactionsData === 'object') {
      const rows = normalizeDataRows(transactionsData);
      rows.forEach(tx => {
        if (Array.isArray(tx)) {
          const [id, date, type, sender, receiver, mobile, amount, reversed] = tx;
          const txData = {
            id: extractTextFromValue(id) || 'TX-Unknown',
            date: extractTextFromValue(date) || new Date().toLocaleString('ar-EG'),
            type: extractTextFromValue(type) || 'شحن',
            typeClass: 'topup',
            sender: extractTextFromValue(sender) || '-',
            receiver: extractTextFromValue(receiver) || '-',
            mobile: extractTextFromValue(mobile) || '-',
            amount: extractTextFromValue(amount) || '0.00',
            neg: String(extractTextFromValue(amount) || '0').includes('-'),
            reversed: /نعم|yes|true/i.test(String(extractTextFromValue(reversed) || ''))
          };
          
          if (txData.type.includes('فاتورة') || txData.type.includes('bill')) txData.typeClass = 'bill';
          else if (txData.type.includes('حزمة') || txData.type.includes('bundle')) txData.typeClass = 'bundle';
          else if (txData.type.includes('استرجاع') || txData.type.includes('rollback')) txData.typeClass = 'rollback';
          
          transactions.push(txData);
          return;
        }

        const txData = {
          id: tx?.id || tx?.transactionId || 'TX-Unknown',
          date: tx?.date || tx?.transactionDate || new Date().toLocaleString('ar-EG'),
          type: tx?.type || tx?.transactionType || 'شحن',
          typeClass: 'topup',
          sender: tx?.sender || tx?.senderName || '-',
          receiver: tx?.receiver || tx?.receiverName || '-',
          mobile: tx?.mobile || tx?.phoneNumber || tx?.msisdn || '-',
          amount: tx?.amount || tx?.transactionAmount || '0.00',
          neg: String(tx?.amount || tx?.transactionAmount || '0').includes('-'),
          reversed: Boolean(tx?.reversed || tx?.isReversed || false)
        };
        
        if (txData.type.includes('فاتورة') || txData.type.includes('bill')) txData.typeClass = 'bill';
        else if (txData.type.includes('حزمة') || txData.type.includes('bundle')) txData.typeClass = 'bundle';
        else if (txData.type.includes('استرجاع') || txData.type.includes('rollback')) txData.typeClass = 'rollback';
        
        transactions.push(txData);
      });
    }
    
    // Fallback to regex extraction if API fails or returns empty
    if (transactions.length === 0) {
      console.log('[JawwalPay UX+] API transactions empty, using regex fallback');
      const allText = originalBody.textContent;
      const txPattern = /(TX-\d+)\s+(\d+\/\d+\/\d+\s+\d+:\d+)\s+([^\s]+(?:\s+[^\s]+)*)\s+([^\s]+(?:\s+[^\s]+)*)\s+([^\s]+(?:\s+[^\s]+)*)\s+(\d+•••\d+)\s+([+-]?\d+\.?\d*)\s*₪\s+(نعم|لا)/g;
      let match;
      while ((match = txPattern.exec(allText)) !== null) {
        const txData = {
          id: match[1],
          date: match[2],
          type: match[3],
          typeClass: 'topup',
          sender: match[4],
          receiver: match[5],
          mobile: match[6],
          amount: match[7],
          neg: match[7].includes('-'),
          reversed: match[8] === 'نعم'
        };
        
        if (txData.type.includes('فاتورة') || txData.type.includes('bill')) txData.typeClass = 'bill';
        else if (txData.type.includes('حزمة') || txData.type.includes('bundle')) txData.typeClass = 'bundle';
        else if (txData.type.includes('استرجاع') || txData.type.includes('rollback')) txData.typeClass = 'rollback';
        
        transactions.push(txData);
      }
    }
    
    console.log('[JawwalPay UX+] Transactions:', transactions.length);
    
    console.log('[JawwalPay UX+] Final data:', { balanceAmount, commissionBalance, rollbackCount, transactionValue, transactionCount, userName, transactions: transactions.length });
    
    // Hide loading state
    hideLoadingState();
    
    // Create an overlay container for the new design (don't hide original body)
    const overlayContainer = document.createElement('div');
    overlayContainer.id = 'jawwalpay-uxplus-overlay';
    overlayContainer.style.cssText = 'position:fixed;inset:0;z-index:999999;background:var(--paper);overflow-y:auto;overflow-x:hidden;visibility:visible;';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    
    // Add page-specific CSS
    const style = document.createElement('style');
    style.textContent = getDashboardPageCSS();
    overlayContainer.appendChild(style);
    
    // Build HTML using shared components
    overlayContainer.appendChild(buildDashboardHTML(balanceAmount, commissionBalance, rollbackCount, transactionValue, transactionCount, userName, transactions, serviceCardUrls, newsItems, navMenuUrls, notificationCount, notificationHtml));
    
    document.body.appendChild(overlayContainer);
    void renderHeaderNotifications(overlayContainer);
    
    // Initialize shared component functionality
    initNavTabs(overlayContainer);
    initDropdowns(overlayContainer);
    
    // Balance show/hide functionality
    let visible = true;
    window.toggleBalance = function(){
      visible = !visible;
      const val = document.getElementById('heroVal');
      const icon = document.getElementById('eyeIcon');
      if(visible){
        val.textContent = balanceAmount;
        icon.innerHTML = '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="#fff" stroke-width="1.8"/>';
      } else {
        val.textContent = '••••••';
        icon.innerHTML = '<path d="M3 3l18 18" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><path d="M10.6 5.2A10.6 10.6 0 0 1 22 12s-1 1.9-2.9 3.6M6.6 6.6C4.2 8.1 2 12 2 12s3.6 7 10 7c1.4 0 2.7-.3 3.9-.8" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';
      }
    };
    
    // Populate transaction table
    const txBody = document.getElementById('txBody');
    const txData = transactions.length > 0 ? transactions : [];
    txBody.innerHTML = txData.map(t=>`<tr><td class="tx-id">${t.id}</td><td>${t.date}</td><td><span class="type-pill ${t.typeClass}">${t.type}</span></td><td>${t.sender}</td><td>${t.receiver}</td><td>${t.mobile}</td><td class="tx-amount ${t.neg?'neg':'pos'}">${t.neg?'-':'+'}${t.amount} ₪</td><td><span class="status-pill ${t.reversed?'yes':'no'}">${t.reversed?'نعم':'لا'}</span></td></tr>`).join('');
    
    console.log('[JawwalPay UX+] Dashboard design injected successfully');
    
  } catch (error) {
    console.error('[JawwalPay UX+] Error enhancing dashboard page:', error);
  }
}

function getDashboardPageCSS() {
  return `
.page{padding:28px 0 64px;flex:1;}
#jawwalpay-uxplus-overlay{display:flex;flex-direction:column;min-height:100vh;}
.balance-row{display:grid;grid-template-columns:1.8fr 1fr;gap:20px;margin-bottom:28px;}
.hero-card{background:linear-gradient(135deg,var(--jp-green),var(--jp-green-dark));border-radius:var(--radius-lg);padding:28px;color:#fff;box-shadow:var(--shadow-md);position:relative;overflow:hidden;}
.hero-card::before{content:'';position:absolute;top:-50%;right:-20%;width:300px;height:300px;background:rgba(255,255,255,.1);border-radius:50%;}
.hero-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.hero-label{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;opacity:.9;}
.dot-ic{width:20px;height:20px;background:rgba(255,255,255,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;}
.eye-toggle{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.15);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;}
.eye-toggle:hover{background:rgba(255,255,255,.25);}
.hero-amount{font-family:'Cairo';font-size:42px;font-weight:800;margin-bottom:16px;}
.hero-amount .cur{font-size:18px;font-weight:600;opacity:.8;margin-right:8px;}
.hero-bottom{display:flex;align-items:center;justify-content:space-between;}
.hero-chip{display:flex;align-items:center;gap:6px;font-size:12px;opacity:.85;}
.hero-cta{display:flex;align-items:center;gap:8px;padding:10px 18px;border-radius:10px;background:#fff;color:var(--jp-green-dark);font-size:13px;font-weight:700;border:none;cursor:pointer;transition:transform .15s;}
.hero-cta:hover{transform:translateY(-2px);}
.stat-mini-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.stat-mini{background:var(--card);border:1px solid var(--line);border-radius:var(--radius-md);padding:16px;box-shadow:var(--shadow-sm);transition:box-shadow .18s, transform .18s;display:flex;flex-direction:column;gap:10px;justify-content:space-between;}
.stat-mini:hover{box-shadow:var(--shadow-md);transform:translateY(-2px);}
.s-ic{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.s-val{font-family:'Cairo';font-size:21px;font-weight:800;color:var(--ink);margin-bottom:2px;}
.s-label{font-size:11.5px;color:var(--ink-soft);font-weight:500;}
.services-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius-lg);padding:24px;box-shadow:var(--shadow-sm);margin-bottom:28px;}
.section-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:16px;}
.section-head h2{font-family:'Cairo';font-size:18px;font-weight:800;margin:0;}
.section-head .link{font-size:12.5px;font-weight:600;color:var(--jp-green-dark);display:flex;align-items:center;gap:4px;}
.eyebrow{font-size:11.5px;font-weight:700;color:var(--jp-green-dark);letter-spacing:.04em;margin:0 0 4px;text-transform:uppercase;}
.svc-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px;}
.svc-tile{border:1px solid var(--line);border-radius:var(--radius-md);padding:16px 12px 14px;text-align:center;cursor:pointer;transition:border-color .18s, box-shadow .18s, transform .18s, background .18s;display:flex;flex-direction:column;align-items:center;gap:10px;background:#fff;text-decoration:none;min-height:132px;justify-content:center;}
.svc-tile:hover{border-color:var(--jp-green);box-shadow:var(--shadow-md);transform:translateY(-3px);background:var(--jp-green-pale-2);}
.svc-ic-wrap{width:58px;height:58px;border-radius:16px;display:flex;align-items:center;justify-content:center;transition:filter .18s;color:inherit;padding:2px;}
.svc-tile:hover .svc-ic-wrap{filter:brightness(0.95);}
.svc-ic-wrap svg,
.svc-ic-wrap img{width:36px;height:36px;object-fit:contain;}
.svc-tile span{font-size:12.5px;font-weight:600;color:var(--ink);line-height:1.35;}
.tx-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);overflow:hidden;margin-bottom:28px;}
.tx-head{display:flex;align-items:center;justify-content:space-between;padding:20px 24px 14px;flex-wrap:wrap;gap:12px;}
.tx-head h2{font-family:'Cairo';font-size:18px;font-weight:800;margin:0;}
.tx-tools{display:flex;align-items:center;gap:10px;}
.tx-search{display:flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:10px;padding:0 12px;height:38px;background:var(--jp-green-pale-2);}
.tx-search input{border:none;background:transparent;outline:none;font-size:12.5px;font-family:'Tajawal';width:150px;}
.tx-search svg{opacity:.5;}
.btn-outline{display:flex;align-items:center;gap:6px;border:1px solid var(--line);background:#fff;color:var(--ink);padding:0 14px;height:38px;border-radius:10px;font-size:12.5px;font-weight:600;cursor:pointer;transition:border-color .15s;}
.btn-outline:hover{border-color:var(--jp-green);color:var(--jp-green-dark);}
.tx-table-wrap{overflow-x:auto;}
table.tx-table{width:100%;border-collapse:collapse;min-width:920px;}
.tx-table thead th{text-align:right;font-size:11.5px;color:var(--ink-soft);font-weight:700;padding:10px 24px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:var(--jp-green-pale-2);white-space:nowrap;}
.tx-table tbody td{padding:14px 24px;font-size:13px;border-bottom:1px solid var(--line);white-space:nowrap;color:var(--ink);}
.tx-table tbody tr:last-child td{border-bottom:none;}
.tx-table tbody tr:hover{background:#FAFCF6;}
.tx-id{font-family:'Cairo';font-weight:700;color:var(--jp-green-dark);}
.tx-amount{font-family:'Cairo';font-weight:800;}
.tx-amount.pos{color:var(--jp-green-dark);}
.tx-amount.neg{color:var(--red);}
.type-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;font-size:11.5px;font-weight:700;}
.type-pill.topup{background:var(--jp-green-pale);color:var(--jp-green-dark);}
.type-pill.bill{background:#EAF1FF;color:var(--blue);}
.type-pill.bundle{background:#F3ECFF;color:var(--violet);}
.type-pill.rollback{background:#FFF3E0;color:var(--amber);}
.status-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;}
.status-pill.no{background:var(--jp-green-pale);color:var(--jp-green-dark);}
.status-pill.yes{background:#FDECEC;color:var(--red);}
.tx-foot{display:flex;align-items:center;justify-content:center;padding:16px;border-top:1px solid var(--line);}
.tx-foot a{font-size:12.5px;font-weight:700;color:var(--jp-green-dark);display:flex;align-items:center;gap:6px;}
@media (max-width:980px){.balance-row{grid-template-columns:1fr;}.stat-mini-grid{grid-template-columns:1fr 1fr;}.svc-grid{grid-template-columns:repeat(3,1fr);}}
@media (max-width:760px){.search-box{display:none;}.user-chip .u-meta{display:none;}.nav-tabs{padding-top:2px;}.svc-grid{grid-template-columns:repeat(2,1fr);}.utility-bar .app-links{display:none;}.hero-amount{font-size:34px;}}
`;
}

function getExtensionRootUrl() {
  if (window.__jawwalpayRuntimeUrlBase) {
    return window.__jawwalpayRuntimeUrlBase;
  }
  const script = document.currentScript;
  if (script?.src) {
    const url = new URL(script.src);
    return url.origin + '/'; // Return just the origin (chrome-extension://id/)
  }
  return '';
}

function normalizeDataRows(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.data2)) return payload.data2;
  return [];
}

function extractTextFromValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  }
  if (Array.isArray(value)) {
    return value.map(item => extractTextFromValue(item)).filter(Boolean).join(' ');
  }
  if (typeof value === 'object') {
    return extractTextFromValue(value.title || value.title1 || value.name || value.text || value.label || value.value);
  }
  return String(value);
}

function extractNewsItemsFromHtml(html) {
  if (!html) return [];

  const container = document.createElement('div');
  container.innerHTML = html;
  const items = [];

  const anchorItems = Array.from(container.querySelectorAll('a'));
  anchorItems.forEach(anchor => {
    const title = extractTextFromValue(anchor.textContent || anchor.innerText || '');
    if (title) {
      items.push({
        title,
        href: anchor.getAttribute('href') || 'javascript:void(0);',
        onclick: anchor.getAttribute('onclick') || ''
      });
    }
  });

  if (items.length > 0) {
    return items;
  }

  const fallbackText = extractTextFromValue(container.textContent || '');
  if (fallbackText) {
    return [{ title: fallbackText, href: 'javascript:void(0);', onclick: '' }];
  }

  return [];
}

function buildDashboardHTML(balanceAmount, commissionBalance, rollbackCount, transactionValue, transactionCount, userName, transactions, serviceCardUrls = {}, newsItems = [], navMenuUrls = {}, notificationCount = 0, notificationHtml = '') {
  const container = document.createElement('div');
  const userRole = 'Agent';
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  // Use getExtensionRootUrl to derive the base URL from the script location
  const runtimeUrlBase = getExtensionRootUrl();
  console.log('[JawwalPay UX+] Runtime URL base from getExtensionRootUrl:', runtimeUrlBase);
  
  const getIcon = (path, alt) => {
    if (!runtimeUrlBase) {
      console.error('[JawwalPay UX+] Runtime URL base not available');
      return '';
    }
    const fullUrl = runtimeUrlBase + path;
    console.log('[JawwalPay UX+] Icon URL for', path, ':', fullUrl);
    return `<img src="${fullUrl}" alt="${alt}" />`;
  };
  const services = [
    { label: 'شحن رصيد', icon: getIcon('icons/service-recharge.png', 'شحن رصيد'), bg: '#047857', fg: '#FFFFFF', labelColor: '#047857', href: serviceCardUrls['شحن رصيد'] || '/topUp/jawwalBalanceTopUp' },
    { label: 'حزم الإنترنت', icon: getIcon('icons/service-internet-bundles.png', 'حزم الإنترنت'), bg: '#1D4ED8', fg: '#FFFFFF', labelColor: '#1D4ED8', href: serviceCardUrls['حزم الانترنت'] || serviceCardUrls['حزم الإنترنت'] || '/topUp/bundles/?is3g=true' },
    { label: 'حزم الدقائق', icon: getIcon('icons/service-minutes-bundles.png', 'حزم الدقائق'), bg: '#B45309', fg: '#FFFFFF', labelColor: '#B45309', href: serviceCardUrls['حزم الدقائق'] || '/topUp/bundles' },
    { label: 'حزم التجوال', icon: getIcon('icons/service-roaming-bundles.png', 'حزم التجوال'), bg: '#7C3AED', fg: '#FFFFFF', labelColor: '#7C3AED', href: serviceCardUrls['حزم التجوال'] || '/topUp/roaming' },
    { label: 'التقارير', icon: getIcon('icons/service-reports.png', 'التقارير'), bg: '#1E40AF', fg: '#FFFFFF', labelColor: '#1E40AF', href: serviceCardUrls['التقارير'] || '/merchant/transactionsServices/?db=true' },
    { label: 'البضائع الإلكترونية', icon: getIcon('icons/service-e-goods.png', 'البضائع الإلكترونية'), bg: '#0F766E', fg: '#FFFFFF', labelColor: '#0F766E', href: serviceCardUrls['البضائع الإلكترونية'] || '/digital/digitalGoods/?db=true' },
    { label: 'حركات شحن الرصيد', icon: getIcon('icons/service-recharge-tx.png', 'حركات شحن الرصيد'), bg: '#047857', fg: '#FFFFFF', labelColor: '#047857', href: serviceCardUrls['حركات شحن الرصيد'] || '/agentView/topUpTransaction/?db=true' },
    { label: 'حركات استرجاع الرصيد', icon: getIcon('icons/service-recharge-tx.png', 'حركات استرجاع الرصيد'), bg: '#B91C1C', fg: '#FFFFFF', labelColor: '#B91C1C', href: serviceCardUrls['حركات استرجاع الرصيد'] || '/agentView/topUpRollBackTransaction/?db=true' },
    { label: 'حركات شحن الحزم', icon: getIcon('icons/service-recharge.png', 'حركات شحن الحزم'), bg: '#B45309', fg: '#FFFFFF', labelColor: '#B45309', href: serviceCardUrls['حركات شحن الحزم'] || '/agentView/bundleTransaction/?db=true' },
    { label: 'دفع الفواتير', icon: getIcon('icons/service-bill-payment.png', 'دفع فواتير'), bg: '#0F4C81', fg: '#FFFFFF', labelColor: '#0F4C81', href: serviceCardUrls['دفع الفواتير'] || '/billing/list/?db=true' }
  ];
  
  container.innerHTML = `
${getUtilityBarHTML()}
${getHeaderHTML({ userName, userRole, notificationCount, notificationHtml })}
${getNavHTML('merchant', navMenuUrls)}
${renderNewsTickerHTML(newsItems)}
<div class="page">
  <div class="wrap">
    <div class="balance-row">
      <div class="hero-card">
        <div class="hero-top">
          <div class="hero-label">
            <span class="dot-ic">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#fff" stroke-width="1.8"/><path d="M9 12h6M9 9h4.5M9 15h6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>
            </span>
            رصيد حساب الوكيل
          </div>
          <button class="eye-toggle" id="eyeBtn" onclick="toggleBalance()">
            <svg id="eyeIcon" width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="#fff" stroke-width="1.8"/></svg>
          </button>
        </div>
        <div class="hero-amount">
          <span id="heroVal">${balanceAmount}</span>
          <span class="cur">₪ شيقل</span>
        </div>
        <div class="hero-bottom">
          <div class="hero-chip">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 3v18M18 8l-6-5-6 5" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            آخر تحديث: الآن
          </div>
          <button class="hero-cta">
            شحن رصيد
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>

      <div class="stat-mini-grid">
        <div class="stat-mini">
          <div class="s-ic" style="background:#F3ECFF;color:var(--violet);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M3 10h18" stroke="currentColor" stroke-width="1.8"/></svg>
          </div>
          <div>
            <div class="s-val">${commissionBalance}</div>
            <div class="s-label">رصيد حساب العمولة</div>
          </div>
        </div>
        <div class="stat-mini">
          <div class="s-ic" style="background:#FFF3E0;color:var(--amber);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 1 0 3-6.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M3 4v5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div>
            <div class="s-val">${rollbackCount}</div>
            <div class="s-label">حركات استرجاع اليوم</div>
          </div>
        </div>
        <div class="stat-mini">
          <div class="s-ic" style="background:#EAF1FF;color:var(--blue);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M9 12h6M9 9h4.5M9 15h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </div>
          <div>
            <div class="s-val">${transactionValue}</div>
            <div class="s-label">قيمة حركات اليوم</div>
          </div>
        </div>
        <div class="stat-mini">
          <div class="s-ic" style="background:#EAF6D8;color:var(--jp-green-dark);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.8"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </div>
          <div>
            <div class="s-val">${transactionCount}</div>
            <div class="s-label">عدد الحركات</div>
          </div>
        </div>
      </div>
    </div>

    <div class="services-card">
      <div class="section-head">
        <div>
          <p class="eyebrow">الخدمات</p>
          <h2>كل ما تحتاجه في مكان واحد</h2>
        </div>
        <a href="#" class="link">عرض الكل <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M14 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
      </div>
      <div class="svc-grid">
        ${services.map(service => `
          <a class="svc-tile" href="${service.href}" target="_self">
            <div class="svc-ic-wrap" style="background:${service.bg};color:${service.fg};">
              ${service.icon}
            </div>
            <span style="color:${service.labelColor};">${service.label}</span>
          </a>
        `).join('')}
      </div>
    </div>

    <div class="tx-card">
      <div class="tx-head">
        <h2>آخر الحركات</h2>
        <div class="tx-tools">
          <div class="tx-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <input type="text" placeholder="بحث...">
          </div>
          <button class="btn-outline">
            تصدير
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
      <div class="tx-table-wrap">
        <table class="tx-table">
          <thead>
            <tr>
              <th>رقم الحركة</th>
              <th>التاريخ</th>
              <th>النوع</th>
              <th>المرسل</th>
              <th>المستقبل</th>
              <th>رقم الموبايل</th>
              <th>المبلغ</th>
              <th>استرجاع</th>
            </tr>
          </thead>
          <tbody id="txBody">
          </tbody>
        </table>
      </div>
      <div class="tx-foot">
        <a href="#">عرض جميع الحركات <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
      </div>
    </div>
  </div>
</div>
${getFooterHTML()}
`;
  
  return container;
}

function renderNewsTickerHTML(newsItems = []) {
  const newsText = newsItems.length > 0 ? newsItems.map(item => {
    const title = item.title.replace(/\s+/g, ' ');
    if (item.href && item.href !== 'javascript:void(0)') {
      return `<a href="${item.href}" class="news-link">${title}</a>`;
    }
    return title;
  }).join(' | ') : 'لا توجد أخبار حالياً';

  return `
<div class="news-strip">
  <div class="wrap">
    <div class="news-badge">
      <svg viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
      جديد
    </div>
    <div class="news-text-mask">
      <div class="news-text">${newsText}</div>
    </div>
    <button class="news-more" aria-label="المزيد من الأخبار">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  </div>
</div>`;
}

// Show loading state
function showLoadingState() {
  const loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'jawwalpay-loading';
  loadingOverlay.style.cssText = 'position:fixed;inset:0;z-index:999998;background:rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;';
  loadingOverlay.innerHTML = `
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#047857" stroke-width="2">
      <circle cx="12" cy="12" r="9" stroke-dasharray="56.52" stroke-dashoffset="28.26">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
      </circle>
    </svg>
    <div style="font-family:system-ui;font-size:14px;font-weight:600;color:#047857;">جاري تحميل البيانات...</div>
  `;
  document.body.appendChild(loadingOverlay);
}

// Hide loading state
function hideLoadingState() {
  const loadingOverlay = document.getElementById('jawwalpay-loading');
  if (loadingOverlay) {
    loadingOverlay.remove();
  }
}

// Execute the enhancement
enhanceDashboardPage();
