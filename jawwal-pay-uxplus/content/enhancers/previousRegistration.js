// Previous Registration page enhancer - injects enhanced subscriber query UX
console.log('[JawwalPay UX+] previousRegistration.js loaded');
// toggle to enable printing full server response body (useful for debugging)
const DEBUG_VERBOSE_SERVER_RESPONSE = true;

function enhancePreviousRegistrationPage() {
  try {
    console.log('[JawwalPay UX+] Injecting previousRegistration page design...');
    extractDataAndInject();
  } catch (error) {
    console.error('[JawwalPay UX+] Error enhancing previousRegistration page:', error);
  }
}

function performServerPageRequest(container, pageNumber) {
  const orig = container._origTable;
  const url = (orig && orig.getAttribute && orig.getAttribute('url')) || '/agent/filterPreviousRegistration';
  const pageSize = container._pagination.pageSize || 10;
  const offset = (Math.max(1, pageNumber) - 1) * pageSize;
  const quickSearch = container.querySelector('#enhanced-quick-search')?.value?.trim() || '';
  // try to read form fields from original form if present
  const originalForm = document.querySelector('form[action*="previousRegistration" i], form#previousRegistrationForm, form');
  const mobileNumber = originalForm ? (originalForm.querySelector('input[name*="mobile" i], input[type="tel"], input#mobileNumber, input#mobile')?.value || '') : (container.querySelector('#enhanced-mobile-number')?.value || '');
  const fromSubmissionDate = originalForm ? (originalForm.querySelector('input[name*="from" i], input[name*="startDate" i], input[id*="from" i], input[id*="startDate" i]')?.value || '') : (container.querySelector('#enhanced-from-date')?.value || '');
  const toSubmissionDate = originalForm ? (originalForm.querySelector('input[name*="to" i], input[name*="endDate" i], input[id*="to" i], input[id*="endDate" i]')?.value || '') : (container.querySelector('#enhanced-to-date')?.value || '');
  const customerStatus = originalForm ? (originalForm.querySelector('select[name="customerStatus" i], select[name*="status" i], select[name*="requestStatus" i], select[name*="orderStatus" i], select#status')?.value || '') : (container.querySelector('#enhanced-request-status')?.value || '');

  const summaryFilters = {
    mobileNumber,
    fromSubmissionDate,
    toSubmissionDate,
    customerStatus,
    sSearch: quickSearch
  };

  const summaryFilterKey = buildSummaryFilterKey(summaryFilters);
  const shouldRefreshSummary = summaryFilterKey !== container._lastSummaryFilterKey;
  if (shouldRefreshSummary) {
    container._lastSummaryFilterKey = summaryFilterKey;
  }

  container._pagination = container._pagination || {};
  container._pagination.serverSide = true;
  container._pagination.draw = pageNumber;
  const params = new URLSearchParams();
  params.set('mobileNumber', mobileNumber);
  params.set('fromSubmissionDate', fromSubmissionDate);
  params.set('toSubmissionDate', toSubmissionDate);
  params.set('customerStatus', mapOverlayStatusToServerValue(customerStatus));
  params.set('sSearch', quickSearch);
  params.set('offset', String(offset));
  params.set('max', String(pageSize));
  params.set('draw', String(pageNumber));
  params.set('orderColumn', String(container._pagination.orderColumn || 0));
  params.set('orderDirection', String(container._pagination.orderDirection || 'desc'));

  console.debug('[JawwalPay UX+] performing server page request', url, params.toString());
  const tbody = container.querySelector('#enhanced-results-body');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row">جاري تحميل النتائج...</td></tr>`;
  }
  const info = container.querySelector('#enhanced-result-info');
  if (info) {
    info.textContent = 'جاري تحميل النتائج...';
  }
  setLoadingState(container, true);

  if (shouldRefreshSummary) {
    fetchAndStoreRegistrationSummaryCounts(container, summaryFilters).catch(err => {
      console.warn('[JawwalPay UX+] failed to refresh registration summary counts', err);
    });
  }

  const apiClient = window.JawwalPayAPI?.filterPreviousRegistrations;
  if (typeof apiClient === 'function') {
    apiClient({
      mobileNumber,
      fromSubmissionDate,
      toSubmissionDate,
      customerStatus: mapOverlayStatusToServerValue(customerStatus),
      sSearch: quickSearch,
      offset: String(offset),
      max: String(pageSize),
      draw: String(pageNumber),
      orderColumn: String(container._pagination.orderColumn || 0),
      orderDirection: String(container._pagination.orderDirection || 'desc')
    }).then(js => {
      if (!js) {
        throw new Error('No response from filterPreviousRegistrations API');
      }

      const recordsTotal = Number(js.recordsFiltered ?? js.recordsTotal ?? 0) || 0;
      const data = js.data ?? js.aaData ?? js.data2 ?? [];
      const responsePageSize = pageSize;
      const totalPages = Math.max(1, Math.ceil(recordsTotal / responsePageSize));

      container._pagination = container._pagination || {};
      container._pagination.total = recordsTotal;
      container._pagination.pageSize = responsePageSize;
      container._pagination.currentPage = pageNumber;
      container._pagination.serverSide = true;
      container._pagination.totalPages = totalPages;

      const pagesSet = new Set([1, totalPages]);
      const radius = 2;
      for (let i = Math.max(1, pageNumber - radius); i <= Math.min(totalPages, pageNumber + radius); i++) {
        pagesSet.add(i);
      }
      pagesSet.add(Math.min(2, totalPages));
      pagesSet.add(Math.max(1, totalPages - 1));
      container._pagination.pagesList = Array.from(pagesSet).sort((a, b) => a - b);

      const tbody = container.querySelector('#enhanced-results-body');
      if (tbody) {
        const currentUserName = container._currentUserName || '';
        const rowsHtml = data.length ? data.map(row => {
          if (Array.isArray(row)) {
            const cells = row.slice(0, 8).map(v => `<td>${escapeHtml(String(v ?? ''))}</td>`);
            return `<tr>${cells.join('')}</tr>`;
          }
          const fullName = escapeHtml(row.fullName || row.name || '');
          const customerId = escapeHtml(row.customerIdNumber || row.customerId || row.id || '');
          const mobile = escapeHtml(row.mobileNumber || row.mobile || '');
          const creationDate = escapeHtml(row.creationDate || row.createdAt || '');
          const approvalDate = escapeHtml(row.approvalDate || row.approval_date || row.approvalDate || '—');
          const agentDisplay = getAgentDisplayName(row);
          const agent = escapeHtml(agentDisplay);
          const status = buildStatusHtml(row.customerStatus || row.status || '');
          const actionIdentifier = getCustomerActionIdentifier(row);
          const actionsHtml = [buildActionAnchor('#view', 'عرض', 'view', actionIdentifier)];
          if (row.allowEdit === 'true' || row.allowEdit === true) actionsHtml.push(buildActionAnchor('#edit', 'تعديل', 'edit', actionIdentifier));
          const isCurrentUserEntry = isCurrentUserRow(row, currentUserName);
          const currentUserBadge = isCurrentUserEntry ? '<span class="current-user-pill">أنت</span>' : '';
          const rowClass = isCurrentUserEntry ? 'current-user-row' : '';
          return `<tr class="${rowClass}"><td>${fullName}</td><td>${customerId}</td><td dir="ltr" style="text-align:right;">${mobile}</td><td>${creationDate}</td><td>${approvalDate}</td><td>${agent}${currentUserBadge}</td><td>${status}</td><td><div style="display:flex;gap:6px;">${actionsHtml.join('')}</div></td></tr>`;
        }).join('') : `<tr><td colspan="8" class="empty-row">لا توجد نتائج حالياً</td></tr>`;
        tbody.innerHTML = rowsHtml;
        container._pagination.filteredRows = Array.from(tbody.querySelectorAll('tr'));
        renderRowsForPage(container);
        renderPaginationControls(container);
        updateResultInfo(container);
      }
      return;
    }).catch(err => {
      console.error('[JawwalPay UX+] previous registration API request failed', err);
      throw err;
    }).finally(() => {
      setLoadingState(container, false);
    });
    return;
  }

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: params.toString(),
    credentials: 'include'
  }).then(resp => resp.text()).then(text => {
    if (DEBUG_VERBOSE_SERVER_RESPONSE) {
      try { console.debug('[JawwalPay UX+] server response (truncated):', text && text.substring ? text.substring(0, 2000) : text); } catch (e) { /* ignore */ }
    }
    // try to parse as HTML first
    if (text && text.trim().startsWith('<')) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      // try to find a table in the response
      const table = doc.querySelector('table') || doc.querySelector('#' + (orig && orig.id ? orig.id : ''));
      if (table) {
        const rows = extractOriginalResultRows(doc);
        const tbody = container.querySelector('#enhanced-results-body');
        if (tbody) {
          const rowsHtml = rows.length ? rows.map(cells => `<tr>${cells.join('')}</tr>`).join('') : `<tr><td colspan="8" class="empty-row">لا توجد نتائج حالياً</td></tr>`;
          tbody.innerHTML = rowsHtml;
          // update pagination metadata from response if available
          syncPaginationFromOriginal(container);
          applyFilterAndPaginate(container, container.querySelector('#enhanced-quick-search')?.value?.trim().toLowerCase() || '');
        }
        return;
      }
    }

    // fallback: try JSON
    try {
      const js = JSON.parse(text);
      if (js) {
        const recordsTotal = Number(js.recordsFiltered ?? js.recordsTotal ?? js.iTotalRecords ?? js.total ?? 0) || 0;
        const data = js.data ?? js.aaData ?? js.data2 ?? [];
        const responsePageSize = pageSize;
        const totalPages = Math.max(1, Math.ceil(recordsTotal / responsePageSize));

        container._pagination = container._pagination || {};
        container._pagination.total = recordsTotal;
        container._pagination.pageSize = responsePageSize;
        container._pagination.currentPage = pageNumber;
        container._pagination.serverSide = true;
        container._pagination.totalPages = totalPages;

        const pagesSet = new Set([1, totalPages]);
        const radius = 2;
        for (let i = Math.max(1, pageNumber - radius); i <= Math.min(totalPages, pageNumber + radius); i++) {
          pagesSet.add(i);
        }
        pagesSet.add(Math.min(2, totalPages));
        pagesSet.add(Math.max(1, totalPages - 1));
        container._pagination.pagesList = Array.from(pagesSet).sort((a, b) => a - b);

        const tbody = container.querySelector('#enhanced-results-body');
        if (tbody) {
          const currentUserName = container._currentUserName || '';
          const rowsHtml = data.length ? data.map(row => {
            if (Array.isArray(row)) {
              const cells = row.slice(0, 8).map(v => `<td>${escapeHtml(String(v ?? ''))}</td>`);
              return `<tr>${cells.join('')}</tr>`;
            }
            const fullName = escapeHtml(row.fullName || row.name || '');
            const customerId = escapeHtml(row.customerIdNumber || row.customerId || row.id || '');
            const mobile = escapeHtml(row.mobileNumber || row.mobile || '');
            const creationDate = escapeHtml(row.creationDate || row.createdAt || '');
            const approvalDate = escapeHtml(row.approvalDate || row.approval_date || row.approvalDate || '—');
            const agentDisplay = getAgentDisplayName(row);
            const agent = escapeHtml(agentDisplay);
            const status = buildStatusHtml(row.customerStatus || row.status || '');
            const actionIdentifier = getCustomerActionIdentifier(row);
            const actionsHtml = [buildActionAnchor('#view', 'عرض', 'view', actionIdentifier)];
            if (row.allowEdit === 'true' || row.allowEdit === true) actionsHtml.push(buildActionAnchor('#edit', 'تعديل', 'edit', actionIdentifier));
            const isCurrentUserEntry = isCurrentUserRow(row, currentUserName);
            const currentUserBadge = isCurrentUserEntry ? '<span class="current-user-pill">أنت</span>' : '';
            const rowClass = isCurrentUserEntry ? 'current-user-row' : '';
            return `<tr class="${rowClass}"><td>${fullName}</td><td>${customerId}</td><td dir="ltr" style="text-align:right;">${mobile}</td><td>${creationDate}</td><td>${approvalDate}</td><td>${agent}${currentUserBadge}</td><td>${status}</td><td><div style="display:flex;gap:6px;">${actionsHtml.join('')}</div></td></tr>`;
          }).join('') : `<tr><td colspan="8" class="empty-row">لا توجد نتائج حالياً</td></tr>`;
          tbody.innerHTML = rowsHtml;
          container._pagination.filteredRows = Array.from(tbody.querySelectorAll('tr'));
          renderRowsForPage(container);
          renderPaginationControls(container);
          updateResultInfo(container);
        }
        return;
      }
    } catch (e) {
      console.warn('[JawwalPay UX+] server response parse failed', e);
    }
  }).catch(err => {
    console.error('[JawwalPay UX+] server page request failed', err);
  }).finally(() => {
    setLoadingState(container, false);
  });
}

