// JawwalPay API Hub - Centralized API calls for all enhancers
// Base URL for all API requests
const API_BASE = 'https://business.jawwalpay.ps';

/**
 * Make an authenticated API request
 * @param {string} endpoint - API endpoint path
 * @param {object} options - Fetch options
 * @returns {Promise<object>} - Response JSON
 */
async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const defaultOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    credentials: 'include',
    ...options
  };

  // If body is an object, convert to URL-encoded format
  if (defaultOptions.method === 'POST' && defaultOptions.body && typeof defaultOptions.body === 'object') {
    defaultOptions.body = new URLSearchParams(defaultOptions.body).toString();
  }

  try {
    const response = await fetch(url, defaultOptions);
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[JawwalPay UX+] API request returned ${response.status} for ${endpoint}:`, errorText.slice(0, 180));
      return null;
    }

    const rawText = await response.text();
    if (!rawText) {
      return null;
    }

    const trimmedText = rawText.trim();
    if (!trimmedText) {
      return null;
    }

    try {
      return JSON.parse(trimmedText);
    } catch (parseError) {
      if (trimmedText.startsWith('<') || contentType.includes('text/html')) {
        return { htmlContent: trimmedText, rawText: trimmedText, responseType: 'html' };
      }

      console.warn(`[JawwalPay UX+] API response for ${endpoint} was not valid JSON.`, parseError.message);
      return null;
    }
  } catch (error) {
    console.error('[JawwalPay UX+] API request error:', error);
    return null;
  }
}

/**
 * Fetch merchant info from API
 * Used by: Dashboard enhancer
 * @returns {Promise<object>} - Merchant info data
 */
async function fetchMerchantInfo() {
  try {
    const data = await apiRequest('/merchant/getMerchantInfo', {
      method: 'POST',
      body: ''
    });
    console.log('[JawwalPay UX+] Merchant info fetched:', data);
    return data;
  } catch (error) {
    console.error('[JawwalPay UX+] Failed to fetch merchant info:', error);
    return null;
  }
}

/**
 * Fetch last transactions from API
 * Used by: Dashboard enhancer
 * @param {object} params - Query parameters
 * @returns {Promise<object>} - Transaction data
 */
async function fetchLastTransactions(params = {}) {
  try {
    const body = {
      sSearch: '',
      offset: '0',
      max: '-1',
      draw: '1',
      orderColumn: '0',
      orderDirection: 'desc',
      ...params
    };
    const data = await apiRequest('/cumulativeReportTbl/getLastTransaction', {
      method: 'POST',
      body
    });
    console.log('[JawwalPay UX+] Transactions fetched:', data);
    return data;
  } catch (error) {
    console.error('[JawwalPay UX+] Failed to fetch transactions:', error);
    return null;
  }
}

/**
 * Fetch news/announcements from API
 * Used by: Dashboard enhancer
 * @returns {Promise<object>} - News data
 */
async function fetchNews() {
  try {
    // Try common news endpoints
    const endpoints = [
      '/news/getActiveNews',
      '/announcement/getActiveNews',
      '/news/list',
      '/announcement/list'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const data = await apiRequest(endpoint, {
          method: 'POST',
          body: { isActive: 'true', max: '1000' }
        });
        if (data && (data.data || data.data2)) {
          console.log('[JawwalPay UX+] News fetched from:', endpoint);
          return data;
        }
      } catch (e) {
        // Try next endpoint
        continue;
      }
    }
    return null;
  } catch (error) {
    console.error('[JawwalPay UX+] Failed to fetch news:', error);
    return null;
  }
}

/**
 * Check workflow notifications
 * Used by: Dashboard, Main enhancers
 * @returns {Promise<object>} - Notification HTML data
 */
async function fetchNotifications() {
  try {
    const data = await apiRequest('/workflowOrder/hasNotifications', {
      method: 'POST',
      body: ''
    });

    const htmlContent = typeof data?.htmlContent === 'string' ? data.htmlContent : '';
    const countMatch = htmlContent.match(/<span[^>]*>(\d+)<\/span>/i);
    const count = countMatch ? Number(countMatch[1]) : 0;
    const normalized = {
      ...data,
      htmlContent,
      count,
      hasNotifications: count > 0
    };

    console.log('[JawwalPay UX+] Notifications fetched:', normalized);
    return normalized;
  } catch (error) {
    console.error('[JawwalPay UX+] Failed to fetch notifications:', error);
    return null;
  }
}

/**
 * Send OTP code to the provided mobile number.
 * Used by: Registration enhancer
 * @param {object} params - OTP request parameters
 * @returns {Promise<object>} - Normalized response payload
 */
async function sendOtpCode(params = {}) {
  try {
    const body = {
      agentMobileNumber: '',
      ...params
    };

    const data = await apiRequest('/agent/sendOTPCode', {
      method: 'POST',
      body
    });

    const normalized = {
      ...data,
      success: data?.success === true,
      reference: data?.reference ?? null,
      message: typeof data?.message === 'string' ? data.message : '',
      raw: data
    };

    console.log('[JawwalPay UX+] OTP code request sent:', normalized);
    return normalized;
  } catch (error) {
    console.error('[JawwalPay UX+] Failed to send OTP code:', error);
    return null;
  }
}

/**
 * Filter previous registrations using the documented agent endpoint.
 * Used by: Previous Registration enhancer
 * @param {object} params - Filter parameters
 * @returns {Promise<object>} - DataTables-compatible response payload
 */
async function filterPreviousRegistrations(params = {}) {
  try {
    const body = {
      mobileNumber: '',
      fromSubmissionDate: '',
      toSubmissionDate: '',
      sSearch: '',
      offset: '0',
      max: '10',
      draw: '1',
      orderColumn: '0',
      orderDirection: 'desc',
      ...params
    };

    const data = await apiRequest('/agent/filterPreviousRegistration', {
      method: 'POST',
      body
    });

    const normalized = {
      ...data,
      recordsTotal: Number(data?.recordsTotal ?? data?.recordsFiltered ?? data?.iTotalRecords ?? 0) || 0,
      recordsFiltered: Number(data?.recordsFiltered ?? data?.recordsTotal ?? data?.iTotalRecords ?? 0) || 0,
      data: data?.data ?? data?.aaData ?? [],
      data2: data?.data2 ?? [],
      raw: data
    };

    console.log('[JawwalPay UX+] Previous registrations fetched:', normalized);
    return normalized;
  } catch (error) {
    console.error('[JawwalPay UX+] Failed to filter previous registrations:', error);
    return null;
  }
}

/**
 * Generic DataTables-compatible list fetch
 * Used by: Various list-based enhancers
 * @param {string} endpoint - API endpoint
 * @param {object} params - DataTables parameters
 * @returns {Promise<object>} - DataTables response
 */
async function fetchDataTableData(endpoint, params = {}) {
  try {
    const body = {
      sSearch: '',
      offset: '0',
      max: '-1',
      draw: '1',
      orderColumn: '0',
      orderDirection: 'desc',
      ...params
    };
    const data = await apiRequest(endpoint, {
      method: 'POST',
      body
    });
    console.log('[JawwalPay UX+] DataTable data fetched from:', endpoint);
    return data;
  } catch (error) {
    console.error('[JawwalPay UX+] Failed to fetch DataTable data:', error);
    return null;
  }
}

const BACKEND_CACHE_BASE = 'https://jawwalpay-cache-service.onrender.com';

function getBackendBaseUrl() {
  return window.JawwalPayBackendUrl || BACKEND_CACHE_BASE;
}

async function backendRequest(endpoint, options = {}) {
  try {
    const baseUrl = getBackendBaseUrl();
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json'
      },
      ...options
    };

    if (defaultOptions.body && typeof defaultOptions.body !== 'string') {
      defaultOptions.body = JSON.stringify(defaultOptions.body);
    }

    const response = await fetch(url, defaultOptions);
    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[JawwalPay UX+] Cache backend request returned ${response.status} for ${url}:`, errorText.slice(0, 180));
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('[JawwalPay UX+] Cache backend request failed:', error);
    return null;
  }
}

