// Validate OTP Code page enhancer - injects enhanced account-summary UX
console.log('[JawwalPay UX+] validateOTPCode.js loaded');

function enhanceValidateOTPCodePage() {
  try {
    console.log('[JawwalPay UX+] Injecting validateOTPCode page design...');
    extractDataAndInject();
  } catch (error) {
    console.error('[JawwalPay UX+] Error enhancing validateOTPCode page:', error);
  }
}

function extractDataAndInject() {
  const originalBody = document.body;
  const { userName, userRole, navLinks } = extractPageMetadata(originalBody);

  const overlayContainer = document.createElement('div');
  overlayContainer.id = 'jawwalpay-uxplus-overlay';
  overlayContainer.style.cssText = 'position:fixed;inset:0;z-index:999999;background:var(--paper);overflow-y:auto;overflow-x:hidden;visibility:visible;';
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  document.body.style.margin = '0';
  document.body.style.padding = '0';

  const style = document.createElement('style');
  style.textContent = getPageSpecificCSS();
  overlayContainer.appendChild(style);

  overlayContainer.appendChild(buildValidateOTPCodeHTML(navLinks, userName, userRole));
  document.body.appendChild(overlayContainer);

  initNavTabs(overlayContainer);
  initDropdowns(overlayContainer);
  setupValidationPageFlow(overlayContainer);

  console.log('[JawwalPay UX+] validateOTPCode page design injected');
}

