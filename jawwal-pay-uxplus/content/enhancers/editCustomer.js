// Edit Customer page enhancer - injects a cleaner edit flow while preserving the original customer form
console.log('[JawwalPay UX+] editCustomer.js loaded');

function enhanceEditCustomerPage() {
  try {
    console.log('[JawwalPay UX+] Injecting editCustomer page design...');
    extractDataAndInject();
  } catch (error) {
    console.error('[JawwalPay UX+] Error enhancing editCustomer page:', error);
  }
}

function clearLegacyPageStyles() {
  document.documentElement.style.overflow = 'hidden';
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.overflow = 'hidden';
}

function extractDataAndInject() {
  const originalBody = document.body;
  const originalForm = document.querySelector('#customerForm');
  if (!originalForm) {
    console.warn('[JawwalPay UX+] editCustomer page form not found, skipping enhancement');
    return;
  }

  const { userName, userRole, navLinks } = extractPageMetadata(originalBody);

  const overlayContainer = document.createElement('div');
  overlayContainer.id = 'jawwalpay-uxplus-overlay';
  overlayContainer.style.cssText = 'position:fixed;inset:0;z-index:999999;background:var(--paper);overflow-y:auto;overflow-x:hidden;visibility:visible;';

  const style = document.createElement('style');
  style.textContent = getPageSpecificCSS();
  style.setAttribute('data-jawwalpay-uxplus', 'true');
  overlayContainer.appendChild(style);

  overlayContainer.appendChild(buildEditCustomerHTML(navLinks, userName, userRole));

  // Keep original form in the DOM for submission, but hide it from the enhanced UI.
  if (originalForm) {
    const hiddenFormContainer = document.createElement('div');
    hiddenFormContainer.id = 'enhanced-original-form-keeper';
    hiddenFormContainer.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden;visibility:hidden;';
    hiddenFormContainer.appendChild(originalForm);
    overlayContainer.appendChild(hiddenFormContainer);
  }

  document.body.appendChild(overlayContainer);
  hydrateEditCustomerFields(originalForm, overlayContainer);
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';

  // Hide legacy page sections that can bleed through original page structure.
  document.querySelectorAll('body > *:not(#jawwalpay-uxplus-overlay)').forEach(el => {
    if (el.id !== 'jawwalpay-uxplus-overlay') {
      el.style.display = 'none';
    }
  });

  initNavTabs(overlayContainer);
  initDropdowns(overlayContainer);
  initEditCustomerActions(overlayContainer, originalForm);

  console.log('[JawwalPay UX+] editCustomer page design injected');
}

function initEditCustomerActions(container, originalForm) {
  const saveBtn = container.querySelector('#enhanced-save-btn');
  const kycBtn = container.querySelector('#enhanced-kyc-btn');

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      if (originalForm) {
        syncOverlayToOriginalForm(container, originalForm);
        const submitButton = originalForm.querySelector('button[type="submit"], input[type="submit"]');
        if (submitButton) {
          submitButton.click();
          return;
        }
        originalForm.submit();
      }
    });
  }

  if (kycBtn) {
    kycBtn.addEventListener('click', () => {
      console.log('[JawwalPay UX+] KYC action clicked');
      // Placeholder for KYC action if the page supports it.
    });
  }
}

function getOriginalFormValue(originalForm, selector) {
  if (!originalForm) return '';
  const element = originalForm.querySelector(selector);
  if (!element) return '';
  if (element.type === 'checkbox' || element.type === 'radio') {
    return element.checked ? element.value || '1' : '';
  }
  return element.value || element.textContent || '';
}

function setOverlayFieldValue(container, selector, value) {
  const field = container.querySelector(selector);
  if (!field) return;
  field.value = value || '';
}

function moveSelect2DropdownsIntoWrapper(wrapper) {
  if (!wrapper) return;
  const dropdowns = Array.from(document.querySelectorAll('body > .select2-dropdown, body .select2-dropdown'));
  dropdowns.forEach((dropdown) => {
    if (dropdown instanceof HTMLElement && !wrapper.contains(dropdown)) {
      wrapper.appendChild(dropdown);
    }
  });
}

function observeSelect2Dropdowns(wrapper) {
  if (!wrapper || !window.MutationObserver || wrapper._select2ObserverAttached) return;
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches('.select2-dropdown')) {
          wrapper.appendChild(node);
        } else {
          node.querySelectorAll?.('.select2-dropdown').forEach((dropdown) => wrapper.appendChild(dropdown));
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  wrapper._select2ObserverAttached = true;
}