function extractDataAndInject() {
  const originalBody = document.body;
  const originalForm = document.querySelector('form[action*="previousRegistration" i], form#previousRegistrationForm, form');
  const { userName, userRole, navLinks } = extractPageMetadata(originalBody);

  const overlayContainer = document.createElement('div');
  overlayContainer.id = 'jawwalpay-uxplus-overlay';
  overlayContainer.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:999999;background:var(--paper);overflow-y:auto;overflow-x:hidden;visibility:visible;';

  const style = document.createElement('style');
  style.textContent = getPageSpecificCSS();
  style.setAttribute('data-jawwalpay-uxplus', 'true');
  overlayContainer.appendChild(style);

  overlayContainer._currentUserName = userName;
  overlayContainer._registrationSummaryCounts = null;
  const rows = extractOriginalResultRows(originalBody);
  overlayContainer.appendChild(buildPreviousRegistrationHTML(navLinks, userName, userRole, rows));

  document.body.appendChild(overlayContainer);
  document.body.style.overflow = 'hidden';
  updateCurrentUserSummary(overlayContainer);

  if (originalForm) {
    hydratePreviousRegistrationFields(originalForm, overlayContainer);
    originalForm.style.display = 'none';
  }

  // attach reference to original table and DataTable instance (if available)
  const origTable = originalBody.querySelector('table');
  if (origTable) {
    overlayContainer._origTable = origTable;
    try {
      overlayContainer._dataTableInstance = window._dataTables && window._dataTables[origTable.id] ? window._dataTables[origTable.id] : null;
    } catch (e) {
      overlayContainer._dataTableInstance = null;
    }
    setupOriginalTableObserver(overlayContainer);
  }

  initNavTabs(overlayContainer);
  initDropdowns(overlayContainer);
  initPreviousRegistrationActions(overlayContainer, originalForm);
  initPagination(overlayContainer);


  console.log('[JawwalPay UX+] previousRegistration page design injected');
}