async function fetchCachedUserFromBackend(userId) {
  if (!userId) return null;
  const result = await backendRequest(`/users/${encodeURIComponent(userId)}`);
  return result?.user ?? null;
}

async function fetchCachedTeamFromBackend(teamId) {
  if (!teamId) return null;
  const result = await backendRequest(`/teams/${encodeURIComponent(teamId)}`);
  return result?.team ?? null;
}

async function fetchCachedUserTeamFromBackend(userId) {
  if (!userId) return null;
  return await backendRequest(`/user-team/${encodeURIComponent(userId)}`);
}

async function cacheUserTeamToBackend(payload = {}) {
  if (!payload || typeof payload !== 'object') return null;
  return await backendRequest('/cache/refresh', {
    method: 'POST',
    body: payload
  });
}

function getCurrentUserIdentifier() {
  const selectors = [
    'a.nav-link.-toggle[role="button"]',
    'a.nav-link[data-toggle="dropdown"][role="button"]',
    '.header-top-menu .nav-link',
    '.user-chip .u-meta b',
    '.DownloadUser .nav-link'
  ];
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.textContent.replace(/\s+/g, ' ').trim();
      if (text) return text;
    }
  }
  return null;
}

async function getOrRefreshCurrentUserCache() {
  const currentUser = getCurrentUserIdentifier();
  if (!currentUser) return null;
  const cacheKey = currentUser.toLowerCase().replace(/\s+/g, '_');
  const cached = await fetchCachedUserTeamFromBackend(cacheKey);
  if (cached && (cached.user || cached.team || cached.stats)) {
    return cached;
  }

  const portalStats = await fetchMerchantInfo();
  const fallbackUser = {
    userId: cacheKey,
    username: currentUser,
    teamId: cacheKey,
    metadata: {
      source: 'portal-derived',
      fallback: true
    }
  };
  const fallbackTeam = {
    teamId: cacheKey,
    name: `${currentUser} team`,
    metadata: {
      source: 'portal-derived',
      fallback: true
    }
  };
  const fallbackStats = {
    teamId: cacheKey,
    stats: portalStats || { fallback: true },
    lastUpdatedAt: new Date().toISOString()
  };

  await cacheUserTeamToBackend({ user: fallbackUser, team: fallbackTeam, stats: fallbackStats });
  return { user: fallbackUser, team: fallbackTeam, stats: fallbackStats };
}