function attachOriginalSelect2Control(originalForm, container, wrapperSelector, originalSelector, attempt = 0) {
  const wrapper = container.querySelector(wrapperSelector);
  const sourceSelect = originalForm?.querySelector(originalSelector) || document.querySelector(originalSelector);
  if (!wrapper || !sourceSelect) {
    if (attempt < 6) {
      setTimeout(() => attachOriginalSelect2Control(originalForm, container, wrapperSelector, originalSelector, attempt + 1), 150);
    }
    return false;
  }

  let select2Container = null;
  const nextSibling = sourceSelect.nextElementSibling;
  if (nextSibling?.classList?.contains('select2-container')) {
    select2Container = nextSibling;
  }

  if (!select2Container) {
    const select2Id = sourceSelect.getAttribute('data-select2-id') || sourceSelect.id;
    if (select2Id) {
      select2Container = document.querySelector(`.select2-container[data-select2-id="${select2Id}"]`);
    }
  }

  if (!select2Container && sourceSelect.id) {
    select2Container = document.querySelector(`.select2-container[aria-labelledby="select2-${sourceSelect.id}-container"]`);
  }

  if (!select2Container) {
    const rendered = document.querySelector(`#select2-${sourceSelect.id}-container`);
    if (rendered) {
      select2Container = rendered.closest('.select2-container');
    }
  }

  if (!select2Container) {
    const candidate = sourceSelect.parentElement?.querySelector('.select2-container');
    if (candidate) {
      select2Container = candidate;
    }
  }

  if (!select2Container && attempt < 6) {
    setTimeout(() => attachOriginalSelect2Control(originalForm, container, wrapperSelector, originalSelector, attempt + 1), 150);
    return false;
  }

  if (!select2Container) return false;

  wrapper.innerHTML = '';
  wrapper.style.position = 'relative';
  wrapper.style.overflow = 'visible';
  wrapper.appendChild(select2Container);
  moveSelect2DropdownsIntoWrapper(wrapper);
  observeSelect2Dropdowns(wrapper);

  const resultsList = document.querySelector(`#select2-${sourceSelect.id}-results`);
  if (resultsList && !wrapper.contains(resultsList)) {
    wrapper.appendChild(resultsList);
  }

  if (select2Container.style.display === 'none') {
    select2Container.style.display = '';
  }
  return true;
}

function setOverlaySelectValue(originalForm, container, selector, originalSelector, attempt = 0) {
  const select = container.querySelector(selector);
  const sourceSelect = originalForm?.querySelector(originalSelector) || document.querySelector(originalSelector);
  if (!select) return;

  if (!sourceSelect) {
    if (attempt < 6) {
      setTimeout(() => setOverlaySelectValue(originalForm, container, selector, originalSelector, attempt + 1), 150);
    }
    return;
  }

  const options = Array.from(sourceSelect.options || []);
  if (!options.length && attempt < 6) {
    setTimeout(() => setOverlaySelectValue(originalForm, container, selector, originalSelector, attempt + 1), 150);
    return;
  }

  select.innerHTML = '';

  options.forEach((option) => {
    const clonedOption = document.createElement('option');
    clonedOption.value = option.value || '';
    clonedOption.textContent = option.textContent?.trim() || '';
    if (option.selected) {
      clonedOption.selected = true;
    }
    select.appendChild(clonedOption);
  });

  const selectedValue = options.find((option) => option.selected)?.value || sourceSelect.value || '';
  if (selectedValue) {
    select.value = selectedValue;
  } else if (select.options.length) {
    select.selectedIndex = 0;
  }
}

function setOverlayRadioValue(container, name, value) {
  if (!value) return;
  const radio = container.querySelector(`input[name="${name}"][value="${CSS.escape(value)}"]`);
  if (radio) {
    radio.checked = true;
  }
}

function setOverlayCheckboxValue(container, selector, checked) {
  const checkbox = container.querySelector(selector);
  if (!checkbox) return;
  checkbox.checked = !!checked;
}