function initPreviousRegistrationActions(container, originalForm) {
  const searchButton = container.querySelector('#enhanced-search-btn');
  const quickSearch = container.querySelector('#enhanced-quick-search');
  const statusSelect = container.querySelector('#enhanced-request-status');
  const mobileInput = container.querySelector('#enhanced-mobile-number');
  const fromDateInput = container.querySelector('#enhanced-from-date');
  const toDateInput = container.querySelector('#enhanced-to-date');
  initCustomerActionHandlers(container);

  function syncOverlayToOriginalForm() {
    if (!originalForm) return;

    const assignValue = (selector, value) => {
      const element = originalForm.querySelector(selector);
      if (!element) return;
      element.value = value || '';
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    };

    assignValue('select[name="customerStatus" i], select[name*="status" i], select[name*="requestStatus" i], select[name*="orderStatus" i], select#status', statusSelect?.value || '');
    assignValue('input[name*="mobile" i], input[type="tel"], input#mobileNumber, input#mobile', mobileInput?.value || '');
    assignValue('input[name*="from" i], input[name*="startDate" i], input[id*="from" i], input[id*="startDate" i]', fromDateInput?.value || '');
    assignValue('input[name*="to" i], input[name*="endDate" i], input[id*="to" i], input[id*="endDate" i]', toDateInput?.value || '');
  }

  function performSearch() {
    syncOverlayToOriginalForm();
    performServerPageRequest(container, 1);
  }

  if (searchButton) {
    searchButton.addEventListener('click', performSearch);
  }

  const summaryFilterCards = container.querySelectorAll('.summary-card-filterable');
  summaryFilterCards.forEach(card => {
    card.addEventListener('click', () => {
      const statusValue = card.getAttribute('data-summary-filter') || '';
      if (statusSelect) {
        statusSelect.value = statusValue;
        statusSelect.dispatchEvent(new Event('input', { bubbles: true }));
        statusSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      applyActiveSummaryCard(container);
      performServerPageRequest(container, 1);
    });
  });

  applyActiveSummaryCard(container);
}

function initPagination(container) {
  if (!container) return;
  const pageSizeSelect = container.querySelector('#enhanced-page-size');
  const quickSearch = container.querySelector('#enhanced-quick-search');
  container._pagination = {
    pageSize: parseInt(pageSizeSelect?.value || '10', 10),
    currentPage: 1,
    draw: 1,
    serverSide: false
  };

  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', () => {
      const newSize = parseInt(pageSizeSelect.value || '10', 10);
      container._pagination.pageSize = newSize;
      container._pagination.currentPage = 1;
      container._pagination.draw = 1;
      container._pagination.serverSide = true;
      // if underlying DataTable exists, set its page length and redraw
      const dt = container._dataTableInstance;
      if (dt) {
        try {
          if (typeof dt.page === 'function' && typeof dt.page.len === 'function') {
            dt.page.len(newSize).draw(false);
            return;
          }
          if (dt.api && typeof dt.api === 'function') {
            const api = dt.api();
            if (api && typeof api.page.len === 'function') {
              api.page.len(newSize).draw(false);
              return;
            }
          }
        } catch (e) {
          console.warn('[JawwalPay UX+] DataTable set length failed, falling back to client-side', e);
        }
      }
      // jQuery DataTables fallback for page length
      try {
        const $ = window.jQuery;
        if ($ && container._origTable) {
          const $tbl = $(container._origTable);
          if (typeof $tbl.DataTable === 'function') {
            const api = $tbl.DataTable();
            if (api && typeof api.page === 'function' && typeof api.page.len === 'function') {
              api.page.len(newSize).draw(false);
              return;
            }
            if (api && typeof api.page.len === 'function') {
              api.page.len(newSize).draw(false);
              return;
            }
          }
          // legacy API: fnDisplayLength or fnPageChange patterns
          if ($tbl && $tbl.length && $tbl.fnSetDisplayLength) {
            $tbl.fnSetDisplayLength(newSize);
            return;
          }
        }
      } catch (e) { /* ignore */ }
      const orig = container._origTable;
      if (orig) {
        performServerPageRequest(container, 1);
        return;
      }
      applyFilterAndPaginate(container, quickSearch?.value?.trim().toLowerCase() || '');
    });
  }

  if (container._origTable) {
    container._pagination.serverSide = true;
    performServerPageRequest(container, 1);
    return;
  }

  const initialQuery = quickSearch?.value?.trim().toLowerCase() || '';
  applyFilterAndPaginate(container, initialQuery);
}

function applyFilterAndPaginate(container, query) {
  const rows = Array.from(container.querySelectorAll('#enhanced-results-body tr'));
  const filtered = query ? rows.filter(r => r.textContent.toLowerCase().includes(query)) : rows.slice();
  // store filtered list on container
  container._pagination.filteredRows = filtered;
  const ps = container._pagination.pageSize || 10;
  const total = typeof container._pagination.total === 'number' ? container._pagination.total : filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / ps));
  if (container._pagination.currentPage > totalPages) container._pagination.currentPage = totalPages;
  if (container._pagination.currentPage < 1) container._pagination.currentPage = 1;
  renderRowsForPage(container);
  renderPaginationControls(container);
  updateResultInfo(container);
}

function renderRowsForPage(container) {
  const { pageSize, currentPage, filteredRows = [], serverSide } = container._pagination;
  const rows = Array.from(container.querySelectorAll('#enhanced-results-body tr'));
  if (serverSide && typeof container._pagination.total === 'number') {
    rows.forEach(r => r.style.display = 'none');
    filteredRows.forEach(r => r.style.display = '');
    return;
  }
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  rows.forEach(r => r.style.display = 'none');
  filteredRows.forEach((r, idx) => {
    r.style.display = (idx >= start && idx < end) ? '' : 'none';
  });
}

function renderPaginationControls(container) {
  const pager = container.querySelector('#enhanced-pagination');
  if (!pager) return;
  const { pageSize, currentPage, filteredRows = [], serverSide, total: paginationTotal } = container._pagination;
  const total = (serverSide && typeof paginationTotal === 'number') ? paginationTotal : filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const createBtn = (text, cls, disabled, idx) => `<a class="paginate_button ${cls}${disabled ? ' disabled' : ''}" data-dt-idx="${idx}" tabindex="0">${text}</a>`;

  const pagesToShow = [];
  const radius = 2;
  // prefer pagesList from original table when available
  const pagesList = container._pagination && container._pagination.pagesList;
  if (Array.isArray(pagesList) && pagesList.length) {
    pagesToShow.push(...pagesList.map(Number));
    // ensure currentPage present
    if (!pagesToShow.includes(currentPage)) pagesToShow.push(currentPage);
    pagesToShow.sort((a, b) => a - b);
    // If original pagesList is too small (e.g. only current page), fall back to generating a neighborhood
    if (pagesToShow.length <= 1 && totalPages > 1) {
      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - radius && i <= currentPage + radius)) pagesToShow.push(i);
      }
      // dedupe & sort
      const set = Array.from(new Set(pagesToShow)).sort((a, b) => a - b);
      pagesToShow.length = 0; pagesToShow.push(...set);
    }
  } else {
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - radius && i <= currentPage + radius)) pagesToShow.push(i);
    }
  }

  let inner = '';
  inner += createBtn('الاولى', 'first', currentPage === 1, 0);
  inner += createBtn('السابق', 'previous', currentPage === 1, 1);
  inner += '<span>';
  let lastShown = 0;
  pagesToShow.forEach(p => {
    if (lastShown && p - lastShown > 1) inner += '<span class="ellipsis">…</span>';
    inner += createBtn(p, p === currentPage ? 'current' : '', false, p);
    lastShown = p;
  });
  inner += '</span>';
  inner += createBtn('التالي', 'next', currentPage === totalPages, totalPages + 1);
  inner += createBtn('الاخيره', 'last', currentPage === totalPages, totalPages + 2);

  pager.innerHTML = inner;

  pager.querySelectorAll('a.paginate_button').forEach(a => {
    a.addEventListener('click', (ev) => {
      if (a.classList.contains('disabled') || a.classList.contains('current')) return;
      const txt = a.textContent.trim();
      console.debug('[JawwalPay UX+] pagination click:', txt);

      const targetPage = getTargetPageFromClick(container, txt);
      if (targetPage !== null) {
        performServerPageRequest(container, targetPage);
      }
    });
  });
}