function setupValidationPageFlow(container) {
  const statusBox = container.querySelector('#enhanced-statusPopup');
  const submitBtn = container.querySelector('#enhanced-submitFormBtn');

  const summaryFields = {
    requestStatus: container.querySelector('#enhanced-requestStatus'),
    nameAr: container.querySelector('#enhanced-nameAr'),
    name: container.querySelector('#enhanced-name'),
    profile: container.querySelector('#enhanced-profile'),
    autoRegister: container.querySelector('#enhanced-autoRegister'),
    expiredStatus: container.querySelector('#enhanced-expiredStatus')
  };

  const hiddenFields = {
    fromAgentWallet: container.querySelector('#enhanced-fromAgentWallet'),
    id: container.querySelector('#enhanced-id'),
    refernce: container.querySelector('#enhanced-refernce'),
    referenceId: container.querySelector('#enhanced-referenceId'),
    mobileNumber: container.querySelector('#enhanced-mobileNumber'),
    activationCode: container.querySelector('#enhanced-activationCode'),
    walletStatus: container.querySelector('#enhanced-walletStatus'),
    isLightWallet: container.querySelector('#enhanced-isLightWallet'),
    isFixLocation: container.querySelector('#enhanced-isFixLocation')
  };

  const originalSubmitBtn = document.querySelector('#submitFormBtn');
  const originalForm = document.querySelector('form#registrationForm, form.formValidatablex, form');

  function clearStatus() {
    if (!statusBox) return;
    statusBox.innerHTML = '';
    statusBox.style.display = 'none';
  }

  function showStatus(message, type = 'success') {
    if (!statusBox) return;
    const colorClass = type === 'error' ? 'alert-danger' : 'alert-success';
    statusBox.style.display = 'block';
    statusBox.innerHTML = `
      <div class="alert-list">
        <div class="alert alert-block ${colorClass}">
          <button data-dismiss="alert" class="close" type="button">x</button>
          ${message}
        </div>
      </div>`;
    statusBox.querySelector('.close')?.addEventListener('click', clearStatus);
  }

  function getOriginalInputValue(selector) {
    const element = document.querySelector(selector);
    return element ? element.value.trim() : '';
  }

  function getOriginalText(selector) {
    const element = document.querySelector(selector);
    return element ? element.textContent.trim() : '';
  }

  function setOriginalInputValue(selector, value) {
    const element = document.querySelector(selector);
    if (element) {
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function syncSummaryFromOriginal() {
    summaryFields.requestStatus.textContent = getOriginalText('.alert-info.form-control') || getOriginalInputValue('input[name="requestStatus" i], input#requestStatus');
    summaryFields.nameAr.textContent = getOriginalInputValue('input[name="nameAr" i], input#nameAr');
    summaryFields.name.textContent = getOriginalInputValue('input[name="name" i], input#name');
    summaryFields.profile.textContent = getOriginalInputValue('input[name="profile" i], input#profile');

    const expiredInputs = Array.from(document.querySelectorAll('input[name="isExpired" i]'));
    summaryFields.autoRegister.textContent = expiredInputs[0]?.value || getOriginalInputValue('input[name="isAutoRegister" i], input#isAutoRegister') || 'لا';
    summaryFields.expiredStatus.textContent = expiredInputs[1]?.value || getOriginalInputValue('input[name="isExpired" i]#isExpired') || 'لا';

    hiddenFields.fromAgentWallet.value = getOriginalInputValue('input[name="fromAgentWallet" i], input#fromAgentWallet');
    hiddenFields.id.value = getOriginalInputValue('input[name="id" i], input#id');
    hiddenFields.refernce.value = getOriginalInputValue('input[name="refernce" i], input#refernce');
    hiddenFields.referenceId.value = getOriginalInputValue('input[name="referenceId" i], input#referenceId');
    hiddenFields.mobileNumber.value = getOriginalInputValue('input[name="mobileNumber" i], input#mobileNumber');
    hiddenFields.activationCode.value = getOriginalInputValue('input[name="activationCode" i], input#activationCode');
    hiddenFields.walletStatus.value = getOriginalInputValue('input[name="walletStatus" i], input#walletStatus');
    hiddenFields.isLightWallet.value = getOriginalInputValue('input[name="isLightWallet" i], input#isLightWallet');
    hiddenFields.isFixLocation.value = getOriginalInputValue('input[name="isFixLocation" i], input#isFixLocation');
  }

  function syncHiddenFieldsToOriginal() {
    Object.entries(hiddenFields).forEach(([name, field]) => {
      if (!field) return;
      const selector = `input[name="${name}" i], input#${name}`;
      setOriginalInputValue(selector, field.value);
    });
  }

  function handleSubmit() {
    clearStatus();
    syncHiddenFieldsToOriginal();

    if (originalSubmitBtn) {
      originalSubmitBtn.click();
      showStatus('جارٍ حفظ التعديلات...', 'success');
      return;
    }

    if (originalForm) {
      originalForm.submit();
      showStatus('جارٍ حفظ التعديلات...', 'success');
      return;
    }

    showStatus('تعذّر العثور على زر التعديل الأصلي أو النموذج.', 'error');
  }

  submitBtn.addEventListener('click', handleSubmit);

  syncSummaryFromOriginal();
  clearStatus();
}

function getPageSpecificCSS() {
  return `
.page{padding:28px 0 64px;}
.breadcrumb{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ink-soft);margin-bottom:18px;}
.breadcrumb a{color:var(--ink-soft);text-decoration:none;transition:color .15s;}
.breadcrumb a:hover{color:var(--jp-green-dark);}
.breadcrumb .sep{opacity:.5;}
.breadcrumb .current{color:var(--jp-green-dark);font-weight:700;}
.form-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);margin-bottom:28px;overflow:hidden;max-width:760px;margin-inline:auto;}
.form-card-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:20px 26px;border-bottom:1px solid var(--line);background:var(--jp-green-pale-2);}
.form-card-head h2{font-family:'Cairo';font-size:17px;font-weight:800;margin:0;display:flex;align-items:center;gap:10px;}
.form-card-head .fc-ic{width:34px;height:34px;border-radius:10px;background:var(--jp-green-pale);color:var(--jp-green-dark);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.form-card-body{padding:26px;}
.enhanced-status-popup{position:fixed;top:20px;right:20px;z-index:100001;max-width:360px;display:none;}
.enhanced-status-popup .alert-list{margin:0;display:flex;justify-content:flex-start;}
.enhanced-status-popup .alert.alert-block{position:relative;display:inline-flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,.18);background:rgba(15,23,42,0.96);border:1px solid rgba(148,163,184,.24);color:#f8fafc;}
.enhanced-status-popup .alert.alert-block.alert-danger{border-color:rgba(248,113,113,.3);background:rgba(185,28,28,.95);}
.enhanced-status-popup .alert.alert-block.alert-success{border-color:rgba(34,197,94,.3);background:rgba(5,150,105,.95);}
.enhanced-status-popup .alert.alert-block .close{position:absolute;top:8px;right:8px;line-height:1;color:#f8fafc;opacity:.85;}
.form-card-foot{display:flex;align-items:center;gap:12px;padding:18px 26px;border-top:1px solid var(--line);flex-wrap:wrap;}
.section-divider{display:flex;align-items:center;gap:10px;margin:26px 0 18px;font-family:'Cairo';font-weight:700;font-size:13px;color:var(--jp-green-dark);}
.section-divider:first-child{margin-top:0;}
.section-divider::after{content:'';flex:1;height:1px;background:var(--line);}
.summary-row{display:grid;grid-template-columns:140px 1fr;gap:10px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line);}
.summary-row:last-child{border-bottom:none;}
.summary-label{font-size:13px;font-weight:700;color:var(--ink-soft);text-align:right;}
.summary-value{font-size:14px;color:var(--ink);padding:10px 12px;border-radius:12px;background:var(--paper);border:1px solid var(--line-strong);}
.summary-value.readonly{background:var(--paper);}
.btn-primary{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--jp-green),var(--jp-green-2));color:#fff;font-family:'Cairo';font-weight:700;font-size:13.5px;border:none;border-radius:10px;padding:0 22px;height:44px;cursor:pointer;transition:box-shadow .15s, transform .15s;box-shadow:var(--shadow-sm);}
.btn-primary:hover{box-shadow:var(--shadow-md);transform:translateY(-1px);}
.btn-secondary{display:inline-flex;align-items:center;gap:8px;background:#fff;color:var(--ink);font-family:'Cairo';font-weight:700;font-size:13.5px;border:1px solid var(--line-strong);border-radius:10px;padding:0 20px;height:44px;cursor:pointer;transition:border-color .15s,color .15s;}
.btn-secondary:hover{border-color:var(--jp-green);color:var(--jp-green-dark);}
@media (max-width:900px){.summary-row{grid-template-columns:1fr;}.form-card-foot{justify-content:center;}.breadcrumb{flex-wrap:wrap;}}
@media (max-width:600px){.summary-row{gap:10px;}}
`;
}

function buildValidateOTPCodeHTML(navLinks, userName = 'User', userRole = 'Agent') {
  const container = document.createElement('div');
  container.innerHTML = `
${getUtilityBarHTML()}
${getHeaderHTML({ userName, userRole })}
${getNavHTML('agent', navLinks)}
<div class="page">
  <div id="enhanced-statusPopup" class="enhanced-status-popup"></div>
  <div class="wrap">
    <div class="breadcrumb">
      <a href="#">الرئيسية</a><span class="sep">/</span><a href="#">الوكيل</a><span class="sep">/</span><a href="#">خدمات الافراد والاعمال</a><span class="sep">/</span><span class="current">الحساب الحالي للمشترك</span>
    </div>
    <div class="form-card">
      <div class="form-card-head">
        <h2><span class="fc-ic"><svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.4" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 20c1.6-4 4.5-5.6 7.5-5.6S17.9 16 19.5 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span>الحساب الحالي للمشترك</h2>
      </div>
      <div class="form-card-body">
        <div class="section-divider">تفاصيل الحساب</div>
        <div class="summary-row"><div class="summary-label">حالة الطلب</div><div class="summary-value readonly" id="enhanced-requestStatus">--</div></div>
        <div class="summary-row"><div class="summary-label">الاسم بالعربية</div><div class="summary-value readonly" id="enhanced-nameAr">--</div></div>
        <div class="summary-row"><div class="summary-label">الاسم الكامل</div><div class="summary-value readonly" id="enhanced-name">--</div></div>
        <div class="summary-row"><div class="summary-label">نوع الحساب</div><div class="summary-value readonly" id="enhanced-profile">--</div></div>
        <div class="summary-row"><div class="summary-label">تسجيل تلقائي</div><div class="summary-value readonly" id="enhanced-autoRegister">--</div></div>
        <div class="summary-row"><div class="summary-label">منتهية</div><div class="summary-value readonly" id="enhanced-expiredStatus">--</div></div>
        <form id="enhanced-validation-form">
          <input type="hidden" name="fromAgentWallet" id="enhanced-fromAgentWallet" value="">
          <input type="hidden" name="id" id="enhanced-id" value="">
          <input type="hidden" name="refernce" id="enhanced-refernce" value="">
          <input type="hidden" name="referenceId" id="enhanced-referenceId" value="">
          <input type="hidden" name="mobileNumber" id="enhanced-mobileNumber" value="">
          <input type="hidden" name="activationCode" id="enhanced-activationCode" value="">
          <input type="hidden" name="walletStatus" id="enhanced-walletStatus" value="">
          <input type="hidden" name="isLightWallet" id="enhanced-isLightWallet" value="">
          <input type="hidden" name="isFixLocation" id="enhanced-isFixLocation" value="">
        </form>
      </div>
      <div class="form-card-foot">
        <button id="enhanced-submitFormBtn" class="btn-primary" type="button">تعديل</button>
        <a class="btn-secondary" href="/agent/businessServices" style="text-decoration:none;">الرجوع الى القائمة</a>
      </div>
    </div>
  </div>
</div>
${getFooterHTML()}
`;
  return container;
}

enhanceValidateOTPCodePage();