function hydrateEditCustomerFields(originalForm, container) {
  if (!originalForm || !container) return;

  setOverlayFieldValue(container, '#enhanced-ar-first-name', getOriginalFormValue(originalForm, 'input[name="arFirstName" i], input#arFirstName'));
  setOverlayFieldValue(container, '#enhanced-ar-middle-name', getOriginalFormValue(originalForm, 'input[name="arMiddleName" i], input#arMiddleName'));
  setOverlayFieldValue(container, '#enhanced-ar-third-name', getOriginalFormValue(originalForm, 'input[name="arThirdName" i], input#arThirdName'));
  setOverlayFieldValue(container, '#enhanced-ar-last-name', getOriginalFormValue(originalForm, 'input[name="arLastName" i], input#arLastName'));

  setOverlayFieldValue(container, '#enhanced-en-first-name', getOriginalFormValue(originalForm, 'input[name="firstName" i], input#firstName'));
  setOverlayFieldValue(container, '#enhanced-en-middle-name', getOriginalFormValue(originalForm, 'input[name="middleName" i], input#middleName'));
  setOverlayFieldValue(container, '#enhanced-en-third-name', getOriginalFormValue(originalForm, 'input[name="thirdName" i], input#thirdName'));
  setOverlayFieldValue(container, '#enhanced-en-last-name', getOriginalFormValue(originalForm, 'input[name="lastName" i], input#lastName'));

  setOverlayFieldValue(container, '#enhanced-mother-name', getOriginalFormValue(originalForm, 'input[name="motherName" i], input#motherName'));
  setOverlaySelectValue(
    originalForm,
    container,
    '#enhanced-nationality',
    'select[name="nationality" i], select#nationalityId'
  );
  setOverlayFieldValue(container, '#enhanced-mobile-number', getOriginalFormValue(originalForm, 'input[name="_mobileNumber" i], input[name="mobileNumber" i], input#_mobileNumber, input#mobileNumber'));
  setOverlayFieldValue(container, '#enhanced-email', getOriginalFormValue(originalForm, 'input[name="email" i], input#email'));

  setOverlaySelectValue(
    originalForm,
    container,
    '#enhanced-id-type',
    'select[name="idTypeId" i], select#idTypeId'
  );
  setOverlayFieldValue(container, '#enhanced-id-number', getOriginalFormValue(originalForm, 'input[name="idNumber" i], input#idNumber'));
  setOverlayFieldValue(container, '#enhanced-id-issuance-date', getOriginalFormValue(originalForm, 'input[name="idCardIssuanceDate" i], input#idCardIssuanceDate'));
  setOverlayFieldValue(container, '#enhanced-place-of-id-issuance', getOriginalFormValue(originalForm, 'input[name="placeOfIdIssuance" i], input#placeOfIdIssuance'));
  setOverlayFieldValue(container, '#enhanced-date-of-birth', getOriginalFormValue(originalForm, 'input[name="dateOfBirth" i], input#dateOfBirth'));
  setOverlayFieldValue(container, '#enhanced-place-of-birth', getOriginalFormValue(originalForm, 'input[name="placeOfBirth" i], input#placeOfBirth'));
  setOverlayFieldValue(container, '#enhanced-request-status', getOriginalFormValue(originalForm, 'input[name="_status" i], input#_status, input[name="status" i], input#status'));
  setOverlayFieldValue(container, '#enhanced-rejection-reason', getOriginalFormValue(originalForm, 'input[name="_rejectionReason" i], input#_rejectionReason, input[name="rejectionReason" i], input#rejectionReason'));

  setOverlaySelectValue(
    originalForm,
    container,
    '#enhanced-city',
    'select[name="cityCode" i], select#cityCode'
  );
  setOverlaySelectValue(
    originalForm,
    container,
    '#enhanced-area',
    'select[name="areaCode" i], select#areaCode'
  );
  setOverlayRadioValue(container, 'enhanced-gender', getOriginalFormValue(originalForm, 'input[name="gender" i]:checked, input[name="gender" i]'));
  setOverlayFieldValue(container, '#enhanced-address', getOriginalFormValue(originalForm, 'input[name="address" i], input#address'));
  setOverlayCheckboxValue(container, '#enhanced-politically-exposed', originalForm.querySelector('input[name="holdingPoliticalPosition" i], input#holdingPoliticalPosition')?.checked);
  setOverlayFieldValue(container, '#enhanced-permanent-address', getOriginalFormValue(originalForm, 'input[name="permanentResidencyAdd" i], input#permanentResidencyAdd'));

  if (!attachOriginalSelect2Control(originalForm, container, '#enhanced-occupation-wrapper', 'select[name="occupation" i], select#occupation')) {
    setOverlaySelectValue(
      originalForm,
      container,
      '#enhanced-occupation-fallback',
      'select[name="occupation" i], select#occupation'
    );
  }
  setOverlayFieldValue(container, '#enhanced-referral', getOriginalFormValue(originalForm, 'input[name="referral" i], input#referral'));
  setOverlaySelectValue(
    originalForm,
    container,
    '#enhanced-pref-language',
    'select[name="prefLanguage" i], select#prefLanguage'
  );
}