function getTargetPageFromClick(container, txt) {
  const { pageSize, currentPage, total = 0 } = container._pagination;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  let targetPage = currentPage;

  if (txt === 'الاولى') targetPage = 1;
  else if (txt === 'السابق') targetPage = Math.max(1, currentPage - 1);
  else if (txt === 'التالي') targetPage = Math.min(totalPages, currentPage + 1);
  else if (txt === 'الاخيره') targetPage = totalPages;
  else {
    const p = parseInt(txt, 10);
    if (!isNaN(p)) targetPage = p;
  }

  if (targetPage < 1 || targetPage > totalPages) return null;
  if (targetPage === currentPage) return null;
  return targetPage;
}

function updateResultInfo(container) {
  const info = container.querySelector('#enhanced-result-info');
  const { pageSize, currentPage, filteredRows = [], total: totalFromOrig } = container._pagination;
  const total = typeof totalFromOrig === 'number' ? totalFromOrig : filteredRows.length;
  if (!info) return;
  if (total === 0) {
    info.textContent = 'جاري تحميل النتائج...';
    updateCurrentUserSummary(container);
    return;
  }
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(total, currentPage * pageSize);
  info.textContent = `إظهار ${start} الى ${end} من ${total} مدخل`;
  updateCurrentUserSummary(container);
}

function buildSummaryFilterKey(filters = {}) {
  return [
    filters.mobileNumber || '',
    filters.fromSubmissionDate || '',
    filters.toSubmissionDate || '',
    filters.customerStatus || '',
    filters.sSearch || ''
  ].join('|');
}

async function fetchAndStoreRegistrationSummaryCounts(container, filters = {}) {
  if (!container) return null;
  const apiClient = window.JawwalPayAPI?.filterPreviousRegistrations;
  if (typeof apiClient !== 'function') {
    console.warn('[JawwalPay UX+] filterPreviousRegistrations API client unavailable for summary counts');
    return null;
  }

  const summaryTargets = [
    { key: 'total', customerStatus: '' },
    { key: 'approved', customerStatus: 'Approved' },
    { key: 'pending', customerStatus: 'Created' },
    { key: 'rejected', customerStatus: 'Rejected' }
  ];

  setSummaryLoadingState(container, true, 'جارٍ تحميل إجمالي المدخلات الكاملة...');

  try {
    const resultEntries = await Promise.all(summaryTargets.map(target =>
      fetchSummaryCount(apiClient, { ...filters, customerStatus: target.customerStatus })
    ));

    const counts = {
      total: Number(resultEntries[0]) || 0,
      approved: Number(resultEntries[1]) || 0,
      pending: Number(resultEntries[2]) || 0,
      rejected: Number(resultEntries[3]) || 0
    };

    container._registrationSummaryCounts = counts;
    updateCurrentUserSummary(container);
    return counts;
  } catch (error) {
    console.warn('[JawwalPay UX+] error fetching registration summary counts', error);
    const statusEl = container.querySelector('#enhanced-summary-status');
    if (statusEl) {
      statusEl.textContent = 'تعذر تحميل الإحصائيات الكاملة';
      statusEl.classList.remove('hidden');
    }
    return null;
  } finally {
    setSummaryLoadingState(container, false);
  }
}

async function fetchSummaryCount(apiClient, params = {}) {
  const request = {
    mobileNumber: params.mobileNumber || '',
    fromSubmissionDate: params.fromSubmissionDate || '',
    toSubmissionDate: params.toSubmissionDate || '',
    customerStatus: mapOverlayStatusToServerValue(params.customerStatus || ''),
    sSearch: params.sSearch || '',
    offset: '0',
    max: '1',
    draw: String(Date.now()),
    orderColumn: '0',
    orderDirection: 'desc'
  };
  const js = await apiClient(request);
  if (!js) throw new Error('No response from filterPreviousRegistrations API');
  return Number(js.recordsFiltered ?? js.recordsTotal ?? js.iTotalRecords ?? 0) || 0;
}

function getCurrentUserSummaryCountsFromTable(container) {
  if (!container) return { total: 0, approved: 0, pending: 0, rejected: 0 };
  if (container._registrationSummaryCounts && typeof container._registrationSummaryCounts === 'object') {
    const { total = 0, approved = 0, pending = 0, rejected = 0 } = container._registrationSummaryCounts;
    return { total, approved, pending, rejected };
  }

  const rows = Array.from(container.querySelectorAll('#enhanced-results-body tr'))
    .filter(row => !row.classList.contains('empty-row'));
  const counts = {
    total: typeof container._pagination?.total === 'number' ? container._pagination.total : rows.length,
    approved: 0,
    pending: 0,
    rejected: 0
  };

  rows.forEach(row => {
    const statusCell = row.querySelector('td:nth-child(7)');
    if (!statusCell) return;
    const text = statusCell.textContent.trim().toLowerCase();
    if (/موافقة|approved|تمت/.test(text)) counts.approved += 1;
    else if (/رفض|rejected/.test(text)) counts.rejected += 1;
    else if (/انتظار|pending|review|قيد/.test(text)) counts.pending += 1;
  });

  return counts;
}

function setSummaryLoadingState(container, isLoading, message = '') {
  if (!container) return;
  const summaryLoader = container.querySelector('#enhanced-summary-loading');
  const summaryStatus = container.querySelector('#enhanced-summary-status');

  if (summaryLoader) {
    summaryLoader.textContent = message || summaryLoader.textContent || 'جارٍ تحميل إجمالي المدخلات الكاملة...';
    summaryLoader.classList.toggle('hidden', !isLoading);
  }
  if (summaryStatus && isLoading) {
    summaryStatus.textContent = '';
    summaryStatus.classList.add('hidden');
  }
}