async function ensureCacheDB() {
  if (window.JawwalPayCacheDB && typeof window.JawwalPayCacheDB.init === 'function') {
    try {
      await window.JawwalPayCacheDB.init();
      return true;
    } catch (error) {
      console.warn('[JawwalPay UX+] CacheDB init failed:', error);
      return false;
    }
  }
  return false;
}

async function getCachedTeamStats(teamId) {
  if (!teamId) return null;
  const initialized = await ensureCacheDB();
  if (!initialized) return null;
  return window.JawwalPayCacheDB.getTeamStats(String(teamId));
}

async function setCachedTeamStats(stats) {
  if (!stats || !stats.teamId) return null;
  const initialized = await ensureCacheDB();
  if (!initialized) return null;
  return window.JawwalPayCacheDB.putTeamStats(stats);
}

async function getCachedUser(userId) {
  if (!userId) return null;
  const initialized = await ensureCacheDB();
  if (!initialized) return null;
  return window.JawwalPayCacheDB.getUser(String(userId));
}

async function setCachedUser(user) {
  if (!user || !user.userId) return null;
  const initialized = await ensureCacheDB();
  if (!initialized) return null;
  return window.JawwalPayCacheDB.putUser(user);
}

async function getCachedTeam(teamId) {
  if (!teamId) return null;
  const initialized = await ensureCacheDB();
  if (!initialized) return null;
  return window.JawwalPayCacheDB.getTeam(String(teamId));
}

async function setCachedTeam(team) {
  if (!team || !team.teamId) return null;
  const initialized = await ensureCacheDB();
  if (!initialized) return null;
  return window.JawwalPayCacheDB.putTeam(team);
}

async function cacheTeamRecords(records) {
  if (!Array.isArray(records) || records.length === 0) return [];
  const initialized = await ensureCacheDB();
  if (!initialized) return [];
  return window.JawwalPayCacheDB.bulkPutRecords(records);
}

async function getCachedRecordsByTeam(teamId) {
  if (!teamId) return [];
  const initialized = await ensureCacheDB();
  if (!initialized) return [];
  return window.JawwalPayCacheDB.getRecordsByTeam(String(teamId));
}

async function getCachedRecordsByUser(userId) {
  if (!userId) return [];
  const initialized = await ensureCacheDB();
  if (!initialized) return [];
  return window.JawwalPayCacheDB.getRecordsByUser(String(userId));
}

// Export functions to global scope for use by enhancers
window.JawwalPayAPI = {
  apiRequest,
  backendRequest,
  getBackendBaseUrl,
  fetchCachedUserFromBackend,
  fetchCachedTeamFromBackend,
  fetchCachedUserTeamFromBackend,
  cacheUserTeamToBackend,
  getOrRefreshCurrentUserCache,
  fetchMerchantInfo,
  fetchLastTransactions,
  fetchNews,
  fetchNotifications,
  sendOtpCode,
  filterPreviousRegistrations,
  fetchDataTableData,
  getCachedTeamStats,
  setCachedTeamStats,
  getCachedUser,
  setCachedUser,
  getCachedTeam,
  setCachedTeam,
  cacheTeamRecords,
  getCachedRecordsByTeam,
  getCachedRecordsByUser,
  API_BASE,
  BACKEND_CACHE_BASE
};

console.log('[JawwalPay UX+] API Hub loaded');