function syncOverlayToOriginalForm(container, originalForm) {
  if (!originalForm || !container) return;

  const assignValue = (originalSelector, overlaySelector) => {
    const original = originalForm.querySelector(originalSelector);
    const overlay = container.querySelector(overlaySelector);
    if (!original || !overlay) return;
    if (original.type === 'checkbox' || original.type === 'radio') {
      original.checked = overlay.checked;
    } else {
      original.value = overlay.value || '';
    }
    original.dispatchEvent(new Event('input', { bubbles: true }));
    original.dispatchEvent(new Event('change', { bubbles: true }));
  };

  assignValue('input[name="arFirstName" i], input#arFirstName', '#enhanced-ar-first-name');
  assignValue('input[name="arMiddleName" i], input#arMiddleName', '#enhanced-ar-middle-name');
  assignValue('input[name="arThirdName" i], input#arThirdName', '#enhanced-ar-third-name');
  assignValue('input[name="arLastName" i], input#arLastName', '#enhanced-ar-last-name');

  assignValue('input[name="firstName" i], input#firstName', '#enhanced-en-first-name');
  assignValue('input[name="middleName" i], input#middleName', '#enhanced-en-middle-name');
  assignValue('input[name="thirdName" i], input#thirdName', '#enhanced-en-third-name');
  assignValue('input[name="lastName" i], input#lastName', '#enhanced-en-last-name');

  assignValue('input[name="motherName" i], input#motherName', '#enhanced-mother-name');
  assignValue('input[name="_mobileNumber" i], input[name="mobileNumber" i], input#_mobileNumber, input#mobileNumber', '#enhanced-mobile-number');
  assignValue('input[name="email" i], input#email', '#enhanced-email');
  assignValue('input[name="idNumber" i], input#idNumber', '#enhanced-id-number');
  assignValue('input[name="idCardIssuanceDate" i], input#idCardIssuanceDate', '#enhanced-id-issuance-date');
  assignValue('input[name="placeOfIdIssuance" i], input#placeOfIdIssuance', '#enhanced-place-of-id-issuance');
  assignValue('input[name="dateOfBirth" i], input#dateOfBirth', '#enhanced-date-of-birth');
  assignValue('input[name="placeOfBirth" i], input#placeOfBirth', '#enhanced-place-of-birth');
  assignValue('input[name="address" i], input#address', '#enhanced-address');
  assignValue('input[name="permanentResidencyAdd" i], input#permanentResidencyAdd', '#enhanced-permanent-address');
  assignValue('input[name="referral" i], input#referral', '#enhanced-referral');

  const genderValue = container.querySelector('input[name="enhanced-gender"]:checked')?.value;
  if (genderValue) {
    originalForm.querySelectorAll('input[name="gender" i]').forEach((radio) => {
      radio.checked = radio.value === genderValue;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  const holdingPolitical = container.querySelector('#enhanced-politically-exposed');
  if (holdingPolitical) {
    originalForm.querySelectorAll('input[name="holdingPoliticalPosition" i], input#holdingPoliticalPosition').forEach((original) => {
      original.checked = holdingPolitical.checked;
      original.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  const assignSelect = (originalSelector, overlaySelector) => {
    const original = originalForm.querySelector(originalSelector);
    const overlay = container.querySelector(overlaySelector);
    if (!original || !overlay) return;
    original.value = overlay.value || '';
    original.dispatchEvent(new Event('change', { bubbles: true }));
    original.dispatchEvent(new Event('input', { bubbles: true }));
  };

  assignSelect('select[name="nationality" i], select#nationalityId', '#enhanced-nationality');
  assignSelect('select[name="idTypeId" i], select#idTypeId', '#enhanced-id-type');
  assignSelect('select[name="cityCode" i], select#cityCode', '#enhanced-city');
  assignSelect('select[name="areaCode" i], select#areaCode', '#enhanced-area');
  assignSelect('select[name="occupation" i], select#occupation', '#enhanced-occupation-fallback');
  assignSelect('select[name="prefLanguage" i], select#prefLanguage', '#enhanced-pref-language');
}

function getDesignTokenFallbacks() {
  return `
:root {
  --jp-green:#77BC23;
  --jp-green-2:#5FA015;
  --jp-green-dark:#3E6D0E;
  --jp-green-pale:#EAF6D8;
  --jp-green-pale-2:#F3FAEA;
  --ink:#182310;
  --ink-soft:#4B5541;
  --paper:#F5F7F1;
  --card:#FFFFFF;
  --line:#E5EADB;
  --line-strong:#D3DCC4;
  --amber:#E29500;
  --red:#E24C4C;
  --radius-lg:20px;
  --radius-md:14px;
  --shadow-sm:0 1px 2px rgba(24,35,16,.06);
  --shadow-md:0 8px 24px -8px rgba(24,35,16,.16);
}
`;
}

function getPageSpecificCSS() {
  return `${getDesignTokenFallbacks()}
#jawwalpay-uxplus-overlay{display:flex;flex-direction:column;min-height:100vh;}
#jawwalpay-uxplus-overlay *{box-sizing:border-box;}
.page{padding:28px 0 64px;}
.wrap{max-width:1280px;margin:0 auto;padding:0 24px;}
.breadcrumb{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ink-soft);margin-bottom:18px;flex-wrap:wrap;}
.breadcrumb a{color:var(--ink-soft);text-decoration:none;transition:color .15s;}
.breadcrumb a:hover{color:var(--jp-green-dark);}
.breadcrumb .sep{opacity:.5;}
.breadcrumb .current{color:var(--jp-green-dark);font-weight:700;}
.form-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);margin-bottom:28px;overflow:hidden;max-width:1180px;margin-inline:auto;}
.form-card-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:20px 26px;border-bottom:1px solid var(--line);background:var(--jp-green-pale-2);}
.form-card-head h2{font-family:'Cairo';font-size:17px;font-weight:800;margin:0;display:flex;align-items:center;gap:10px;}
.form-card-head .fc-ic{width:34px;height:34px;border-radius:10px;background:var(--jp-green-pale);color:var(--jp-green-dark);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.form-card-body{padding:26px;}
.section-divider{display:flex;align-items:center;gap:10px;margin:26px 0 18px;font-family:'Cairo';font-weight:700;font-size:13px;color:var(--jp-green-dark);}
.section-divider:first-child{margin-top:0;}
.section-divider::after{content:'';flex:1;height:1px;background:var(--line);}
.enhanced-original-form-wrapper{display:block;width:100%;padding:0;margin:0;font-family:'Tajawal',sans-serif;color:var(--ink);}
.enhanced-original-form-wrapper *{box-sizing:border-box;}
.enhanced-original-form-wrapper form{width:100%;margin:0;padding:0;}
.enhanced-original-form-wrapper .widget-box,
.enhanced-original-form-wrapper .widget-content,
.enhanced-original-form-wrapper .widget-head,
.enhanced-original-form-wrapper .widget-body,
.enhanced-original-form-wrapper .widget-header,
.enhanced-original-form-wrapper .widget-toolbar,
.enhanced-original-form-wrapper .panel,
.enhanced-original-form-wrapper .panel-heading,
.enhanced-original-form-wrapper .panel-body,
.enhanced-original-form-wrapper .panel-footer,
.enhanced-original-form-wrapper .card,
.enhanced-original-form-wrapper .card-body,
.enhanced-original-form-wrapper .card-header,
.enhanced-original-form-wrapper .form-element-area,
.enhanced-original-form-wrapper .container,
.enhanced-original-form-wrapper .container-fluid{border:none !important;box-shadow:none !important;background:transparent !important;margin:0 !important;padding:0 !important;}
.enhanced-original-form-wrapper .widget-title{font-size:15px;font-weight:700;margin-bottom:14px;}
.enhanced-original-form-wrapper .form-example-int{margin:0 !important;padding:0 !important;}
.enhanced-original-form-wrapper .form-example-int.form-horizental{padding:0 !important;}
.enhanced-original-form-wrapper .form-group{margin-bottom:18px !important;}
.enhanced-original-form-wrapper .form-group .row,
.enhanced-original-form-wrapper .form-group > .row,
.enhanced-original-form-wrapper .row,
.enhanced-original-form-wrapper .form-example-int.form-horizental .row{display:grid !important;grid-template-columns:repeat(12,minmax(0,1fr)) !important;gap:16px !important;margin:0;width:100%;}
.enhanced-original-form-wrapper .row > [class*='col-'],
.enhanced-original-form-wrapper [class*='col-']{min-width:0 !important;flex:0 0 auto !important;width:auto !important;}
.enhanced-original-form-wrapper .col-lg-1,
.enhanced-original-form-wrapper .col-md-1,
.enhanced-original-form-wrapper .col-sm-1{grid-column:span 1 !important;}
.enhanced-original-form-wrapper .col-lg-2,
.enhanced-original-form-wrapper .col-md-2,
.enhanced-original-form-wrapper .col-sm-2{grid-column:span 2 !important;}
.enhanced-original-form-wrapper .col-lg-3,
.enhanced-original-form-wrapper .col-md-3,
.enhanced-original-form-wrapper .col-sm-3{grid-column:span 3 !important;}
.enhanced-original-form-wrapper .col-lg-4,
.enhanced-original-form-wrapper .col-md-4,
.enhanced-original-form-wrapper .col-sm-4{grid-column:span 4 !important;}
.enhanced-original-form-wrapper .col-lg-5,
.enhanced-original-form-wrapper .col-md-5,
.enhanced-original-form-wrapper .col-sm-5{grid-column:span 5 !important;}
.enhanced-original-form-wrapper .col-lg-6,
.enhanced-original-form-wrapper .col-md-6,
.enhanced-original-form-wrapper .col-sm-6{grid-column:span 6 !important;}
.enhanced-original-form-wrapper .col-lg-7,
.enhanced-original-form-wrapper .col-md-7,
.enhanced-original-form-wrapper .col-sm-7{grid-column:span 7 !important;}
.enhanced-original-form-wrapper .col-lg-8,
.enhanced-original-form-wrapper .col-md-8,
.enhanced-original-form-wrapper .col-sm-8{grid-column:span 8 !important;}
.enhanced-original-form-wrapper .col-lg-9,
.enhanced-original-form-wrapper .col-md-9,
.enhanced-original-form-wrapper .col-sm-9{grid-column:span 9 !important;}
.enhanced-original-form-wrapper .col-lg-10,
.enhanced-original-form-wrapper .col-md-10,
.enhanced-original-form-wrapper .col-sm-10{grid-column:span 10 !important;}
.enhanced-original-form-wrapper .col-lg-11,
.enhanced-original-form-wrapper .col-md-11,
.enhanced-original-form-wrapper .col-sm-11,
.enhanced-original-form-wrapper .col-xs-11{grid-column:span 11 !important;}
.enhanced-original-form-wrapper .col-lg-12,
.enhanced-original-form-wrapper .col-md-12,
.enhanced-original-form-wrapper .col-sm-12,
.enhanced-original-form-wrapper .col-xs-12{grid-column:span 12 !important;}
.enhanced-original-form-wrapper .form-group .roots-control{padding-right:0;padding-left:0;}
.enhanced-original-form-wrapper label{display:block;font-size:12.5px;font-weight:700;color:var(--ink-soft);margin-bottom:8px;}
.enhanced-original-form-wrapper .alert, .enhanced-original-form-wrapper .alert.page{margin-bottom:18px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,.08);background:#fff;border:1px solid var(--line-strong);color:var(--ink);padding:14px 16px;}
.enhanced-original-form-wrapper .alert.page:empty{display:none !important;margin:0 !important;padding:0 !important;border:none !important;box-shadow:none !important;}
.enhanced-original-form-wrapper .alert.alert-danger{border-color:rgba(248,113,113,.3);background:rgba(248,113,113,.08);color:var(--red);}
.enhanced-original-form-wrapper .alert.alert-success{border-color:rgba(34,197,94,.3);background:rgba(34,197,94,.08);color:var(--jp-green-dark);}
.enhanced-original-form-wrapper .alert.alert-block{position:relative;display:inline-flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,.18);background:rgba(15,23,42,.96);border:1px solid rgba(148,163,184,.24);color:#f8fafc;}
.enhanced-original-form-wrapper .alert.alert-block.alert-danger{border-color:rgba(248,113,113,.3);background:rgba(185,28,28,.95);}
.enhanced-original-form-wrapper .alert.alert-block.alert-success{border-color:rgba(34,197,94,.3);background:rgba(5,150,105,.95);}
.enhanced-original-form-wrapper .alert.alert-block .close{position:absolute;top:8px;right:8px;line-height:1;color:#f8fafc;opacity:.85;}
.enhanced-original-form-wrapper .btn, .enhanced-original-form-wrapper button, .enhanced-original-form-wrapper .btn-success, .enhanced-original-form-wrapper .btn.btn-primary{border-radius:10px;min-height:44px;line-height:1.2;}
.enhanced-original-form-wrapper .chosen-container{width:100% !important;border-radius:12px;}
.enhanced-original-form-wrapper .chosen-container .chosen-single{border-radius:10px !important;background:#fff !important;border:1px solid var(--line-strong) !important;box-shadow:none !important;height:42px;display:flex;align-items:center;padding:0 14px;}
.enhanced-original-form-wrapper .chosen-container .chosen-drop{border:none !important;box-shadow:0 10px 25px rgba(0,0,0,.08) !important;border-radius:12px !important;margin-top:4px !important;}
.enhanced-original-form-wrapper .chosen-container .chosen-search input{border:1px solid var(--line-strong) !important;border-radius:10px !important;padding:10px 14px !important;box-shadow:none !important;}
.enhanced-original-form-wrapper .chosen-container .chosen-results{max-height:240px !important;overflow:auto !important;}
.enhanced-original-form-wrapper input.form-control, .enhanced-original-form-wrapper select, .enhanced-original-form-wrapper textarea,
.enhanced-original-form-wrapper .nk-int-st,
.enhanced-original-form-wrapper input:not([type=checkbox]):not([type=radio]){border-radius:10px;border:1px solid var(--line-strong) !important;box-shadow:none !important;background:#fff !important;color:var(--ink) !important;min-height:42px;padding:0 14px;outline:none;width:100%;font-family:'Tajawal',sans-serif !important;font-size:13.5px !important;line-height:1.4 !important;}
.enhanced-original-form-wrapper input.form-control:focus, .enhanced-original-form-wrapper select:focus, .enhanced-original-form-wrapper textarea:focus, .enhanced-original-form-wrapper input:not([type=checkbox]):not([type=radio]):focus{border-color:var(--jp-green) !important;box-shadow:0 0 0 3px rgba(119,188,35,.12) !important;}
.enhanced-original-form-wrapper input::placeholder, .enhanced-original-form-wrapper textarea::placeholder{color:#8A9678;opacity:1;font-weight:400;}
.enhanced-original-form-wrapper select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6' stroke='%234B5541' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;background-size:12px;padding-right:36px;}
.enhanced-original-form-wrapper .nk-int-st{border:none;border-radius:12px;padding:10px;background:var(--paper);}
.enhanced-original-form-wrapper input[type=checkbox], .enhanced-original-form-wrapper input[type=radio]{accent-color:var(--jp-green);}
.enhanced-original-form-wrapper .btn-group, .enhanced-original-form-wrapper .form-actions, .enhanced-original-form-wrapper .actions{display:flex;flex-wrap:wrap;gap:12px;}
.enhanced-original-form-wrapper .widget-toolbar a,
.enhanced-original-form-wrapper .widget-toolbar .btn,
.enhanced-original-form-wrapper .btn-success.notika-btn-success,
.enhanced-original-form-wrapper .btn-success{display:inline-flex !important;align-items:center;gap:8px;justify-content:center;border-radius:10px !important;padding:0 20px !important;height:44px !important;font-family:'Cairo' !important;font-weight:700 !important;font-size:13.5px !important;line-height:1.2 !important;border:none !important;background:linear-gradient(135deg,var(--jp-green),var(--jp-green-2)) !important;color:#fff !important;box-shadow:var(--shadow-sm) !important;}
.enhanced-original-form-wrapper .widget-toolbar a:hover,
.enhanced-original-form-wrapper .widget-toolbar .btn:hover,
.enhanced-original-form-wrapper .btn-success.notika-btn-success:hover,
.enhanced-original-form-wrapper .btn-success:hover{box-shadow:var(--shadow-md) !important;transform:translateY(-1px) !important;}
.enhanced-original-form-wrapper input[type=checkbox], .enhanced-original-form-wrapper input[type=radio]{accent-color:var(--jp-green);}
.enhanced-original-form-wrapper .btn-group, .enhanced-original-form-wrapper .form-actions, .enhanced-original-form-wrapper .actions{display:flex;flex-wrap:wrap;gap:12px;}
.btn-primary{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--jp-green),var(--jp-green-2));color:#fff;font-family:'Cairo';font-weight:700;font-size:13.5px;border:none;border-radius:10px;padding:0 22px;height:44px;cursor:pointer;transition:box-shadow .15s, transform .15s;box-shadow:var(--shadow-sm);}
.btn-primary:hover{box-shadow:var(--shadow-md);transform:translateY(-1px);}
.btn-secondary{display:inline-flex;align-items:center;gap:8px;background:#fff;color:var(--ink);font-family:'Cairo';font-weight:700;font-size:13.5px;border:1px solid var(--line-strong);border-radius:10px;padding:0 20px;height:44px;cursor:pointer;transition:border-color .15s,color .15s;}
.btn-secondary:hover{border-color:var(--jp-green);color:var(--jp-green-dark);}
.field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 24px;margin-top:16px;}
.field{display:flex;flex-direction:column;gap:8px;}
.field label{font-size:13px;font-weight:700;color:var(--ink-soft);}
.field span.req{color:var(--red);margin-inline-start:4px;}
.field input,.field select{width:100%;min-height:44px;padding:12px 14px;border-radius:10px;border:1px solid var(--line-strong);background:#fff;color:var(--ink);font-size:13.5px;}
.field select,.enhanced-native-select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6' stroke='%234B5541' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;background-size:12px;padding-right:36px;}
.field.span-2{grid-column:span 2;}
.field-radio-group{display:flex;flex-wrap:wrap;gap:12px;}
.field-radio{display:inline-flex;align-items:center;gap:10px;padding:11px 14px;border:1px solid var(--line);border-radius:12px;background:var(--paper);cursor:pointer;transition:border-color .15s,box-shadow .15s;}
.field-radio:hover{border-color:var(--jp-green);box-shadow:0 12px 30px rgba(73,117,45,.08);}
.field-radio input{accent-color:var(--jp-green);width:18px;height:18px;min-width:auto;min-height:auto;margin:0;padding:0;}
.field-check{display:inline-flex;align-items:center;gap:10px;padding:12px 16px;border:1px solid var(--line);border-radius:12px;background:var(--paper);cursor:pointer;transition:box-shadow .15s,border-color .15s;min-height:44px;width:100%;}
.field-check:hover{border-color:var(--jp-green);box-shadow:0 12px 30px rgba(73,117,45,.08);}
.field-check input{accent-color:var(--jp-green);width:18px;height:18px;min-width:auto;min-height:auto;margin:0;padding:0;}
.form-card-foot{display:flex;align-items:center;justify-content:flex-end;gap:12px;padding:18px 26px;border-top:1px solid var(--line);background:var(--paper);flex-wrap:wrap;}
@media (max-width:900px){.field-grid{grid-template-columns:1fr;}
.field.span-2{grid-column:span 1;}
.field.span-2 > div{display:grid;grid-template-columns:1fr !important;gap:12px;}
.form-card{margin:16px;}.form-card-body{padding:20px;}.breadcrumb{justify-content:center;}.enhanced-original-form-wrapper .row{display:block;}.enhanced-original-form-wrapper .col-lg-2,.enhanced-original-form-wrapper .col-lg-3,.enhanced-original-form-wrapper .col-md-2,.enhanced-original-form-wrapper .col-md-3,.enhanced-original-form-wrapper .col-sm-2,.enhanced-original-form-wrapper .col-sm-3{width:100%;}.enhanced-original-form-wrapper .form-group .row{flex-wrap:wrap;}.enhanced-original-form-wrapper .chosen-container{width:100% !important;}.form-card-foot{flex-direction:column;align-items:stretch;}.form-card-foot > *{width:100%;}.form-card-foot > *:not(:last-child){margin-bottom:12px;}}
@media (max-width:600px){.field.span-2 > div{grid-template-columns:1fr !important;}}
`;
}

function buildEditCustomerHTML(navLinks, userName = 'User', userRole = 'Agent') {
  const container = document.createElement('div');
  container.innerHTML = `
${getUtilityBarHTML()}
${getHeaderHTML({ userName, userRole })}
${getNavHTML('agent', navLinks)}
<div class="page">
  <div class="breadcrumb">
    <a href="#">الرئيسية</a><span class="sep">/</span><a href="#">الوكيل</a><span class="sep">/</span><a href="#">قائمة مشترك</a><span class="sep">/</span><span class="current">تعديل مشترك</span>
  </div>

  <div class="form-card">
    <div class="form-card-head">
      <h2><span class="fc-ic"><svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path></svg></span>تعديل مشترك</h2>
      <a class="btn-secondary" href="#" style="text-decoration:none;" id="enhanced-back-list-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.7"></rect><path d="M7 9h10M7 13h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path></svg>
        قائمة مشترك
      </a>
    </div>
    <div class="form-card-body">

      <div class="section-divider">نوع الحساب</div>
      <div class="field-grid">
        <div class="field">
          <label>نوع الحساب<span class="req">*</span></label>
          <select><option selected="">Full Wallet Profile</option></select>
        </div>
      </div>

      <div class="section-divider">البيانات الشخصية</div>
      <div class="field-grid">
        <div class="field span-2">
          <label>الاسم بالعربية<span class="req">*</span></label>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
            <input id="enhanced-ar-first-name" name="arFirstName" type="text" placeholder="الاسم الاول">
            <input id="enhanced-ar-middle-name" name="arMiddleName" type="text" placeholder="اسم الاب">
            <input id="enhanced-ar-third-name" name="arThirdName" type="text" placeholder="اسم الجد">
            <input id="enhanced-ar-last-name" name="arLastName" type="text" placeholder="اسم العائلة">
          </div>
        </div>
        <div class="field span-2">
          <label>الاسم بالانجليزية<span class="req">*</span></label>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
            <input id="enhanced-en-first-name" name="firstName" type="text" value="osama" placeholder="الاسم الاول">
            <input id="enhanced-en-middle-name" name="middleName" type="text" value="mohmmed" placeholder="اسم الاب">
            <input id="enhanced-en-third-name" name="thirdName" type="text" value="huseyn" placeholder="اسم الجد">
            <input id="enhanced-en-last-name" name="lastName" type="text" value="radi" placeholder="اسم العائلة">
          </div>
        </div>
        <div class="field">
          <label>اسم الام بالعربية<span class="req">*</span></label>
          <input id="enhanced-mother-name" name="motherName" type="text" value="وفاء صبحي الحاج يوسف">
        </div>
        <div class="field">
          <label>الجنسية<span class="req">*</span></label>
          <select id="enhanced-nationality" name="nationality" class="enhanced-native-select">
            <option value="">اختر ..</option>
          </select>
        </div>
        <div class="field">
          <label>رقم الموبايل</label>
          <input id="enhanced-mobile-number" name="_mobileNumber" type="text" value="00970595339008" disabled="">
        </div>
        <div class="field">
          <label>البريد الإلكتروني</label>
          <input id="enhanced-email" name="email" type="email" placeholder="example@mail.com">
        </div>
      </div>

      <div class="section-divider">الهوية</div>
      <div class="field-grid">
        <div class="field">
          <label>نوع الهوية<span class="req">*</span></label>
          <select id="enhanced-id-type" name="idTypeId"><option selected="">هوية فلسطينية</option></select>
        </div>
        <div class="field">
          <label>رقم الهوية<span class="req">*</span></label>
          <input id="enhanced-id-number" name="idNumber" type="text" value="406957035">
        </div>
        <div class="field">
          <label>تاريخ اصدار الهوية</label>
          <input id="enhanced-id-issuance-date" name="idCardIssuanceDate" type="text" placeholder="dd/mm/yyyy">
        </div>
        <div class="field">
          <label>مكان اصدار الهوية</label>
          <input id="enhanced-place-of-id-issuance" name="placeOfIdIssuance" type="text">
        </div>
        <div class="field">
          <label>تاريخ الميلاد<span class="req">*</span></label>
          <input id="enhanced-date-of-birth" name="dateOfBirth" type="text" value="03/12/2000" placeholder="dd/mm/yyyy">
        </div>
        <div class="field">
          <label>مكان الولادة بالإنجليزية<span class="req">*</span></label>
          <input id="enhanced-place-of-birth" name="placeOfBirth" type="text" value="Khan Younis">
        </div>
      </div>

      <div class="section-divider">العنوان</div>
      <div class="field-grid">
        <div class="field">
          <label>المدينة<span class="req">*</span></label>
          <select id="enhanced-city" name="cityCode" class="enhanced-native-select">
            <option value="">اختر ..</option>
          </select>
        </div>
        <div class="field">
          <label>المنطقة<span class="req">*</span></label>
          <select id="enhanced-area" name="areaCode" class="enhanced-native-select">
            <option value="">اختر ..</option>
          </select>
        </div>
        <div class="field">
          <label>الجنس<span class="req">*</span></label>
          <div class="field-radio-group">
            <label class="field-radio"><input type="radio" name="enhanced-gender" value="1" checked=""> ذكر</label>
            <label class="field-radio"><input type="radio" name="enhanced-gender" value="2"> أنثى</label>
          </div>
        </div>
        <div class="field span-2">
          <label>العنوان</label>
          <input id="enhanced-address" name="address" type="text" value="خانيونس حي الامل">
        </div>
        <div class="field">
          <label>صاحب منصب سياسي</label>
          <label class="field-check"><input id="enhanced-politically-exposed" name="holdingPoliticalPosition" type="checkbox"> نعم، أشغل منصباً سياسياً</label>
        </div>
        <div class="field span-2">
          <label>العنوان الدائم<span class="req">*</span></label>
          <input id="enhanced-permanent-address" name="permanentResidencyAdd" type="text">
        </div>
      </div>

      <div class="section-divider">معلومات الطلب</div>
      <div class="field-grid">
        <div class="field">
          <label>حالة الطلب</label>
          <input id="enhanced-request-status" name="_status" type="text" readonly="">
        </div>
        <div class="field span-2">
          <label>أسباب الرفض</label>
          <input id="enhanced-rejection-reason" name="_rejectionReason" type="text" readonly="">
        </div>
      </div>

      <div class="section-divider">معلومات إضافية</div>
      <div class="field-grid">
        <div class="field span-2">
          <label>المهنة<span class="req">*</span></label>
          <div id="enhanced-occupation-wrapper" class="enhanced-occupation-wrapper">
            <select id="enhanced-occupation-fallback" name="occupation" class="enhanced-native-select">
              <option value="">اختر ..</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label>رمز الدعوه</label>
          <input id="enhanced-referral" name="referral" type="text" readonly="">
        </div>
        <div class="field">
          <label>اللغة المفضلة<span class="req">*</span></label>
          <select id="enhanced-pref-language" name="prefLanguage" class="enhanced-native-select">
            <option value="">اختر ..</option>
          </select>
        </div>
      </div>

    </div>
    <div class="form-card-foot">
      <a class="btn-secondary" href="#" style="text-decoration:none;" id="enhanced-back-list-footer-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M8 6l-6 6 6 6M2 12h20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        الرجوع الى القائمة
      </a>
      <button class="btn-secondary" type="button" style="color:var(--amber);border-color:#F2D9A8;" id="enhanced-kyc-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M14 3v4a1 1 0 0 0 1 1h4M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path></svg>
        نموذج اعرف عميلك
      </button>
      <button class="btn-primary" type="button" id="enhanced-save-btn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path><path d="M8 3v6h8V3M8 21v-7h8v7" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path></svg>
        حفظ
      </button>
    </div>
  </div>
</div>
${getFooterHTML()}
`;
  return container;
}

enhanceEditCustomerPage();