function updateCurrentUserSummary(container) {
  if (!container) return;
  const totalEl = container.querySelector('#enhanced-summary-total');
  const approvedEl = container.querySelector('#enhanced-summary-approved');
  const pendingEl = container.querySelector('#enhanced-summary-pending');
  const rejectedEl = container.querySelector('#enhanced-summary-rejected');
  const summaryLoader = container.querySelector('#enhanced-summary-loading');
  const summaryStatus = container.querySelector('#enhanced-summary-status');
  if (!totalEl || !approvedEl || !pendingEl || !rejectedEl) return;

  const counts = getCurrentUserSummaryCountsFromTable(container);

  if (summaryLoader) {
    summaryLoader.classList.add('hidden');
  }

  totalEl.textContent = counts.total !== undefined ? counts.total : '0';
  approvedEl.textContent = counts.approved !== undefined ? counts.approved : '0';
  pendingEl.textContent = counts.pending !== undefined ? counts.pending : '0';
  rejectedEl.textContent = counts.rejected !== undefined ? counts.rejected : '0';

  if (summaryStatus) {
    summaryStatus.textContent = '';
    summaryStatus.classList.add('hidden');
  }

  applyActiveSummaryCard(container);
}

function applyActiveSummaryCard(container) {
  if (!container) return;
  const selectedStatus = container.querySelector('#enhanced-request-status')?.value || '';
  container.querySelectorAll('.summary-card-filterable').forEach(card => {
    const cardFilter = card.getAttribute('data-summary-filter') || '';
    card.classList.toggle('active', cardFilter === selectedStatus);
  });
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const ageSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (ageSeconds < 60) return 'قبل لحظات';
  if (ageSeconds < 3600) return `قبل ${Math.floor(ageSeconds / 60)} دقيقة`;
  if (ageSeconds < 86400) return `قبل ${Math.floor(ageSeconds / 3600)} ساعة`;
  return `قبل ${Math.floor(ageSeconds / 86400)} يوم`;
}

function setLoadingState(container, isLoading) {
  const mask = container.querySelector('#enhanced-loading-mask');
  const pager = container.querySelector('#enhanced-pagination');
  const info = container.querySelector('#enhanced-result-info');
  if (mask) mask.classList.toggle('hidden', !isLoading);
  if (pager) pager.classList.toggle('loading', isLoading);
  if (info) info.textContent = isLoading ? 'جاري تحميل النتائج...' : info.textContent;
  if (container._pagination) container._pagination.loading = isLoading;
}

function setupOriginalTableObserver(container) {
  const origTable = container._origTable;
  if (!origTable) return;
  const tbody = origTable.querySelector('tbody');
  if (!tbody) return;

  const observer = new MutationObserver(() => {
    // original table changed (DataTable redraw) - update overlay rows
    try {
      updateOverlayFromOriginal(container);
    } catch (e) {
      console.error('[JawwalPay UX+] failed to update overlay from original table', e);
    }
  });

  observer.observe(tbody, { childList: true, subtree: true });
  // keep reference so it can be disconnected later
  container._origTableObserver = observer;
}

function updateOverlayFromOriginal(container) {
  if (!container) return;
  const rows = extractOriginalResultRows(document);
  const tbody = container.querySelector('#enhanced-results-body');
  if (!tbody) return;
  const rowsHtml = rows.length
    ? rows.map(cells => `<tr>${cells.join('')}</tr>`).join('')
    : `<tr><td colspan="8" class="empty-row">لا توجد نتائج حالياً</td></tr>`;
  tbody.innerHTML = rowsHtml;

  // if original DataTable instance exists, try to extract server-side paging info
  const dt = container._dataTableInstance;
  if (dt) {
    try {
      // DataTables v1.10+ API pattern
      const info = (typeof dt.page === 'function' && dt.page().info) ? dt.page().info() : (dt.api ? dt.api().page.info() : null);
      if (info) {
        container._pagination = container._pagination || {};
        container._pagination.pageSize = info.length || container._pagination.pageSize || 10;
        container._pagination.currentPage = (info.page || 0) + 1;
        // populate filteredRows with current table rows for client-side rendering
        container._pagination.filteredRows = Array.from(tbody.querySelectorAll('tr'));
      }
    } catch (e) { /* ignore */ }
  }

  // re-apply filter and pagination
  const quickSearch = container.querySelector('#enhanced-quick-search');
  // sync pagination metadata (total, pages) from original DOM if available
  syncPaginationFromOriginal(container);
  applyFilterAndPaginate(container, quickSearch?.value?.trim().toLowerCase() || '');
}

function syncPaginationFromOriginal(container) {
  const orig = container._origTable;
  // try by table id first (common DataTables integration)
  const infoEl = (orig && orig.id) ? document.getElementById(orig.id + '_info') : null;
  const paginateEl = (orig && orig.id) ? document.getElementById(orig.id + '_paginate') : null;

  // fallback: try to find a nearby info/footer element with the expected Arabic summary text
  let fallbackInfo = null;
  if (!infoEl) {
    // look for elements that contain 'إظهار' near the table
    const candidates = Array.from(document.querySelectorAll('div,span'));
    for (const el of candidates) {
      if (el.textContent && /إظهار\s+\d+/i.test(el.textContent)) { fallbackInfo = el; break; }
    }
  }
  const finalInfoEl = infoEl || fallbackInfo;

  // parse info text like: 'إظهار 1 الى 10 من 9,546 مدخل'
  if (finalInfoEl && finalInfoEl.textContent) {
    const nums = finalInfoEl.textContent.replace(/,/g, '').match(/\d+/g);
    if (nums && nums.length >= 3) {
      const start = parseInt(nums[0], 10);
      const end = parseInt(nums[1], 10);
      const total = parseInt(nums[2], 10);
      container._pagination = container._pagination || {};
      container._pagination.total = total;
      container._pagination.pageSize = container._pagination.pageSize || (end - start + 1) || container._pagination.pageSize || 10;
      container._pagination.currentPage = Math.max(1, Math.ceil(start / (container._pagination.pageSize || 10)));
    }
  }

  // try to extract numeric page buttons from paginate element (if available)
  const finalPaginateEl = paginateEl || document.querySelector('.dataTables_paginate, .pagination, .paginate, .tx-foot');
  if (finalPaginateEl) {
    const pageButtons = Array.from(finalPaginateEl.querySelectorAll('a.paginate_button'))
      .map(a => a.textContent.trim())
      .filter(t => /^\d+$/.test(t))
      .map(Number);
    if (pageButtons.length) {
      container._pagination = container._pagination || {};
      container._pagination.pagesList = pageButtons;
      container._pagination.totalPages = Math.max(1, Math.ceil((container._pagination.total || (pageButtons[pageButtons.length-1] * (container._pagination.pageSize||10))) / (container._pagination.pageSize || 10)));
    }
  }
}


function getOriginalFormValue(form, selector) {
  if (!form) return '';
  const element = form.querySelector(selector);
  if (!element) return '';
  return element.value || element.textContent || '';
}

function setOverlayFieldValue(container, selector, value) {
  const field = container.querySelector(selector);
  if (!field) return;
  field.value = value || '';
}

function initCustomerActionHandlers(container) {
  if (!container) return;
  container.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[data-action]');
    if (!anchor || !container.contains(anchor)) return;
    event.preventDefault();
    const action = anchor.dataset.action;
    const customerId = anchor.dataset.customerId;
    if (!action || !customerId) return;
    performCustomerAction(container, action, customerId);
  });
}

async function retrieveJawwalpayToken(container) {
  if (container._jawwalToken) return container._jawwalToken;
  try {
    const resp = await fetch('/base/getToken', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    const text = await resp.text();
    let token = parsePotentialToken(text);
    if (!token) token = text.trim();
    container._jawwalToken = token;
    return token;
  } catch (err) {
    console.error('[JawwalPay UX+] token fetch failed', err);
    return null;
  }
}

function parsePotentialToken(value) {
  if (!value) return null;
  try {
    const js = JSON.parse(value);
    if (typeof js === 'string') return js;
    if (js && typeof js === 'object') {
      if (typeof js.token === 'string') return js.token;
      if (typeof js.accessToken === 'string') return js.accessToken;
      const strValues = Object.values(js).filter(v => typeof v === 'string');
      if (strValues.length === 1) return strValues[0];
    }
  } catch (e) {
    return value.trim();
  }
  return null;
}

function buildCustomerActionUrl(endpoint, token) {
  if (!endpoint) return endpoint;
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (!token) return `${window.location.origin}${normalizedEndpoint}`;

  const url = `${window.location.origin}${normalizedEndpoint}?SYNCHRONIZER_URI=${encodeURIComponent(normalizedEndpoint)}&SYNCHRONIZER_TOKEN=${encodeURIComponent(token)}`;
  return url;
}

async function performCustomerAction(container, action, customerId) {
  const token = await retrieveJawwalpayToken(container);
  const endpoint = action === 'edit' ? `/agent/editCustomer/${customerId}` : `/agent/showCustomer/${customerId}`;
  const isEdit = action === 'edit';
  const headers = {
    'X-Requested-With': 'XMLHttpRequest'
  };
  if (token) {
    headers['X-CSRF-TOKEN'] = token;
    headers['X-XSRF-TOKEN'] = token;
    headers['Authorization'] = `Bearer ${token}`;
  }

  setLoadingState(container, true);
  try {
    if (isEdit) {
      const targetUrl = buildCustomerActionUrl(endpoint, token);
      const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
      if (!win) {
        console.warn('[JawwalPay UX+] unable to open new window for customer action');
        return;
      }
      return;
    }

    const resp = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
      headers
    });
    const contentType = resp.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await resp.json() : await resp.text();

    const win = window.open('', '_blank');
    if (!win) {
      console.warn('[JawwalPay UX+] unable to open new window for customer action');
      return;
    }

    if (typeof data === 'object') {
      win.document.write('<pre>' + escapeHtml(JSON.stringify(data, null, 2)) + '</pre>');
    } else {
      win.document.write('<pre>' + escapeHtml(data) + '</pre>');
    }
    win.document.close();
  } catch (err) {
    console.error('[JawwalPay UX+] customer action failed', err);
  } finally {
    setLoadingState(container, false);
  }
}

function hydratePreviousRegistrationFields(originalForm, container) {
  if (!originalForm || !container) return;

  setOverlayFieldValue(container, '#enhanced-request-status', getOriginalFormValue(originalForm, 'select[name="customerStatus" i], select[name*="status" i], select[name*="requestStatus" i], select[name*="orderStatus" i], select#status'));
  setOverlayFieldValue(container, '#enhanced-mobile-number', getOriginalFormValue(originalForm, 'input[name*="mobile" i], input[type="tel"], input#mobileNumber, input#mobile'));
  setOverlayFieldValue(container, '#enhanced-from-date', getOriginalFormValue(originalForm, 'input[name*="from" i], input[name*="startDate" i], input[id*="from" i], input[id*="startDate" i]'));
  setOverlayFieldValue(container, '#enhanced-to-date', getOriginalFormValue(originalForm, 'input[name*="to" i], input[name*="endDate" i], input[id*="to" i], input[id*="endDate" i]'));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function mapOverlayStatusToServerValue(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) return '';
  switch (normalized) {
    case 'approved':
      return 'Approved';
    case 'rejected':
    case 'reject':
      return 'Rejected';
    case 'expired':
      return 'Expired';
    case 'pending':
    case 'review':
    case 'waiting':
    case 'waiting approval':
      return 'Waiting Approval';
    case 'created':
      return 'Created';
    case 'modified':
    case 'edit':
      return 'Modified';
    default:
      return status;
  }
}

function getCustomerActionIdentifier(row) {
  const candidates = [
    row?.mobileNumber,
    row?.mobile,
    row?.phoneNumber,
    row?.phone,
    row?.customerIdNumber,
    row?.customerId,
    row?.id,
    row?.customerNumber
  ];

  for (const value of candidates) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }

  return '';
}

function getCellText(cell) {
  return cell.textContent.replace(/\s+/g, ' ').trim();
}

function buildActionAnchor(href, title, type, customerId) {
  const icon = type === 'view'
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"></circle></svg>`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 17v3Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path></svg>`;

  const color = type === 'view' ? 'var(--jp-green-dark)' : 'var(--blue)';
  return `
    <a href="${escapeHtml(href)}" title="${escapeHtml(title)}" data-action="${escapeHtml(type)}" data-customer-id="${escapeHtml(customerId)}" style="width:30px;height:30px;border-radius:8px;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;color:${color};">
      ${icon}
    </a>`;
}

function buildActionCell(cells) {
  const actionTypes = new Set();
  const actions = [];

  cells.forEach(cell => {
    cell.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href') || '#';
      const title = link.getAttribute('data-original-title') || link.getAttribute('title') || getCellText(link) || 'عرض';
      const normalized = title.toLowerCase();
      const type = /عرض|show|view/.test(normalized) ? 'view' : /تعديل|edit/.test(normalized) ? 'edit' : 'action';
      if (actionTypes.has(type)) return;
      actionTypes.add(type);
      actions.push({ href, title, type });
    });
  });

  if (!actions.length) {
    return `<div style="display:flex;gap:6px;">${escapeHtml(cells.map(getCellText).join(' '))}</div>`;
  }

  return `<div style="display:flex;gap:6px;">${actions.map(({ href, title, type }) => buildActionAnchor(href, title, type)).join('')}</div>`;
}

function isCurrentUserRow(row, currentUserName) {
  const currentIdentity = normalizeDisplayName(currentUserName).toLowerCase();
  if (!currentIdentity) return false;
  const candidates = [
    row?.regAgentDeviceName,
    row?.agentDeviceName,
    row?.agentName,
    row?.regAgentName,
    row?.agentRegion,
    row?.agent,
    row?.fullName,
    row?.name,
    row?.customerName
  ].filter(Boolean).map(value => normalizeDisplayName(value).toLowerCase());
  return candidates.some(candidate => candidate === currentIdentity);
}

function getAgentDisplayName(row) {
  const deviceName = row?.regAgentDeviceName || row?.agentDeviceName || row?.agentName || '';
  const regionName = row?.regAgentName || row?.agentRegion || row?.agent || '';
  const cleanedDeviceName = normalizeDisplayName(deviceName);
  const cleanedRegionName = normalizeDisplayName(regionName);
  if (cleanedDeviceName) {
    return cleanedDeviceName.includes(cleanedRegionName) ? cleanedDeviceName : `${cleanedDeviceName}${cleanedRegionName ? ` (${cleanedRegionName})` : ''}`;
  }
  return cleanedRegionName;
}

function buildStatusHtml(statusText) {
  const normalized = (statusText || '').trim().toLowerCase();
  const isApproved = /موافقة|approved|تمت/.test(normalized);
  const isRejected = /مرفوض|rejected|رفض/.test(normalized);
  const isWaiting = /انتظار|pending|review|قيد|انتظار/.test(normalized);
  const className = isRejected ? 'rejected' : isWaiting ? 'pending' : isApproved ? 'approved' : 'neutral';

  const icon = isApproved
    ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`
    : isRejected
      ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"></path></svg>`
      : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"></circle><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>`;

  return `<span class="status-pill ${className}">${icon} ${escapeHtml(statusText)}</span>`;
}

function extractOriginalResultRows(root) {
  const table = root.querySelector('table');
  if (!table) return [];

  const targetColumns = 7;

  return Array.from(table.querySelectorAll('tbody tr')).map(row => {
    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length < 2) return [];

    const actionCell = cells[cells.length - 1];
    const rawDataCells = cells.slice(0, -1);
    const dataCells = normalizePreviousRegistrationDataCells(rawDataCells, targetColumns);

    const sanitized = dataCells.map((cell, index) => {
      const text = cell ? getCellText(cell) : '';

      if (index === 2) {
        return `<td dir="ltr" style="text-align:right;">${escapeHtml(text)}</td>`;
      }
      if (index === 6) {
        return `<td>${buildStatusHtml(text)}</td>`;
      }
      return `<td>${escapeHtml(text)}</td>`;
    });

    sanitized.push(`<td>${buildActionCell([actionCell])}</td>`);
    return sanitized;
  }).filter(cells => cells.length > 0);
}

function normalizePreviousRegistrationDataCells(rawCells, targetColumns) {
  if (rawCells.length >= 9) {
    return [rawCells[0], rawCells[1], rawCells[2], rawCells[3], rawCells[5], rawCells[6], rawCells[7]];
  }
  if (rawCells.length === 8 && rawCells[4] && !getCellText(rawCells[4]).length) {
    return [rawCells[0], rawCells[1], rawCells[2], rawCells[3], rawCells[5], rawCells[6], rawCells[7]];
  }
  return rawCells.slice(0, targetColumns);
}

function buildPreviousRegistrationHTML(navLinks, userName = 'User', userRole = 'Agent', rows = []) {
  const rowsHtml = rows.length
    ? rows.map(cells => `
      <tr>${cells.join('')}</tr>`).join('')
    : `
      <tr><td colspan="8" class="empty-row">لا توجد نتائج حالياً</td></tr>`;

  return document.createRange().createContextualFragment(`
    ${getUtilityBarHTML()}
    ${getHeaderHTML({ userName, userRole })}
    ${getNavHTML('agent', navLinks)}
    <div class="page">
      <div class="breadcrumb">
        <a href="#">الرئيسية</a><span class="sep">/</span><a href="#">الوكيل</a><span class="sep">/</span><span class="current">استعلام عن قائمة المشتركين</span>
      </div>
      <div class="form-card">
        <div class="form-card-head">
          <h2><span class="fc-ic"><svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span>استعلام عن قائمة المشتركين</h2>
        </div>
        <div class="form-card-body">
          <div class="filter-grid">
            <div class="field">
              <label for="enhanced-request-status">حالة الطلب</label>
              <select id="enhanced-request-status" name="requestStatus">
                <option value="">اختر ..</option>
                <option value="pending">قيد الانتظار</option>
                <option value="approved">تمت الموافقة</option>
                <option value="review">قيد المراجعة</option>
                <option value="edit">قيد التعديل</option>
                <option value="rejected">مرفوض</option>
                <option value="expired">منتهية الصلاحية</option>
              </select>
            </div>
            <div class="field">
              <label for="enhanced-mobile-number">رقم المحمول</label>
              <input id="enhanced-mobile-number" name="mobileNumber" type="tel" placeholder="05XXXXXXXX">
            </div>
            <div class="field">
              <label for="enhanced-from-date">من تاريخ تقديم طلب</label>
              <input id="enhanced-from-date" name="fromDate" type="text" placeholder="dd/mm/yyyy">
            </div>
            <div class="field">
              <label for="enhanced-to-date">الى تاريخ تقديم طلب</label>
              <input id="enhanced-to-date" name="toDate" type="text" placeholder="dd/mm/yyyy">
            </div>
          </div>
          <div class="filter-actions">
            <button id="enhanced-search-btn" class="btn-primary" type="button">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              استعلام
            </button>
          </div>
        </div>
      </div>
      <div class="tx-card">
        <div class="tx-head">
          <h2>نتائج البحث</h2>
          <div class="tx-tools">
            <div class="tx-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
              <input id="enhanced-quick-search" type="text" placeholder="بحث سريع">
            </div>
                <div class="page-size">
                  <label style="font-weight:700;margin-right:8px;color:var(--ink-soft);">عرض</label>
                  <select id="enhanced-page-size" style="height:36px;border-radius:8px;padding:6px 10px;border:1px solid var(--line);background:transparent;">
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
            <button class="btn-outline" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
              تصدير Excel
            </button>
          </div>
        </div>
        <div class="registration-summary" id="enhanced-registration-summary">
          <div class="summary-card status-approved summary-card-filterable" data-summary-filter="">
            <div class="summary-card-label">إجمالي مدخلاتك</div>
            <div class="summary-card-value" id="enhanced-summary-total">0</div>
          </div>
          <div class="summary-card status-approved summary-card-filterable" data-summary-filter="approved">
            <div class="summary-card-label">الموافق عليها</div>
            <div class="summary-card-value" id="enhanced-summary-approved">0</div>
          </div>
          <div class="summary-card status-pending summary-card-filterable" data-summary-filter="pending">
            <div class="summary-card-label">قيد الانتظار</div>
            <div class="summary-card-value" id="enhanced-summary-pending">0</div>
          </div>
          <div class="summary-card status-rejected summary-card-filterable" data-summary-filter="rejected">
            <div class="summary-card-label">المرفوضة</div>
            <div class="summary-card-value" id="enhanced-summary-rejected">0</div>
          </div>
        </div>
        <div id="enhanced-summary-loading" class="enhanced-summary-loading hidden">جارٍ تحميل إجمالي المدخلات الكاملة...</div>
        <div id="enhanced-summary-status" class="enhanced-summary-status hidden"></div>
        <div class="tx-table-wrap">
          <div id="enhanced-loading-mask" class="enhanced-loading-mask hidden">
            <div class="enhanced-loading-spinner"></div>
            <div class="enhanced-loading-text">جاري تحميل النتائج...</div>
          </div>
          <table class="tx-table">
            <thead>
              <tr>
                <th>الاسم الكامل</th>
                <th>رقم الهوية</th>
                <th>رقم الموبايل</th>
                <th>تاريخ الانشاء</th>
                <th>تاريخ الموافقة</th>
                <th>اسم الوكيل</th>
                <th>الحالة</th>
                <th>أدوات</th>
              </tr>
            </thead>
            <tbody id="enhanced-results-body">
              ${rowsHtml}
            </tbody>
          </table>
        </div>
        <div class="tx-foot">
          <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
            <span class="result-count" id="enhanced-result-info">إظهار 0 من النتائج</span>
            <div id="enhanced-pagination" class="enhanced-pagination"></div>
          </div>
        </div>
      </div>
    </div>
    ${getFooterHTML()}
  `);
}

function getPageSpecificCSS() {
  return `
    .page{padding:28px 0 64px;}
    .breadcrumb{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ink-soft);margin-bottom:18px;}
    .breadcrumb a{color:var(--ink-soft);text-decoration:none;transition:color .15s;}
    .breadcrumb a:hover{color:var(--jp-green-dark);}
    .breadcrumb .sep{opacity:.5;}
    .breadcrumb .current{color:var(--jp-green-dark);font-weight:700;}
    .form-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);margin-bottom:28px;overflow:hidden;max-width:1080px;margin-inline:auto;}
    .form-card-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:20px 26px;border-bottom:1px solid var(--line);background:var(--jp-green-pale-2);}
    .form-card-head h2{font-family:'Cairo';font-size:17px;font-weight:800;margin:0;display:flex;align-items:center;gap:10px;}
    .form-card-body{padding:26px;}
    .filter-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;}
    .field{display:flex;flex-direction:column;gap:10px;}
    .field label{font-size:13px;font-weight:700;color:var(--ink-soft);}
    .field input,
    .field select{height:44px;border:1px solid var(--line);border-radius:12px;padding:0 14px;background:var(--paper);color:var(--ink);font-family:'Tajawal',sans-serif;font-size:14px;outline:none;transition:border-color .15s,box-shadow .15s;}
    .field input:focus,
    .field select:focus{border-color:var(--jp-green);box-shadow:0 0 0 3px rgba(119,188,35,.12);}
    .filter-actions{display:flex;justify-content:flex-end;padding-top:12px;}
    .btn-primary{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--jp-green),var(--jp-green-2));color:#fff;font-family:'Cairo';font-weight:700;font-size:13.5px;border:none;border-radius:10px;padding:0 22px;height:44px;cursor:pointer;transition:box-shadow .15s, transform .15s;box-shadow:var(--shadow-sm);}
    .btn-primary:hover{box-shadow:var(--shadow-md);transform:translateY(-1px);}
    .tx-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);max-width:1080px;margin-inline:auto;overflow:hidden;}
    .tx-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:22px 26px;border-bottom:1px solid var(--line);flex-wrap:wrap;}
    .tx-head h2{font-family:'Cairo';font-size:17px;font-weight:800;margin:0;}
    .registration-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;padding:18px 26px;border-bottom:1px solid var(--line);background:var(--jp-green-pale-2);}
    .summary-card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;min-height:94px;justify-content:center;cursor:pointer;transition:transform .15s,box-shadow .15s,border-color .15s;}
    .summary-card:hover{transform:translateY(-2px);box-shadow:0 8px 26px rgba(0,0,0,.09);}
    .summary-card.active{border-color:var(--jp-green);box-shadow:0 0 0 4px rgba(34,197,94,.12);}
    .summary-card-label{font-size:12px;color:var(--ink-soft);font-weight:700;}
    .summary-card-value{font-size:24px;font-weight:800;color:var(--jp-green-dark);}
    .summary-card.status-approved .summary-card-value{color:#15803d;}
    .summary-card.status-pending .summary-card-value{color:#b45309;}
    .summary-card.status-rejected .summary-card-value{color:#b91c1c;}
    .tx-tools{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
    .tx-search{display:flex;align-items:center;gap:10px;background:var(--paper);border:1px solid var(--line);border-radius:999px;padding:10px 16px;min-width:220px;}
    .tx-search svg{opacity:.55;}
    .tx-search input{border:none;background:transparent;outline:none;font-size:13.5px;color:var(--ink);width:220px;}
    .btn-outline{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:12px;padding:0 18px;height:42px;background:transparent;color:var(--ink);font-family:'Cairo';font-weight:700;cursor:pointer;transition:border-color .15s, color .15s;}
    .btn-outline:hover{border-color:var(--jp-green);color:var(--jp-green-dark);}
    .tx-table-wrap{position:relative;overflow-x:auto;}
    .enhanced-loading-mask{position:absolute;top:0;left:0;right:0;bottom:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;background:rgba(255,255,255,.92);backdrop-filter:blur(2px);z-index:20;box-sizing:border-box;}
    .enhanced-loading-mask.hidden{display:none;}
    .enhanced-loading-spinner{width:48px;height:48px;border:4px solid rgba(0,0,0,.1);border-top-color:var(--jp-green);border-radius:50%;animation:enhanced-spin 1s linear infinite;}
    .enhanced-loading-text{font-size:14px;color:var(--ink);font-weight:700;text-align:center;}
    .enhanced-summary-loading,
    .enhanced-summary-status{display:block;padding:10px 16px;margin:0 26px 14px;border-radius:12px;font-size:13px;font-weight:700;max-width:calc(100% - 52px);overflow-wrap:break-word;word-break:break-word;white-space:normal;}
    .enhanced-summary-loading{background:rgba(56,142,60,0.08);color:#155724;}
    .enhanced-summary-status{background:rgba(15,118,110,0.08);color:#0f6f63;}
    .enhanced-summary-loading.hidden,
    .enhanced-summary-status.hidden{display:none;}
    .enhanced-summary-loading{display:block;padding:10px 16px;margin:0 26px 14px;border-radius:12px;background:rgba(56,142,60,0.08);color:#155724;font-size:13px;font-weight:700;}
    .enhanced-summary-loading.hidden{display:none;}
    @keyframes enhanced-spin{to{transform:rotate(360deg);}}
    .tx-table{width:100%;border-collapse:collapse;min-width:900px;}
    .tx-table th,
    .tx-table td{padding:16px 18px;text-align:right;border-bottom:1px solid var(--line);font-size:13.5px;color:var(--ink);}
    .tx-table th{background:var(--jp-paper);font-weight:700;color:var(--ink-soft);text-transform:none;}
    .tx-table tr:hover{background:rgba(119,188,35,.06);} 
    .tx-table tr.current-user-row{background:rgba(34,197,94,.12)!important;box-shadow:inset 3px 0 0 var(--jp-green-dark);} 
    .current-user-pill{display:inline-flex;align-items:center;margin-right:8px;padding:3px 8px;border-radius:999px;background:rgba(34,197,94,.16);color:var(--jp-green-dark);font-size:11px;font-weight:800;}
    .status-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;font-size:12.5px;font-weight:700;background:rgba(119,188,35,.12);color:var(--jp-green-dark);}
    .status-pill.approved{background:rgba(34,197,94,.14);color:#15803d;}
    .status-pill.pending{background:rgba(255,184,0,.16);color:#b45309;}
    .status-pill.rejected{background:rgba(239,68,68,.14);color:#b91c1c;}
    .status-pill.neutral{background:rgba(99,102,241,.12);color:#4338ca;}
    .empty-row{padding:24px;text-align:center;color:var(--ink-soft);}
    .tx-foot{padding:18px 26px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;}
    .result-count{font-size:13px;color:var(--ink-soft);}
    @media (max-width:1080px){.filter-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
    @media (max-width:760px){.filter-grid{grid-template-columns:1fr;}.tx-table{min-width:760px;}.tx-search input{width:150px;}}
    .tx-head .page-size{display:flex;align-items:center;gap:8px;margin-left:8px}
    .enhanced-pagination{display:flex;align-items:center;gap:8px}
    .enhanced-pagination a.paginate_button{display:inline-flex;align-items:center;justify-content:center;min-width:38px;height:34px;padding:0 8px;border-radius:8px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer;font-weight:700}
    .enhanced-pagination a.paginate_button.disabled{opacity:.45;cursor:default}
    .enhanced-pagination a.paginate_button.current{background:var(--jp-green-pale-2);border-color:var(--jp-green);color:var(--jp-green-dark)}
    .enhanced-pagination .ellipsis{padding:0 6px;color:var(--ink-soft)}
    @media (max-width:760px){.enhanced-pagination a.paginate_button{min-width:30px;height:30px;padding:0 6px}}
  `;
}

enhancePreviousRegistrationPage();
